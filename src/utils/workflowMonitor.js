// Workflow Monitor - Automatically detects and fixes common issues
import { 
  collection, 
  getDocs, 
  updateDoc,
  doc,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from './logger';

class WorkflowMonitor {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.issues = [];
    this.fixes = [];
    this.checkInProgress = false;
    this.checkTimeout = 60000; // 60 second timeout
    this.lastCheckTime = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
    
    // Rate limiting for issue reporting
    this.issueReportCache = new Map();
    this.maxIssuesPerType = 10; // Max issues to report per type per check
    this.reportCooldown = 300000; // 5 minutes cooldown for similar issues
    this.lastReportTime = new Map();
  }

  // Start monitoring
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔍 Workflow Monitor started');
    
    // Run checks every 30 seconds
    this.checkInterval = setInterval(() => {
      // Prevent overlapping checks
      if (!this.checkInProgress) {
        this.runChecks();
      } else {
        console.log('⏳ Previous check still in progress, skipping...');
      }
    }, 30000);
    
    // Run initial check
    this.runChecks();
  }

  // Stop monitoring
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🛑 Workflow Monitor stopped');
  }

  // Run all checks with timeout and circuit breaker
  async runChecks() {
    // Circuit breaker - stop if too many failures
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      console.log('🛑 Workflow monitor circuit breaker activated - too many failures');
      this.stop();
      return;
    }

    // Prevent concurrent checks
    if (this.checkInProgress) {
      console.log('⚠️ Check already in progress, skipping...');
      return;
    }

    this.checkInProgress = true;
    this.lastCheckTime = Date.now();
    
    console.log('🔄 Running workflow checks...');
    const issues = [];
    const fixes = [];

    // Set timeout for checks
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Workflow check timeout')), this.checkTimeout);
    });

    try {
      // Run checks with timeout
      await Promise.race([
        this.performAllChecks(issues, fixes),
        timeoutPromise
      ]);

      // Apply rate limiting to issues
      const filteredIssues = this.rateLimitIssues(issues);
      const filteredFixes = this.rateLimitFixes(fixes);
      
      this.issues = filteredIssues;
      this.fixes = filteredFixes;

      if (filteredIssues.length > 0) {
        // Group issues by type for better reporting
        const issuesByType = this.groupIssuesByType(filteredIssues);
        console.log(`⚠️  Found ${filteredIssues.length} issues (${issues.length} total before filtering)`);
        
        for (const [type, typeIssues] of Object.entries(issuesByType)) {
          if (typeIssues.length > this.maxIssuesPerType) {
            console.log(`  - ${type}: ${this.maxIssuesPerType} shown (${typeIssues.length} total)`);
          } else {
            console.log(`  - ${type}: ${typeIssues.length} issues`);
          }
        }
      }

      if (filteredFixes.length > 0) {
        const fixesByType = this.groupFixesByType(filteredFixes);
        console.log(`✅ Applied ${filteredFixes.length} fixes`);
        
        for (const [type, count] of Object.entries(fixesByType)) {
          console.log(`  - ${type}: ${count} fixes`);
        }
      }

      if (issues.length === 0 && fixes.length === 0) {
        console.log('✨ No issues found');
      }

      // Reset failure counter on successful check
      this.consecutiveFailures = 0;

    } catch (error) {
      console.error('Monitor check failed:', error);
      await logger.error('Workflow monitor check failed', error);
      
      // Increment failure counter
      this.consecutiveFailures++;
      
      // Stop if timeout
      if (error.message === 'Workflow check timeout') {
        console.log('⏱️ Workflow check timed out after 60 seconds');
        this.stop();
      }
    } finally {
      this.checkInProgress = false;
    }
  }

  // Perform all checks
  async performAllChecks(issues, fixes) {
    // Check 1: Stuck locks
    const lockIssues = await this.checkStuckLocks();
    issues.push(...lockIssues.issues);
    fixes.push(...lockIssues.fixes);

    // Check 2: Inconsistent field names
    const fieldIssues = await this.checkFieldInconsistencies();
    issues.push(...fieldIssues.issues);
    fixes.push(...fieldIssues.fixes);

    // Check 3: Orphaned allocations
    const allocationIssues = await this.checkOrphanedAllocations();
    issues.push(...allocationIssues.issues);
    fixes.push(...allocationIssues.fixes);

    // Check 4: Invalid status transitions
    const statusIssues = await this.checkInvalidStatuses();
    issues.push(...statusIssues.issues);
    fixes.push(...statusIssues.fixes);

    // Check 5: Missing required fields
    const missingFieldIssues = await this.checkMissingFields();
    issues.push(...missingFieldIssues.issues);
    fixes.push(...missingFieldIssues.fixes);

    // Check 6: Duplicate releases
    const duplicateIssues = await this.checkDuplicateReleases();
    issues.push(...duplicateIssues.issues);
    fixes.push(...duplicateIssues.fixes);
  }

  // Check for stuck locks
  async checkStuckLocks() {
    const issues = [];
    const fixes = [];
    
    try {
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      const now = new Date();
      
      for (const docSnapshot of releasesSnapshot.docs) {
        const data = docSnapshot.data();
        
        if (data.lockedBy && data.lockedAt) {
          const lockTime = data.lockedAt.toDate();
          const lockAge = now - lockTime;
          
          // If lock is older than 15 minutes
          if (lockAge > 15 * 60 * 1000) {
            issues.push({
              type: 'STUCK_LOCK',
              documentId: docSnapshot.id,
              description: `Release ${data.releaseNumber} locked for ${Math.round(lockAge / 60000)} minutes`,
              data: { lockedBy: data.lockedByName, lockTime }
            });
            
            // Auto-fix: Release the lock
            try {
              await updateDoc(doc(db, 'releases', docSnapshot.id), {
                lockedBy: null,
                lockedByName: null,
                lockedAt: null
              });
              
              fixes.push({
                type: 'LOCK_RELEASED',
                documentId: docSnapshot.id,
                description: `Released stuck lock on ${data.releaseNumber}`
              });
            } catch (fixError) {
              console.error('Failed to release lock:', fixError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to check stuck locks:', error);
    }
    
    return { issues, fixes };
  }

  // Check for field name inconsistencies
  async checkFieldInconsistencies() {
    const issues = [];
    const fixes = [];
    
    try {
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      
      for (const docSnapshot of releasesSnapshot.docs) {
        const data = docSnapshot.data();
        const fieldsToFix = {};
        
        // Check for mixed case fields
        if (data.Status && !data.status) {
          fieldsToFix.status = data.Status;
          delete data.Status;
        }
        
        if (data.ReleaseNumber && !data.releaseNumber) {
          fieldsToFix.releaseNumber = data.ReleaseNumber;
        }
        
        if (data.SupplierId && !data.supplierId) {
          fieldsToFix.supplierId = data.SupplierId;
        }
        
        if (data.CustomerId && !data.customerId) {
          fieldsToFix.customerId = data.CustomerId;
        }
        
        if (data.LineItems && !data.lineItems) {
          fieldsToFix.lineItems = data.LineItems;
        }
        
        if (Object.keys(fieldsToFix).length > 0) {
          issues.push({
            type: 'FIELD_INCONSISTENCY',
            documentId: docSnapshot.id,
            description: `Release has inconsistent field names`,
            data: { fields: Object.keys(fieldsToFix) }
          });
          
          // Auto-fix: Add lowercase versions
          try {
            await updateDoc(doc(db, 'releases', docSnapshot.id), fieldsToFix);
            
            fixes.push({
              type: 'FIELDS_NORMALIZED',
              documentId: docSnapshot.id,
              description: `Normalized ${Object.keys(fieldsToFix).length} fields`
            });
          } catch (fixError) {
            console.error('Failed to normalize fields:', fixError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check field inconsistencies:', error);
    }
    
    return { issues, fixes };
  }

  // Check for orphaned allocations
  async checkOrphanedAllocations() {
    const issues = [];
    const fixes = [];
    
    try {
      // Get all allocations
      const allocationsSnapshot = await getDocs(collection(db, 'allocations'));
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      
      const releaseIds = new Set(releasesSnapshot.docs.map(d => d.id));
      
      for (const allocDoc of allocationsSnapshot.docs) {
        const data = allocDoc.data();
        
        // Check if allocation points to non-existent release
        if (data.releaseId && !releaseIds.has(data.releaseId)) {
          // Check if it's a draft (starts with 'draft-')
          if (data.releaseId.startsWith('draft-')) {
            // Check age of draft
            const createdAt = data.createdAt?.toDate();
            const age = createdAt ? (new Date() - createdAt) : Infinity;
            
            // If draft is older than 1 hour
            if (age > 60 * 60 * 1000) {
              issues.push({
                type: 'ORPHANED_DRAFT',
                documentId: allocDoc.id,
                description: `Orphaned draft allocation (${Math.round(age / 60000)} minutes old)`,
                data: { releaseId: data.releaseId }
              });
              
              // Auto-fix: Delete old draft
              try {
                await deleteDoc(doc(db, 'allocations', allocDoc.id));
                
                fixes.push({
                  type: 'DRAFT_DELETED',
                  documentId: allocDoc.id,
                  description: `Deleted orphaned draft allocation`
                });
              } catch (fixError) {
                console.error('Failed to delete draft:', fixError);
              }
            }
          } else {
            issues.push({
              type: 'ORPHANED_ALLOCATION',
              documentId: allocDoc.id,
              description: `Allocation points to non-existent release ${data.releaseId}`,
              data: { releaseId: data.releaseId }
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to check orphaned allocations:', error);
    }
    
    return { issues, fixes };
  }

  // Check for invalid status values
  async checkInvalidStatuses() {
    const issues = [];
    const fixes = [];
    
    const validStatuses = ['Entered', 'Staged', 'Verified', 'Loaded', 'Shipped'];
    
    try {
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      
      for (const docSnapshot of releasesSnapshot.docs) {
        const data = docSnapshot.data();
        const currentStatus = data.status || data.Status;
        
        if (currentStatus && !validStatuses.includes(currentStatus)) {
          issues.push({
            type: 'INVALID_STATUS',
            documentId: docSnapshot.id,
            description: `Invalid status: ${currentStatus}`,
            data: { status: currentStatus }
          });
          
          // Auto-fix: Default to 'Entered' for safety
          try {
            await updateDoc(doc(db, 'releases', docSnapshot.id), {
              status: 'Entered',
              Status: 'Entered'
            });
            
            fixes.push({
              type: 'STATUS_CORRECTED',
              documentId: docSnapshot.id,
              description: `Reset invalid status to 'Entered'`
            });
          } catch (fixError) {
            console.error('Failed to fix status:', fixError);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check invalid statuses:', error);
    }
    
    return { issues, fixes };
  }

  // Check for missing required fields
  async checkMissingFields() {
    const issues = [];
    const fixes = [];
    
    try {
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      
      for (const docSnapshot of releasesSnapshot.docs) {
        const data = docSnapshot.data();
        const missingFields = [];
        const fieldsToAdd = {};
        
        // Check required fields
        if (!data.releaseNumber && !data.ReleaseNumber) {
          missingFields.push('releaseNumber');
          fieldsToAdd.releaseNumber = `AUTO-${docSnapshot.id.substring(0, 8)}`;
        }
        
        if (!data.status && !data.Status) {
          missingFields.push('status');
          fieldsToAdd.status = 'Entered';
        }
        
        if (!data.supplierId && !data.SupplierId) {
          missingFields.push('supplierId');
        }
        
        if (!data.customerId && !data.CustomerId) {
          missingFields.push('customerId');
        }
        
        if (missingFields.length > 0) {
          issues.push({
            type: 'MISSING_FIELDS',
            documentId: docSnapshot.id,
            description: `Missing required fields: ${missingFields.join(', ')}`,
            data: { fields: missingFields }
          });
          
          // Auto-fix: Add default values where possible
          if (Object.keys(fieldsToAdd).length > 0) {
            try {
              await updateDoc(doc(db, 'releases', docSnapshot.id), fieldsToAdd);
              
              fixes.push({
                type: 'FIELDS_ADDED',
                documentId: docSnapshot.id,
                description: `Added default values for ${Object.keys(fieldsToAdd).join(', ')}`
              });
            } catch (fixError) {
              console.error('Failed to add missing fields:', fixError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to check missing fields:', error);
    }
    
    return { issues, fixes };
  }

  // Check for duplicate release numbers
  async checkDuplicateReleases() {
    const issues = [];
    const fixes = [];
    
    try {
      const releasesSnapshot = await getDocs(collection(db, 'releases'));
      const releaseNumbers = new Map();
      
      // Group by release number
      releasesSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        const releaseNumber = data.releaseNumber || data.ReleaseNumber;
        
        if (releaseNumber) {
          if (!releaseNumbers.has(releaseNumber)) {
            releaseNumbers.set(releaseNumber, []);
          }
          releaseNumbers.get(releaseNumber).push({
            id: docSnapshot.id,
            createdAt: data.createdAt
          });
        }
      });
      
      // Find duplicates
      for (const [releaseNumber, docs] of releaseNumbers.entries()) {
        if (docs.length > 1) {
          issues.push({
            type: 'DUPLICATE_RELEASE',
            description: `Release number ${releaseNumber} used ${docs.length} times`,
            data: { 
              releaseNumber, 
              documentIds: docs.map(d => d.id) 
            }
          });
          
          // Auto-fix: Add suffix to duplicates (keep the oldest)
          const sorted = docs.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return aTime - bTime;
          });
          
          for (let i = 1; i < sorted.length; i++) {
            try {
              const newNumber = `${releaseNumber}-DUP${i}`;
              await updateDoc(doc(db, 'releases', sorted[i].id), {
                releaseNumber: newNumber,
                ReleaseNumber: newNumber
              });
              
              fixes.push({
                type: 'DUPLICATE_RENAMED',
                documentId: sorted[i].id,
                description: `Renamed duplicate to ${newNumber}`
              });
            } catch (fixError) {
              console.error('Failed to rename duplicate:', fixError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to check duplicate releases:', error);
    }
    
    return { issues, fixes };
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date().toISOString(),
      issuesFound: this.issues.length,
      fixesApplied: this.fixes.length,
      issues: this.issues,
      fixes: this.fixes
    };
  }
  
  // Rate limit issues to prevent spam
  rateLimitIssues(issues) {
    const now = Date.now();
    const filtered = [];
    const typeCount = new Map();
    
    for (const issue of issues) {
      const typeKey = `${issue.type}_${issue.description?.substring(0, 50)}`;
      
      // Check if we've reported this type recently
      const lastReport = this.lastReportTime.get(typeKey);
      if (lastReport && (now - lastReport) < this.reportCooldown) {
        continue; // Skip this issue, too soon since last report
      }
      
      // Count issues per type
      const currentCount = typeCount.get(issue.type) || 0;
      if (currentCount >= this.maxIssuesPerType) {
        continue; // Already reported enough of this type
      }
      
      filtered.push(issue);
      typeCount.set(issue.type, currentCount + 1);
      this.lastReportTime.set(typeKey, now);
    }
    
    return filtered;
  }
  
  // Rate limit fixes
  rateLimitFixes(fixes) {
    // Fixes are good, we want to show them all but summarize if too many
    const typeCount = new Map();
    const filtered = [];
    
    for (const fix of fixes) {
      const currentCount = typeCount.get(fix.type) || 0;
      if (currentCount < this.maxIssuesPerType * 2) { // Allow more fixes to be shown
        filtered.push(fix);
        typeCount.set(fix.type, currentCount + 1);
      }
    }
    
    return filtered;
  }
  
  // Group issues by type
  groupIssuesByType(issues) {
    const grouped = {};
    
    for (const issue of issues) {
      if (!grouped[issue.type]) {
        grouped[issue.type] = [];
      }
      grouped[issue.type].push(issue);
    }
    
    return grouped;
  }
  
  // Group fixes by type
  groupFixesByType(fixes) {
    const grouped = {};
    
    for (const fix of fixes) {
      grouped[fix.type] = (grouped[fix.type] || 0) + 1;
    }
    
    return grouped;
  }
}

// Export singleton instance
export const workflowMonitor = new WorkflowMonitor();

// Auto-start in development
if (import.meta.env.DEV) {
  // Start monitoring after a delay to let the app initialize
  setTimeout(() => {
    workflowMonitor.start();
  }, 5000);
}

export default workflowMonitor;