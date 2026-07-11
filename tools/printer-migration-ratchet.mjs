#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  assertPrinterMigrationBaselineUpdateAllowed,
  buildPrinterMigrationBaseline,
  formatPrinterMigrationReport,
  scanPrinterMigrationRepository,
  validatePrinterMigrationReport,
} from './printer-migration-ratchet-core.mjs';

const BASELINE_PATH = 'tools/printer-migration-baseline.json';

function parseArgs(argv) {
  const options = { json: false, writeBaseline: false, accepted: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') options.json = true;
    else if (argument === '--write-baseline') options.writeBaseline = true;
    else if (argument === '--accept') options.accepted = true;
    else if (argument === '--reason') {
      options.reason = argv[index + 1];
      index += 1;
    } else if (argument === '--help') options.help = true;
    else throw new Error(`Unknown printer migration argument: ${argument}`);
  }
  return options;
}

const HELP = `Usage:
  npm run test:printer-migration
  npm run report:printer-migration -- --json
  npm run update:printer-migration -- --accept --reason "durable explanation"
`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
  } else {
    const rootDir = process.cwd();
    const absoluteBaseline = path.join(rootDir, BASELINE_PATH);
    const report = scanPrinterMigrationRepository({ rootDir });
    const existingBaseline = fs.existsSync(absoluteBaseline)
      ? JSON.parse(fs.readFileSync(absoluteBaseline, 'utf8'))
      : undefined;

    if (options.writeBaseline) {
      if (!options.accepted) throw new Error('Baseline updates require --accept');
      if (!options.reason?.trim()) throw new Error('Baseline updates require a non-empty --reason');
      assertPrinterMigrationBaselineUpdateAllowed(report, existingBaseline);
      const baseline = buildPrinterMigrationBaseline(report, options.reason);
      fs.writeFileSync(absoluteBaseline, `${JSON.stringify(baseline, null, 2)}\n`);
      process.stdout.write(
        `Updated printer migration baseline: ${report.summary.compatibilityFallbackCount} compatibility assignment(s).\n`,
      );
    } else {
      if (!existingBaseline) {
        throw new Error(`Printer migration baseline is missing: ${BASELINE_PATH}`);
      }
      const validation = validatePrinterMigrationReport(report, existingBaseline);
      process.stdout.write(
        options.json
          ? `${JSON.stringify({ ...report, validation }, null, 2)}\n`
          : `${formatPrinterMigrationReport(report, validation)}\n`,
      );
      if (!validation.ok) process.exitCode = 1;
    }
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
