#!/usr/bin/env node
/**
 * Firestore Collection Scanner
 * Discovers all Firestore collection paths used in the app
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fastGlob from 'fast-glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Regex patterns to find Firestore operations
const patterns = {
  collection: [
    /collection\s*\(\s*db\s*,\s*["'`]([^"'`]+)["'`]/g,
    /collection\s*\(\s*firestore\s*,\s*["'`]([^"'`]+)["'`]/g,
    /\.collection\s*\(\s*["'`]([^"'`]+)["'`]/g,
  ],
  doc: [
    /doc\s*\(\s*db\s*,\s*["'`]([^"'`]+)["'`]\s*,\s*["'`]([^"'`]+)["'`]/g,
    /doc\s*\(\s*collection\s*\([^)]+\)\s*,\s*["'`]([^"'`]+)["'`]/g,
    /\.doc\s*\(\s*["'`]([^"'`]+)["'`]/g,
  ],
  query: [
    /query\s*\(\s*collection\s*\(\s*db\s*,\s*["'`]([^"'`]+)["'`]/g,
    /where\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /orderBy\s*\(\s*["'`]([^"'`]+)["'`]/g,
  ],
};

// Pattern to extract expected fields from component code
const fieldPatterns = [
  /row\.(\w+)/g,
  /item\.(\w+)/g,
  /data\.(\w+)/g,
  /\{[\s]*["']?(\w+)["']?\s*:\s*[^}]+\}/g,
  /field:\s*["'`](\w+)["'`]/g,
  /dataIndex:\s*["'`](\w+)["'`]/g,
  /name:\s*["'`](\w+)["'`]/g,
];

async function scanFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const relativePath = path.relative(projectRoot, filePath);
  const results = [];
  
  // Find collections
  for (const pattern of patterns.collection) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      results.push({
        path: match[1],
        type: 'collection',
        file: relativePath,
        line: getLineNumber(content, match.index),
      });
    }
  }
  
  // Find document references
  for (const pattern of patterns.doc) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const docPath = match[2] ? `${match[1]}/${match[2]}` : match[1];
      results.push({
        path: docPath,
        type: 'doc',
        file: relativePath,
        line: getLineNumber(content, match.index),
      });
    }
  }
  
  // Find query fields
  const queryFields = new Set();
  for (const pattern of patterns.query) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match[1] && !match[1].includes('/')) {
        queryFields.add(match[1]);
      }
    }
  }
  
  // Extract expected fields
  const expectedFields = new Set();
  for (const pattern of fieldPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const field = match[1];
      if (field && !field.includes('$') && field.length < 50) {
        expectedFields.add(field);
      }
    }
  }
  
  return {
    references: results,
    queryFields: Array.from(queryFields),
    expectedFields: Array.from(expectedFields),
  };
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

async function findCollections() {
  console.log('🔍 Scanning for Firestore collections...\n');
  
  // Find all relevant files
  const files = await fastGlob([
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
  ], {
    cwd: projectRoot,
    absolute: true,
  });
  
  console.log(`Found ${files.length} source files to scan`);
  
  const collectionMap = new Map();
  const fieldMap = new Map();
  
  for (const file of files) {
    const { references, queryFields, expectedFields } = await scanFile(file);
    
    for (const ref of references) {
      const key = `${ref.type}:${ref.path}`;
      if (!collectionMap.has(key)) {
        collectionMap.set(key, {
          path: ref.path,
          type: ref.type,
          files: [],
          queryFields: new Set(),
        });
      }
      
      const entry = collectionMap.get(key);
      entry.files.push({
        file: ref.file,
        line: ref.line,
      });
      
      // Add query fields
      for (const field of queryFields) {
        entry.queryFields.add(field);
      }
    }
    
    // Map expected fields to files
    const fileName = path.basename(file);
    if (fileName.includes('Manager') || fileName.includes('Route')) {
      fieldMap.set(file, expectedFields);
    }
  }
  
  // Convert to array and sort
  const collections = Array.from(collectionMap.values()).map(item => ({
    ...item,
    queryFields: Array.from(item.queryFields),
  })).sort((a, b) => a.path.localeCompare(b.path));
  
  // Infer expected fields per collection based on component names
  const collectionFields = {};
  for (const [file, fields] of fieldMap.entries()) {
    const fileName = path.basename(file, '.jsx');
    
    // Map Manager names to collection names
    const collectionMapping = {
      'ItemManager': 'items',
      'CustomerManager': 'customers',
      'SupplierManager': 'suppliers',
      'CarrierManager': 'carriers',
      'BarcodeManager': 'barcodes',
      'BargeManager': 'barges',
      'LotManager': 'lots',
      'ProductManager': 'products',
      'SizeManager': 'sizes',
      'StaffManager': 'staff',
      'TruckManager': 'trucks',
    };
    
    const collectionName = collectionMapping[fileName];
    if (collectionName && fields.length > 0) {
      collectionFields[collectionName] = fields;
    }
  }
  
  // Create audit directory
  const auditDir = path.join(projectRoot, 'audit');
  await fs.mkdir(auditDir, { recursive: true });
  
  // Write results
  const output = {
    timestamp: new Date().toISOString(),
    collections,
    expectedFields: collectionFields,
    summary: {
      totalCollections: collections.filter(c => c.type === 'collection').length,
      totalDocRefs: collections.filter(c => c.type === 'doc').length,
      totalFiles: files.length,
    },
  };
  
  await fs.writeFile(
    path.join(auditDir, 'collections.map.json'),
    JSON.stringify(output, null, 2)
  );
  
  // Print summary
  console.log('\n📊 Summary:');
  console.log(`  Collections found: ${output.summary.totalCollections}`);
  console.log(`  Document refs found: ${output.summary.totalDocRefs}`);
  console.log(`  Files scanned: ${output.summary.totalFiles}`);
  
  console.log('\n📁 Collections discovered:');
  collections
    .filter(c => c.type === 'collection')
    .forEach(c => {
      console.log(`  - ${c.path} (used in ${c.files.length} files)`);
    });
  
  console.log('\n✅ Results written to audit/collections.map.json');
}

// Run the scanner
findCollections().catch(err => {
  console.error('❌ Error scanning collections:', err);
  process.exit(1);
});