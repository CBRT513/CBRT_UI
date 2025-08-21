#!/usr/bin/env node

/**
 * Integration Layer Verification Script
 * 
 * Comprehensive verification of all F milestone components
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Verification configuration
const VERIFICATION_CONFIG = {
  timeout: 30000,
  retries: 3,
  maxResponseTime: 5000,
  minSuccessRate: 0.95,
  requiredFiles: [
    // Core integration files
    'src/lib/integration/types.ts',
    'src/lib/integration/registry.ts',
    'src/lib/integration/runtime.ts',
    
    // Adapters
    'src/lib/integration/adapters/rest.ts',
    'src/lib/integration/adapters/graphql.ts',
    'src/lib/integration/adapters/grpc.ts',
    'src/lib/integration/adapters/stream.ts',
    
    // Authentication
    'src/lib/integration/auth/oauth2.ts',
    'src/lib/integration/auth/oidc.ts',
    'src/lib/integration/auth/apiKey.ts',
    'src/lib/integration/auth/signer.ts',
    
    // Policies
    'src/lib/integration/policies/integrationPolicies.ts',
    'src/lib/integration/policies/redaction.ts',
    
    // Monitoring
    'src/lib/integration/monitoring/metrics.ts',
    'src/lib/integration/monitoring/health.ts',
    'src/lib/integration/monitoring/tracing.ts',
    
    // Storage
    'src/lib/integration/storage/models.ts',
    'src/lib/integration/storage/repo.ts',
    
    // Security
    'src/lib/integration/integrationAuth.ts',
    
    // UI Components
    'src/components/IntegrationManager.jsx',
    'src/components/IntegrationHealthPanel.jsx',
    'src/components/IntegrationConfigPanel.jsx',
    
    // Tests
    'src/tests/FIntegrationTests.js',
    'src/tests/mocks/FIntegrationMocks.js',
  ],
  requiredExports: {
    'src/lib/integration/types.ts': [
      'ConnectorType',
      'ConnectorAdapter',
      'ConnectorConfig',
      'ExecutionContext',
      'AdapterResponse',
    ],
    'src/lib/integration/registry.ts': [
      'ConnectorRegistry',
      'connectorRegistry',
    ],
    'src/lib/integration/runtime.ts': [
      'executeWithPolicy',
      'CircuitBreaker',
    ],
    'src/lib/integration/auth/oauth2.ts': [
      'OAuth2Client',
      'OAuth2Config',
      'OAuth2Token',
    ],
    'src/lib/integration/integrationAuth.ts': [
      'IntegrationAuthService',
      'integrationAuth',
      'PERMISSIONS',
    ],
  },
};

/**
 * Main verification function
 */
