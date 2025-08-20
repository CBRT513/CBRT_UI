const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccount = require('./src/cbrt-firebase-adminsdk.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function getSupplierCustomerRelationships() {
  try {
    console.log('🔍 Querying barcodes collection...');
    
    const barcodesRef = db.collection('barcodes');
    const snapshot = await barcodesRef.get();
    
    console.log(`📊 Found ${snapshot.size} barcode records`);
    
    // Track unique combinations
    const relationships = new Map();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const bolPrefix = data.BOLPrefix;
      const customerName = data.customerName;
      
      if (bolPrefix && customerName) {
        const key = `${bolPrefix}|${customerName}`;
        if (!relationships.has(key)) {
          relationships.set(key, {
            BOLPrefix: bolPrefix,
            customerName: customerName,
            count: 0
          });
        }
        relationships.get(key).count++;
      }
    });
    
    console.log('\n📋 Supplier (BOLPrefix) → Customer Relationships:');
    console.log('='.repeat(50));
    
    // Group by BOLPrefix
    const groupedBySupplier = new Map();
    relationships.forEach((rel) => {
      if (!groupedBySupplier.has(rel.BOLPrefix)) {
        groupedBySupplier.set(rel.BOLPrefix, []);
      }
      groupedBySupplier.get(rel.BOLPrefix).push(rel);
    });
    
    // Display results
    groupedBySupplier.forEach((customers, bolPrefix) => {
      console.log(`\n🏢 Supplier BOLPrefix: "${bolPrefix}"`);
      customers.forEach((rel) => {
        console.log(`   👤 Customer: "${rel.customerName}" (${rel.count} records)`);
      });
    });
    
    console.log('\n\n📊 Summary:');
    groupedBySupplier.forEach((customers, bolPrefix) => {
      const customerNames = customers.map(c => c.customerName).join(', ');
      console.log(`${bolPrefix}: ${customerNames}`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getSupplierCustomerRelationships();
