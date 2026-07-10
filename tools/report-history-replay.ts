import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  formatHistoryReplayReport,
  runHistoryReplayHarness,
} from '../src/lib/history-replay/replay-harness';

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const json = args.includes('--json');
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
const known = new Set(['--json', '--output', output]);
const invalid = args.find((arg) => !known.has(arg));
if (invalid || (outputIndex >= 0 && !output)) {
  throw new Error(`Invalid History replay report argument: ${invalid ?? '--output'}`);
}

const report = await runHistoryReplayHarness();
const rendered = json
  ? `${JSON.stringify(report, null, 2)}\n`
  : formatHistoryReplayReport(report);

if (output) {
  const target = resolve(output);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, rendered, 'utf8');
} else {
  process.stdout.write(rendered);
}

if (report.hardFailures.length > 0) {
  process.exitCode = 1;
}
