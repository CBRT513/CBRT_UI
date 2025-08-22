#!/usr/bin/env node

/**
 * Wipe Firebase Storage
 * WARNING: This will delete ALL files and folders
 * 
 * Usage:
 *   npm run wipe:storage:dev      # Wipes DEV storage
 *   npm run wipe:storage:staging  # Wipes STAGING storage
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

// Check environment
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cbrt-app-ui-dev';
const FORCE = process.argv.includes('--force') || process.argv.includes('--yes');

console.log(`
╔════════════════════════════════════════════╗
║           STORAGE WIPE UTILITY             ║
╠════════════════════════════════════════════╣
║  ⚠️  WARNING: DESTRUCTIVE OPERATION        ║
║  This will DELETE ALL files in:           ║
║  Project: ${PROJECT_ID.padEnd(33)}║
╚════════════════════════════════════════════╝
`);

async function confirmWipe() {
  if (FORCE) return true;
  
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`\nType "DELETE STORAGE ${PROJECT_ID}" to confirm: `, (answer) => {
      rl.close();
      resolve(answer === `DELETE STORAGE ${PROJECT_ID}`);
    });
  });
}

async function deleteAllFiles(bucket) {
  let deletedCount = 0;
  let nextPageToken;
  
  do {
    try {
      // List files with pagination
      const [files, , metadata] = await bucket.getFiles({
        maxResults: 500,
        pageToken: nextPageToken
      });
      
      if (files.length === 0) {
        break;
      }
      
      // Delete files in batches
      const deletePromises = files.map(file => 
        file.delete()
          .then(() => {
            deletedCount++;
            process.stdout.write(`  Deleted ${deletedCount} files\r`);
          })
          .catch(error => {
            console.log(`\n  ❌ Failed to delete ${file.name}: ${error.message}`);
          })
      );
      
      await Promise.all(deletePromises);
      nextPageToken = metadata?.nextPageToken;
    } catch (error) {
      console.error('\n❌ Error listing files:', error.message);
      break;
    }
  } while (nextPageToken);
  
  return deletedCount;
}

async function wipeStorage() {
  try {
    // Initialize Firebase Admin
    let app;
    if (PROJECT_ID === 'cbrt-app-ui-dev' || PROJECT_ID === 'cbrt-ui-staging') {
      // Use default credentials or environment-based init
      app = initializeApp({
        projectId: PROJECT_ID,
        storageBucket: `${PROJECT_ID}.appspot.com`
      });
    } else {
      // Require service account for other projects
      const serviceAccount = JSON.parse(
        readFileSync(`./service-account-${PROJECT_ID}.json`, 'utf8')
      );
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: PROJECT_ID,
        storageBucket: `${PROJECT_ID}.appspot.com`
      });
    }
    
    const bucket = getStorage(app).bucket();
    
    // Confirm before proceeding
    const confirmed = await confirmWipe();
    if (!confirmed) {
      console.log('❌ Storage wipe cancelled');
      process.exit(0);
    }
    
    console.log('\n🗑️  Starting storage wipe...\n');
    
    // Delete all files
    const deletedCount = await deleteAllFiles(bucket);
    
    console.log(`
╔════════════════════════════════════════════╗
║           STORAGE WIPE COMPLETE            ║
║  Deleted ${String(deletedCount).padEnd(37)}║
║  Storage is now empty and ready for       ║
║  fresh uploads.                           ║
╚════════════════════════════════════════════╝

Next steps:
  1. Storage is clean and ready
  2. All file references in Firestore are now broken
  3. Upload new files through the application UI
`);
    
  } catch (error) {
    console.error('❌ Storage wipe failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  wipeStorage().then(() => process.exit(0));
}