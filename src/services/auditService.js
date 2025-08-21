// Audit logging and compliance service for CBRT UI
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';

/**
 * AuditService - Centralized audit logging for compliance and troubleshooting
 */
class AuditService {
  constructor() {
    this.collectionName = 'auditLogs';
  }

  /**
   * Log an audit event
   * @param {Object} params
   * @param {string} params.action - Action performed (create, update, delete, etc.)
   * @param {string} params.resource - Resource type (release, customer, barcode, etc.)
   * @param {string} params.resourceId - ID of the affected resource
   * @param {Object} params.changes - What changed (before/after values)
   * @param {Object} params.metadata - Additional context
   * @param {Object} params.user - User who performed the action
   */
  async logEvent({ action, resource, resourceId, changes = {}, metadata = {}, user }) {
    try {
      const auditEntry = {
        // Core audit fields
        action,
        resource,
        resourceId,
        
        // User context
        userId: user.id,
        userEmail: user.email,
        userName: user.name || user.displayName,
        userRole: user.role,
        
        // Change tracking
        changes,
        
        // Metadata and context
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          sessionId: this.getSessionId()
        },
        
        // Timestamps
        createdAt: serverTimestamp(),
        
        // Compliance fields
        ipAddress: await this.getClientIP(),
        severity: this.calculateSeverity(action, resource),
        
        // Additional tracking
        releaseId: this.extractReleaseId(resource, resourceId, metadata),
        customerId: this.extractCustomerId(resource, resourceId, metadata)
      };

      await addDoc(collection(db, this.collectionName), auditEntry);

      logger.info('Audit event logged', {
        action,
        resource,
        resourceId,
        userId: user.id
      });

    } catch (error) {
      logger.error('Failed to log audit event', error, {
        action,
        resource,
        resourceId,
        userId: user?.id
      });
      
      // Don't throw - audit failures shouldn't break business operations
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Log release lifecycle events
   */
  async logReleaseEvent(action, release, user, previousData = null) {
    const changes = previousData ? this.calculateChanges(previousData, release) : {};
    
    await this.logEvent({
      action,
      resource: 'release',
      resourceId: release.id,
      changes,
      metadata: {
        releaseNumber: release.releaseNumber || release.ReleaseNumber,
        customerName: release.customerName || release.CustomerName,
        supplierName: release.supplierName || release.SupplierName,
        status: release.status,
        totalItems: release.TotalItems,
        totalWeight: release.TotalWeight
      },
      user
    });
  }

  /**
   * Log user authentication events
   */
  async logAuthEvent(action, user, metadata = {}) {
    await this.logEvent({
      action,
      resource: 'authentication',
      resourceId: user.id,
      changes: {},
      metadata: {
        ...metadata,
        authMethod: metadata.authMethod || 'unknown'
      },
      user
    });
  }

  /**
   * Log barcode operations
   */
  async logBarcodeEvent(action, barcode, user, previousData = null) {
    const changes = previousData ? this.calculateChanges(previousData, barcode) : {};
    
    await this.logEvent({
      action,
      resource: 'barcode',
      resourceId: barcode.id,
      changes,
      metadata: {
        barcode: barcode.Barcode,
        itemName: barcode.ItemName,
        supplierName: barcode.SupplierName,
        customerName: barcode.CustomerName,
        status: barcode.status
      },
      user
    });
  }

  /**
   * Log bulk operations
   */
  async logBulkOperation(action, resource, selectedIds, user, metadata = {}) {
    await this.logEvent({
      action: `bulk_${action}`,
      resource,
      resourceId: 'bulk',
      changes: {
        affectedIds: selectedIds,
        count: selectedIds.length
      },
      metadata: {
        ...metadata,
        bulkOperation: true
      },
      user
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(action, user, metadata = {}) {
    await this.logEvent({
      action,
      resource: 'security',
      resourceId: user?.id || 'anonymous',
      changes: {},
      metadata: {
        ...metadata,
        securityEvent: true,
        timestamp: new Date().toISOString()
      },
      user: user || { id: 'anonymous', email: 'unknown', role: 'none' }
    });
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters = {}) {
    try {
      let auditQuery = collection(db, this.collectionName);
      
      // Apply filters
      if (filters.userId) {
        auditQuery = query(auditQuery, where('userId', '==', filters.userId));
      }
      
      if (filters.resource) {
        auditQuery = query(auditQuery, where('resource', '==', filters.resource));
      }
      
      if (filters.resourceId) {
        auditQuery = query(auditQuery, where('resourceId', '==', filters.resourceId));
      }
      
      if (filters.action) {
        auditQuery = query(auditQuery, where('action', '==', filters.action));
      }
      
      if (filters.releaseId) {
        auditQuery = query(auditQuery, where('releaseId', '==', filters.releaseId));
      }
      
      // Always order by creation time, newest first
      auditQuery = query(auditQuery, orderBy('createdAt', 'desc'));
      
      // Apply limit
      if (filters.limit) {
        auditQuery = query(auditQuery, limit(filters.limit));
      }

      const snapshot = await getDocs(auditQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      logger.error('Failed to query audit logs', error, filters);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate, endDate) {
    try {
      const logs = await this.queryAuditLogs({
        limit: 10000 // Adjust based on needs
      });

      // Filter by date range (client-side for now)
      const filteredLogs = logs.filter(log => {
        const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
        return logDate >= startDate && logDate <= endDate;
      });

      // Generate summary statistics
      const summary = {
        totalEvents: filteredLogs.length,
        userActivity: this.summarizeUserActivity(filteredLogs),
        resourceActivity: this.summarizeResourceActivity(filteredLogs),
        securityEvents: filteredLogs.filter(log => log.resource === 'security').length,
        criticalEvents: filteredLogs.filter(log => log.severity === 'high').length,
        dateRange: { startDate, endDate }
      };

      return {
        summary,
        logs: filteredLogs
      };

    } catch (error) {
      logger.error('Failed to generate compliance report', error);
      throw error;
    }
  }

  // Helper methods
  
  calculateChanges(before, after) {
    const changes = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    
    for (const key of allKeys) {
      if (before[key] !== after[key]) {
        changes[key] = {
          before: before[key],
          after: after[key]
        };
      }
    }
    
    return changes;
  }
  
  calculateSeverity(action, resource) {
    // High severity events
    if (action === 'delete' || action.startsWith('bulk_delete')) return 'high';
    if (resource === 'security') return 'high';
    if (action === 'login_failed') return 'high';
    
    // Medium severity events
    if (action === 'create' || action === 'update') return 'medium';
    if (action.startsWith('bulk_')) return 'medium';
    
    // Low severity events
    return 'low';
  }
  
  extractReleaseId(resource, resourceId, metadata) {
    if (resource === 'release') return resourceId;
    if (metadata.releaseId) return metadata.releaseId;
    return null;
  }
  
  extractCustomerId(resource, resourceId, metadata) {
    if (resource === 'customer') return resourceId;
    if (metadata.customerId) return metadata.customerId;
    return null;
  }
  
  getSessionId() {
    // Generate or retrieve session ID for tracking user sessions
    let sessionId = sessionStorage.getItem('cbrt_session_id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('cbrt_session_id', sessionId);
    }
    return sessionId;
  }
  
  async getClientIP() {
    // In production, this could call an IP service
    // For now, return a placeholder
    return 'unknown';
  }
  
  summarizeUserActivity(logs) {
    const userStats = {};
    
    logs.forEach(log => {
      if (!userStats[log.userId]) {
        userStats[log.userId] = {
          email: log.userEmail,
          name: log.userName,
          role: log.userRole,
          actions: 0,
          lastActivity: null
        };
      }
      
      userStats[log.userId].actions++;
      
      const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      if (!userStats[log.userId].lastActivity || logDate > userStats[log.userId].lastActivity) {
        userStats[log.userId].lastActivity = logDate;
      }
    });
    
    return userStats;
  }
  
  summarizeResourceActivity(logs) {
    const resourceStats = {};
    
    logs.forEach(log => {
      if (!resourceStats[log.resource]) {
        resourceStats[log.resource] = {
          total: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          views: 0
        };
      }
      
      resourceStats[log.resource].total++;
      
      if (log.action === 'create') resourceStats[log.resource].creates++;
      else if (log.action === 'update') resourceStats[log.resource].updates++;
      else if (log.action === 'delete') resourceStats[log.resource].deletes++;
      else if (log.action === 'view') resourceStats[log.resource].views++;
    });
    
    return resourceStats;
  }
}

// Singleton instance
const auditService = new AuditService();

// Convenience functions for common audit operations
export const logReleaseCreated = (release, user) => 
  auditService.logReleaseEvent('create', release, user);

export const logReleaseUpdated = (release, user, previousData) => 
  auditService.logReleaseEvent('update', release, user, previousData);

export const logReleaseDeleted = (release, user) => 
  auditService.logReleaseEvent('delete', release, user);

export const logStatusChange = (release, user, fromStatus, toStatus) => 
  auditService.logReleaseEvent('status_change', release, user, null);

export const logUserLogin = (user, authMethod) => 
  auditService.logAuthEvent('login', user, { authMethod });

export const logUserLogout = (user) => 
  auditService.logAuthEvent('logout', user);

export const logSecurityViolation = (user, violation) => 
  auditService.logSecurityEvent('security_violation', user, { violation });

export const logBulkOperation = (action, resource, selectedIds, user) => 
  auditService.logBulkOperation(action, resource, selectedIds, user);

export { auditService };
export default auditService;