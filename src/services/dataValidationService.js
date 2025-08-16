// Data Validation and Recovery Service
// Handles data corruption detection and automatic recovery
import { 
  doc, 
  updateDoc, 
  getDoc, 
  collection, 
  query, 
  where,
  getDocs,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { logger } from '../utils/logger';

class DataValidationService {
  constructor() {
    this.validationRules = new Map();
    this.initializeValidationRules();
  }

  // Initialize validation rules for each collection
  initializeValidationRules() {
    // Release validation rules
    this.validationRules.set('releases', {
      required: ['releaseNumber', 'status', 'supplierId', 'customerId'],
      types: {
        releaseNumber: 'string',
        status: 'string',
        supplierId: 'string',
        customerId: 'string',
        lineItems: 'array',
        quantity: 'number',
        createdAt: 'timestamp'
      },
      validValues: {
        status: ['Entered', 'Staged', 'Verified', 'Loaded', 'Shipped']
      },
      constraints: {
        quantity: { min: 0, max: 999999 },
        releaseNumber: { pattern: /^[A-Z0-9-]+$/ }
      }
    });
  }

  // Validate document data
  validateDocument(collectionName, data) {
    const rules = this.validationRules.get(collectionName);
    if (!rules) return { valid: true };

    const errors = [];
    const warnings = [];

    // Check required fields
    for (const field of rules.required) {
      if (!data[field] || data[field] === null || data[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check data types
    for (const [field, expectedType] of Object.entries(rules.types)) {
      if (data[field] !== undefined && data[field] !== null) {
        const actualType = this.getDataType(data[field]);
        if (actualType !== expectedType) {
          errors.push(`Invalid type for ${field}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }

    // Check valid values
    if (rules.validValues) {
      for (const [field, validValues] of Object.entries(rules.validValues)) {
        if (data[field] && !validValues.includes(data[field])) {
          errors.push(`Invalid value for ${field}: ${data[field]}. Must be one of: ${validValues.join(', ')}`);
        }
      }
    }

    // Check constraints
    if (rules.constraints) {
      for (const [field, constraints] of Object.entries(rules.constraints)) {
        if (data[field] !== undefined) {
          if (constraints.min !== undefined && data[field] < constraints.min) {
            errors.push(`${field} below minimum value: ${constraints.min}`);
          }
          if (constraints.max !== undefined && data[field] > constraints.max) {
            errors.push(`${field} exceeds maximum value: ${constraints.max}`);
          }
          if (constraints.pattern && !constraints.pattern.test(data[field])) {
            errors.push(`${field} doesn't match required pattern`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      canRecover: this.canAutoRecover(errors)
    };
  }

  // Determine data type
  getDataType(value) {
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date || value?.toDate) return 'timestamp';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    return 'object';
  }

  // Check if errors can be auto-recovered
  canAutoRecover(errors) {
    const recoverablePatterns = [
      'Missing required field',
      'Invalid type',
      'Invalid value',
      'below minimum',
      'exceeds maximum'
    ];

    return errors.every(error => 
      recoverablePatterns.some(pattern => error.includes(pattern))
    );
  }

  // Auto-recover corrupted data
  async recoverDocument(collectionName, docId, data) {
    try {
      const rules = this.validationRules.get(collectionName);
      if (!rules) return { success: false, error: 'No rules defined' };

      const recoveredData = { ...data };
      const fixes = [];

      // Fix required fields
      for (const field of rules.required) {
        if (!recoveredData[field]) {
          recoveredData[field] = this.getDefaultValue(field, rules.types[field]);
          fixes.push(`Set ${field} to default value`);
        }
      }

      // Fix data types
      for (const [field, expectedType] of Object.entries(rules.types)) {
        if (recoveredData[field] !== undefined) {
          const actualType = this.getDataType(recoveredData[field]);
          if (actualType !== expectedType) {
            recoveredData[field] = this.convertToType(recoveredData[field], expectedType);
            fixes.push(`Converted ${field} to ${expectedType}`);
          }
        }
      }

      // Fix invalid values
      if (rules.validValues) {
        for (const [field, validValues] of Object.entries(rules.validValues)) {
          if (recoveredData[field] && !validValues.includes(recoveredData[field])) {
            recoveredData[field] = validValues[0]; // Use first valid value as default
            fixes.push(`Reset ${field} to valid value: ${validValues[0]}`);
          }
        }
      }

      // Fix constraints
      if (rules.constraints) {
        for (const [field, constraints] of Object.entries(rules.constraints)) {
          if (recoveredData[field] !== undefined) {
            if (constraints.min !== undefined && recoveredData[field] < constraints.min) {
              recoveredData[field] = constraints.min;
              fixes.push(`Set ${field} to minimum value: ${constraints.min}`);
            }
            if (constraints.max !== undefined && recoveredData[field] > constraints.max) {
              recoveredData[field] = constraints.max;
              fixes.push(`Set ${field} to maximum value: ${constraints.max}`);
            }
          }
        }
      }

      // Add recovery metadata
      recoveredData.dataRecovered = true;
      recoveredData.recoveredAt = serverTimestamp();
      recoveredData.recoveryFixes = fixes;

      // Update document with recovered data
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, collectionName, docId);
        transaction.update(docRef, recoveredData);
      });

      await logger.info('Data corruption recovered', {
        collection: collectionName,
        docId,
        fixes: fixes.length,
        details: fixes
      });

      return {
        success: true,
        fixes,
        recoveredData
      };

    } catch (error) {
      await logger.error('Failed to recover document', error, {
        collection: collectionName,
        docId
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get default value for field type
  getDefaultValue(field, type) {
    const defaults = {
      releaseNumber: `RECOVERED-${Date.now()}`,
      status: 'Entered',
      supplierId: 'DEFAULT-SUPPLIER',
      customerId: 'DEFAULT-CUSTOMER',
      lineItems: [],
      quantity: 0
    };

    if (defaults[field]) return defaults[field];

    switch (type) {
      case 'string': return '';
      case 'number': return 0;
      case 'array': return [];
      case 'boolean': return false;
      case 'timestamp': return serverTimestamp();
      default: return null;
    }
  }

  // Convert value to specified type
  convertToType(value, targetType) {
    try {
      switch (targetType) {
        case 'string':
          return String(value);
        case 'number':
          const num = Number(value);
          return isNaN(num) ? 0 : num;
        case 'array':
          return Array.isArray(value) ? value : [value];
        case 'boolean':
          return Boolean(value);
        case 'timestamp':
          return value?.toDate ? value : serverTimestamp();
        default:
          return value;
      }
    } catch {
      return this.getDefaultValue('', targetType);
    }
  }

  // Scan collection for corrupted documents
  async scanCollection(collectionName, limit = 100) {
    try {
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      
      const issues = [];
      const recovered = [];
      let processed = 0;

      for (const doc of snapshot.docs) {
        if (processed >= limit) break;
        processed++;

        const data = doc.data();
        const validation = this.validateDocument(collectionName, data);

        if (!validation.valid) {
          issues.push({
            docId: doc.id,
            errors: validation.errors,
            canRecover: validation.canRecover
          });

          // Attempt auto-recovery if possible
          if (validation.canRecover) {
            const recovery = await this.recoverDocument(collectionName, doc.id, data);
            if (recovery.success) {
              recovered.push({
                docId: doc.id,
                fixes: recovery.fixes
              });
            }
          }
        }
      }

      return {
        scanned: processed,
        issues: issues.length,
        recovered: recovered.length,
        details: { issues, recovered }
      };

    } catch (error) {
      await logger.error('Collection scan failed', error, { collectionName });
      throw error;
    }
  }

  // Real-time validation hook
  async validateOnWrite(collectionName, data) {
    const validation = this.validateDocument(collectionName, data);
    
    if (!validation.valid && validation.canRecover) {
      // Auto-fix data before write
      const rules = this.validationRules.get(collectionName);
      const fixedData = { ...data };

      for (const field of rules.required) {
        if (!fixedData[field]) {
          fixedData[field] = this.getDefaultValue(field, rules.types[field]);
        }
      }

      return {
        valid: true,
        data: fixedData,
        autoFixed: true
      };
    }

    return {
      valid: validation.valid,
      data,
      errors: validation.errors
    };
  }
}

// Export singleton
export const dataValidationService = new DataValidationService();
export default dataValidationService;