// scripts/normalizeFirestore.js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load service account credentials
const serviceAccount = JSON.parse(
  fs.readFileSync('./cbrt-app-ui-dev-firebase-adminsdk-fbsvc-2a575db97d.json', 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function normalizeFields(collectionName, renameMap = {}, fillDefaults = {}) {
  const snap = await db.collection(collectionName).get();
  if (snap.empty) {
    console.log(`⚠️  ${collectionName} has no documents.`);
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    let changed = false;
    const updates = {};

    // Rename fields
    for (const [oldKey, newKey] of Object.entries(renameMap)) {
      if (data.hasOwnProperty(oldKey)) {
        updates[newKey] = data[oldKey];
        updates[oldKey] = FirestoreDeleteField;
        changed = true;
      }
    }

    // Add missing default fields
    for (const [key, value] of Object.entries(fillDefaults)) {
      const current = data[key];
      const isEmpty = current === undefined || current === null || current === '';
      if (isEmpty) {
        updates[key] = typeof value === 'function' ? value(doc) : value;
        changed = true;
      }
    }

    if (changed) {
      await db.collection(collectionName).doc(doc.id).update(updates);
      console.log(`✅ Updated ${collectionName}/${doc.id}`);
    }
  }
}

async function seedReleaseIfEmpty() {
  const releasesRef = db.collection('releases');
  const existing = await releasesRef.limit(1).get();
  if (!existing.empty) return;

  const customers = await db.collection('customers').limit(1).get();
  const products = await db.collection('products').limit(2).get();
  if (customers.empty || products.size < 2) {
    console.warn(`⚠️ Cannot seed release — need at least 1 customer and 2 products`);
    return;
  }

  const release = {
    customerId: customers.docs[0].id,
    items: products.docs.map((p, i) => ({
      id: `p${i}`,
      productId: p.id,
      qty: 5 + i,
    })),
    status: 'open',
    createdAt: new Date(),
  };

  await releasesRef.add(release);
  console.log(`✅ Seeded 1 sample release.`);
}

(async () => {
  global.FirestoreDeleteField = (await import('firebase-admin/firestore')).FieldValue.delete();

  await normalizeFields('items', {
    item_code: 'itemCode',
    item_name: 'itemName',
  });

  await normalizeFields('sizes', {}, {
    sizeName: (doc) => doc.id,
  });

  await normalizeFields('products', {
    standard_weight: 'standardWeight',
  });

  await normalizeFields('trucks', {
    unit_number: 'unitNumber',
    carrier_id: 'carrierId',
  }, {
    status: 'Active',
  });

  await normalizeFields('staff', {
    displayName: 'name',
    authIdentifier: 'email',
  }, {
    role: 'office',
    status: 'Active',
  });

  await normalizeFields('customers', {
    displayName: 'name',
    contactPhone: 'contact',
  }, {
    status: 'Active',
  });

  await normalizeFields('suppliers', {
    displayName: 'name',
    contactPhone: 'contact',
  }, {
    status: 'Active',
  });

  await normalizeFields('carriers', {
    displayName: 'name',
    contactPhone: 'contact',
  }, {
    status: 'Active',
  });

  await seedReleaseIfEmpty();

  console.log('\n✨ Normalization complete.\n');
})();