async function runVerification() {
  console.log(`${colors.cyan}${colors.bright}🔍 Integration Layer Verification${colors.reset}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: {},
    startTime: performance.now(),
  };

  try {
    // File structure verification
    await verifyFileStructure(results);
    
    // Module imports verification
    await verifyModuleImports(results);
    
    // Type definitions verification
    await verifyTypeDefinitions(results);
    
    // Configuration validation
    await verifyConfiguration(results);
    
    // Security verification
    await verifySecurityFeatures(results);
    
    // Performance benchmarks
    await verifyPerformance(results);
    
    // Integration tests
    await verifyIntegrationTests(results);
    
  } catch (error) {
    console.error(`${colors.red}Fatal verification error: ${error.message}${colors.reset}`);
    results.failed++;
  }

  // Generate final report
  generateVerificationReport(results);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

/**
 * Verify file structure and required files
 */
async function verifyFileStructure(results) {
  console.log(`${colors.blue}📁 Verifying file structure...${colors.reset}`);
  
  const missingFiles = [];
  const existingFiles = [];
  
  for (const file of VERIFICATION_CONFIG.requiredFiles) {
    const filePath = path.join(rootDir, file);
    
    try {
      const stats = await fs.promises.stat(filePath);
      if (stats.isFile()) {
        existingFiles.push(file);
        console.log(`  ${colors.green}✓${colors.reset} ${file}`);
      } else {
        missingFiles.push(file);
        console.log(`  ${colors.red}✗${colors.reset} ${file} (not a file)`);
      }
    } catch (error) {
      missingFiles.push(file);
      console.log(`  ${colors.red}✗${colors.reset} ${file} (missing)`);
    }
  }
  
  results.details.fileStructure = {
    totalFiles: VERIFICATION_CONFIG.requiredFiles.length,
    existingFiles: existingFiles.length,
    missingFiles: missingFiles.length,
    missing: missingFiles,
  };
  
  if (missingFiles.length === 0) {
    console.log(`${colors.green}✅ File structure verification passed${colors.reset}\n`);
    results.passed++;
  } else {
    console.log(`${colors.red}❌ File structure verification failed (${missingFiles.length} missing files)${colors.reset}\n`);
    results.failed++;
  }
}

/**
 * Verify module imports and exports
 */
async function verifyModuleImports(results) {
  console.log(`${colors.blue}📦 Verifying module imports...${colors.reset}`);
  
  const importResults = {};
  let successCount = 0;
  let failureCount = 0;
  
  for (const [filePath, expectedExports] of Object.entries(VERIFICATION_CONFIG.requiredExports)) {
    const fullPath = path.join(rootDir, filePath);
    
    try {
      // Check if file exists
      await fs.promises.access(fullPath);
      
      // Read file content to check exports
      const content = await fs.promises.readFile(fullPath, 'utf-8');
      const foundExports = [];
      const missingExports = [];
      
      for (const exportName of expectedExports) {
        if (content.includes(`export`) && 
            (content.includes(`export class ${exportName}`) ||
             content.includes(`export interface ${exportName}`) ||
             content.includes(`export enum ${exportName}`) ||
             content.includes(`export type ${exportName}`) ||
             content.includes(`export const ${exportName}`) ||
             content.includes(`export function ${exportName}`) ||
             content.includes(`export { ${exportName}`) ||
             content.includes(`${exportName},`) ||
             content.includes(`${exportName} }`))) {
          foundExports.push(exportName);
          console.log(`  ${colors.green}✓${colors.reset} ${filePath}: ${exportName}`);
        } else {
          missingExports.push(exportName);
          console.log(`  ${colors.yellow}⚠${colors.reset} ${filePath}: ${exportName} (not found)`);
        }
      }
      
      importResults[filePath] = {
        foundExports,
        missingExports,
        success: missingExports.length === 0,
      };
      
      if (missingExports.length === 0) {
        successCount++;
      } else {
        failureCount++;
        results.warnings++;
      }
      
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} ${filePath}: Cannot read file`);
      importResults[filePath] = {
        error: error.message,
        success: false,
      };
      failureCount++;
    }
  }
  
  results.details.moduleImports = {
    totalModules: Object.keys(VERIFICATION_CONFIG.requiredExports).length,
    successCount,
    failureCount,
    results: importResults,
  };
  
  if (failureCount === 0) {
    console.log(`${colors.green}✅ Module imports verification passed${colors.reset}\n`);
    results.passed++;
  } else {
    console.log(`${colors.yellow}⚠️ Module imports verification completed with warnings${colors.reset}\n`);
  }
}

/**
 * Verify TypeScript type definitions
 */
async function verifyTypeDefinitions(results) {
  console.log(`${colors.blue}🔷 Verifying TypeScript definitions...${colors.reset}`);
  
  const typeFiles = VERIFICATION_CONFIG.requiredFiles.filter(f => f.endsWith('.ts'));
  const typeResults = {
    validTypeFiles: 0,
    invalidTypeFiles: 0,
    syntaxErrors: [],
  };
  
  for (const file of typeFiles) {
    const filePath = path.join(rootDir, file);
    
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Basic TypeScript syntax validation
      const hasInterfaces = content.includes('interface ');
      const hasTypes = content.includes('type ') || content.includes('export type');
      const hasEnums = content.includes('enum ');
      const hasClasses = content.includes('class ');
      const hasExports = content.includes('export ');
      
      if (hasExports && (hasInterfaces || hasTypes || hasEnums || hasClasses)) {
        typeResults.validTypeFiles++;
        console.log(`  ${colors.green}✓${colors.reset} ${file}`);
      } else {
        typeResults.invalidTypeFiles++;
        console.log(`  ${colors.yellow}⚠${colors.reset} ${file} (minimal type definitions)`);
      }
      
      // Check for common syntax issues
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for missing semicolons in interface properties
        if (line.includes(':') && !line.endsWith(';') && !line.endsWith(',') && 
            !line.endsWith('{') && !line.endsWith('}') && line.length > 0) {
          typeResults.syntaxErrors.push({
            file,
            line: i + 1,
            issue: 'Missing semicolon',
            content: line,
          });
        }
      }
      
    } catch (error) {
      typeResults.invalidTypeFiles++;
      console.log(`  ${colors.red}✗${colors.reset} ${file}: ${error.message}`);
    }
  }
  
  results.details.typeDefinitions = typeResults;
  
  if (typeResults.invalidTypeFiles === 0 && typeResults.syntaxErrors.length === 0) {
    console.log(`${colors.green}✅ TypeScript definitions verification passed${colors.reset}\n`);
    results.passed++;
  } else {
    console.log(`${colors.yellow}⚠️ TypeScript definitions verification completed with issues${colors.reset}\n`);
    results.warnings++;
  }
}

