#!/usr/bin/env node

/**
 * Seed Firestore with Test Data
 * Creates a complete test environment with all necessary collections
 * 
 * Usage:
 *   npm run seed:dev      # Seeds DEV environment
 *   node scripts/seed-data.js --minimal  # Minimal dataset
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'cbrt-app-ui-dev';
const MINIMAL = process.argv.includes('--minimal');

console.log(`
╔════════════════════════════════════════════╗
║           FIRESTORE SEED UTILITY           ║
╠════════════════════════════════════════════╣
║  Project: ${PROJECT_ID.padEnd(34)}║
║  Mode: ${(MINIMAL ? 'Minimal' : 'Full').padEnd(37)}║
╚════════════════════════════════════════════╝
`);

// Initialize Firebase Admin
let app;
try {
  app = initializeApp({
    projectId: PROJECT_ID
  });
} catch (error) {
  console.error('Failed to initialize Firebase:', error.message);
  process.exit(1);
}

const db = getFirestore(app);

// Seed data definitions
const seedData = {
  // Staff with permissions
  staff: [
    {
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@cbrt.com',
      role: 'admin',
      isVerifier: true,
      perms: { canStage: true, canVerify: true, canLoad: true },
      createdAt: Timestamp.now()
    },
    {
      id: 'stager-001',
      name: 'John Stager',
      email: 'stager@cbrt.com',
      role: 'warehouse',
      isVerifier: false,
      perms: { canStage: true, canVerify: false, canLoad: false },
      createdAt: Timestamp.now()
    },
    {
      id: 'verifier-001',
      name: 'Jane Verifier',
      email: 'verifier@cbrt.com',
      role: 'supervisor',
      isVerifier: true,
      perms: { canStage: false, canVerify: true, canLoad: false },
      createdAt: Timestamp.now()
    },
    {
      id: 'loader-001',
      name: 'Bob Loader',
      email: 'loader@cbrt.com',
      role: 'warehouse',
      isVerifier: false,
      perms: { canStage: false, canVerify: false, canLoad: true },
      createdAt: Timestamp.now()
    }
  ],

  // Customers
  customers: [
    {
      CustomerName: 'Acme Corporation',
      CustomerCode: 'ACME',
      Address: '123 Main St',
      City: 'Springfield',
      State: 'IL',
      Contact: 'John Doe',
      Email: 'john@acme.com',
      Phone: '555-0100'
    },
    {
      CustomerName: 'Beta Industries',
      CustomerCode: 'BETA',
      Address: '456 Oak Ave',
      City: 'Riverside',
      State: 'CA',
      Contact: 'Jane Smith',
      Email: 'jane@beta.com',
      Phone: '555-0200'
    },
    {
      CustomerName: 'Gamma Tech',
      CustomerCode: 'GAMMA',
      Address: '789 Pine Rd',
      City: 'Austin',
      State: 'TX',
      Contact: 'Bob Johnson',
      Email: 'bob@gamma.com',
      Phone: '555-0300'
    }
  ],

  // Suppliers
  suppliers: [
    {
      SupplierName: 'Global Logistics',
      SupplierCode: 'GL001',
      Address: '100 Port Blvd',
      City: 'Seattle',
      State: 'WA'
    },
    {
      SupplierName: 'Regional Transport',
      SupplierCode: 'RT001',
      Address: '200 Highway Dr',
      City: 'Dallas',
      State: 'TX'
    }
  ],

  // Items
  items: [
    { ItemName: 'Widget A', ItemCode: 'WGT-A', Category: 'Hardware' },
    { ItemName: 'Widget B', ItemCode: 'WGT-B', Category: 'Hardware' },
    { ItemName: 'Widget C', ItemCode: 'WGT-C', Category: 'Hardware' },
    { ItemName: 'Gadget X', ItemCode: 'GDG-X', Category: 'Electronics' },
    { ItemName: 'Gadget Y', ItemCode: 'GDG-Y', Category: 'Electronics' }
  ],

  // Sizes
  sizes: [
    { SizeName: 'Small', SizeCode: 'S' },
    { SizeName: 'Medium', SizeCode: 'M' },
    { SizeName: 'Large', SizeCode: 'L' },
    { SizeName: 'Extra Large', SizeCode: 'XL' }
  ],

  // Inventory Lots
  inventoryLots: [
    {
      id: 'LOT-001',
      itemName: 'Widget A',
      itemCode: 'WGT-A',
      onHandQty: 1000,
      committedQty: 0,
      availableQty: 1000,
      location: 'A-1-1'
    },
    {
      id: 'LOT-002',
      itemName: 'Widget B',
      itemCode: 'WGT-B',
      onHandQty: 750,
      committedQty: 0,
      availableQty: 750,
      location: 'B-2-3'
    },
    {
      id: 'LOT-003',
      itemName: 'Widget C',
      itemCode: 'WGT-C',
      onHandQty: 500,
      committedQty: 0,
      availableQty: 500,
      location: 'C-3-2'
    }
  ],

  // Releases with different statuses
  releases: [
    {
      ReleaseNumber: 'REL-2024-001',
      number: 'REL-2024-001',
      customerName: 'Acme Corporation',
      shipToName: 'Acme Warehouse #1',
      status: 'Entered',
      statusChangedAt: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000)),
      carrierMode: 'SupplierArranged',
      LineItems: [
        { ItemName: 'Widget A', Quantity: 50, lotId: 'LOT-001' },
        { ItemName: 'Widget B', Quantity: 30, lotId: 'LOT-002' }
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      ReleaseNumber: 'REL-2024-002',
      number: 'REL-2024-002',
      customerName: 'Beta Industries',
      shipToName: 'Beta Distribution Center',
      status: 'Entered',
      statusChangedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)),
      carrierMode: 'CustomerArranged',
      LineItems: [
        { ItemName: 'Widget C', Quantity: 25, lotId: 'LOT-003' }
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      ReleaseNumber: 'REL-2024-003',
      number: 'REL-2024-003',
      customerName: 'Gamma Tech',
      stagingLocation: 'Allied',
      status: 'Staged',
      statusChangedAt: Timestamp.fromDate(new Date(Date.now() - 1 * 60 * 60 * 1000)),
      stagedBy: 'stager-001',
      stagedAt: Timestamp.fromDate(new Date(Date.now() - 1 * 60 * 60 * 1000)),
      carrierMode: 'SupplierArranged',
      LineItems: [
        { ItemName: 'Widget A', Quantity: 100, qtyStaged: 100, lotId: 'LOT-001' },
        { ItemName: 'Widget B', Quantity: 50, qtyStaged: 50, lotId: 'LOT-002' }
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ],

  // Carriers
  carriers: [
    { CarrierName: 'FastShip Express', CarrierCode: 'FSE', Type: 'LTL' },
    { CarrierName: 'Regional Freight', CarrierCode: 'RFL', Type: 'FTL' }
  ],

  // Trucks
  trucks: [
    { TruckNumber: 'TRK-001', Carrier: 'FastShip Express', Capacity: 10000 },
    { TruckNumber: 'TRK-002', Carrier: 'Regional Freight', Capacity: 20000 }
  ]
};

async function seedCollection(collectionName, documents) {
  console.log(`\nSeeding ${collectionName}...`);
  let count = 0;
  
  for (const doc of documents) {
    try {
      if (doc.id) {
        // Use specific ID
        await db.collection(collectionName).doc(doc.id).set(doc);
      } else {
        // Auto-generate ID
        await db.collection(collectionName).add(doc);
      }
      count++;
      process.stdout.write(`  ✅ ${count}/${documents.length}\r`);
    } catch (error) {
      console.error(`\n  ❌ Error seeding ${collectionName}:`, error.message);
    }
  }
  console.log(`  ✅ ${count}/${documents.length} documents created`);
}

async function seedDatabase() {
  console.log('\n🌱 Starting seed process...\n');
  
  // Seed collections in order
  const collections = MINIMAL ? 
    ['staff', 'customers', 'items', 'inventoryLots', 'releases'] :
    Object.keys(seedData);
  
  for (const collection of collections) {
    if (seedData[collection]) {
      await seedCollection(collection, seedData[collection]);
    }
  }
  
  console.log(`
╔════════════════════════════════════════════╗
║           SEED COMPLETE                    ║
║  Database populated with test data         ║
╚════════════════════════════════════════════╝

Test accounts created:
  • admin@cbrt.com (all permissions)
  • stager@cbrt.com (can stage)
  • verifier@cbrt.com (can verify)
  • loader@cbrt.com (can load)

Test releases:
  • 2 in "Entered" status (ready to stage)
  • 1 in "Staged" status (ready to verify)

Next steps:
  1. Start dev server: npm run dev
  2. Navigate to: http://localhost:5173/ops/queues
  3. Test F7/F8 workflows
`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0));
}