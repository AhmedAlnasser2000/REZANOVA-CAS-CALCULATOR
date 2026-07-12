#!/usr/bin/env node
import { scanResultIntent } from './result-intent-ratchet-core.mjs';

const report = scanResultIntent();
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  process.stdout.write(
    `Result intent: ${report.summary.declaredDirectAssignments}/${report.summary.directSummaryAssignments} direct summary assignments declared; ${report.summary.violationCount} violation(s).\n`,
  );
  for (const violation of report.violations) {
    process.stdout.write(`- ${violation.file}:${violation.line} ${violation.message}\n`);
  }
}

if (report.violations.length > 0) process.exitCode = 1;