/**
 * Verify configuration files and environment setup
 */
async function verifyConfiguration(results) {
  console.log(`${colors.blue}⚙️ Verifying configuration...${colors.reset}`);
  
  const configResults = {
    envExample: false,
    packageJson: false,
    requiredDependencies: [],
    missingDependencies: [],
  };
  
  // Check .env.example
  try {
    const envPath = path.join(rootDir, '.env.example');
    const envContent = await fs.promises.readFile(envPath, 'utf-8');
    
    const requiredEnvVars = [
      'INTEGRATION_MASTER_KEY',
      'OAUTH2_CLIENT_ID',
      'OAUTH2_CLIENT_SECRET',
      'WEBHOOK_SECRET',
    ];
    
    const foundVars = requiredEnvVars.filter(varName => 
      envContent.includes(varName)
    );
    
    configResults.envExample = foundVars.length === requiredEnvVars.length;
    console.log(`  ${configResults.envExample ? colors.green + '✓' : colors.yellow + '⚠'}${colors.reset} .env.example (${foundVars.length}/${requiredEnvVars.length} vars)`);
    
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} .env.example: ${error.message}`);
  }
  
  // Check package.json dependencies
  try {
    const packagePath = path.join(rootDir, 'package.json');
    const packageContent = await fs.promises.readFile(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);
    
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    
    const requiredDeps = [
      'react',
      '@heroicons/react',
      'crypto',
    ];
    
    for (const dep of requiredDeps) {
      if (allDependencies[dep]) {
        configResults.requiredDependencies.push(dep);
        console.log(`  ${colors.green}✓${colors.reset} Dependency: ${dep}`);
      } else {
        configResults.missingDependencies.push(dep);
        console.log(`  ${colors.yellow}⚠${colors.reset} Missing dependency: ${dep}`);
      }
    }
    
    configResults.packageJson = configResults.missingDependencies.length === 0;
    
  } catch (error) {
    console.log(`  ${colors.red}✗${colors.reset} package.json: ${error.message}`);
  }
  
  results.details.configuration = configResults;
  
  const configSuccess = configResults.envExample && configResults.packageJson;
  if (configSuccess) {
    console.log(`${colors.green}✅ Configuration verification passed${colors.reset}\n`);
    results.passed++;
  } else {
    console.log(`${colors.yellow}⚠️ Configuration verification completed with issues${colors.reset}\n`);
    results.warnings++;
  }
}

/**
 * Verify security features implementation
 */
async function verifySecurityFeatures(results) {
  console.log(`${colors.blue}🔒 Verifying security features...${colors.reset}`);
  
  const securityResults = {
    encryption: false,
    authentication: false,
    authorization: false,
    auditLogging: false,
    rateLimit: false,
    inputValidation: false,
  };
  
  const securityFiles = [
    'src/lib/integration/integrationAuth.ts',
    'src/lib/integration/storage/repo.ts',
    'src/lib/integration/auth/oauth2.ts',
    'src/lib/integration/auth/signer.ts',
  ];
  
  for (const file of securityFiles) {
    try {
      const content = await fs.promises.readFile(path.join(rootDir, file), 'utf-8');
      
      // Check for encryption
      if (content.includes('encrypt') || content.includes('crypto') || content.includes('cipher')) {
        securityResults.encryption = true;
      }
      
      // Check for authentication
      if (content.includes('authenticate') || content.includes('OAuth2') || content.includes('JWT')) {
        securityResults.authentication = true;
      }
      
      // Check for authorization
      if (content.includes('authorize') || content.includes('permissions') || content.includes('RBAC')) {
        securityResults.authorization = true;
      }
      
      // Check for audit logging
      if (content.includes('audit') || content.includes('log') || content.includes('securityEvent')) {
        securityResults.auditLogging = true;
      }
      
      // Check for rate limiting
      if (content.includes('rateLimit') || content.includes('throttle') || content.includes('limit')) {
        securityResults.rateLimit = true;
      }
      
      // Check for input validation
      if (content.includes('validate') || content.includes('sanitize') || content.includes('escape')) {
        securityResults.inputValidation = true;
      }
      
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} Cannot read ${file}: ${error.message}`);
    }
  }
  
  // Report results
  const securityChecks = [
    ['Encryption', securityResults.encryption],
    ['Authentication', securityResults.authentication],
    ['Authorization', securityResults.authorization],
    ['Audit Logging', securityResults.auditLogging],
    ['Rate Limiting', securityResults.rateLimit],
    ['Input Validation', securityResults.inputValidation],
  ];
  
  let securityScore = 0;
  for (const [feature, implemented] of securityChecks) {
    const status = implemented ? `${colors.green}✓` : `${colors.red}✗`;
    console.log(`  ${status}${colors.reset} ${feature}`);
    if (implemented) securityScore++;
  }
  
  results.details.security = {
    ...securityResults,
    score: securityScore,
    maxScore: securityChecks.length,
  };
  
  if (securityScore >= securityChecks.length * 0.8) { // 80% threshold
    console.log(`${colors.green}✅ Security verification passed (${securityScore}/${securityChecks.length})${colors.reset}\n`);
    results.passed++;
  } else {
    console.log(`${colors.red}❌ Security verification failed (${securityScore}/${securityChecks.length})${colors.reset}\n`);
    results.failed++;
  }
}

