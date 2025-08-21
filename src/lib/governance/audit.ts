/**
 * Append-only Audit Log Module
 */

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName?: string;
  workspaceId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure' | 'partial';
  errorMessage?: string;
}

export enum AuditAction {
  // Entity operations
  CREATE = 'entity.create',
  READ = 'entity.read',
  UPDATE = 'entity.update',
  DELETE = 'entity.delete',
  EXPORT = 'entity.export',
  
  // AI operations
  AI_EXTRACT = 'ai.extract',
  AI_APPROVE = 'ai.approve',
  AI_REJECT = 'ai.reject',
  AI_MODERATE = 'ai.moderate',
  
  // Workspace operations
  WORKSPACE_CREATE = 'workspace.create',
  WORKSPACE_UPDATE = 'workspace.update',
  WORKSPACE_DELETE = 'workspace.delete',
  WORKSPACE_INVITE = 'workspace.invite',
  WORKSPACE_JOIN = 'workspace.join',
  WORKSPACE_LEAVE = 'workspace.leave',
  
  // User operations
  USER_CREATE = 'user.create',
  USER_UPDATE = 'user.update',
  USER_DELETE = 'user.delete',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_ROLE_CHANGE = 'user.role.change',
  
  // Governance operations
  POLICY_CREATE = 'policy.create',
  POLICY_UPDATE = 'policy.update',
  POLICY_DELETE = 'policy.delete',
  POLICY_VIOLATION = 'policy.violation',
  
  // System operations
  SYSTEM_BACKUP = 'system.backup',
  SYSTEM_RESTORE = 'system.restore',
  SYSTEM_EXPORT = 'system.export',
  SYSTEM_CONFIG = 'system.config',
}

export interface AuditQuery {
  userId?: string;
  workspaceId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  result?: 'success' | 'failure' | 'partial';
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalEntries: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  byAction: Record<string, number>;
  byUser: Record<string, number>;
  byResult: {
    success: number;
    failure: number;
    partial: number;
  };
  topUsers: Array<{ userId: string; count: number }>;
  recentViolations: AuditEntry[];
}

/**
 * Audit service for immutable logging
 */
export class AuditService {
  private entries: AuditEntry[] = [];
  private readonly maxEntries = 1000000; // 1M entries before archiving
  private archives: string[] = [];

  /**
   * Log an audit entry
   */
  async log(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    options: Partial<AuditEntry> = {}
  ): Promise<AuditEntry> {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      action,
      entityType,
      entityId,
      result: 'success',
      ...options,
    };

    // Append to log (immutable)
    this.entries.push(Object.freeze(entry));

    // Check if we need to archive
    if (this.entries.length >= this.maxEntries) {
      await this.archiveOldEntries();
    }

    // Trigger real-time alerts for violations
    if (action === AuditAction.POLICY_VIOLATION) {
      await this.sendViolationAlert(entry);
    }

