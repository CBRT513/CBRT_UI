// Simple script to query barcodes and show supplier-customer relationships
const { execSync } = require('child_process');

console.log('🔍 Querying Firebase for supplier-customer relationships...');
console.log('Using Firebase CLI to get barcode data...');

try {
  // Use Firebase CLI to export a small sample of barcodes data
  const result = execSync('firebase firestore:get barcodes --limit 20 --project cbrt-da5e3', { 
    encoding: 'utf8',
    cwd: '/Users/cerion/CBRT_UI'
  });
  
  console.log('Raw Firebase result:');
  console.log(result);
  
} catch (error) {
  console.error('Error querying Firebase:', error.message);
  
  // Fallback: Let's just show what we know from previous analysis
  console.log('\n📊 From Previous CSV Analysis:');
  console.log('=====================================');
  console.log('BOLPrefix → Customers:');
  console.log('• YAS: URC, AJF');
  console.log('• TRX: URC'); 
  console.log('• GNP: GNP');
  console.log('\nThis means:');
  console.log('- YAS supplier should show: URC, AJF customers');
  console.log('- TRX supplier should show: URC customer');
  console.log('- GNP supplier should show: GNP customer');
}
