/**
 * Role-Based Access Control (RBAC) System
 */

export enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  GUEST = 'guest',
}

export enum Permission {
  // Graph operations
  GRAPH_READ = 'graph:read',
  GRAPH_CREATE = 'graph:create',
  GRAPH_UPDATE = 'graph:update',
  GRAPH_DELETE = 'graph:delete',
  GRAPH_EXPORT = 'graph:export',
  
  // Workspace operations
  WORKSPACE_CREATE = 'workspace:create',
  WORKSPACE_READ = 'workspace:read',
  WORKSPACE_UPDATE = 'workspace:update',
  WORKSPACE_DELETE = 'workspace:delete',
  WORKSPACE_INVITE = 'workspace:invite',
  
  // AI operations
  AI_EXTRACT = 'ai:extract',
  AI_APPROVE = 'ai:approve',
  AI_MODERATE = 'ai:moderate',
  
  // Governance operations
  GOVERNANCE_VIEW_AUDIT = 'governance:view_audit',
  GOVERNANCE_EXPORT_AUDIT = 'governance:export_audit',
  GOVERNANCE_SET_POLICY = 'governance:set_policy',
  
  // User management
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ASSIGN_ROLE = 'user:assign_role',
}

// Permission matrix
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Full access to everything
    Permission.GRAPH_READ,
    Permission.GRAPH_CREATE,
    Permission.GRAPH_UPDATE,
    Permission.GRAPH_DELETE,
    Permission.GRAPH_EXPORT,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.WORKSPACE_INVITE,
    Permission.AI_EXTRACT,
    Permission.AI_APPROVE,
    Permission.AI_MODERATE,
    Permission.GOVERNANCE_VIEW_AUDIT,
    Permission.GOVERNANCE_EXPORT_AUDIT,
    Permission.GOVERNANCE_SET_POLICY,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_ASSIGN_ROLE,
  ],
  
  [Role.EDITOR]: [
    // Can edit content but not manage users/policies
    Permission.GRAPH_READ,
    Permission.GRAPH_CREATE,
    Permission.GRAPH_UPDATE,
    Permission.GRAPH_EXPORT,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_INVITE,
    Permission.AI_EXTRACT,
    Permission.AI_APPROVE,
    Permission.GOVERNANCE_VIEW_AUDIT,
  ],
  
  [Role.VIEWER]: [
    // Read-only access
    Permission.GRAPH_READ,
    Permission.WORKSPACE_READ,
    Permission.GOVERNANCE_VIEW_AUDIT,
  ],
  
  [Role.GUEST]: [
    // Minimal access
    Permission.GRAPH_READ,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check multiple permissions (ALL must be true)
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check multiple permissions (ANY can be true)
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Role hierarchy for comparison
 */
export const ROLE_HIERARCHY = {
  [Role.ADMIN]: 4,
  [Role.EDITOR]: 3,
  [Role.VIEWER]: 2,
  [Role.GUEST]: 1,
};

/**
 * Check if role1 is higher than role2
 */
export function isHigherRole(role1: Role, role2: Role): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get the highest role from a list
 */
export function getHighestRole(roles: Role[]): Role {
  return roles.reduce((highest, current) => 
    ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest,
    Role.GUEST
  );
}