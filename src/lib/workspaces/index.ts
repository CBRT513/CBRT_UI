import { User, userService } from '../auth/users';
import { Role, Permission, hasPermission } from '../auth/roles';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  settings: WorkspaceSettings;
  metadata?: Record<string, any>;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowCrossLinks: boolean;
  requireApproval: boolean;
  retentionDays?: number;
  defaultRole: Role;
  features: {
    aiExtraction: boolean;
    collaborativeEditing: boolean;
    auditLog: boolean;
  };
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  invitedBy: string;
  role: Role;
  createdAt: Date;
  expiresAt: Date;
  accepted: boolean;
}

/**
 * Workspace management service
 */
export class WorkspaceService {
  private workspaces: Map<string, Workspace> = new Map();
  private invites: Map<string, WorkspaceInvite[]> = new Map();
  private scopedData: Map<string, any[]> = new Map(); // workspace-scoped entities

  /**
   * Create a new workspace
   */
  async createWorkspace(
    name: string,
    ownerId: string,
    settings?: Partial<WorkspaceSettings>
  ): Promise<Workspace> {
    const workspace: Workspace = {
      id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        isPublic: false,
        allowCrossLinks: false,
        requireApproval: true,
        defaultRole: Role.VIEWER,
        features: {
          aiExtraction: true,
          collaborativeEditing: true,
          auditLog: true,
        },
        ...settings,
      },
    };

    this.workspaces.set(workspace.id, workspace);

    // Add owner to workspace
    await userService.addToWorkspace(ownerId, workspace.id, Role.ADMIN, 'system');

    return workspace;
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.workspaces.get(workspaceId) || null;
  }

  /**
   * Update workspace settings
   */
  async updateWorkspace(
    workspaceId: string,
    updates: Partial<Workspace>,
    userId: string
  ): Promise<Workspace> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Check permissions
    const canUpdate = await userService.canUserPerform(
      userId,
      Permission.WORKSPACE_UPDATE,
      workspaceId
    );

    if (!canUpdate) {
      throw new Error('Insufficient permissions to update workspace');
    }

    // Apply updates
    Object.assign(workspace, updates, {
      updatedAt: new Date(),
    });

    return workspace;
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    // Check if user is owner or admin
    if (workspace.ownerId !== userId) {
      const canDelete = await userService.canUserPerform(
        userId,
        Permission.WORKSPACE_DELETE,
        workspaceId
      );

      if (!canDelete) {
        throw new Error('Only workspace owner or admin can delete workspace');
      }
    }

    // Remove workspace
    this.workspaces.delete(workspaceId);
    this.scopedData.delete(workspaceId);
    this.invites.delete(workspaceId);
  }

  /**
   * Invite user to workspace
   */
  async inviteToWorkspace(
    workspaceId: string,
    invitedEmail: string,
    role: Role,
    invitedBy: string
  ): Promise<WorkspaceInvite> {
    // Check permissions
    const canInvite = await userService.canUserPerform(
      invitedBy,
      Permission.WORKSPACE_INVITE,
      workspaceId
    );

    if (!canInvite) {
      throw new Error('Insufficient permissions to invite users');
    }

    const invite: WorkspaceInvite = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workspaceId,
      invitedEmail,
      invitedBy,
      role,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      accepted: false,
    };

    const workspaceInvites = this.invites.get(workspaceId) || [];
    workspaceInvites.push(invite);
    this.invites.set(workspaceId, workspaceInvites);

    return invite;
  }

  /**
   * Accept workspace invite
   */
  async acceptInvite(inviteId: string, userId: string): Promise<void> {
    let targetInvite: WorkspaceInvite | null = null;
    let workspaceId: string | null = null;

    // Find the invite
    for (const [wsId, invites] of this.invites.entries()) {
      const invite = invites.find(i => i.id === inviteId);
      if (invite) {
        targetInvite = invite;
        workspaceId = wsId;
        break;
      }
    }

    if (!targetInvite || !workspaceId) {
      throw new Error('Invite not found or expired');
    }

    if (targetInvite.expiresAt < new Date()) {
      throw new Error('Invite has expired');
    }

    // Add user to workspace
    await userService.addToWorkspace(
      userId,
      workspaceId,
      targetInvite.role,
      targetInvite.invitedBy
    );

    // Mark invite as accepted
    targetInvite.accepted = true;
  }

  /**
   * Get user's workspaces
   */
  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const user = await userService.getUser(userId);
    if (!user) return [];

    const workspaces: Workspace[] = [];
    for (const workspaceId of user.workspaces) {
      const workspace = await this.getWorkspace(workspaceId);
      if (workspace) {
        workspaces.push(workspace);
      }
    }

    return workspaces;
  }

  /**
   * Scope data to workspace
   */
  async addScopedData(
    workspaceId: string,
    data: any,
    userId: string
  ): Promise<void> {
    // Check permissions
    const canCreate = await userService.canUserPerform(
      userId,
      Permission.GRAPH_CREATE,
      workspaceId
    );

    if (!canCreate) {
      throw new Error('Insufficient permissions to add data');
    }

    const scopedData = this.scopedData.get(workspaceId) || [];
    scopedData.push({
      ...data,
      workspaceId,
      createdBy: userId,
      createdAt: new Date(),
    });
    this.scopedData.set(workspaceId, scopedData);
  }

  /**
   * Get workspace-scoped data
   */
  async getScopedData(
    workspaceId: string,
    userId: string
  ): Promise<any[]> {
    // Check permissions
    const canRead = await userService.canUserPerform(
      userId,
      Permission.GRAPH_READ,
      workspaceId
    );

    if (!canRead) {
      throw new Error('Insufficient permissions to read data');
    }

    return this.scopedData.get(workspaceId) || [];
  }

  /**
   * Check cross-workspace link permission
   */
  async canLinkWorkspaces(
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    userId: string
  ): Promise<boolean> {
    const sourceWorkspace = await this.getWorkspace(sourceWorkspaceId);
    const targetWorkspace = await this.getWorkspace(targetWorkspaceId);

    if (!sourceWorkspace || !targetWorkspace) {
      return false;
    }

    // Check if both workspaces allow cross-links
    if (!sourceWorkspace.settings.allowCrossLinks || 
        !targetWorkspace.settings.allowCrossLinks) {
      return false;
    }

    // Check if user has permissions in both workspaces
    const canReadSource = await userService.canUserPerform(
      userId,
      Permission.GRAPH_READ,
      sourceWorkspaceId
    );

    const canReadTarget = await userService.canUserPerform(
      userId,
      Permission.GRAPH_READ,
      targetWorkspaceId
    );

    return canReadSource && canReadTarget;
  }
}

// Singleton instance
export const workspaceService = new WorkspaceService();