// Audit service for compliance and activity logging
import { collection, addDoc, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

class AuditService {
  constructor() {
    this.collectionName = 'auditLogs';
  }

  /**
   * Log an audit event
   * @param {Object} params - Event parameters
   * @param {string} params.action - Action performed (e.g., 'create', 'update', 'delete', 'bol_generated')
   * @param {string} params.resource - Resource type (e.g., 'release', 'customer', 'barcode')
   * @param {string} params.resourceId - ID of the resource
   * @param {Object} params.changes - Object describing what changed
   * @param {Object} params.metadata - Additional metadata
   * @param {Object} params.user - User who performed the action
   */
  async logEvent({ action, resource, resourceId, changes = {}, metadata = {}, user = null }) {
    try {
      const auditEntry = {
        action,
        resource,
        resourceId,
        changes,
        metadata,
        userId: user?.id || user?.uid || 'anonymous',
        userEmail: user?.email || 'anonymous@cbrt.local',
        userName: user?.displayName || user?.name || 'Anonymous User',
        timestamp: new Date(),
        severity: this.determineSeverity(action),
        ipAddress: metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || navigator?.userAgent || 'unknown'
      };

      const docRef = await addDoc(collection(db, this.collectionName), auditEntry);
      
      console.log(`Audit logged: ${action} on ${resource}/${resourceId}`, { id: docRef.id });
      
      return docRef.id;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw - audit failures shouldn't break the main operation
      return null;
    }
  }

  /**
   * Determine severity level based on action
   */
  determineSeverity(action) {
    const highSeverityActions = ['delete', 'void', 'cancel', 'bulk_delete'];
    const mediumSeverityActions = ['create', 'update', 'bulk_update', 'bol_generated', 'bulk_bol_generated'];
    const lowSeverityActions = ['view', 'export', 'search', 'filter'];

    if (highSeverityActions.includes(action)) return 'high';
    if (mediumSeverityActions.includes(action)) return 'medium';
    if (lowSeverityActions.includes(action)) return 'low';
    return 'info';
  }

  /**
   * Query audit logs
   * @param {Object} filters - Query filters
   * @param {string} filters.resource - Filter by resource type
   * @param {string} filters.action - Filter by action
   * @param {string} filters.userId - Filter by user ID
   * @param {Date} filters.startDate - Start date for time range
   * @param {Date} filters.endDate - End date for time range
   * @param {number} filters.limitCount - Maximum number of results
   */
  async queryLogs({ 
    resource = null, 
    action = null, 
    userId = null, 
    startDate = null, 
    endDate = null,
    limitCount = 100 
  } = {}) {
    try {
      let q = collection(db, this.collectionName);
      const constraints = [];

      if (resource) {
        constraints.push(where('resource', '==', resource));
      }
      if (action) {
        constraints.push(where('action', '==', action));
      }
      if (userId) {
        constraints.push(where('userId', '==', userId));
      }
      if (startDate) {
        constraints.push(where('timestamp', '>=', startDate));
      }
      if (endDate) {
        constraints.push(where('timestamp', '<=', endDate));
      }

      constraints.push(orderBy('timestamp', 'desc'));
      constraints.push(limit(limitCount));

      q = query(q, ...constraints);
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }

  /**
   * Get recent activity for a specific resource
   */
  async getResourceHistory(resourceType, resourceId, limitCount = 50) {
    return this.queryLogs({
      resource: resourceType,
      limitCount
    }).then(logs => logs.filter(log => log.resourceId === resourceId));
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId, limitCount = 50) {
    return this.queryLogs({
      userId,
      limitCount
    });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate, endDate) {
    const logs = await this.queryLogs({
      startDate,
      endDate,
      limitCount: 10000
    });

    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      totalEvents: logs.length,
      eventsByAction: {},
      eventsByResource: {},
      eventsBySeverity: {},
      userActivity: {},
      highSeverityEvents: []
    };

    logs.forEach(log => {
      // Count by action
      report.eventsByAction[log.action] = (report.eventsByAction[log.action] || 0) + 1;
      
      // Count by resource
      report.eventsByResource[log.resource] = (report.eventsByResource[log.resource] || 0) + 1;
      
      // Count by severity
      report.eventsBySeverity[log.severity] = (report.eventsBySeverity[log.severity] || 0) + 1;
      
      // Count by user
      report.userActivity[log.userName] = (report.userActivity[log.userName] || 0) + 1;
      
      // Collect high severity events
      if (log.severity === 'high') {
        report.highSeverityEvents.push(log);
      }
    });

    return report;
  }
}

// Export singleton instance
export const auditService = new AuditService();