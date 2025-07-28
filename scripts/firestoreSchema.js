// scripts/firestoreSchema.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./cbrt-app-ui-dev-firebase-adminsdk-fbsvc-2a575db97d.json', 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const collections = [
  'customers',
  'suppliers',
  'carriers',
  'trucks',
  'items',
  'staff',
  'products',
  'sizes',
  'releases',
  'staff'
];

async function getSchema() {
  for (const name of collections) {
    const snapshot = await db.collection(name).limit(10).get();
    const fieldSet = new Set();
    snapshot.forEach(doc => {
      Object.keys(doc.data()).forEach(k => fieldSet.add(k));
    });

    const fields = Array.from(fieldSet);
    console.log(`\n🗂 ${name}:`);
    if (fields.length === 0) {
      console.log('   ⚠️ No documents found.');
    } else {
      fields.forEach(f => console.log(`   • ${f}`));
    }
  }
}

getSchema();