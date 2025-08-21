#!/usr/bin/env node
/**
 * Seed Empty Collections
 * Automatically seeds all empty Firestore collections with sample data
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

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
    console.error(chalk.red('❌ Failed to initialize Firebase'));
    process.exit(1);
  }
}

async function seedEmptyCollections() {
  console.log(chalk.bold('\n🌱 Seeding Empty Collections\n'));
  
  // Load audit results
  const auditPath = path.join(projectRoot, 'audit', 'firestore_audit.json');
  let auditData;
  
  try {
    const content = await fs.readFile(auditPath, 'utf-8');
    auditData = JSON.parse(content);
  } catch {
    console.log(chalk.yellow('⚠ No audit data found. Run "npm run audit:fs" first.'));
    process.exit(1);
  }
  
  // Initialize Firestore
  const db = await initializeFirestore();
  
  // Find empty collections
  const emptyCollections = auditData.results
    .filter(r => !r.exists && r.errors.length === 0)
    .map(r => r.path);
  
  if (emptyCollections.length === 0) {
    console.log(chalk.green('✓ No empty collections to seed'));
    return;
  }
  
  console.log(`Found ${emptyCollections.length} empty collections to seed:\n`);
  
  let seeded = 0;
  let failed = 0;
  
  for (const collName of emptyCollections) {
    const sampleData = SAMPLE_DATA[collName];
    
    if (!sampleData) {
      console.log(chalk.yellow(`  ⚠ ${collName}: No sample data defined`));
      continue;
    }
    
    try {
      await addDoc(collection(db, collName), sampleData);
      console.log(chalk.green(`  ✓ ${collName}: Seeded with sample data`));
      seeded++;
    } catch (err) {
      console.log(chalk.red(`  ✗ ${collName}: ${err.message}`));
      failed++;
    }
  }
  
  console.log(chalk.bold('\n📊 Summary:'));
  console.log(`  Seeded: ${seeded} collections`);
  console.log(`  Failed: ${failed} collections`);
  console.log(`  Skipped: ${emptyCollections.length - seeded - failed} collections`);
  
  if (seeded > 0) {
    console.log(chalk.green('\n✅ Sample data added successfully!'));
    console.log('Run "npm run audit:fs" again to verify the data.');
  }
}

// Run the seeding
seedEmptyCollections().catch(err => {
  console.error(chalk.red('❌ Seeding failed:'), err);
  process.exit(1);
});