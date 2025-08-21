# F Integration Layer API Reference

## Overview

This document provides comprehensive API documentation for the Milestone F Integration Layer. All APIs follow RESTful conventions with JSON request/response bodies and standard HTTP status codes.

## Base URL

```
Production: https://api.cbrt-ui.com/v1/integration
Development: http://localhost:3000/api/integration
```

## Authentication

All API endpoints require authentication using Bearer tokens:

```http
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### Authenticate User
```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "secure_password",
  "mfa_token": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-08-21T12:00:00Z",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "permissions": ["integration:read", "integration:create"]
  }
}
```

#### API Key Authentication
```http
POST /auth/api-key
```

**Request Body:**
```json
{
  "apiKey": "integration_key_abc123",
  "workspaceId": "ws_456"
}
```

## Core Integration APIs

### Integrations

#### List Integrations
```http
GET /integrations
```

**Query Parameters:**
- `workspaceId` (string): Filter by workspace
- `status` (string): Filter by status (active, inactive, error, pending)
- `connectorType` (string): Filter by connector type
- `search` (string): Search in name and description
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 20, max: 100)
- `sortBy` (string): Sort field (createdAt, updatedAt, name)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "int_abc123",
      "name": "Salesforce CRM",
      "description": "Customer relationship management integration",
      "connectorType": "rest",
      "connectorVersion": "1.0.0",
      "status": "active",
      "workspaceId": "ws_456",
      "createdBy": "user_123",
      "createdAt": "2025-08-21T10:00:00Z",
      "updatedAt": "2025-08-21T10:30:00Z",
      "config": {
        "baseUrl": "https://api.salesforce.com",
        "timeout": 30000,
        "retryPolicy": {
          "maxRetries": 3,
          "backoffMs": 1000,
          "backoffMultiplier": 2
        }
      },
      "credentials": ["cred_def456"],
      "lastTestResult": {
        "status": "passed",
        "timestamp": "2025-08-21T09:00:00Z",
        "responseTime": 245
      },
      "metrics": {
        "totalRequests": 1547,
        "successfulRequests": 1532,
        "averageResponseTime": 287,
        "errorRate": 0.0097,
        "uptime": 0.995
      },
      "tags": ["crm", "sales", "production"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### Get Integration
```http
GET /integrations/{integrationId}
```

**Response:**
```json
{
  "id": "int_abc123",
  "name": "Salesforce CRM",
  "description": "Customer relationship management integration",
  "connectorType": "rest",
  "connectorVersion": "1.0.0",
  "status": "active",
  "workspaceId": "ws_456",
  "createdBy": "user_123",
  "createdAt": "2025-08-21T10:00:00Z",
  "updatedAt": "2025-08-21T10:30:00Z",
  "config": {
    "baseUrl": "https://api.salesforce.com",
    "timeout": 30000,
    "headers": {
      "User-Agent": "CBRT-Integration/1.0"
    },
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMs": 1000,
      "backoffMultiplier": 2
    }
  },
  "credentials": ["cred_def456"],
  "testResults": [
    {
      "id": "test_789",
      "testType": "connection",
      "status": "passed",
      "timestamp": "2025-08-21T09:00:00Z",
      "duration": 245,
      "results": [
        {
          "test": "connectivity",
          "status": "passed",
          "duration": 120,
          "message": "Successfully connected to endpoint"
        },
        {
          "test": "authentication",
          "status": "passed", 
          "duration": 125,
          "message": "Authentication successful"
        }
      ]
    }
  ],
  "metrics": {
    "totalRequests": 1547,
    "successfulRequests": 1532,
    "failedRequests": 15,
    "averageResponseTime": 287,
    "lastResponseTime": 312,
    "errorRate": 0.0097,
    "throughput": 25.3,
    "uptime": 0.995,
    "lastUpdated": "2025-08-21T11:45:00Z"
  }
}
```

#### Create Integration
```http
POST /integrations
```

**Request Body:**
```json
{
  "name": "HubSpot Marketing",
  "description": "Marketing automation platform integration",
  "connectorType": "rest",
  "connectorVersion": "1.0.0",
  "workspaceId": "ws_456",
  "config": {
    "baseUrl": "https://api.hubapi.com",
    "timeout": 30000,
    "headers": {
      "User-Agent": "CBRT-Integration/1.0"
    },
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMs": 1000,
      "backoffMultiplier": 2
    }
  },
  "tags": ["marketing", "automation"]
}
```

**Response:**
```json
{
  "id": "int_xyz789",
  "name": "HubSpot Marketing",
  "description": "Marketing automation platform integration",
  "connectorType": "rest",
  "connectorVersion": "1.0.0",
  "status": "pending",
  "workspaceId": "ws_456",
  "createdBy": "user_123",
  "createdAt": "2025-08-21T12:00:00Z",
  "updatedAt": "2025-08-21T12:00:00Z",
  "config": {
    "baseUrl": "https://api.hubapi.com",
    "timeout": 30000,
    "headers": {
      "User-Agent": "CBRT-Integration/1.0"
    },
    "retryPolicy": {
      "maxRetries": 3,
      "backoffMs": 1000,
      "backoffMultiplier": 2
    }
  },
  "credentials": [],
  "tags": ["marketing", "automation"]
}
```

#### Update Integration
```http
PUT /integrations/{integrationId}
```

**Request Body:**
```json
{
  "description": "Updated marketing platform integration",
  "config": {
    "timeout": 45000,
    "retryPolicy": {
      "maxRetries": 5
    }
  },
  "tags": ["marketing", "automation", "updated"]
}
```

#### Delete Integration
```http
DELETE /integrations/{integrationId}
```

**Response:**
```json
{
  "success": true,
  "message": "Integration deleted successfully",
  "deletedAt": "2025-08-21T12:30:00Z"
}
```

#### Test Integration Connection
```http
POST /integrations/{integrationId}/test
```

**Request Body (Optional):**
```json
{
  "testType": "connection",
  "config": {
    "timeout": 10000
  }
}
```

**Response:**
```json
{
  "success": true,
  "testType": "connection",
  "duration": 287,
  "results": [
    {
      "test": "connectivity",
      "status": "passed",
      "duration": 145,
      "message": "Successfully connected to https://api.hubapi.com"
    },
    {
      "test": "authentication", 
      "status": "passed",
      "duration": 142,
      "message": "API key authentication successful"
    }
  ],
  "timestamp": "2025-08-21T12:45:00Z"
}
```

#### Execute Integration Request
```http
POST /integrations/{integrationId}/execute
```

**Request Body:**
```json
{
  "method": "GET",
  "path": "/contacts",
  "headers": {
    "Accept": "application/json"
  },
  "query": {
    "limit": 100,
    "properties": "email,firstname,lastname"
  },
  "timeout": 30000
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "headers": {
    "content-type": "application/json",
    "x-ratelimit-remaining": "99"
  },
  "data": {
    "contacts": [
      {
        "id": "contact_123",
        "email": "john@example.com",
        "firstname": "John",
        "lastname": "Doe"
      }
    ],
    "total": 1
  },
  "responseTime": 342,
  "timestamp": "2025-08-21T13:00:00Z"
}
```

### Credentials

#### List Credentials
```http
GET /credentials
```

**Query Parameters:**
- `integrationId` (string): Filter by integration
- `type` (string): Filter by credential type
- `status` (string): Filter by status
- `expiringBefore` (string): ISO date for expiring credentials

**Response:**
```json
{
  "data": [
    {
      "id": "cred_abc123",
      "name": "Salesforce OAuth Token",
      "type": "oauth2",
      "integrationId": "int_def456",
      "status": "active",
      "createdAt": "2025-08-21T10:00:00Z",
      "updatedAt": "2025-08-21T11:00:00Z",
      "expiresAt": "2025-08-22T10:00:00Z",
      "metadata": {
        "environment": "production",
        "scopes": ["read", "write"],
        "autoRotate": true
      },
      "rotationPolicy": {
        "enabled": true,
        "intervalDays": 30,
        "warningDays": 7
      },
      "lastUsed": "2025-08-21T11:30:00Z",
      "usageCount": 1547
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Create Credential
```http
POST /credentials
```

**Request Body:**
```json
{
  "name": "HubSpot API Key",
  "type": "api_key",
  "integrationId": "int_xyz789",
  "credentialData": {
    "apiKey": "hub_api_key_secret_123",
    "keyType": "private"
  },
  "metadata": {
    "environment": "production",
    "scopes": ["read", "write"],
    "autoRotate": false
  },
  "rotationPolicy": {
    "enabled": false,
    "intervalDays": 90,
    "warningDays": 14
  }
}
```

**Response:**
```json
{
  "id": "cred_new456",
  "name": "HubSpot API Key",
  "type": "api_key",
  "integrationId": "int_xyz789",
  "status": "active",
  "createdAt": "2025-08-21T12:00:00Z",
  "updatedAt": "2025-08-21T12:00:00Z",
  "metadata": {
    "environment": "production",
    "scopes": ["read", "write"],
    "autoRotate": false
  },
  "rotationPolicy": {
    "enabled": false,
    "intervalDays": 90,
    "warningDays": 14
  },
  "usageCount": 0
}
```

#### Rotate Credential
```http
POST /credentials/{credentialId}/rotate
```

**Request Body:**
```json
{
  "newCredentialData": {
    "apiKey": "hub_api_key_rotated_456",
    "keyType": "private"
  },
  "retireOldCredential": true,
  "gracePeriodMs": 300000
}
```

### Jobs

#### List Jobs
```http
GET /jobs
```

**Query Parameters:**
- `integrationId` (string): Filter by integration
- `status` (string): Filter by status
- `type` (string): Filter by job type
- `priority` (string): Filter by priority

**Response:**
```json
{
  "data": [
    {
      "id": "job_abc123",
      "name": "Daily Contact Sync",
      "type": "sync",
      "integrationId": "int_def456",
      "status": "completed",
      "priority": "normal",
      "createdBy": "user_123",
      "createdAt": "2025-08-21T08:00:00Z",
      "startedAt": "2025-08-21T08:00:05Z",
      "completedAt": "2025-08-21T08:15:32Z",
      "config": {
        "source": {
          "integrationId": "int_def456",
          "query": {
            "modifiedSince": "2025-08-20T08:00:00Z"
          }
        },
        "target": {
          "integrationId": "int_xyz789",
          "operation": "upsert",
          "batchSize": 100
        }
      },
      "result": {
        "recordsProcessed": 1247,
        "recordsSuccessful": 1235,
        "recordsSkipped": 7,
        "recordsFailed": 5,
        "executionTimeMs": 927000,
        "errors": [
          {
            "code": "VALIDATION_ERROR",
            "message": "Invalid email format",
            "field": "email",
            "record": {"id": "contact_456"}
          }
        ]
      }
    }
  ]
}
```

#### Create Job
```http
POST /jobs
```

**Request Body:**
```json
{
  "name": "Weekly Report Export",
  "type": "export",
  "integrationId": "int_def456",
  "priority": "normal",
  "scheduledAt": "2025-08-28T08:00:00Z",
  "config": {
    "source": {
      "integrationId": "int_def456",
      "query": {
        "dateRange": {
          "start": "2025-08-21T00:00:00Z",
          "end": "2025-08-27T23:59:59Z"
        }
      }
    },
    "target": {
      "format": "csv",
      "destination": "s3://reports-bucket/weekly/"
    },
    "schedule": {
      "type": "recurring",
      "cronExpression": "0 8 * * 1",
      "timezone": "America/New_York"
    }
  }
}
```

## Monitoring & Health APIs

### Health Checks

#### System Health
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-21T13:00:00Z",
  "uptime": 345600,
  "version": "1.0.0",
  "checks": [
    {
      "name": "Database",
      "status": "healthy",
      "responseTime": 12,
      "lastChecked": "2025-08-21T12:59:45Z"
    },
    {
      "name": "Redis Cache",
      "status": "healthy", 
      "responseTime": 3,
      "lastChecked": "2025-08-21T12:59:45Z"
    }
  ],
  "dependencies": [
    {
      "name": "External API",
      "status": "healthy",
      "latency": 287,
      "lastChecked": "2025-08-21T12:59:30Z"
    }
  ]
}
```

#### Integration Health
```http
GET /integrations/{integrationId}/health
```

**Response:**
```json
{
  "integrationId": "int_abc123",
  "status": "healthy",
  "lastChecked": "2025-08-21T13:00:00Z",
  "checks": [
    {
      "name": "Connectivity",
      "status": "healthy",
      "responseTime": 245,
      "lastChecked": "2025-08-21T12:59:45Z",
      "metadata": {
        "endpoint": "https://api.salesforce.com/services/data/v52.0/"
      }
    },
    {
      "name": "Authentication",
      "status": "healthy",
      "responseTime": 156,
      "lastChecked": "2025-08-21T12:59:45Z"
    }
  ],
  "metrics": {
    "averageResponseTime": 287,
    "successRate": 0.997,
    "throughput": 25.3,
    "errorRate": 0.003
  }
}
```

### Metrics

#### System Metrics
```http
GET /metrics
```

**Query Parameters:**
- `timeRange` (string): Time range (1h, 6h, 24h, 7d, 30d)
- `format` (string): Response format (json, prometheus)

**Response:**
```json
{
  "timeRange": "1h",
  "timestamp": "2025-08-21T13:00:00Z",
  "system": {
    "totalRequests": 15472,
    "successfulRequests": 15398,
    "failedRequests": 74,
    "averageResponseTime": 287,
    "throughput": 4.3,
    "errorRate": 0.0048,
    "p50ResponseTime": 245,
    "p95ResponseTime": 567,
    "p99ResponseTime": 1234
  },
  "integrations": {
    "total": 12,
    "active": 11,
    "inactive": 1,
    "error": 0
  },
  "credentials": {
    "total": 34,
    "active": 32,
    "expired": 1,
    "expiringSoon": 1
  },
  "jobs": {
    "total": 156,
    "completed": 142,
    "running": 3,
    "failed": 11
  }
}
```

#### Integration Metrics
```http
GET /integrations/{integrationId}/metrics
```

**Query Parameters:**
- `timeRange` (string): Time range for metrics
- `granularity` (string): Data granularity (minute, hour, day)

**Response:**
```json
{
  "integrationId": "int_abc123",
  "timeRange": "24h",
  "granularity": "hour",
  "metrics": {
    "totalRequests": 1547,
    "successfulRequests": 1532,
    "failedRequests": 15,
    "averageResponseTime": 287,
    "throughput": 0.42,
    "errorRate": 0.0097,
    "uptime": 0.995
  },
  "timeSeries": [
    {
      "timestamp": "2025-08-21T12:00:00Z",
      "requests": 67,
      "successes": 66,
      "failures": 1,
      "avgResponseTime": 294,
      "throughput": 1.11
    }
  ],
  "errors": [
    {
      "code": "TIMEOUT",
      "count": 8,
      "percentage": 53.3
    },
    {
      "code": "AUTH_FAILURE", 
      "count": 4,
      "percentage": 26.7
    },
    {
      "code": "RATE_LIMIT",
      "count": 3,
      "percentage": 20.0
    }
  ]
}
```

## Policy & Governance APIs

### Policy Management

#### List Policies
```http
GET /policies
```

**Response:**
```json
{
  "data": [
    {
      "id": "policy_abc123",
      "name": "EU Data Residency",
      "type": "data_residency",
      "enabled": true,
      "priority": 1,
      "rules": [
        {
          "conditions": {
            "field": "dataClassification",
            "operator": "in",
            "value": ["personal", "sensitive"]
          },
          "action": "restrict",
          "message": "Personal data must remain in EU"
        }
      ],
      "config": {
        "allowedRegions": ["eu-west-1", "eu-central-1"],
        "requiredCertifications": ["GDPR"]
      }
    }
  ]
}
```

#### Create Policy
```http
POST /policies
```

**Request Body:**
```json
{
  "name": "Domain Allowlist",
  "type": "domain_allowlist", 
  "enabled": true,
  "priority": 2,
  "rules": [
    {
      "conditions": {
        "field": "targetDomain",
        "operator": "not_in",
        "value": ["trusted.com", "api.example.com"]
      },
      "action": "deny",
      "message": "Domain not in allowlist"
    }
  ],
  "config": {
    "allowedDomains": ["trusted.com", "api.example.com"],
    "requireHttps": true
  }
}
```

### Data Redaction

#### Configure Redaction
```http
POST /redaction/configure
```

**Request Body:**
```json
{
  "integrationId": "int_abc123",
  "config": {
    "strategy": "mask",
    "patterns": ["email", "ssn", "creditCard"],
    "preserveLength": true,
    "auditRedactions": true
  }
}
```

#### Test Redaction
```http
POST /redaction/test
```

**Request Body:**
```json
{
  "data": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "ssn": "123-45-6789"
  },
  "config": {
    "strategy": "mask",
    "patterns": ["email", "ssn"]
  }
}
```

**Response:**
```json
{
  "original": {
    "name": "John Doe",
    "email": "john.doe@example.com", 
    "ssn": "123-45-6789"
  },
  "redacted": {
    "name": "John Doe",
    "email": "***@***.***",
    "ssn": "***-**-****"
  },
  "redactionLog": [
    {
      "field": "email",
      "pattern": "email",
      "strategy": "mask"
    },
    {
      "field": "ssn",
      "pattern": "ssn", 
      "strategy": "mask"
    }
  ]
}
```

## Error Responses

### Standard Error Format

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "specific_field",
      "value": "invalid_value",
      "expected": "expected_format"
    },
    "timestamp": "2025-08-21T13:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### HTTP Status Codes

| Status | Description | Example |
|--------|-------------|---------|
| 200 | Success | Request completed successfully |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate name) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | External service error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request validation failed |
| `UNAUTHORIZED` | Authentication failed |
| `FORBIDDEN` | Access denied |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource conflict |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |
| `INTEGRATION_ERROR` | External integration error |
| `TIMEOUT` | Request timeout |
| `CIRCUIT_BREAKER_OPEN` | Circuit breaker activated |

## Rate Limits

### API Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 60 requests | 1 minute |
| Integration Management | 300 requests | 1 minute |
| Job Operations | 120 requests | 1 minute |
| Metrics & Health | 600 requests | 1 minute |
| Policy Management | 60 requests | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 245
X-RateLimit-Reset: 1692614460
X-RateLimit-Window: 60
```

## Webhooks

### Webhook Events

Configure webhooks to receive real-time notifications:

| Event | Description |
|-------|-------------|
| `integration.created` | New integration created |
| `integration.updated` | Integration configuration updated |
| `integration.deleted` | Integration removed |
| `integration.status_changed` | Integration status changed |
| `credential.created` | New credential added |
| `credential.rotated` | Credential rotated |
| `credential.expired` | Credential expired |
| `job.started` | Job execution started |
| `job.completed` | Job execution completed |
| `job.failed` | Job execution failed |
| `policy.violated` | Policy violation detected |
| `health.degraded` | System health degraded |

### Webhook Payload

```json
{
  "event": "integration.status_changed",
  "timestamp": "2025-08-21T13:00:00Z",
  "data": {
    "integrationId": "int_abc123",
    "oldStatus": "active",
    "newStatus": "error",
    "reason": "Authentication failed"
  },
  "signature": "sha256=abc123def456..."
}
```

---

**API Version**: v1.0  
**Last Updated**: 2025-08-21  
**Authentication**: Bearer Token Required