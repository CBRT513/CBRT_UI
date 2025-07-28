// firestore_bulk_seed.js
// -------------------------------------------------------------
// Bulk‑update / seed your Firestore with the canonical schemas
// you specified (carriers → trucks relationship handled too).
// -------------------------------------------------------------
// 1)  Put your service‑account JSON in the project root and update SA_PATH.
// 2)  npm i firebase-admin slugify
// 3)  node firestore_bulk_seed.js   ← run it once.
// -------------------------------------------------------------

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import slugify from 'slugify';

// ————————————————————————————————————————————————————————————
// CONFIG
// ————————————————————————————————————————————————————————————
const SA_PATH = './cbrt-app-ui-dev-firebase-adminsdk-fbsvc-2a575db97d.json';
const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// helper to make nice deterministic IDs
const idFromName = (name) => slugify(name, { lower: true, strict: true });
const upsert = async (coll, id, data) => {
  const ref = id ? db.collection(coll).doc(id) : db.collection(coll).doc();
  await ref.set(data, { merge: true });
  return ref.id;
};

// ————————————————————————————————————————————————————————————
// MASTER DATA PAYLOAD  ▾  ↓  (edit if you need to!)
// ————————————————————————————————————————————————————————————
const carriers = [
  { id: '01HZZX9B9M7GJS8DKC6H51Z90E', CarrierName: 'AWL/TLX', Status: 'Active' },
  { CarrierName: 'PGT', Status: 'Active' },
  { CarrierName: 'Brutus', Status: 'Active' },
];

const trucks = [
  { CarrierName: 'AWL/TLX', TruckNumber: '3550', TrailerNumber: '3550', Status: 'Active' },
  { CarrierName: 'AWL/TLX', TruckNumber: '4550', TrailerNumber: '4550', Status: 'Active' },
];

const customers = [
  {
    CustomerName: 'URC',
    ShippingAddress: '1707 Riverside Drive',
    ShippingCity: 'Cincinnati',
    ShippingState: 'OH',
    ShippingZip: '45202',
    Status: 'Active',
  },
];

const suppliers = [
  { SupplierName: 'YAS', BOLPrefix: 'YAS', Status: 'Active' },
  { SupplierName: 'Traxys', BOLPrefix: 'TRX', Status: 'Active' },
  { SupplierName: 'GNPGraystar', BOLPrefix: 'GNP', Status: 'Active' },
];

const items = [
  { ItemCode: 'WFA', ItemName: 'White Fused Alumina' },
  { ItemCode: 'BXHDLS', ItemName: 'Bauxite HDLS' },
  { ItemCode: 'SIC97', ItemName: 'Silicone Carbide' },
  { ItemCode: 'BX85', ItemName: 'Bauxite 85 (Regular)' },
];

const sizes = [
  '3x6', '6x14', '-28', '6x16', '-16', '3x8', '6x8', '8x14', '14x28',
  '6x10', '10x16', '16x35', '35x70', '-100', '-200', '-325', '3/4x3/8',
];

// Sample products (combinations of items + sizes)
const products = [
  { ItemCode: 'WFA', ItemName: 'White Fused Alumina', SizeName: '3x6', standardWeight: 50 },
  { ItemCode: 'WFA', ItemName: 'White Fused Alumina', SizeName: '6x14', standardWeight: 50 },
  { ItemCode: 'BXHDLS', ItemName: 'Bauxite HDLS', SizeName: '-28', standardWeight: 55 },
  { ItemCode: 'SIC97', ItemName: 'Silicone Carbide', SizeName: '6x16', standardWeight: 45 },
  { ItemCode: 'BX85', ItemName: 'Bauxite 85 (Regular)', SizeName: '-16', standardWeight: 52 },
];

// Sample staff
const staff = [
  { name: 'John Admin', email: 'john@cbrt.com', role: 'Admin', authType: 'Google', status: 'Active' },
  { name: 'Jane Office', email: 'jane@cbrt.com', role: 'Office', authType: 'Email', status: 'Active' },
  { name: 'Bob Warehouse', email: 'bob@cbrt.com', role: 'Warehouse', authType: 'Email', status: 'Active' },
];

// ————————————————————————————————————————————————————————————
// MAIN SEED ROUTINE
// ————————————————————————————————————————————————————————————
(async () => {
  // ▸ carriers
  const carrierIdByName = {};
  for (const c of carriers) {
    const docId = c.id || idFromName(c.CarrierName);
    const id = await upsert('carriers', docId, {
      CarrierName: c.CarrierName,
      Status: c.Status,
    });
    carrierIdByName[c.CarrierName] = id;
    console.log(`✔ carrier  ${c.CarrierName} → ${id}`);
  }

  // ▸ trucks  (resolve Carrier FK)
  for (const t of trucks) {
    const carrierId = carrierIdByName[t.CarrierName];
    if (!carrierId) {
      console.warn(`⚠  carrier "${t.CarrierName}" missing – skipped truck ${t.TruckNumber}`);
      continue;
    }
    await upsert('trucks', null, {
      Carrier: carrierId,
      TruckNumber: t.TruckNumber,
      TrailerNumber: t.TrailerNumber,
      Status: t.Status,
    });
    console.log(`✔ truck ${t.TruckNumber}`);
  }

  // ▸ customers
  for (const c of customers) {
    const id = idFromName(c.CustomerName);
    await upsert('customers', id, {
      CustomerName: c.CustomerName,
      ShippingAddress: c.ShippingAddress,
      ShippingCity: c.ShippingCity,
      ShippingState: c.ShippingState,
      ShippingZip: c.ShippingZip,
      Status: c.Status,
    });
    console.log(`✔ customer ${c.CustomerName}`);
  }

  // ▸ suppliers
  for (const s of suppliers) {
    await upsert('suppliers', idFromName(s.SupplierName), s);
    console.log(`✔ supplier ${s.SupplierName}`);
  }

  // ▸ staff
  for (const s of staff) {
    await upsert('staff', idFromName(s.name), s);
    console.log(`✔ staff ${s.name}`);
  }

  // ▸ items
  for (const i of items) {
    await upsert('items', i.ItemCode, i);
  }
  console.log(`✔ items (${items.length})`);

  // ▸ sizes
  for (const sz of sizes) {
    await upsert('sizes', idFromName(sz), { SizeName: sz });
  }
  console.log(`✔ sizes (${sizes.length})`);

  // ▸ products
  for (const p of products) {
    const id = `${p.ItemCode}-${idFromName(p.SizeName)}`;
    await upsert('products', id, p);
  }
  console.log(`✔ products (${products.length})`);

  console.log('\n✨ All done');
  process.exit(0);
})();