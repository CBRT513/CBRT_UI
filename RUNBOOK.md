# CBRT UI RUNBOOK
**Deployment, Monitoring, and Incident Response Guide**

## 🚀 DEPLOYMENT PROCEDURES

### Pre-Deployment Checklist
- [ ] All tests passing (`npm run build`)
- [ ] Security rules tested in emulator
- [ ] Role matrix verified with test accounts
- [ ] Performance benchmarks within acceptable limits
- [ ] Firestore indexes deployed
- [ ] Environment variables configured

### 1. Standard Deployment

```bash
# 1. Build and test
npm ci
npm run build
npm run test  # if tests exist

# 2. Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# 3. Deploy application
firebase deploy --only hosting

# 4. Verify deployment
curl -I https://your-app.web.app
```

### 2. Security Rules Deployment

```bash
# Test rules in emulator first
firebase emulators:start --only firestore

# Deploy rules
firebase deploy --only firestore:rules

# Verify rules are active
firebase firestore:rules:get
```

### 3. Canary Deployment (Recommended)

```bash
# Deploy to staging first
firebase use staging
firebase deploy

# Verify on staging
# Run smoke tests
# Deploy to production
firebase use production
firebase deploy
```

## 🔄 ROLLBACK PROCEDURES

### Immediate Rollback (< 5 minutes)

```bash
# Rollback hosting to previous version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION_ID TARGET_SITE_ID

# Rollback Firestore rules
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

### Application Rollback

```bash
# 1. Identify last known good version
firebase hosting:versions:list

# 2. Rollback to specific version
firebase hosting:versions:clone SOURCE_VERSION_ID

# 3. Verify rollback
curl -I https://your-app.web.app
# Check version in browser DevTools
```

### Security Rules Rollback

```bash
# Emergency: Rollback to permissive rules
# ONLY use in emergency - immediate security impact
cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
EOF

firebase deploy --only firestore:rules

# Then immediately fix and redeploy proper rules
```

### Database Schema Rollback

```bash
# No automatic rollback for Firestore data
# Manual data migration may be required
# Use backup and restore procedures
```

## 📊 MONITORING & ALERTS

### Key Metrics to Monitor

**Application Performance:**
- Page load time < 3 seconds
- Time to interactive < 5 seconds
- Bundle size < 2MB compressed
- Core Web Vitals within thresholds

**Firestore Metrics:**
- Read operations < 50k/day
- Write operations < 10k/day
- Document count growth rate
- Query performance < 500ms

**Authentication Metrics:**
- Login success rate > 95%
- Session duration average
- Failed authentication attempts
- Role distribution

### Firebase Console Monitoring

1. **Performance Monitoring**
   - Navigate to Firebase Console → Performance
   - Monitor page load times and user flows
   - Set up alerts for performance degradation

2. **Firestore Usage**
   - Firebase Console → Firestore → Usage
   - Monitor read/write operations
   - Track storage usage

3. **Authentication**
   - Firebase Console → Authentication → Users
   - Monitor daily active users
   - Track sign-in methods usage

### Alerting Setup

```javascript
// Example Sentry error tracking
// In production environment
{
  VITE_SENTRY_DSN: "your-sentry-dsn",
  VITE_LOG_LEVEL: "info"
}
```

### Custom Monitoring Dashboard

```bash
# Use Firebase CLI to export usage data
firebase projects:list
firebase use your-project
firebase firestore:export gs://your-bucket/backup-$(date +%Y%m%d)
```

## 🚨 INCIDENT RESPONSE

### Severity Levels

**P0 - Critical (Response: Immediate)**
- Application completely down
- Security breach
- Data corruption
- Authentication system failure

**P1 - High (Response: < 1 hour)**
- Major feature broken
- Performance severely degraded
- Multiple user complaints

**P2 - Medium (Response: < 4 hours)**
- Minor feature issues
- Moderate performance impact
- Single user reports

**P3 - Low (Response: < 24 hours)**
- Cosmetic issues
- Enhancement requests
- Documentation updates

### Incident Response Steps

1. **Assessment (0-5 minutes)**
   ```bash
   # Check application status
   curl -I https://your-app.web.app
   
   # Check Firebase status
   # Visit: https://status.firebase.google.com/
   
   # Check recent deployments
   firebase hosting:versions:list --limit 5
   ```

2. **Immediate Mitigation (5-15 minutes)**
   ```bash
   # If recent deployment caused issue
   firebase hosting:versions:clone LAST_GOOD_VERSION
   
   # If security rules issue
   # Review and rollback rules if needed
   firebase firestore:rules:get
   ```

3. **Communication (Within 15 minutes)**
   - Notify stakeholders
   - Post status update
   - Communicate expected resolution time

4. **Investigation & Fix**
   - Review logs in Firebase Console
   - Check Sentry for errors
   - Identify root cause
   - Implement fix

5. **Verification & Post-Mortem**
   - Verify fix in production
   - Document incident
   - Update runbook if needed

### Common Issues & Solutions

**Issue: Authentication Failures**
```bash
# Check Firebase Auth configuration
firebase auth:export auth-backup.json
# Verify API keys in environment
# Check security rules for auth requirements
```

**Issue: Firestore Permission Denied**
```bash
# Test security rules in emulator
firebase emulators:start --only firestore
# Check user roles in staff collection
# Verify rule logic with simulator
```

**Issue: Performance Degradation**
```bash
# Check bundle size
npm run build
# Analyze bundle with tools
npm install -g webpack-bundle-analyzer
# Check Firestore query performance
```

**Issue: Failed Deployments**
```bash
# Check build logs
npm run build 2>&1 | tee build.log
# Verify Firebase CLI auth
firebase login --reauth
# Check project configuration
firebase projects:list
```

## 🔐 SECURITY PROCEDURES

### Access Control
- Admin access requires multi-factor authentication
- Regular audit of user permissions
- Quarterly review of Firebase project access

### Data Protection
- Daily automated backups to Cloud Storage
- Encryption at rest (Firebase default)
- HTTPS enforced for all connections

### Security Monitoring
- Monitor failed authentication attempts
- Alert on unusual access patterns
- Regular security rule testing

### Incident Response - Security
1. **Potential Breach Detection**
   - Immediately restrict access
   - Preserve logs for analysis
   - Notify security team

2. **Data Exposure**
   - Assess scope of exposure
   - Notify affected users
   - Implement additional protections

## 📞 EMERGENCY CONTACTS

**Development Team:**
- Primary: [Development Lead]
- Secondary: [Senior Developer]

**Infrastructure:**
- Firebase Support: Firebase Console → Support
- Domain/DNS: [DNS Provider]

**Business:**
- Warehouse Manager: [Phone]
- IT Manager: [Phone]

## 📋 MAINTENANCE PROCEDURES

### Weekly Maintenance
- Review performance metrics
- Check error rates in Sentry
- Validate backup procedures
- Update dependencies if needed

### Monthly Maintenance
- Security rules review
- User access audit
- Performance optimization review
- Documentation updates

### Quarterly Maintenance
- Full security audit
- Disaster recovery testing
- Capacity planning review
- Technology stack updates

---

**Last Updated:** August 21, 2025  
**Next Review:** November 21, 2025