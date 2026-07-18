#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  baseRefFromGitHubEvent,
  readBaselineAtGitRef,
  readEnforcementBaseline,
  readProducerVersionPolicyAtGitRef,
  validateCurrentRepository,
} from './canonical-result-v2-enforcement-core.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = process.cwd();
let baseRef = argumentValue('--base-ref');
if (process.argv.includes('--github-event')) {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('--github-event requires GITHUB_EVENT_PATH.');
  baseRef = baseRefFromGitHubEvent(JSON.parse(readFileSync(eventPath, 'utf8')));
}

const baseline = readEnforcementBaseline(root);
const baseBaseline = baseRef ? readBaselineAtGitRef(root, baseRef) : undefined;
const basePolicy = baseRef ? readProducerVersionPolicyAtGitRef(root, baseRef) : undefined;
const result = validateCurrentRepository(
  root,
  baseline,
  baseBaseline,
  basePolicy?.explicitV2DefaultRouteIds,
);
if (!result.ok) {
  process.stderr.write(`${result.errors.join('\n')}\n`);
  process.exitCode = 1;
} else {
  const comparison = baseRef && baseBaseline ? ` against ${baseRef}` : '';
  process.stdout.write(
    `Canonical Result V2 enforcement passed for ${baseline.files.length} frozen producer files${comparison}.\n`,
  );
}
