#!/usr/bin/env node

/**
 * D5 Validation Test Runner
 * Run with: node src/tests/run-d5-validation.js
 */

import { runAllScenarios, generateReport } from './knowledge-flow-test.js';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('🚀 Starting D5 Operational AI Validation\n');
  
  try {
    // Run all test scenarios
    const { results, summary } = await runAllScenarios({
      explainReasoning: true,
      persist: false,
      verbose: true,
    });
    
    // Generate detailed report
    const report = generateReport(results, summary);
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'docs', 'D5_VALIDATION_REPORT.md');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report, 'utf-8');
    
    console.log(`\n✅ Report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    const successRate = summary.successfulScenarios / summary.totalScenarios;
    if (successRate >= 0.7) {
      console.log('\n🎉 D5 Validation PASSED! System is operational.');
      process.exit(0);
    } else {
      console.log('\n⚠️ D5 Validation needs improvement. Success rate below 70%.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as runD5Validation };