    return entry;
  }

  /**
   * Query audit log
   */
  async query(query: AuditQuery): Promise<AuditEntry[]> {
    let results = [...this.entries];

    // Apply filters
    if (query.userId) {
      results = results.filter(e => e.userId === query.userId);
    }

    if (query.workspaceId) {
      results = results.filter(e => e.workspaceId === query.workspaceId);
    }

    if (query.action) {
      results = results.filter(e => e.action === query.action);
    }

    if (query.entityType) {
      results = results.filter(e => e.entityType === query.entityType);
    }

    if (query.entityId) {
      results = results.filter(e => e.entityId === query.entityId);
    }

    if (query.startDate) {
      results = results.filter(e => e.timestamp >= query.startDate);
    }

    if (query.endDate) {
      results = results.filter(e => e.timestamp <= query.endDate);
    }

    if (query.result) {
      results = results.filter(e => e.result === query.result);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit summary
   */
  async getSummary(
    startDate?: Date,
    endDate?: Date,
    workspaceId?: string
  ): Promise<AuditSummary> {
    let entries = [...this.entries];

    // Filter by date range
    if (startDate) {
      entries = entries.filter(e => e.timestamp >= startDate);
    }
    if (endDate) {
      entries = entries.filter(e => e.timestamp <= endDate);
    }

    // Filter by workspace
    if (workspaceId) {
      entries = entries.filter(e => e.workspaceId === workspaceId);
    }

    // Calculate statistics
    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const byResult = {
      success: 0,
      failure: 0,
      partial: 0,
    };

    for (const entry of entries) {
      // Count by action
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;

      // Count by user
      byUser[entry.userId] = (byUser[entry.userId] || 0) + 1;

      // Count by result
      byResult[entry.result]++;
    }

    // Get top users
    const topUsers = Object.entries(byUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    // Get recent violations
    const recentViolations = entries
      .filter(e => e.action === AuditAction.POLICY_VIOLATION)
      .slice(0, 10);

    return {
      totalEntries: entries.length,
      timeRange: {
        start: entries[entries.length - 1]?.timestamp || new Date(),
        end: entries[0]?.timestamp || new Date(),
      },
      byAction,
      byUser,
      byResult,
      topUsers,
      recentViolations,
    };
  }

  /**
   * Export audit log
   */
  async export(
    format: 'json' | 'csv',
    query?: AuditQuery
  ): Promise<string> {
    const entries = query ? await this.query(query) : this.entries;

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'Action',
      'Entity Type',
      'Entity ID',
      'Result',
      'Error Message',
    ];

    const rows = entries.map(e => [
      e.id,
      e.timestamp.toISOString(),
      e.userId,
      e.action,
      e.entityType,
      e.entityId,
      e.result,
      e.errorMessage || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Archive old entries
   */
  private async archiveOldEntries(): Promise<void> {
    // Take first 80% of entries for archiving
    const archiveCount = Math.floor(this.entries.length * 0.8);
    const toArchive = this.entries.slice(0, archiveCount);

    // Create archive identifier
    const archiveId = `archive_${Date.now()}`;
    
    // In a real implementation, this would save to persistent storage
    this.archives.push(archiveId);

    // Remove archived entries from active log
    this.entries = this.entries.slice(archiveCount);

    console.log(`Archived ${archiveCount} entries to ${archiveId}`);
  }

  /**
   * Send violation alert
   */
  private async sendViolationAlert(entry: AuditEntry): Promise<void> {
    // In a real implementation, this would send notifications
    console.warn('Policy Violation Alert:', {
      userId: entry.userId,
      action: entry.action,
      entityId: entry.entityId,
      timestamp: entry.timestamp,
    });
  }

  /**
   * Get user activity timeline
   */
  async getUserActivity(
    userId: string,
    limit = 100
  ): Promise<AuditEntry[]> {
    return this.query({
      userId,
      limit,
    });
  }

  /**
   * Get entity history
   */
  async getEntityHistory(
    entityType: string,
    entityId: string
  ): Promise<AuditEntry[]> {
    return this.query({
      entityType,
      entityId,
    });
  }

  /**
   * Check for suspicious activity
   */
  async detectAnomalies(
    userId?: string,
    timeWindow = 3600000 // 1 hour
  ): Promise<{
    anomalies: Array<{
      type: string;
      description: string;
      entries: AuditEntry[];
    }>;
  }> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindow);

    const recentEntries = await this.query({
      userId,
      startDate: windowStart,
      endDate: now,
    });

    const anomalies: Array<{
      type: string;
      description: string;
      entries: AuditEntry[];
    }> = [];

    // Check for rapid operations
    const operationCounts: Record<string, number> = {};
    for (const entry of recentEntries) {
      const key = `${entry.userId}-${entry.action}`;
      operationCounts[key] = (operationCounts[key] || 0) + 1;
    }

    // Flag if more than 100 operations of same type in time window
    for (const [key, count] of Object.entries(operationCounts)) {
      if (count > 100) {
        const [userId, action] = key.split('-');
        anomalies.push({
          type: 'rapid_operations',
          description: `User ${userId} performed ${count} ${action} operations in ${timeWindow / 60000} minutes`,
          entries: recentEntries.filter(
            e => e.userId === userId && e.action === action
          ),
        });
      }
    }

    // Check for failed operations
    const failures = recentEntries.filter(e => e.result === 'failure');
    if (failures.length > 10) {
      anomalies.push({
        type: 'high_failure_rate',
        description: `${failures.length} failed operations in ${timeWindow / 60000} minutes`,
        entries: failures,
      });
    }

    return { anomalies };
  }
}

// Singleton instance
export const auditService = new AuditService();