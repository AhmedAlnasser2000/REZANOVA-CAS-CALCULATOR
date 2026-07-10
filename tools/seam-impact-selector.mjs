#!/usr/bin/env node
import {
  formatHumanPlan,
  parseSelectorArgs,
  resolveSelectorPlan,
  runAdditionalCommands,
} from './seam-impact-selector-core.mjs';

const HELP = `Usage:
  npm run seam:impact -- --base <rev> --head <rev> [--format human|json] [--run]
  npm run seam:impact -- --path <repo-path> [--path <repo-path> ...] [--format human|json] [--run]
  npm run seam:impact -- --github-event [--event-file <path>] [--format human|json] [--run]
`;

try {
  const options = parseSelectorArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
  } else {
    const plan = resolveSelectorPlan(options);
    process.stdout.write(
      options.format === 'json'
        ? `${JSON.stringify(plan, null, 2)}\n`
        : `${formatHumanPlan(plan)}\n`,
    );
    if (options.run) runAdditionalCommands(plan);
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
