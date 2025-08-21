/**
 * Optimistic Concurrency Control for Graph Updates
 */

export interface EditSession {
  id: string;
  userId: string;
  entityId: string;
  entityType: string;
  startedAt: Date;
  lastActivity: Date;
  version: number;
  changes: Change[];
}

export interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

export interface Conflict {
  id: string;
  entityId: string;
  sessions: EditSession[];
  conflictingFields: string[];
  detectedAt: Date;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: 'merge' | 'override' | 'manual';
  resolvedBy: string;
  resolvedAt: Date;
  finalValue: any;
}

export interface PresenceInfo {
  userId: string;
  userName: string;
  entityId: string;
  entityType: string;
  action: 'viewing' | 'editing';
  since: Date;
  cursorPosition?: number;
  selectedText?: string;
}

/**
 * Concurrency control service
 */
export class ConcurrencyService {
  private sessions: Map<string, EditSession> = new Map();
  private entityVersions: Map<string, number> = new Map();
  private conflicts: Map<string, Conflict> = new Map();
  private presence: Map<string, PresenceInfo[]> = new Map();
  private locks: Map<string, string> = new Map(); // entityId -> userId

  /**
   * Start an edit session
   */
  startEditSession(
    userId: string,
    entityId: string,
    entityType: string
  ): EditSession {
    // Check if entity is locked by another user
    const existingLock = this.locks.get(entityId);
    if (existingLock && existingLock !== userId) {
      throw new Error(`Entity ${entityId} is locked by another user`);
    }

    const session: EditSession = {
      id: `ses_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      entityId,
      entityType,
      startedAt: new Date(),
      lastActivity: new Date(),
      version: this.entityVersions.get(entityId) || 0,
      changes: [],
    };

    this.sessions.set(session.id, session);
    
    // Update presence
    this.updatePresence(userId, entityId, entityType, 'editing');

    return session;
  }

  /**
   * Record a change in the session
   */
  recordChange(
    sessionId: string,
    field: string,
    oldValue: any,
    newValue: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const change: Change = {
      field,
      oldValue,
      newValue,
      timestamp: new Date(),
    };

    session.changes.push(change);
    session.lastActivity = new Date();

    // Check for conflicts with other sessions
    this.checkForConflicts(session);
  }

  /**
   * Commit changes from a session
   */
  async commitSession(
    sessionId: string,
    finalData: any
  ): Promise<{ success: boolean; conflicts?: Conflict[] }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check version
    const currentVersion = this.entityVersions.get(session.entityId) || 0;
    
    if (currentVersion !== session.version) {
      // Version mismatch - potential conflict
      const conflicts = this.detectConflicts(session, currentVersion);
      
      if (conflicts.length > 0) {
        return {
          success: false,
          conflicts,
        };
      }
    }

    // No conflicts, commit changes
    this.entityVersions.set(session.entityId, currentVersion + 1);
    
    // Clear session
    this.sessions.delete(sessionId);
    
    // Update presence
    this.clearPresence(session.userId, session.entityId);

    return { success: true };
  }

  /**
   * Check for conflicts with other active sessions
   */
  private checkForConflicts(session: EditSession): void {
    const otherSessions = Array.from(this.sessions.values()).filter(
      s => s.entityId === session.entityId && s.id !== session.id
    );

    if (otherSessions.length === 0) return;

    // Find conflicting fields
    const conflictingFields = new Set<string>();
    
    for (const otherSession of otherSessions) {
      for (const change of session.changes) {
        const otherChange = otherSession.changes.find(c => c.field === change.field);
        if (otherChange && otherChange.newValue !== change.newValue) {
          conflictingFields.add(change.field);
        }
      }
    }

    if (conflictingFields.size > 0) {
      const conflict: Conflict = {
        id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entityId: session.entityId,
        sessions: [session, ...otherSessions],
        conflictingFields: Array.from(conflictingFields),
        detectedAt: new Date(),
      };

      this.conflicts.set(conflict.id, conflict);
    }
  }

  /**
   * Detect conflicts between session and current version
   */
  private detectConflicts(
    session: EditSession,
    currentVersion: number
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    // In a real implementation, we would compare with the actual current data
    // For now, we'll create a conflict if versions don't match
    if (session.version !== currentVersion) {
      const conflict: Conflict = {
        id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entityId: session.entityId,
        sessions: [session],
        conflictingFields: session.changes.map(c => c.field),
        detectedAt: new Date(),
      };

      conflicts.push(conflict);
      this.conflicts.set(conflict.id, conflict);
    }

    return conflicts;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    strategy: 'merge' | 'override' | 'manual',
    resolvedBy: string,
    finalValue?: any
  ): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const resolution: ConflictResolution = {
      strategy,
      resolvedBy,
      resolvedAt: new Date(),
      finalValue,
    };

    conflict.resolution = resolution;

    // Apply resolution based on strategy
    switch (strategy) {
      case 'merge':
        // Merge changes from all sessions
        await this.mergeChanges(conflict);
        break;
      
      case 'override':
        // Use the provided final value
        if (!finalValue) {
          throw new Error('Final value required for override strategy');
        }
        await this.applyOverride(conflict.entityId, finalValue);
        break;
      
      case 'manual':
        // Manual resolution - user provides the final value
        if (!finalValue) {
          throw new Error('Final value required for manual strategy');
        }
        await this.applyManualResolution(conflict.entityId, finalValue);
        break;
    }

    // Clear the conflict
    this.conflicts.delete(conflictId);
  }

  /**
   * Merge changes from conflicting sessions
   */
  private async mergeChanges(conflict: Conflict): Promise<void> {
    // Simple last-write-wins merge strategy
    const allChanges: Change[] = [];
    
    for (const session of conflict.sessions) {
      allChanges.push(...session.changes);
    }

    // Sort by timestamp
    allChanges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Apply changes in order
    const mergedData: Record<string, any> = {};
    for (const change of allChanges) {
      mergedData[change.field] = change.newValue;
    }

    // Update version
    const entityId = conflict.entityId;
    const currentVersion = this.entityVersions.get(entityId) || 0;
    this.entityVersions.set(entityId, currentVersion + 1);
  }

  /**
   * Apply override resolution
   */
  private async applyOverride(entityId: string, finalValue: any): Promise<void> {
    // Update version
    const currentVersion = this.entityVersions.get(entityId) || 0;
    this.entityVersions.set(entityId, currentVersion + 1);
  }

  /**
   * Apply manual resolution
   */
  private async applyManualResolution(
    entityId: string,
    finalValue: any
  ): Promise<void> {
    // Update version
    const currentVersion = this.entityVersions.get(entityId) || 0;
    this.entityVersions.set(entityId, currentVersion + 1);
  }

  /**
   * Update presence information
   */
  updatePresence(
    userId: string,
    entityId: string,
    entityType: string,
    action: 'viewing' | 'editing',
    userName?: string
  ): void {
    const presence: PresenceInfo = {
      userId,
      userName: userName || userId,
      entityId,
      entityType,
      action,
      since: new Date(),
    };

    const entityPresence = this.presence.get(entityId) || [];
    
    // Remove existing presence for this user
    const filtered = entityPresence.filter(p => p.userId !== userId);
    filtered.push(presence);
    
    this.presence.set(entityId, filtered);
  }

  /**
   * Clear presence for a user
   */
  clearPresence(userId: string, entityId: string): void {
    const entityPresence = this.presence.get(entityId) || [];
    const filtered = entityPresence.filter(p => p.userId !== userId);
    
    if (filtered.length > 0) {
      this.presence.set(entityId, filtered);
    } else {
      this.presence.delete(entityId);
    }
  }

  /**
   * Get presence information for an entity
   */
  getPresence(entityId: string): PresenceInfo[] {
    return this.presence.get(entityId) || [];
  }

  /**
   * Get all active conflicts
   */
  getActiveConflicts(): Conflict[] {
    return Array.from(this.conflicts.values()).filter(
      c => !c.resolution
    );
  }

  /**
   * Acquire a lock on an entity
   */
  acquireLock(entityId: string, userId: string): boolean {
    const existingLock = this.locks.get(entityId);
    
    if (existingLock && existingLock !== userId) {
      return false; // Already locked by another user
    }

    this.locks.set(entityId, userId);
    return true;
  }

  /**
   * Release a lock
   */
  releaseLock(entityId: string, userId: string): void {
    const existingLock = this.locks.get(entityId);
    
    if (existingLock === userId) {
      this.locks.delete(entityId);
    }
  }
}

// Singleton instance
export const concurrencyService = new ConcurrencyService();