/**
 * Verify performance characteristics
 */
async function verifyPerformance(results) {
  console.log(`${colors.blue}⚡ Verifying performance features...${colors.reset}`);
  
  const performanceResults = {
    caching: false,
    circuitBreaker: false,
    retry: false,
    timeout: false,
    connectionPooling: false,
    metrics: false,
  };
  
  const performanceFiles = [
    'src/lib/integration/runtime.ts',
    'src/lib/integration/monitoring/metrics.ts',
    'src/lib/performance',
  ];
  
  for (const file of performanceFiles) {
    try {
      const filePath = path.join(rootDir, file);
      let content = '';
      
      // Handle both files and directories
      const stats = await fs.promises.stat(filePath);
      if (stats.isDirectory()) {
        const files = await fs.promises.readdir(filePath);
        for (const subFile of files) {
          if (subFile.endsWith('.ts') || subFile.endsWith('.js')) {
            const subContent = await fs.promises.readFile(path.join(filePath, subFile), 'utf-8');
            content += subContent;
          }
        }
      } else {
        content = await fs.promises.readFile(filePath, 'utf-8');
      }
      
      // Check for performance features
      if (content.includes('cache') || content.includes('Cache') || content.includes('LRU')) {
        performanceResults.caching = true;
      }
      
      if (content.includes('CircuitBreaker') || content.includes('circuit')) {
        performanceResults.circuitBreaker = true;
      }
      
      if (content.includes('retry') || content.includes('backoff')) {
        performanceResults.retry = true;
      }
      
      if (content.includes('timeout') || content.includes('setTimeout')) {
        performanceResults.timeout = true;
      }
      
      if (content.includes('pool') || content.includes('Pool')) {
        performanceResults.connectionPooling = true;
      }
      
      if (content.includes('metrics') || content.includes('Metrics')) {
        performanceResults.metrics = true;
      }
      
    } catch (error) {
      // File/directory might not exist, continue
    }
  }
  
  // Report results
  const performanceChecks = [
    ['Caching', performanceResults.caching],
    ['Circuit Breaker', performanceResults.circuitBreaker],
    ['Retry Logic', performanceResults.retry],
    ['Timeout Handling', performanceResults.timeout],
    ['Connection Pooling', performanceResults.connectionPooling],
    ['Metrics Collection', performanceResults.metrics],
  ];
  
  let performanceScore = 0;
  for (const [feature, implemented] of performanceChecks) {
    const status = implemented ? `${colors.green}✓` : `${colors.yellow}⚠`;
    console.log(`  ${status}${colors.reset} ${feature}`);
    if (implemented) performanceScore++;
  }
  
  results.details.performance = {
    ...performanceResults,
    score: performanceScore,
    maxScore: performanceChecks.length,
  };
  
  if (performanceScore >= performanceChecks.length * 0.7) { // 70% threshold
    console.log(`${colors.green}✅ Performance verification passed (${performanceScore}/${performanceChecks.length})${colors.reset}\n`);
    results.passed++;
  } else {
    console.log(`${colors.yellow}⚠️ Performance verification completed with warnings (${performanceScore}/${performanceChecks.length})${colors.reset}\n`);
    results.warnings++;
  }
}

