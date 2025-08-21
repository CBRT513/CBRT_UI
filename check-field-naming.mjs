#!/usr/bin/env node
import fs from 'fs';

const auditData = JSON.parse(fs.readFileSync('audit/firestore_audit.json', 'utf8'));

console.log('🔍 Field Naming Convention Analysis\n');
console.log('=' .repeat(60));

const collectionsWithPascalCase = [];
const collectionsWithCamelCase = [];

auditData.results.forEach(collection => {
  if (collection.count > 0 && collection.sampleDocs.length > 0) {
    const sampleDoc = collection.sampleDocs[0];
    const fields = Object.keys(sampleDoc).filter(k => k !== 'id');
    
    const hasPascalCase = fields.some(f => 
      /^[A-Z]/.test(f) && !['ID', 'URL'].includes(f)
    );
    
    const hasCamelCase = fields.some(f => 
      /^[a-z]/.test(f) && f !== 'id'
    );
    
    if (hasPascalCase || hasCamelCase) {
      console.log(`\n📁 Collection: ${collection.path}`);
      console.log(`   Documents: ${collection.count}`);
      
      const pascalFields = fields.filter(f => /^[A-Z]/.test(f));
      const camelFields = fields.filter(f => /^[a-z]/.test(f) && f !== 'id');
      
      if (pascalFields.length > 0) {
        console.log(`   ❌ PascalCase fields: ${pascalFields.join(', ')}`);
        collectionsWithPascalCase.push({
          name: collection.path,
          fields: pascalFields
        });
      }
      
      if (camelFields.length > 0) {
        console.log(`   ✅ camelCase fields: ${camelFields.join(', ')}`);
        collectionsWithCamelCase.push({
          name: collection.path,
          fields: camelFields
        });
      }
    }
  }
});

console.log('\n' + '=' .repeat(60));
console.log('\n📊 Summary:');
console.log(`\nCollections with PascalCase fields (need fixing):`);
collectionsWithPascalCase.forEach(c => {
  console.log(`  - ${c.name}: ${c.fields.join(', ')}`);
});

console.log(`\nCollections with camelCase fields (correct):`);
collectionsWithCamelCase.forEach(c => {
  console.log(`  - ${c.name}: ${c.fields.slice(0, 3).join(', ')}...`);
});

process.exit(0);