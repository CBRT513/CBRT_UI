#!/usr/bin/env node

/**
 * Wipe Firebase Auth Users
 * WARNING: This will delete ALL user accounts
 * 
 * Usage:
 *   npm run wipe:auth:dev      # Wipes DEV auth
 *   npm run wipe:auth:staging  # Wipes STAGING auth
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

// Check environment
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cbrt-app-ui-dev';
const FORCE = process.argv.includes('--force') || process.argv.includes('--yes');

console.log(`
╔════════════════════════════════════════════╗
║           AUTH WIPE UTILITY                ║
╠════════════════════════════════════════════╣
║  ⚠️  WARNING: DESTRUCTIVE OPERATION        ║
║  This will DELETE ALL user accounts in:   ║
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
    rl.question(`\nType "DELETE AUTH ${PROJECT_ID}" to confirm: `, (answer) => {
      rl.close();
      resolve(answer === `DELETE AUTH ${PROJECT_ID}`);
    });
  });
}

async function deleteAllUsers(auth) {
  let deletedCount = 0;
  let nextPageToken;
  
  do {
    try {
      // List batch of users
      const listResult = await auth.listUsers(1000, nextPageToken);
      
      if (listResult.users.length === 0) {
        break;
      }
      
      // Delete each user
      const deletePromises = listResult.users.map(user => 
        auth.deleteUser(user.uid)
          .then(() => {
            deletedCount++;
            process.stdout.write(`  Deleted ${deletedCount} users\r`);
          })
          .catch(error => {
            console.log(`\n  ❌ Failed to delete user ${user.email}: ${error.message}`);
          })
      );
      
      await Promise.all(deletePromises);
      nextPageToken = listResult.pageToken;
    } catch (error) {
      console.error('\n❌ Error listing users:', error.message);
      break;
    }
  } while (nextPageToken);
  
  return deletedCount;
}

async function wipeAuth() {
  try {
    // Initialize Firebase Admin
    let app;
    if (PROJECT_ID === 'cbrt-app-ui-dev' || PROJECT_ID === 'cbrt-ui-staging') {
      // Use default credentials or environment-based init
      app = initializeApp({
        projectId: PROJECT_ID
      });
    } else {
      // Require service account for other projects
      const serviceAccount = JSON.parse(
        readFileSync(`./service-account-${PROJECT_ID}.json`, 'utf8')
      );
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: PROJECT_ID
      });
    }
    
    const auth = getAuth(app);
    
    // Confirm before proceeding
    const confirmed = await confirmWipe();
    if (!confirmed) {
      console.log('❌ Auth wipe cancelled');
      process.exit(0);
    }
    
    console.log('\n🗑️  Starting auth wipe...\n');
    
    // Delete all users
    const deletedCount = await deleteAllUsers(auth);
    
    console.log(`
╔════════════════════════════════════════════╗
║           AUTH WIPE COMPLETE               ║
║  Deleted ${String(deletedCount).padEnd(37)}║
║  Auth is now empty and ready for          ║
║  fresh user registration.                 ║
╚════════════════════════════════════════════╝

Next steps:
  1. Configure auth providers in Firebase Console
  2. DEV: Enable Email/Password, Google, Anonymous
  3. STAGING: Enable Email/Password, Google (no Anonymous)
`);
    
  } catch (error) {
    console.error('❌ Auth wipe failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  wipeAuth().then(() => process.exit(0));
}