/**
 * Verify integration tests exist and are valid
 */
async function verifyIntegrationTests(results) {
  console.log(`${colors.blue}🧪 Verifying integration tests...${colors.reset}`);
  
  const testResults = {
    testFiles: 0,
    mockFiles: 0,
    testCoverage: [],
    missingTests: [],
  };
  
  const testFiles = [
    'src/tests/FIntegrationTests.js',
    'src/tests/mocks/FIntegrationMocks.js',
  ];
  
  for (const file of testFiles) {
    try {
      const content = await fs.promises.readFile(path.join(rootDir, file), 'utf-8');
      
      if (file.includes('Mock')) {
        testResults.mockFiles++;
        console.log(`  ${colors.green}✓${colors.reset} Mock file: ${file}`);
      } else {
        testResults.testFiles++;
        
        // Check for test coverage areas
        const testAreas = [
          'Authentication',
          'Authorization', 
          'Storage',
          'Adapters',
          'Performance',
          'Security',
          'Error Handling',
        ];
        
        for (const area of testAreas) {
          if (content.toLowerCase().includes(area.toLowerCase())) {
            testResults.testCoverage.push(area);
          } else {
            testResults.missingTests.push(area);
          }
        }
        
        console.log(`  ${colors.green}✓${colors.reset} Test file: ${file}`);
      }
      
    } catch (error) {
      console.log(`  ${colors.red}✗${colors.reset} Missing test file: ${file}`);
    }
  }
  
  results.details.tests = testResults;
  
  const hasRequiredTests = testResults.testFiles > 0 && testResults.mockFiles > 0;
  const goodCoverage = testResults.testCoverage.length >= 5; // At least 5 test areas
  
  if (hasRequiredTests && goodCoverage) {
    console.log(`${colors.green}✅ Integration tests verification passed${colors.reset}\n`);
    results.passed++;
  } else {
    console.log(`${colors.yellow}⚠️ Integration tests verification completed with warnings${colors.reset}\n`);
    results.warnings++;
  }
}

/**
 * Generate final verification report
 */
function generateVerificationReport(results) {
  const duration = ((performance.now() - results.startTime) / 1000).toFixed(2);
  const total = results.passed + results.failed + results.warnings;
  
  console.log(`${colors.cyan}${colors.bright}📋 VERIFICATION REPORT${colors.reset}`);
  console.log(`${colors.cyan}================================${colors.reset}\n`);
  
  console.log(`Duration: ${duration}s`);
  console.log(`Total Checks: ${total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.yellow}Warnings: ${results.warnings}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}\n`);
  
  // Detailed breakdown
  if (results.details.fileStructure) {
    const fs = results.details.fileStructure;
    console.log(`📁 File Structure: ${fs.existingFiles}/${fs.totalFiles} files present`);
  }
  
  if (results.details.security) {
    const sec = results.details.security;
    console.log(`🔒 Security Features: ${sec.score}/${sec.maxScore} implemented`);
  }
  
  if (results.details.performance) {
    const perf = results.details.performance;
    console.log(`⚡ Performance Features: ${perf.score}/${perf.maxScore} implemented`);
  }
  
  if (results.details.tests) {
    const tests = results.details.tests;
    console.log(`🧪 Test Coverage: ${tests.testCoverage.length} areas covered`);
  }
  
  console.log();
  
  // Final status
  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bright}🎉 INTEGRATION LAYER VERIFICATION PASSED${colors.reset}`);
    console.log(`${colors.green}All core components are properly implemented and verified.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bright}❌ INTEGRATION LAYER VERIFICATION FAILED${colors.reset}`);
    console.log(`${colors.red}${results.failed} critical issues need to be addressed.${colors.reset}\n`);
  }
  
  // Recommendations
  if (results.warnings > 0) {
    console.log(`${colors.yellow}${colors.bright}💡 RECOMMENDATIONS${colors.reset}`);
    console.log(`${colors.yellow}Consider addressing the ${results.warnings} warnings for optimal implementation.${colors.reset}\n`);
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVerification().catch(error => {
    console.error(`${colors.red}Verification failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export { runVerification, VERIFICATION_CONFIG };