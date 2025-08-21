#!/usr/bin/env node
/**
 * Firestore Audit Tool
 * Audits Firestore collections against app requirements
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, doc, limit, query } from 'firebase/firestore';
import chalk from 'chalk';
import Table from 'cli-table3';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Try to load Admin SDK if available
let admin = null;
let adminEnabled = false;
try {
  const adminModule = await import('firebase-admin');
  admin = adminModule.default;
  adminEnabled = true;
} catch {
  console.log(chalk.yellow('⚠ Firebase Admin SDK not installed. Using client SDK (may have limited access)'));
}

// Field requirements per collection (based on typical Manager expectations)
const REQUIRED_FIELDS = {
  items: ['itemCode', 'name', 'status', 'quantity'],
  customers: ['name', 'contactName', 'phone', 'address', 'city', 'state', 'status'],
  suppliers: ['name', 'contactName', 'phone', 'address', 'city', 'state', 'status'],
  carriers: ['name', 'contactName', 'phone', 'status'],
  barcodes: ['barcode', 'itemCode', 'status', 'createdAt'],
  barges: ['bargeNumber', 'name', 'status', 'capacity'],
  lots: ['lotNumber', 'itemCode', 'quantity', 'status'],
  products: ['productCode', 'name', 'category', 'status'],
  sizes: ['sizeCode', 'description', 'dimensions'],
  staff: ['name', 'email', 'role', 'status'],
  trucks: ['truckNumber', 'carrier', 'status', 'capacity'],
  releases: ['releaseNumber', 'customer', 'status', 'items', 'createdAt'],
  inventory: ['itemCode', 'location', 'quantity', 'status'],
  shipments: ['shipmentNumber', 'origin', 'destination', 'status', 'items'],
};

// Sample data for seeding
const SAMPLE_DATA = {
  allocations: {
    itemCode: 'ITEM-001',
    customer: 'Sample Customer',
    quantity: 50,
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  audit_logs: {
    action: 'create',
    collection: 'items',
    documentId: 'ITEM-001',
    userId: 'system',
    timestamp: new Date().toISOString(),
    changes: {},
  },
  auditLogs: {
    action: 'create',
    collection: 'items',
    documentId: 'ITEM-001',
    userId: 'system',
    timestamp: new Date().toISOString(),
    changes: {},
  },
  items: {
    itemCode: 'ITEM-001',
    name: 'Sample Item',
    status: 'active',
    quantity: 100,
    description: 'Test item for audit',
    unit: 'EA',
  },
  customers: {
    name: 'Sample Customer Inc',
    contactName: 'John Doe',
    phone: '555-0100',
    email: 'contact@sample.com',
    address: '123 Main St',
    city: 'Cincinnati',
    state: 'OH',
    zip: '45202',
    status: 'active',
  },
  suppliers: {
    name: 'Sample Supplier LLC',
    contactName: 'Jane Smith',
    phone: '555-0200',
    email: 'supplier@sample.com',
    address: '456 Supply Ave',
    city: 'Cincinnati',
    state: 'OH',
    zip: '45203',
    status: 'active',
  },
  carriers: {
    name: 'Sample Carrier Transport',
    contactName: 'Bob Johnson',
    phone: '555-0300',
    email: 'carrier@sample.com',
    status: 'active',
  },
  barcodes: {
    barcode: '1234567890123',
    itemCode: 'ITEM-001',
    status: 'active',
    createdAt: new Date().toISOString(),
  },
  barges: {
    bargeNumber: 'BRG-001',
    name: 'Sample Barge',
    status: 'active',
    capacity: 1000,
  },
  lots: {
    lotNumber: 'LOT-001',
    itemCode: 'ITEM-001',
    quantity: 50,
    status: 'active',
  },
  products: {
    productCode: 'PROD-001',
    name: 'Sample Product',
    category: 'General',
    status: 'active',
  },
  sizes: {
    sizeCode: 'SIZE-M',
    description: 'Medium',
    dimensions: '10x10x10',
  },
  staff: {
    name: 'Admin User',
    email: 'admin@cbrt.com',
    role: 'admin',
    status: 'active',
  },
  trucks: {
    truckNumber: 'TRK-001',
    carrier: 'Sample Carrier Transport',
    status: 'active',
    capacity: 40000,
  },
  bols: {
    bolNumber: 'BOL-001',
    customer: 'Sample Customer Inc',
    supplier: 'Sample Supplier LLC',
    carrier: 'Sample Carrier Transport',
    status: 'draft',
    items: [],
    createdAt: new Date().toISOString(),
  },
  emailQueue: {
    to: 'test@example.com',
    subject: 'Test Email',
    body: 'This is a test email',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  logs: {
    level: 'info',
    message: 'System initialized',
    timestamp: new Date().toISOString(),
    source: 'audit',
  },
  notifications: {
    userId: 'test-user',
    message: 'Welcome to CBRT',
    type: 'info',
    read: false,
    createdAt: new Date().toISOString(),
  },
  releases: {
    releaseNumber: 'REL-001',
    customer: 'Sample Customer Inc',
    status: 'pending',
    items: [],
    createdAt: new Date().toISOString(),
  },
  staging: {
    itemCode: 'ITEM-001',
    location: 'STAGE-01',
    quantity: 25,
    status: 'ready',
    createdAt: new Date().toISOString(),
  },
  system_alerts: {
    type: 'info',
    message: 'System running normally',
    severity: 'low',
    timestamp: new Date().toISOString(),
  },
  test_analyses: {
    testId: 'TEST-001',
    itemCode: 'ITEM-001',
    results: {},
    status: 'completed',
    createdAt: new Date().toISOString(),
  },
  verifications: {
    verificationId: 'VER-001',
    itemCode: 'ITEM-001',
    verifiedBy: 'system',
    status: 'verified',
    createdAt: new Date().toISOString(),
  },
};

async function initializeFirestore() {
  // Try Admin SDK first
  if (adminEnabled) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const credJson = process.env.FIREBASE_ADMIN_JSON;
    
    if (credPath || credJson) {
      try {
        if (credJson) {
          const serviceAccount = JSON.parse(credJson);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
        } else {
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        }
        console.log(chalk.green('✓ Connected using Firebase Admin SDK'));
        return admin.firestore();
      } catch (err) {
        console.log(chalk.yellow('⚠ Admin SDK failed, falling back to client SDK'));
      }
    }
  }
  
  // Fallback to client SDK
  try {
    const envPath = path.join(projectRoot, '.env.local');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const config = {};
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.trim()] = value.trim().replace(/["']/g, '');
      }
    });
    
    const firebaseConfig = {
      apiKey: config.VITE_FIREBASE_API_KEY,
      authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: config.VITE_FIREBASE_PROJECT_ID,
      storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: config.VITE_FIREBASE_APP_ID,
    };
    
    const app = initializeApp(firebaseConfig);
    console.log(chalk.green(`✓ Connected to Firebase project: ${firebaseConfig.projectId}`));
    return getFirestore(app);
  } catch (err) {
    console.error(chalk.red('❌ Failed to initialize Firebase. Please set up credentials:'));
    console.log('\nOption 1: Set service account path');
    console.log(chalk.cyan('  export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccount.json"'));
    console.log('\nOption 2: Set service account JSON directly');
    console.log(chalk.cyan('  export FIREBASE_ADMIN_JSON=\'{"type":"service_account",...}\''));
    console.log('\nOption 3: Ensure .env.local has Firebase config');
    process.exit(1);
  }
}

async function auditCollection(db, collectionPath, expectedFields = []) {
  const result = {
    path: collectionPath,
    exists: false,
    count: 0,
    sampleDocs: [],
    schema: {},
    missingFields: [],
    fieldCoverage: {},
    errors: [],
  };
  
  try {
    let docs;
    
    // Check if we're using Admin SDK by testing for the collection method
    const isAdminSdk = typeof db.collection === 'function';
    
    if (isAdminSdk) {
      // Admin SDK
      const collRef = db.collection(collectionPath);
      const q = await collRef.limit(100).get();
      docs = q.docs;
    } else {
      // Client SDK
      const collRef = collection(db, collectionPath);
      const q = await getDocs(query(collRef, limit(100)));
      docs = q.docs;
    }
    result.exists = docs.length > 0;
    result.count = docs.length;
    
    // Sample documents and infer schema
    const fieldTypes = {};
    const fieldCounts = {};
    
    docs.slice(0, 20).forEach(doc => {
      const data = doc.data();
      result.sampleDocs.push({ id: doc.id, ...data });
      
      // Track field types and counts
      Object.entries(data).forEach(([key, value]) => {
        if (!fieldTypes[key]) {
          fieldTypes[key] = new Set();
          fieldCounts[key] = 0;
        }
        fieldTypes[key].add(typeof value);
        fieldCounts[key]++;
      });
    });
    
    // Build schema
    Object.entries(fieldTypes).forEach(([key, types]) => {
      result.schema[key] = {
        types: Array.from(types),
        coverage: Math.round((fieldCounts[key] / result.count) * 100),
      };
    });
    
    // Check required fields
    const requiredFields = REQUIRED_FIELDS[collectionPath] || expectedFields;
    requiredFields.forEach(field => {
      if (!fieldTypes[field]) {
        result.missingFields.push(field);
        result.fieldCoverage[field] = 0;
      } else {
        result.fieldCoverage[field] = Math.round((fieldCounts[field] / result.count) * 100);
      }
    });
    
  } catch (err) {
    result.errors.push({
      type: err.code || 'unknown',
      message: err.message,
    });
    
    if (err.code === 'permission-denied') {
      result.errors.push({
        type: 'hint',
        message: 'Check Firestore rules or use Admin SDK with service account',
      });
    }
  }
  
  return result;
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function seedCollection(db, collectionPath) {
  const sampleData = SAMPLE_DATA[collectionPath];
  if (!sampleData) {
    console.log(chalk.yellow(`  No sample data defined for ${collectionPath}`));
    return false;
  }
  
  try {
    const isAdminSdk = typeof db.collection === 'function';
    
    if (isAdminSdk) {
      await db.collection(collectionPath).add(sampleData);
    } else {
      const { addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, collectionPath), sampleData);
    }
    console.log(chalk.green(`  ✓ Added sample document to ${collectionPath}`));
    return true;
  } catch (err) {
    console.log(chalk.red(`  ✗ Failed to seed ${collectionPath}: ${err.message}`));
    return false;
  }
}

async function runAudit() {
  console.log(chalk.bold('\n🔍 Firestore Audit Tool\n'));
  
  // Load collection map
  const mapPath = path.join(projectRoot, 'audit', 'collections.map.json');
  let collectionMap;
  
  try {
    const mapContent = await fs.readFile(mapPath, 'utf-8');
    collectionMap = JSON.parse(mapContent);
  } catch {
    console.log(chalk.yellow('⚠ No collection map found. Run "pnpm audit:scan" first.'));
    console.log('  Using default collection list...\n');
    collectionMap = {
      collections: Object.keys(REQUIRED_FIELDS).map(name => ({
        path: name,
        type: 'collection',
        files: [],
      })),
    };
  }
  
  // Initialize Firestore
  const db = await initializeFirestore();
  
  // Check for seed flag
  const shouldSeed = process.argv.includes('--seed');
  
  // Audit each collection
  const results = [];
  const collections = collectionMap.collections.filter(c => c.type === 'collection');
  
  console.log(`\nAuditing ${collections.length} collections...\n`);
  
  for (const coll of collections) {
    process.stdout.write(`  Checking ${coll.path}...`);
    const result = await auditCollection(db, coll.path, collectionMap.expectedFields?.[coll.path]);
    results.push(result);
    
    if (result.exists) {
      console.log(chalk.green(` ✓ (${result.count} docs)`));
    } else {
      console.log(chalk.red(` ✗ (empty)`));
      
      if (shouldSeed) {
        const answer = await promptUser(`    Seed ${coll.path} with sample data? (y/n): `);
        if (answer === 'y') {
          await seedCollection(db, coll.path);
        }
      }
    }
  }
  
  // Generate reports
  const auditDir = path.join(projectRoot, 'audit');
  await fs.mkdir(auditDir, { recursive: true });
  
  // Write JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    project: typeof db.collection === 'function' ? 'admin-sdk' : 'client-sdk',
    results,
    summary: {
      totalCollections: results.length,
      emptyCollections: results.filter(r => !r.exists).length,
      collectionsWithErrors: results.filter(r => r.errors.length > 0).length,
      collectionsWithMissingFields: results.filter(r => r.missingFields.length > 0).length,
    },
  };
  
  await fs.writeFile(
    path.join(auditDir, 'firestore_audit.json'),
    JSON.stringify(jsonReport, null, 2)
  );
  
  // Generate console table
  const table = new Table({
    head: ['Collection', 'Status', 'Docs', 'Missing Fields', 'Issues'],
    colWidths: [20, 10, 8, 30, 30],
  });
  
  results.forEach(r => {
    const status = r.exists ? chalk.green('✓') : chalk.red('✗');
    const missing = r.missingFields.length > 0 
      ? r.missingFields.join(', ')
      : chalk.green('None');
    const issues = r.errors.length > 0
      ? r.errors[0].message.substring(0, 25) + '...'
      : chalk.green('None');
    
    table.push([r.path, status, r.count, missing, issues]);
  });
  
  console.log('\n' + table.toString());
  
  // Generate markdown report
  const markdown = `# Firestore Audit Report

Generated: ${new Date().toISOString()}

## Summary
- Total Collections: ${jsonReport.summary.totalCollections}
- Empty Collections: ${jsonReport.summary.emptyCollections}
- Collections with Errors: ${jsonReport.summary.collectionsWithErrors}
- Collections with Missing Fields: ${jsonReport.summary.collectionsWithMissingFields}

## Collection Details

${results.map(r => `### ${r.path}
- **Status**: ${r.exists ? '✅ Active' : '❌ Empty'}
- **Document Count**: ${r.count}
- **Missing Required Fields**: ${r.missingFields.length > 0 ? r.missingFields.join(', ') : 'None'}
- **Field Coverage**:
${Object.entries(r.fieldCoverage).map(([field, coverage]) => `  - ${field}: ${coverage}%`).join('\n')}
${r.errors.length > 0 ? `- **Errors**: ${r.errors.map(e => e.message).join('; ')}` : ''}
`).join('\n')}

## Next Steps

${jsonReport.summary.emptyCollections > 0 ? `
### Seed Empty Collections
Run the following to add sample data:
\`\`\`bash
pnpm audit:fs -- --seed
\`\`\`
` : ''}

${jsonReport.summary.collectionsWithMissingFields > 0 ? `
### Fix Missing Fields
Some collections are missing required fields. Review the data model and update Firestore documents.
` : ''}

${jsonReport.summary.collectionsWithErrors > 0 ? `
### Resolve Permission Errors
Some collections couldn't be accessed. Check Firestore rules or use Admin SDK.
` : ''}
`;
  
  await fs.writeFile(path.join(auditDir, 'README.md'), markdown);
  
  // Print summary
  console.log(chalk.bold('\n📊 Audit Summary:'));
  console.log(`  Total collections: ${jsonReport.summary.totalCollections}`);
  console.log(`  Empty collections: ${jsonReport.summary.emptyCollections}`);
  console.log(`  Collections with missing fields: ${jsonReport.summary.collectionsWithMissingFields}`);
  console.log(`  Collections with errors: ${jsonReport.summary.collectionsWithErrors}`);
  
  console.log(chalk.bold('\n📁 Reports generated:'));
  console.log('  - audit/firestore_audit.json (detailed JSON)');
  console.log('  - audit/README.md (human-readable summary)');
  
  if (jsonReport.summary.emptyCollections > 0 && !shouldSeed) {
    console.log(chalk.yellow('\n💡 Tip: Run "pnpm audit:fs -- --seed" to populate empty collections'));
  }
}

// Run the audit
runAudit().catch(err => {
  console.error(chalk.red('❌ Audit failed:'), err);
  process.exit(1);
});