#!/usr/bin/env node
import {
  buildWorkspaceFreshnessReport,
  formatWorkspaceFreshnessHuman,
  parseWorkspaceFreshnessArgs,
} from './workspace-freshness-core.mjs';

try {
  const options = parseWorkspaceFreshnessArgs(process.argv.slice(2));
  const report = buildWorkspaceFreshnessReport(process.cwd(), options.asOf);
  process.stdout.write(options.json
    ? `${JSON.stringify(report, null, 2)}\n`
    : formatWorkspaceFreshnessHuman(report));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
