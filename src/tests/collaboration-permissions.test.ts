import { describe, it, expect, beforeEach } from 'vitest';
import { userService } from '../lib/auth/users';
import { Role, Permission, hasPermission } from '../lib/auth/roles';
import { workspaceService } from '../lib/workspaces';

describe('Collaboration Permissions', () => {
  let adminId: string;
  let editorId: string;
  let viewerId: string;
  let workspaceId: string;

  beforeEach(async () => {
    // Create test users
    const admin = await userService.createUser('admin@test.com', 'Admin User', Role.ADMIN);
    const editor = await userService.createUser('editor@test.com', 'Editor User', Role.EDITOR);
    const viewer = await userService.createUser('viewer@test.com', 'Viewer User', Role.VIEWER);
    
    adminId = admin.id;
    editorId = editor.id;
    viewerId = viewer.id;

    // Create test workspace
    const workspace = await workspaceService.createWorkspace(
      'Test Workspace',
      adminId
    );
    workspaceId = workspace.id;

    // Add users to workspace
    await userService.addToWorkspace(editorId, workspaceId, Role.EDITOR);
    await userService.addToWorkspace(viewerId, workspaceId, Role.VIEWER);
  });

  describe('Role-based permissions', () => {
    it('should grant admin full permissions', () => {
      expect(hasPermission(Role.ADMIN, Permission.GRAPH_CREATE)).toBe(true);
      expect(hasPermission(Role.ADMIN, Permission.GRAPH_DELETE)).toBe(true);
      expect(hasPermission(Role.ADMIN, Permission.USER_ASSIGN_ROLE)).toBe(true);
      expect(hasPermission(Role.ADMIN, Permission.GOVERNANCE_SET_POLICY)).toBe(true);
    });

    it('should grant editor limited permissions', () => {
      expect(hasPermission(Role.EDITOR, Permission.GRAPH_CREATE)).toBe(true);
      expect(hasPermission(Role.EDITOR, Permission.GRAPH_UPDATE)).toBe(true);
      expect(hasPermission(Role.EDITOR, Permission.GRAPH_DELETE)).toBe(false);
      expect(hasPermission(Role.EDITOR, Permission.USER_ASSIGN_ROLE)).toBe(false);
    });

    it('should grant viewer read-only permissions', () => {
      expect(hasPermission(Role.VIEWER, Permission.GRAPH_READ)).toBe(true);
      expect(hasPermission(Role.VIEWER, Permission.GRAPH_CREATE)).toBe(false);
      expect(hasPermission(Role.VIEWER, Permission.GRAPH_UPDATE)).toBe(false);
      expect(hasPermission(Role.VIEWER, Permission.GRAPH_DELETE)).toBe(false);
    });
  });

  describe('Workspace permissions', () => {
    it('should allow admin to update workspace', async () => {
      const canUpdate = await userService.canUserPerform(
        adminId,
        Permission.WORKSPACE_UPDATE,
        workspaceId
      );
      expect(canUpdate).toBe(true);
    });

    it('should allow editor to read workspace data', async () => {
      const canRead = await userService.canUserPerform(
        editorId,
        Permission.GRAPH_READ,
        workspaceId
      );
      expect(canRead).toBe(true);
    });

    it('should prevent viewer from creating data', async () => {
      const canCreate = await userService.canUserPerform(
        viewerId,
        Permission.GRAPH_CREATE,
        workspaceId
      );
      expect(canCreate).toBe(false);
    });

    it('should enforce workspace isolation', async () => {
      // Create another workspace
      const workspace2 = await workspaceService.createWorkspace(
        'Workspace 2',
        adminId
      );

      // Editor not in workspace2 shouldn't have access
      const canAccess = await userService.canUserPerform(
        editorId,
        Permission.GRAPH_READ,
        workspace2.id
      );
      expect(canAccess).toBe(false);
    });
  });

  describe('Permission inheritance', () => {
    it('should inherit global role permissions in workspace', async () => {
      // Admin has global delete permission
      const canDelete = await userService.canUserPerform(
        adminId,
        Permission.GRAPH_DELETE,
        workspaceId
      );
      expect(canDelete).toBe(true);
    });

    it('should allow workspace-specific role override', async () => {
      // Give viewer editor role in specific workspace
      await userService.addToWorkspace(viewerId, workspaceId, Role.EDITOR);
      
      const canCreate = await userService.canUserPerform(
        viewerId,
        Permission.GRAPH_CREATE,
        workspaceId
      );
      expect(canCreate).toBe(true);
    });
  });

  describe('Cross-workspace permissions', () => {
    it('should allow cross-workspace links when enabled', async () => {
      const workspace2 = await workspaceService.createWorkspace(
        'Workspace 2',
        adminId,
        { allowCrossLinks: true }
      );

      // Update first workspace to allow cross-links
      await workspaceService.updateWorkspace(
        workspaceId,
        { settings: { allowCrossLinks: true } as any },
        adminId
      );

      // Add admin to both workspaces
      await userService.addToWorkspace(adminId, workspace2.id);

      const canLink = await workspaceService.canLinkWorkspaces(
        workspaceId,
        workspace2.id,
        adminId
      );
      expect(canLink).toBe(true);
    });

    it('should prevent cross-workspace links when disabled', async () => {
      const workspace2 = await workspaceService.createWorkspace(
        'Workspace 2',
        adminId,
        { allowCrossLinks: false }
      );

      const canLink = await workspaceService.canLinkWorkspaces(
        workspaceId,
        workspace2.id,
        adminId
      );
      expect(canLink).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should check permissions quickly', async () => {
      const startTime = Date.now();
      
      // Check 100 permissions
      for (let i = 0; i < 100; i++) {
        await userService.canUserPerform(
          editorId,
          Permission.GRAPH_READ,
          workspaceId
        );
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});