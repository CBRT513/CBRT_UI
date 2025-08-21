# E1 Governance Policies & Audit Guide

## Overview

This document defines the governance policies and audit procedures implemented in Milestone E1 for the CBRT UI + UMS Graph collaboration system.

## 1. Access Control Policies

### Policy: Workspace Access Control

**ID**: `pol_workspace_access`  
**Type**: `ACCESS_CONTROL`  
**Priority**: 1

**Rules:**
1. Users must be explicitly added to a workspace to access its data
2. Workspace owners have admin rights within their workspace
3. Cross-workspace access requires both workspaces to enable `allowCrossLinks`

### Policy: AI Operation Control

**ID**: `pol_ai_operations`  
**Type**: `ACCESS_CONTROL`  
**Priority**: 2

**Rules:**
1. Only Editors and Admins can trigger AI extraction
2. AI-extracted entities with confidence <0.7 require approval
3. Rejected AI extractions are logged for retraining

## 2. Data Quality Policies

### Policy: Entity Confidence Threshold

**ID**: `pol_entity_confidence`  
**Type**: `DATA_QUALITY`  
**Priority**: 1

**Rules:**
```javascript
if (entity.confidence < 0.5) {
  action: 'flag';
  reason: 'Low confidence entity requires review';
}

if (entity.confidence < 0.3) {
  action: 'deny';
  reason: 'Confidence too low for automatic acceptance';
}
```

### Policy: Duplicate Detection

**ID**: `pol_duplicate_detection`  
**Type**: `DATA_QUALITY`  
**Priority**: 2

**Rules:**
1. Entities with >90% name similarity trigger duplicate warning
2. Exact normalized name matches require merge approval
3. Cross-workspace duplicates logged but not auto-merged

## 3. Moderation Policies

### Policy: Content Moderation

**ID**: `pol_content_moderation`  
**Type**: `MODERATION`  
**Priority**: 1

**Triggers:**
- Sensitive data patterns detected
- PII (Personal Identifiable Information) found
- Compliance keywords matched

**Actions:**
1. Flag for review
2. Notify workspace admin
3. Quarantine if critical

### Policy: Anomaly Detection

**ID**: `pol_anomaly_detection`  
**Type**: `MODERATION`  
**Priority**: 3

**Thresholds:**
- >100 operations of same type in 1 hour → Flag
- >10 failed operations in 10 minutes → Alert
- Unusual access patterns → Investigate

## 4. Approval Workflows

### Workflow: High-Value Entity Changes

**Applies to:** Entities with `value > $100,000` or `critical: true`

**Approval Chain:**
1. Editor proposes change
2. Senior Editor reviews (optional)
3. Admin approves
4. Change applied with full audit trail

### Workflow: Cross-Workspace Links

**Steps:**
1. User requests link creation
2. Source workspace admin approves
3. Target workspace admin approves
4. Link established with bidirectional audit

## 5. Retention Policies

### Policy: Standard Retention

**ID**: `pol_standard_retention`  
**Type**: `RETENTION`  

**Rules:**
- Active data: Indefinite
- Deleted entities: 30 days soft delete
- Audit logs: 7 years
- Session data: 24 hours

### Policy: Compliance Retention

**ID**: `pol_compliance_retention`  
**Type**: `RETENTION`  

**For regulated data:**
- Financial records: 7 years
- Shipping documents: 5 years
- Personnel records: As per jurisdiction

## 6. Export Control Policies

### Policy: Data Export Restrictions

**ID**: `pol_export_control`  
**Type**: `EXPORT_CONTROL`  

**Rules:**
1. Viewers cannot export data
2. Editors can export their workspace data
3. Admins can export all data
4. Exports logged with full metadata

**Export Formats:**
- JSON (full fidelity)
- CSV (tabular data only)
- PDF (read-only reports)

## 7. Audit Trail Requirements

### Mandatory Audit Events

All of the following must be logged:

```typescript
enum MandatoryAuditEvents {
  // Authentication
  USER_LOGIN,
  USER_LOGOUT,
  USER_ROLE_CHANGE,
  
  // Data Operations
  ENTITY_CREATE,
  ENTITY_UPDATE,
  ENTITY_DELETE,
  
  // AI Operations
  AI_EXTRACTION,
  AI_APPROVAL,
  AI_REJECTION,
  
  // Governance
  POLICY_VIOLATION,
  APPROVAL_REQUEST,
  APPROVAL_DECISION,
  
  // Export
  DATA_EXPORT,
  AUDIT_EXPORT
}
```

### Audit Entry Format

