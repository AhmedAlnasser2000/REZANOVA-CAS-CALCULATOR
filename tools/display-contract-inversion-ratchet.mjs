#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  assertDisplayContractInversionBaselineUpdateAllowed,
  buildDisplayContractInversionBaseline,
  formatDisplayContractInversionReport,
  scanDisplayContractInversionRepository,
  validateDisplayContractInversionReport,
} from './display-contract-inversion-ratchet-core.mjs';

const BASELINE_PATH = 'tools/display-contract-inversion-baseline.json';

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
    else throw new Error(`Unknown display contract inversion argument: ${argument}`);
  }
  return options;
}

const HELP = `Usage:
  npm run test:display-contract-inversion
  npm run report:display-contract-inversion -- --json
  npm run update:display-contract-inversion -- --accept --reason "durable explanation"
`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
  } else {
    const rootDir = process.cwd();
    const absoluteBaseline = path.join(rootDir, BASELINE_PATH);
    const report = scanDisplayContractInversionRepository({ rootDir });
    const existingBaseline = fs.existsSync(absoluteBaseline)
      ? JSON.parse(fs.readFileSync(absoluteBaseline, 'utf8'))
      : undefined;

    if (options.writeBaseline) {
      if (!options.accepted) throw new Error('Baseline updates require --accept');
      if (!options.reason?.trim()) throw new Error('Baseline updates require a non-empty --reason');
      assertDisplayContractInversionBaselineUpdateAllowed(report, existingBaseline);
      const baseline = buildDisplayContractInversionBaseline(report, options.reason);
      fs.writeFileSync(absoluteBaseline, `${JSON.stringify(baseline, null, 2)}\n`);
      process.stdout.write(
        `Updated display contract inversion baseline: ${report.summary.compatibilityProjectionCount} compatibility projection(s), ${report.summary.legacyReadCount} legacy read(s).\n`,
      );
    } else {
      if (!existingBaseline) {
        throw new Error(`Display contract inversion baseline is missing: ${BASELINE_PATH}`);
      }
      const validation = validateDisplayContractInversionReport(report, existingBaseline);
      process.stdout.write(
        options.json
          ? `${JSON.stringify({ ...report, validation }, null, 2)}\n`
          : `${formatDisplayContractInversionReport(report, validation)}\n`,
      );
      if (!validation.ok) process.exitCode = 1;
    }
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
