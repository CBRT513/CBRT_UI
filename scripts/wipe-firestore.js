#!/usr/bin/env node

/**
 * Wipe Firestore Database
 * WARNING: This will delete ALL collections and documents
 * 
 * Usage:
 *   npm run wipe:dev      # Wipes DEV environment
 *   node scripts/wipe-firestore.js --force  # Skip confirmation
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

// Check environment
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cbrt-app-ui-dev';
const FORCE = process.argv.includes('--force') || process.argv.includes('--yes');

console.log(`
╔════════════════════════════════════════════╗
║           FIRESTORE WIPE UTILITY           ║
╠════════════════════════════════════════════╣
║  ⚠️  WARNING: DESTRUCTIVE OPERATION        ║
║  This will DELETE ALL data in:            ║
║  Project: ${PROJECT_ID.padEnd(33)}║
╚════════════════════════════════════════════╝
`);

// Collections to wipe (in order)
const COLLECTIONS = [
  'releases',
  'releaseLines',
  'inventoryLots',
  'customers',
  'suppliers',
  'staff',
  'items',
  'sizes',
  'products',
  'carriers',
  'trucks',
  'barges',
  'lots',
  'auditLogs',
  'umsEvents',
  'expected-shipments',
  'notifications'
];

async function confirmWipe() {
  if (FORCE) return true;
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`\nType "DELETE ${PROJECT_ID}" to confirm: `, (answer) => {
      rl.close();
      resolve(answer === `DELETE ${PROJECT_ID}`);
    });
  });
}

async function deleteCollection(db, collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(500);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();
  
  if (snapshot.size === 0) {
    resolve();
    return;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  
  // Recurse on the next batch
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function wipeFirestore() {
  try {
    // Initialize Firebase Admin
    let app;
    if (PROJECT_ID === 'cbrt-app-ui-dev') {
      // For DEV, we can use default credentials or service account
      app = initializeApp({
        projectId: PROJECT_ID
      });
    } else {
      // For other environments, require service account
      const serviceAccount = JSON.parse(
        readFileSync(`./service-account-${PROJECT_ID}.json`, 'utf8')
      );
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: PROJECT_ID
      });
    }
    
    const db = getFirestore(app);
    
    // Confirm before proceeding
    const confirmed = await confirmWipe();
    if (!confirmed) {
      console.log('❌ Wipe cancelled');
      process.exit(0);
    }
    
    console.log('\n🗑️  Starting wipe...\n');
    
    // Delete each collection
    for (const collection of COLLECTIONS) {
      process.stdout.write(`  Deleting ${collection}...`);
      try {
        await deleteCollection(db, collection);
        console.log(' ✅');
      } catch (error) {
        console.log(` ❌ ${error.message}`);
      }
    }
    
    console.log(`
╔════════════════════════════════════════════╗
║           WIPE COMPLETE                    ║
║  Database is now empty and ready for       ║
║  fresh data seeding.                       ║
╚════════════════════════════════════════════╝

Next steps:
  1. Run seed script: npm run seed:dev
  2. Or use web seeders: seedReleases.html, seedF8Test.html
`);
    
  } catch (error) {
    console.error('❌ Wipe failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  wipeFirestore().then(() => process.exit(0));
}