```json
{
  "id": "audit_1234567890_abc123",
  "timestamp": "2025-08-21T00:00:00.000Z",
  "userId": "user_123",
  "userName": "John Doe",
  "workspaceId": "ws_456",
  "action": "entity.update",
  "entityType": "document",
  "entityId": "doc_789",
  "changes": {
    "title": {
      "old": "Old Title",
      "new": "New Title"
    }
  },
  "metadata": {
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "sessionId": "ses_xyz"
  },
  "result": "success"
}
```

## 8. Compliance Mappings

### SOC 2 Type II

| Control | Implementation |
|---------|---------------|
| CC6.1 | Logical access controls → RBAC system |
| CC6.2 | User access provisioning → Workspace invites |
| CC6.3 | Access removal → Session expiry, role revocation |
| CC7.1 | Change monitoring → Audit trail |

### GDPR

| Requirement | Implementation |
|-------------|---------------|
| Right to Access | Export user's data via API |
| Right to Deletion | Soft delete with purge after retention |
| Data Portability | JSON/CSV export formats |
| Audit Logging | Comprehensive audit trail |

## 9. Incident Response

### Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P1 | Data breach, system compromise | Immediate | CEO, Security Team |
| P2 | Policy violation, unauthorized access | 1 hour | Admin, Security |
| P3 | Failed operations, performance issues | 4 hours | Engineering |
| P4 | Minor issues, UI bugs | Next business day | Support |

### Response Procedures

1. **Detection**: Automated alerts or user reports
2. **Triage**: Assess severity and impact
3. **Containment**: Isolate affected components
4. **Investigation**: Analyze audit logs
5. **Remediation**: Fix issue and patch vulnerability
6. **Recovery**: Restore normal operations
7. **Post-Mortem**: Document lessons learned

## 10. Monitoring & Alerts

### Real-Time Alerts

```javascript
// Alert Configuration
const alerts = {
  highFailureRate: {
    threshold: 10,
    window: '10m',
    action: 'email:admin'
  },
  rapidOperations: {
    threshold: 100,
    window: '1h',
    action: 'flag:suspicious'
  },
  unauthorizedAccess: {
    threshold: 1,
    window: 'immediate',
    action: 'block:user,email:security'
  }
};
```

### Dashboard Metrics

- Active users by role
- Operations per minute
- Failed operations
- Pending approvals
- Active conflicts
- Policy violations

## 11. Best Practices

### For Administrators

1. Review audit logs daily
2. Process approval requests within 24 hours
3. Update policies based on violation patterns
4. Conduct quarterly access reviews

### For Editors

1. Check for conflicts before major edits
2. Provide clear descriptions for changes
3. Request approvals early for critical changes
4. Monitor your operation quota

### For Viewers

1. Report suspicious activity
2. Export data responsibly
3. Respect workspace boundaries

## 12. API Endpoints

### Governance Endpoints

```
GET  /api/governance/policies        - List active policies
POST /api/governance/policies        - Create policy (admin)
GET  /api/governance/audit           - Query audit log
GET  /api/governance/audit/export    - Export audit log
GET  /api/governance/approvals       - List pending approvals
POST /api/governance/approvals/{id}  - Process approval
GET  /api/governance/flags           - List moderation flags
POST /api/governance/flags/{id}      - Review flag
```

## Appendix A: Role Permission Matrix

| Permission | Admin | Editor | Viewer | Guest |
|------------|:-----:|:------:|:------:|:-----:|
| Graph Read | ✅ | ✅ | ✅ | ✅ |
| Graph Create | ✅ | ✅ | ❌ | ❌ |
| Graph Update | ✅ | ✅ | ❌ | ❌ |
| Graph Delete | ✅ | ❌ | ❌ | ❌ |
| Workspace Create | ✅ | ✅ | ❌ | ❌ |
| Workspace Update | ✅ | ✅ | ❌ | ❌ |
| Workspace Delete | ✅ | ❌ | ❌ | ❌ |
| AI Extract | ✅ | ✅ | ❌ | ❌ |
| AI Approve | ✅ | ✅ | ❌ | ❌ |
| AI Moderate | ✅ | ❌ | ❌ | ❌ |
| View Audit | ✅ | ✅ | ✅ | ❌ |
| Export Audit | ✅ | ❌ | ❌ | ❌ |
| Set Policy | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

## Appendix B: Audit Retention Schedule

| Event Type | Retention Period | Archive Method |
|------------|-----------------|----------------|
| User login/logout | 90 days | Compressed JSON |
| Data operations | 1 year | Database |
| AI operations | 2 years | Database + S3 |
| Policy violations | 7 years | Immutable storage |
| Approvals | 5 years | Database |
| Exports | 3 years | Metadata only |

---

*This document is version controlled and requires approval for changes.*
*Last updated: 2025-08-21*
*Next review: 2025-09-21*