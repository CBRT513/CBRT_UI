# E2 Collaboration Workflows API Reference

## Overview

This document provides comprehensive API reference for the E2 Collaboration Workflows milestone. The API extends the existing CBRT UI + UMS Graph system with workflow automation, notifications, and conflict resolution capabilities.

## Base URL

```
https://api.cbrt-ui.com/v2
```

## Authentication

All API endpoints require authentication using the existing auth system:

```http
Authorization: Bearer <jwt_token>
```

## Workflow Engine API

### Workflow Chains

#### Create Workflow Chain

Creates a new workflow chain with specified steps and configuration.

```http
POST /api/workflows/chains
```

**Request Body:**
```json
{
  "name": "Purchase Order Approval",
  "description": "Multi-step approval process for purchase orders",
  "workspaceId": "ws_123456",
  "steps": [
    {
      "id": "step_1",
      "name": "Initial Review",
      "type": "approval",
      "mode": "sequential",
      "approvers": [
        {
          "type": "user",
          "value": "reviewer_123",
          "isOptional": false
        }
      ],
      "timeout": 300000,
      "escalation": {
        "timeoutMs": 600000,
        "escalateTo": [
          {
            "type": "role",
            "value": "senior_reviewer"
          }
        ],
        "autoApprove": false,
        "notifyOriginal": true
      },
      "autoApprove": {
        "field": "value",
        "operator": "less_than",
        "value": 1000,
        "confidence": 0.9
      },
      "actions": [
        {
          "type": "notify",
          "params": {
            "template": "approval_request"
          }
        }
      ],
      "nextSteps": ["step_2"]
    }
  ],
  "triggers": [
    {
      "type": "entity_create",
      "entityType": "purchase_order",
      "conditions": {
        "value": {
          "operator": "greater_than",
          "value": 500
        }
      }
    }
  ],
  "policies": [
    {
      "type": "approval_threshold",
      "params": {
        "maxValue": 100000,
        "requireSeniorApproval": true
      }
    }
  ]
}
```

**Response:**
```json
{
  "id": "wf_chain_789",
  "name": "Purchase Order Approval",
  "description": "Multi-step approval process for purchase orders",
  "workspaceId": "ws_123456",
  "createdBy": "user_123",
  "createdAt": "2025-08-21T10:00:00Z",
  "updatedAt": "2025-08-21T10:00:00Z",
  "status": "active",
  "steps": [...],
  "triggers": [...],
  "policies": [...]
}
```

#### List Workflow Chains

Retrieves workflow chains for the authenticated user's workspace.

```http
GET /api/workflows/chains?workspaceId=ws_123&status=active&page=1&limit=20
```

**Query Parameters:**
- `workspaceId` (optional): Filter by workspace
- `status` (optional): Filter by status (active, paused, archived)
- `createdBy` (optional): Filter by creator
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response:**
```json
{
  "chains": [
    {
      "id": "wf_chain_789",
      "name": "Purchase Order Approval",
      "description": "Multi-step approval process",
      "workspaceId": "ws_123456",
      "createdBy": "user_123",
      "createdAt": "2025-08-21T10:00:00Z",
      "status": "active",
      "stepCount": 3,
      "activeInstances": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "hasNext": false
  }
}
```

#### Get Workflow Chain

Retrieves detailed information about a specific workflow chain.

```http
GET /api/workflows/chains/{chainId}
```

**Response:**
```json
{
  "id": "wf_chain_789",
  "name": "Purchase Order Approval",
  "description": "Multi-step approval process for purchase orders",
  "workspaceId": "ws_123456",
  "createdBy": "user_123",
  "createdAt": "2025-08-21T10:00:00Z",
  "updatedAt": "2025-08-21T10:00:00Z",
  "status": "active",
  "steps": [...],
  "triggers": [...],
  "policies": [...],
  "metrics": {
    "totalInstances": 25,
    "activeInstances": 5,
    "completedInstances": 18,
    "averageCompletionTime": 3600000,
    "averageStepLatency": 450000
  }
}
```

#### Update Workflow Chain

Updates an existing workflow chain.

