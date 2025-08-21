import { Role, hasPermission, Permission } from './roles';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  workspaces: string[];
  activeWorkspace?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActive?: Date;
  metadata?: Record<string, any>;
}

export interface WorkspaceMembership {
  userId: string;
  workspaceId: string;
  role: Role;
  joinedAt: Date;
  invitedBy?: string;
  permissions?: Permission[];
}

export interface UserSession {
  user: User;
  token: string;
  expiresAt: Date;
  workspace?: string;
  permissions: Permission[];
}

/**
 * User management service
 */
export class UserService {
  private users: Map<string, User> = new Map();
  private memberships: Map<string, WorkspaceMembership[]> = new Map();
  private sessions: Map<string, UserSession> = new Map();

  /**
   * Create a new user
   */
  async createUser(
    email: string,
    displayName: string,
    role: Role = Role.VIEWER
  ): Promise<User> {
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      displayName,
      role,
      workspaces: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  /**
   * Update user role
   */
  async updateUserRole(
    userId: string,
    newRole: Role,
    updatedBy: string
  ): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    user.role = newRole;
    user.updatedAt = new Date();
    
    // Audit log would go here
    this.auditLog({
      action: 'user.role.update',
      userId,
      updatedBy,
      oldRole: user.role,
      newRole,
      timestamp: new Date(),
    });

    return user;
  }

  /**
   * Add user to workspace
   */
  async addToWorkspace(
    userId: string,
    workspaceId: string,
    role?: Role,
    invitedBy?: string
  ): Promise<WorkspaceMembership> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const membership: WorkspaceMembership = {
      userId,
      workspaceId,
      role: role || user.role,
      joinedAt: new Date(),
      invitedBy,
    };

    // Add to user's workspace list
    if (!user.workspaces.includes(workspaceId)) {
      user.workspaces.push(workspaceId);
      user.updatedAt = new Date();
    }

    // Store membership
    const workspaceMemberships = this.memberships.get(workspaceId) || [];
    workspaceMemberships.push(membership);
    this.memberships.set(workspaceId, workspaceMemberships);

    return membership;
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMembership[]> {
    return this.memberships.get(workspaceId) || [];
  }

  /**
   * Check if user can perform action
   */
  async canUserPerform(
    userId: string,
    permission: Permission,
    workspaceId?: string
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    // Check global role permissions
    if (hasPermission(user.role, permission)) {
      return true;
    }

    // Check workspace-specific permissions
    if (workspaceId) {
      const memberships = await this.getWorkspaceMembers(workspaceId);
      const membership = memberships.find(m => m.userId === userId);
      
      if (membership) {
        // Check workspace role
        if (hasPermission(membership.role, permission)) {
          return true;
        }
        
        // Check custom permissions
        if (membership.permissions?.includes(permission)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Create user session
   */
  async createSession(
    user: User,
    token: string,
    workspace?: string
  ): Promise<UserSession> {
    const session: UserSession = {
      user,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      workspace,
      permissions: this.getUserPermissions(user, workspace),
    };

    this.sessions.set(token, session);
    
    // Update last active
    user.lastActive = new Date();
    
    return session;
  }

  /**
   * Validate session
   */
  async validateSession(token: string): Promise<UserSession | null> {
    const session = this.sessions.get(token);
    
    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }

    // Update last active
    session.user.lastActive = new Date();
    
    return session;
  }

  /**
   * Get user's effective permissions
   */
  private getUserPermissions(user: User, workspaceId?: string): Permission[] {
    const permissions = new Set<Permission>();

    // Add global role permissions
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    rolePerms.forEach(p => permissions.add(p));

    // Add workspace-specific permissions
    if (workspaceId) {
      const memberships = this.memberships.get(workspaceId) || [];
      const membership = memberships.find(m => m.userId === user.id);
      
      if (membership) {
        // Add workspace role permissions
        const workspaceRolePerms = ROLE_PERMISSIONS[membership.role] || [];
        workspaceRolePerms.forEach(p => permissions.add(p));
        
        // Add custom permissions
        membership.permissions?.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  /**
   * Audit log (placeholder)
   */
  private auditLog(entry: any): void {
    // This would integrate with the audit service
    console.log('[AUDIT]', entry);
  }
}

// Import role permissions for use
import { ROLE_PERMISSIONS } from './roles';

// Singleton instance
export const userService = new UserService();