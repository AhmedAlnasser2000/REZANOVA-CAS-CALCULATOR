#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  assertDetailSegmentBaselineUpdateAllowed,
  buildDetailSegmentBaseline,
  formatDetailSegmentReport,
  scanDetailSegmentRepository,
  validateDetailSegmentReport,
} from './detail-segment-migration-ratchet-core.mjs';

const BASELINE_PATH = 'tools/detail-segment-migration-baseline.json';

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
    else throw new Error(`Unknown detail-segment migration argument: ${argument}`);
  }
  return options;
}
const HELP = `Usage:
  npm run test:detail-segment-migration
  npm run report:detail-segment-migration -- --json
  npm run update:detail-segment-migration -- --accept --reason "durable explanation"
`;

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
  } else {
    const rootDir = process.cwd();
    const absoluteBaseline = path.join(rootDir, BASELINE_PATH);
    const report = scanDetailSegmentRepository({ rootDir });
    const existingBaseline = fs.existsSync(absoluteBaseline)
      ? JSON.parse(fs.readFileSync(absoluteBaseline, 'utf8'))
      : undefined;

    if (options.writeBaseline) {
      if (!options.accepted) throw new Error('Baseline updates require --accept');
      if (!options.reason?.trim()) throw new Error('Baseline updates require a non-empty --reason');
      assertDetailSegmentBaselineUpdateAllowed(report, existingBaseline);
      const baseline = buildDetailSegmentBaseline(report, options.reason);
      fs.writeFileSync(absoluteBaseline, `${JSON.stringify(baseline, null, 2)}\n`);
      process.stdout.write(
        `Updated detail-segment migration baseline: ${report.summary.undeclaredCount} undeclared producer(s).\n`,
      );
    } else {
      if (!existingBaseline) {
        throw new Error(`Detail-segment migration baseline is missing: ${BASELINE_PATH}`);
      }
      const validation = validateDetailSegmentReport(report, existingBaseline);
      process.stdout.write(options.json
        ? `${JSON.stringify({ ...report, validation }, null, 2)}\n`
        : `${formatDetailSegmentReport(report, validation)}\n`);
      if (!validation.ok) process.exitCode = 1;
    }
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