```http
PUT /api/workflows/chains/{chainId}
```

**Request Body:** Same as create workflow chain

**Response:** Updated workflow chain object

#### Delete Workflow Chain

Deletes a workflow chain. Only chains with no active instances can be deleted.

```http
DELETE /api/workflows/chains/{chainId}
```

**Response:**
```json
{
  "message": "Workflow chain deleted successfully",
  "deletedAt": "2025-08-21T10:30:00Z"
}
```

### Workflow Instances

#### Start Workflow Instance

Starts a new workflow instance for a specific entity.

```http
POST /api/workflows/instances
```

**Request Body:**
```json
{
  "chainId": "wf_chain_789",
  "entityId": "po_456",
  "entityType": "purchase_order",
  "metadata": {
    "value": 15000,
    "department": "IT",
    "urgency": "high",
    "requestedBy": "user_456",
    "description": "New laptops for development team"
  }
}
```

**Response:**
```json
{
  "id": "wf_instance_abc123",
  "chainId": "wf_chain_789",
  "entityId": "po_456",
  "entityType": "purchase_order",
  "startedAt": "2025-08-21T10:15:00Z",
  "status": "in_progress",
  "currentStep": "step_1",
  "metadata": {...},
  "history": [
    {
      "stepId": "step_1",
      "action": "started",
      "timestamp": "2025-08-21T10:15:00Z",
      "userId": "user_123"
    }
  ]
}
```

#### List Workflow Instances

Retrieves workflow instances with filtering options.

```http
GET /api/workflows/instances?status=in_progress&entityType=purchase_order&page=1&limit=20
```

