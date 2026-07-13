import { readFileSync, writeFileSync } from 'node:fs';
import {
  buildMathJsonCoverageReport,
} from '../src/lib/result-contract/mathjson-coverage';
import {
  createMathJsonCoverageBaseline,
  validateMathJsonCoverageBaseline,
  type MathJsonCoverageBaseline,
} from '../src/lib/result-contract/mathjson-coverage-ratchet';

const BASELINE_PATH = 'tools/mathjson-coverage-baseline.json';
const args = process.argv.slice(2);
const json = args.includes('--json');
const writeBaseline = args.includes('--write-baseline');
const accept = args.includes('--accept');
const reasonIndex = args.indexOf('--reason');
const reason = reasonIndex >= 0 ? args[reasonIndex + 1]?.trim() : undefined;

const report = await buildMathJsonCoverageReport();

if (writeBaseline) {
  if (!accept || !reason) {
    throw new Error('Baseline updates require --accept --reason "durable explanation".');
  }
  const baseline = createMathJsonCoverageBaseline(report, reason);
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Updated ${BASELINE_PATH}: ${reason}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as MathJsonCoverageBaseline;
const validation = validateMathJsonCoverageBaseline(report, baseline);
if (json) {
  console.log(JSON.stringify({ ...report, validation }, null, 2));
} else {
  console.log('MathJSON coverage ratchet v2');
  console.log(`Replay fixtures: ${report.replayFixtureCount}`);
  console.log(`Golden cases: ${report.goldenCaseCount}`);
  console.log(`Executable evidence: ${report.evidenceCount}`);
  console.log(`Route families: ${report.routeCount}`);
  console.log(`Canonical leaves: ${report.totals.leaves}`);
  console.log(`Proven MathJSON: ${report.totals.proven}`);
  console.log(`Exempt: ${report.totals.exempt}`);
  console.log(`Missing proof: ${report.totals.missing}`);
  console.log(`Serialized bytes: ${report.totals.bytes}`);
  console.log(`Maximum document: ${report.totals.maxBytes} bytes`);
  console.log(`Baseline: ${validation.ok ? 'pass' : 'fail'}`);
}
if (!validation.ok) {
  throw new Error(validation.errors.join('\n'));
}
