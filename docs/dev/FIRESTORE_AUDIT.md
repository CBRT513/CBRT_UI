# Firestore Audit Documentation

## Overview
The Firestore Audit toolkit helps diagnose why your UI tables might be showing blanks by:
1. Scanning your codebase for all Firestore collection references
2. Auditing the actual Firestore database against those references
3. Identifying missing collections, documents, and required fields
4. Optionally seeding empty collections with sample data

## Setup

### Install Dependencies
```bash
# Install required packages
npm install fast-glob chalk cli-table3
# or
pnpm add fast-glob chalk cli-table3
```

### Configure Credentials

The audit tool can connect to Firestore in three ways:

#### Option 1: Firebase Admin SDK (Recommended)
Best for full access without security rules restrictions.

```bash
# Set path to service account JSON
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/barge2rail-admin.json"

# Or provide JSON directly
export FIREBASE_ADMIN_JSON='{"type":"service_account","project_id":"barge2rail-auth-e4c16",...}'
```

To get a service account key:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project Settings → Service Accounts
3. Generate New Private Key
4. Save the JSON file securely

#### Option 2: Client SDK (Fallback)
Uses `.env.local` configuration. May be limited by security rules.

Ensure your `.env.local` contains:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=barge2rail-auth-e4c16
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Usage

### Run Complete Audit
```bash
# Scan codebase and audit Firestore
pnpm audit:all

# With Admin SDK
GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccount.json" pnpm audit:all
```

### Individual Commands

#### 1. Scan Collections
Discovers all Firestore paths referenced in your code:
```bash
pnpm audit:scan
```

Outputs:
- `audit/collections.map.json` - All discovered collection paths

#### 2. Audit Firestore
Checks actual Firestore data against discovered collections:
```bash
pnpm audit:fs

# With seeding for empty collections
pnpm audit:fs -- --seed
```

Outputs:
- `audit/firestore_audit.json` - Detailed JSON report
- `audit/README.md` - Human-readable summary
- Console table with immediate results

## Understanding Results

### Console Table
```
┌────────────────────┬──────────┬────────┬──────────────────────────────┬──────────────────────────────┐
│ Collection         │ Status   │ Docs   │ Missing Fields               │ Issues                       │
├────────────────────┼──────────┼────────┼──────────────────────────────┼──────────────────────────────┤
│ items              │ ✓        │ 45     │ None                         │ None                         │
│ customers          │ ✗        │ 0      │ name, contactName, phone     │ None                         │
│ suppliers          │ ✓        │ 12     │ status                       │ None                         │
└────────────────────┴──────────┴────────┴──────────────────────────────┴──────────────────────────────┘
```

### Status Indicators
- ✓ Green check: Collection exists with documents
- ✗ Red X: Collection is empty or doesn't exist
- Missing Fields: Required fields not found in any documents
- Issues: Permission errors or other problems

### Report Files

#### audit/README.md
Human-readable markdown summary with:
- Collection statistics
- Missing field details
- Field coverage percentages
- Next steps recommendations

#### audit/firestore_audit.json
Machine-readable JSON with:
- Complete schema for each collection
- Sample documents
- Field type information
- Error details

## Troubleshooting

### Permission Denied Errors
```
Error: Missing or insufficient permissions
```

**Solution**: Use Admin SDK instead of client SDK:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccount.json"
pnpm audit:fs
```

### Collection Case Mismatch
The audit will detect if code references `Items` but database has `items`.

**Solution**: Update code to match actual collection names (case-sensitive).

### Missing Indexes
If you see index errors, the audit will provide links to create them:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

### Empty Collections
Run with `--seed` flag to add minimal sample data:
```bash
pnpm audit:fs -- --seed
```

You'll be prompted to confirm each collection before seeding.

## Sample Data Structure

When seeding, the tool adds minimal valid documents:

```javascript
// Example for 'items' collection
{
  itemCode: 'ITEM-001',
  name: 'Sample Item',
  status: 'active',
  quantity: 100,
  description: 'Test item for audit',
  unit: 'EA'
}

// Example for 'customers' collection
{
  name: 'Sample Customer Inc',
  contactName: 'John Doe',
  phone: '555-0100',
  email: 'contact@sample.com',
  address: '123 Main St',
  city: 'Cincinnati',
  state: 'OH',
  zip: '45202',
  status: 'active'
}
```

## Field Requirements

The audit checks for these required fields per collection:

| Collection | Required Fields |
|------------|----------------|
| items | itemCode, name, status, quantity |
| customers | name, contactName, phone, address, city, state, status |
| suppliers | name, contactName, phone, address, city, state, status |
| carriers | name, contactName, phone, status |
| barcodes | barcode, itemCode, status, createdAt |
| barges | bargeNumber, name, status, capacity |
| lots | lotNumber, itemCode, quantity, status |
| products | productCode, name, category, status |
| sizes | sizeCode, description, dimensions |
| staff | name, email, role, status |
| trucks | truckNumber, carrier, status, capacity |

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Audit Firestore
  env:
    FIREBASE_ADMIN_JSON: ${{ secrets.FIREBASE_ADMIN_JSON }}
  run: |
    npm run audit:all
    if [ -f audit/README.md ]; then
      cat audit/README.md >> $GITHUB_STEP_SUMMARY
    fi
```

## Security Notes

1. **Never commit service account keys** to version control
2. Store credentials in secure secret management
3. Use read-only service accounts for audits when possible
4. Rotate service account keys regularly

## Next Steps

After running the audit:

1. **Fix Empty Collections**: Add data through your app or seed with sample data
2. **Add Missing Fields**: Update your data model to include required fields
3. **Fix Permission Errors**: Update Firestore rules or use Admin SDK
4. **Create Indexes**: Follow console links to create composite indexes
5. **Update Code**: Fix any collection name mismatches (case-sensitive)