**Query Parameters:**
- `chainId` (optional): Filter by workflow chain
- `status` (optional): Filter by status
- `entityType` (optional): Filter by entity type
- `entityId` (optional): Filter by specific entity
- `assignedTo` (optional): Filter by assigned user
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "instances": [
    {
      "id": "wf_instance_abc123",
      "chainId": "wf_chain_789",
      "entityId": "po_456",
      "entityType": "purchase_order",
      "startedAt": "2025-08-21T10:15:00Z",
      "status": "in_progress",
      "currentStep": "step_1",
      "currentStepName": "Initial Review",
      "assignedTo": ["reviewer_123"],
      "metadata": {
        "value": 15000,
        "urgency": "high"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "hasNext": false
  }
}
```

#### Get Workflow Instance

Retrieves detailed information about a specific workflow instance.

```http
GET /api/workflows/instances/{instanceId}
```

**Response:**
```json
{
  "id": "wf_instance_abc123",
  "chainId": "wf_chain_789",
  "entityId": "po_456",
  "entityType": "purchase_order",
  "startedAt": "2025-08-21T10:15:00Z",
  "completedAt": null,
  "status": "in_progress",
  "currentStep": "step_1",
  "metadata": {...},
  "history": [
    {
      "stepId": "step_1",
      "action": "started",
      "timestamp": "2025-08-21T10:15:00Z",
      "userId": "user_123"
    }
  ],
  "chain": {
    "name": "Purchase Order Approval",
    "steps": [...]
  }
}
```

#### Approve Workflow Step

Approves a step in a workflow instance.

```http
POST /api/workflows/instances/{instanceId}/approve
```

**Request Body:**
```json
{
  "stepId": "step_1",
  "comment": "Approved - all documentation looks good",
  "metadata": {
    "reviewedDocuments": true,
    "budgetVerified": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Step approved successfully",
  "nextStep": "step_2",
  "approvedAt": "2025-08-21T10:45:00Z"
}
```

#### Reject Workflow Step

Rejects a step in a workflow instance.

```http
POST /api/workflows/instances/{instanceId}/reject
```

**Request Body:**
```json
{
  "stepId": "step_1",
  "reason": "Insufficient documentation provided",
  "metadata": {
    "missingDocuments": ["budget_approval", "vendor_quotes"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Step rejected - workflow terminated",
  "rejectedAt": "2025-08-21T10:50:00Z"
}
```

#### Get Workflow Metrics

Retrieves performance metrics for workflows.

```http
GET /api/workflows/metrics?chainId=wf_chain_789&timeRange=7d
```

**Query Parameters:**
- `chainId` (optional): Specific workflow chain
- `timeRange` (optional): Time range (1h, 1d, 7d, 30d)
- `workspaceId` (optional): Filter by workspace

**Response:**
```json
{
  "timeRange": "7d",
  "metrics": {
    "totalInstances": 45,
    "completedInstances": 38,
    "activeInstances": 7,
    "averageCompletionTime": 3600000,
    "averageStepLatency": 450000,
    "timeoutRate": 0.02,
    "rejectionRate": 0.08,
    "throughput": 6.4
  },
  "stepMetrics": [
    {
      "stepId": "step_1",
      "name": "Initial Review",
      "averageTime": 300000,
      "approvalRate": 0.95,
      "timeoutRate": 0.02
    }
  ]
}
```

## Notification API

### Send Notification

Sends a notification to specified recipients.

```http
POST /api/notifications
```

**Request Body:**
```json
{
  "type": "workflow",
  "recipients": ["user_123", "user_456"],
  "subject": "Approval Required: Purchase Order #PO-2025-001",
  "body": "A purchase order requires your approval. Please review the details and approve or reject.",
  "priority": "high",
  "channels": ["email", "realtime"],
  "metadata": {
    "workflowInstanceId": "wf_instance_abc123",
    "entityId": "po_456",
    "actionUrl": "/workflows/instances/wf_instance_abc123"
  }
}
```

**Response:**
```json
{
  "id": "notif_xyz789",
  "type": "workflow",
  "recipients": ["user_123", "user_456"],
  "subject": "Approval Required: Purchase Order #PO-2025-001",
  "body": "A purchase order requires your approval...",
  "priority": "high",
  "channels": ["email", "realtime"],
  "status": "sent",
  "sentAt": "2025-08-21T11:00:00Z",
  "metadata": {...}
}
```

### Get User Notifications

Retrieves notifications for the authenticated user.

```http
GET /api/notifications?unread=true&type=workflow&page=1&limit=20
```

**Query Parameters:**
- `unread` (optional): Filter by read status
- `type` (optional): Filter by notification type
- `priority` (optional): Filter by priority
- `since` (optional): ISO timestamp for notifications since
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif_xyz789",
      "type": "workflow",
      "subject": "Approval Required: Purchase Order #PO-2025-001",
      "body": "A purchase order requires your approval...",
      "priority": "high",
      "sentAt": "2025-08-21T11:00:00Z",
      "read": false,
      "metadata": {
        "workflowInstanceId": "wf_instance_abc123",
        "entityId": "po_456",
        "actionUrl": "/workflows/instances/wf_instance_abc123"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "unreadCount": 3
  }
}
```

### Mark Notification as Read

Marks a notification as read.

```http
PUT /api/notifications/{notificationId}/read
```

**Response:**
```json
{
  "success": true,
  "readAt": "2025-08-21T11:30:00Z"
}
```

### Delete Notification

Deletes a notification.

```http
DELETE /api/notifications/{notificationId}
```

**Response:**
```json
{
  "success": true,
  "deletedAt": "2025-08-21T11:35:00Z"
}
```

### Get Notification Preferences

Retrieves user's notification preferences.

```http
GET /api/notifications/preferences
```

**Response:**
```json
{
  "userId": "user_123",
  "channels": {
    "email": {
      "enabled": true,
      "address": "user@example.com",
      "types": ["workflow", "approval_request"],
      "priority": "high"
    },
    "webhook": {
      "enabled": false,
      "address": "https://api.company.com/webhooks/notifications",
      "types": []
    },
    "realtime": {
      "enabled": true,
      "types": ["workflow", "conflict_detected", "system_alert"]
    },
    "sms": {
      "enabled": false,
      "address": "+1234567890",
      "types": ["urgent"]
    },
    "slack": {
      "enabled": true,
      "address": "#workflow-notifications",
      "types": ["workflow"]
    }
  },
  "digest": {
    "enabled": true,
    "frequency": "daily",
    "time": "09:00",
    "types": ["workflow", "system_alert"]
  },
  "muted": [
    {
      "type": "system_alert",
      "until": "2025-08-22T09:00:00Z",
      "reason": "On vacation"
    }
  ],
  "filters": [
    {
      "field": "priority",
      "operator": "equals",
      "value": "low",
      "action": "block"
    }
  ]
}
```

### Update Notification Preferences

Updates user's notification preferences.

```http
PUT /api/notifications/preferences
```

**Request Body:** Same as preferences response structure

**Response:** Updated preferences object

### Subscribe to Real-time Notifications

Establishes WebSocket connection for real-time notifications.

```http
GET /api/notifications/subscribe
Upgrade: websocket
Connection: Upgrade
```

**WebSocket Messages:**
```json
{
  "type": "notification",
  "data": {
    "id": "notif_xyz789",
    "type": "workflow",
    "subject": "Approval Required",
    "body": "A new request requires approval",
    "priority": "high",
    "metadata": {...}
  }
}
```

## Conflict Resolution API

### Analyze Conflict

Analyzes a conflict and provides resolution suggestions.

```http
POST /api/conflicts/analyze
```

**Request Body:**
```json
{
  "sessionId": "session_123",
  "field": "description",
  "type": "update",
  "baseValue": "Original product description",
  "ourChange": {
    "value": "Updated product description with new features",
    "timestamp": "2025-08-21T10:00:00Z",
    "userId": "user_123"
  },
  "theirChange": {
    "value": "Updated product description with better formatting",
    "timestamp": "2025-08-21T10:05:00Z",
    "userId": "user_456"
  },
  "userId": "user_123"
}
```

**Response:**
```json
{
  "conflictType": "semantic_difference",
  "severity": "medium",
  "semanticDifference": 0.65,
  "businessImpact": "Medium - affects product documentation",
  "suggestedStrategies": [
    {
      "id": "ai_semantic",
      "name": "AI Semantic Merge",
      "description": "Use AI to merge semantic changes",
      "confidence": 0.72,
      "preview": "Updated product description with new features and better formatting"
    },
    {
      "id": "latest_wins",
      "name": "Latest Timestamp Wins",
      "description": "Accept the most recent change",
      "confidence": 0.70,
      "preview": "Updated product description with better formatting"
    }
  ],
  "recommendation": "Suggest AI semantic merge with manual review"
}
```

### Auto-Resolve Conflict

Automatically resolves a conflict using AI.

```http
POST /api/conflicts/resolve
```

**Request Body:**
```json
{
  "sessionId": "session_123",
  "field": "description",
  "type": "update",
  "baseValue": "Original product description",
  "ourChange": {
    "value": "Updated product description with new features",
    "timestamp": "2025-08-21T10:00:00Z",
    "userId": "user_123"
  },
  "theirChange": {
    "value": "Updated product description with better formatting",
    "timestamp": "2025-08-21T10:05:00Z",
    "userId": "user_456"
  },
  "userId": "user_123",
  "preferredStrategy": "ai_semantic"
}
```

**Response:**
```json
{
  "success": true,
  "mergedValue": "Updated product description with new features and better formatting",
  "explanation": "Successfully merged both changes using semantic analysis",
  "confidence": 0.72,
  "requiresReview": false,
  "resolvedAt": "2025-08-21T11:00:00Z"
}
```

### Get Resolution Suggestions

Gets resolution suggestions for a conflict.

```http
POST /api/conflicts/suggestions
```

**Request Body:** Same as analyze conflict

**Response:**
```json
{
  "strategies": [
    {
      "id": "ai_semantic",
      "name": "AI Semantic Merge",
      "description": "Use AI to merge semantic changes",
      "confidence": 0.72,
      "preview": "Updated product description with new features and better formatting"
    },
    {
      "id": "latest_wins",
      "name": "Latest Timestamp Wins", 
      "description": "Accept the most recent change",
      "confidence": 0.70,
      "preview": "Updated product description with better formatting"
    },
    {
      "id": "merge_objects",
      "name": "Merge Objects",
      "description": "Merge non-conflicting properties",
      "confidence": 0.65,
      "preview": {...}
    }
  ],
  "analysis": {
    "conflictType": "semantic_difference",
    "severity": "medium",
    "semanticDifference": 0.65,
    "businessImpact": "Medium - affects product documentation",
    "recommendation": "Suggest AI semantic merge with manual review"
  }
}
```

### Provide Resolution Feedback

Provides feedback on a resolution to improve AI accuracy.

```http
POST /api/conflicts/feedback
```

**Request Body:**
```json
{
  "resolutionId": "res_abc123",
  "rating": 4,
  "wasHelpful": true,
  "preferredStrategy": "ai_semantic",
  "comment": "The AI merge worked well but could have preserved more of the original formatting"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback recorded successfully",
  "feedbackId": "feedback_def456"
}
```

### Get Resolution Metrics

Retrieves metrics about conflict resolution performance.

```http
GET /api/conflicts/metrics?timeRange=7d
```

**Response:**
```json
{
  "totalResolutions": 145,
  "successRate": 0.78,
  "averageConfidence": 0.71,
  "strategyUsage": {
    "ai_semantic": 65,
    "latest_wins": 45,
    "merge_objects": 25,
    "manual": 10
  },
  "feedbackScore": 4.2,
  "improvementTrend": 0.15
}
```

## Error Responses

All endpoints return standard HTTP status codes with detailed error messages:

### 400 Bad Request
```json
{
  "error": "INVALID_REQUEST",
  "message": "Missing required field: entityId",
  "details": {
    "field": "entityId",
    "expected": "string",
    "received": null
  }
}
```

### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "FORBIDDEN",
  "message": "Insufficient permissions to access this workflow",
  "details": {
    "required": "workflow.approve",
    "user": "user_123",
    "resource": "wf_instance_abc123"
  }
}
```

### 404 Not Found
```json
{
  "error": "NOT_FOUND",
  "message": "Workflow instance not found",
  "details": {
    "resource": "workflow_instance",
    "id": "wf_instance_invalid"
  }
}
```

### 409 Conflict
```json
{
  "error": "CONFLICT",
  "message": "Workflow step has already been approved",
  "details": {
    "stepId": "step_1",
    "currentStatus": "approved",
    "approvedBy": "user_456",
    "approvedAt": "2025-08-21T10:30:00Z"
  }
}
```

### 422 Unprocessable Entity
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Workflow validation failed",
  "details": {
    "violations": [
      "Chain exceeds maximum 20 steps",
      "Step 'step_5' has circular dependency"
    ]
  }
}
```

### 429 Too Many Requests
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "API rate limit exceeded",
  "details": {
    "limit": 100,
    "window": "60s",
    "remaining": 0,
    "resetAt": "2025-08-21T11:01:00Z"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "details": {
    "errorId": "err_xyz789",
    "timestamp": "2025-08-21T11:00:00Z"
  }
}
```

## Rate Limits

API endpoints have the following rate limits per user:

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Workflow Operations | 100 requests | 1 minute |
| Notifications | 500 requests | 1 minute |
| Conflict Resolution | 50 requests | 1 minute |
| Metrics & Reporting | 200 requests | 1 minute |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692614460
```

## Webhooks

Configure webhooks to receive real-time notifications about workflow events:

### Webhook Events

- `workflow.instance.started`
- `workflow.instance.completed`
- `workflow.step.approved`
- `workflow.step.rejected`
- `workflow.step.timeout`
- `workflow.step.escalated`
- `conflict.detected`
- `conflict.resolved`

### Webhook Payload Example

```json
{
  "event": "workflow.step.approved",
  "timestamp": "2025-08-21T11:00:00Z",
  "data": {
    "instanceId": "wf_instance_abc123",
    "chainId": "wf_chain_789",
    "stepId": "step_1",
    "approvedBy": "user_123",
    "comment": "Approved - all documentation verified",
    "nextStep": "step_2"
  },
  "signature": "sha256=a8b7c6d5e4f3..."
}
```

---

*API Reference v2.0 - E2 Collaboration Workflows*  
*Last updated: 2025-08-21*