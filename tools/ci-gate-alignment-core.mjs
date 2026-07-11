import { readFileSync } from 'node:fs';
import path from 'node:path';

export const STATIC_GATE_COMMANDS = [
  'npm run test:memory-protocol',
  'npm run test:ci-gate-alignment',
  'npm run test:seam-impact-selector',
  'npm run test:printer-migration',
  'npm run test:detail-segment-migration',
  'npm run test:clipboard-contract',
  'npm run test:app-identity',
  'npm run test:surface-protocol',
  'npm run test:ooe-boundaries',
  'npm run test:compartments-boundaries',
  'npm run test:file-sizes',
  'npm run test:canary-registry',
  'npm run test:runtime-probes',
];

export const CANARY_COMMAND = 'npm run test:canaries:browser';
export const PACKAGE_COMMAND = 'npm run tauri:build';
export const SEAM_IMPACT_COMMAND = 'npm run seam:impact -- --github-event --run';

function assertIncludes(text, value, label) {
  if (!text.includes(value)) {
    throw new Error(`${label} must include ${value}`);
  }
}

function assertCommands(text, commands, label) {
  for (const command of commands) {
    assertIncludes(text, `run: ${command}`, label);
  }
}

function assertCiTriggers(ciWorkflow) {
  assertIncludes(ciWorkflow, '  pull_request:', 'CI workflow');
  assertIncludes(ciWorkflow, '      - main', 'CI workflow');
}

function assertCiCanaryJob(ciWorkflow) {
  const jobIndex = ciWorkflow.indexOf('  e2e-linux:');
  const canaryIndex = ciWorkflow.indexOf(`run: ${CANARY_COMMAND}`);
  if (jobIndex < 0 || canaryIndex < jobIndex) {
    throw new Error(`CI e2e-linux job must include ${CANARY_COMMAND}`);
  }
  if (/\be2e-linux:\s*[\s\S]*?\bneeds:\s*ci-linux\b/u.test(ciWorkflow)) {
    throw new Error('CI e2e-linux job must run independently from ci-linux');
  }
}

function assertCiSeamImpactRunner(ciWorkflow) {
  assertIncludes(ciWorkflow, `run: ${SEAM_IMPACT_COMMAND}`, 'CI workflow');
  assertIncludes(ciWorkflow, 'fetch-depth: 0', 'CI workflow checkout');
  const seamIndex = ciWorkflow.indexOf(`run: ${SEAM_IMPACT_COMMAND}`);
  const unitIndex = ciWorkflow.indexOf('run: npm run test:unit');
  if (seamIndex < 0 || unitIndex < 0 || seamIndex >= unitIndex) {
    throw new Error('CI workflow must run seam impact evidence before broad unit tests');
  }
}

function assertCanaryOrdering(workflow, beforeCommand, label) {
  const canaryIndex = workflow.indexOf(`run: ${CANARY_COMMAND}`);
  const boundaryIndex = workflow.indexOf(`run: ${beforeCommand}`);
  if (canaryIndex < 0 || boundaryIndex < 0 || canaryIndex >= boundaryIndex) {
    throw new Error(`${label} must run ${CANARY_COMMAND} before ${beforeCommand}`);
  }
}

function assertCommandsBefore(workflow, commands, beforeCommand, label) {
  const boundaryIndex = workflow.indexOf(`run: ${beforeCommand}`);
  for (const command of commands) {
    const commandIndex = workflow.indexOf(`run: ${command}`);
    if (commandIndex < 0 || boundaryIndex < 0 || commandIndex >= boundaryIndex) {
      throw new Error(`${label} must run ${command} before ${beforeCommand}`);
    }
  }
}

function assertNoPlaywrightRetries(playwrightConfig, workflows) {
  if (!/\bretries:\s*0\s*[,\n]/u.test(playwrightConfig)) {
    throw new Error('Playwright configuration must pin retries to 0');
  }
  for (const [label, workflow] of workflows) {
    if (/--retries(?:=|\s)/u.test(workflow)) {
      throw new Error(`${label} must not override Playwright retries`);
    }
  }
}

export function validateCiGateAlignment({
  ciWorkflow,
  releaseWorkflow,
  playwrightConfig,
}) {
  assertCiTriggers(ciWorkflow);
  assertCommands(ciWorkflow, STATIC_GATE_COMMANDS, 'CI workflow');
  assertCiCanaryJob(ciWorkflow);
  assertCiSeamImpactRunner(ciWorkflow);

  assertCommands(releaseWorkflow, STATIC_GATE_COMMANDS, 'Linux release workflow');
  assertCommandsBefore(
    releaseWorkflow,
    STATIC_GATE_COMMANDS,
    PACKAGE_COMMAND,
    'Linux release workflow',
  );
  assertCanaryOrdering(releaseWorkflow, PACKAGE_COMMAND, 'Linux release workflow');
  assertNoPlaywrightRetries(playwrightConfig, [
    ['CI workflow', ciWorkflow],
    ['Linux release workflow', releaseWorkflow],
  ]);

  return {
    staticGateCount: STATIC_GATE_COMMANDS.length,
    canaryCommand: CANARY_COMMAND,
  };
}

export function validateRepoCiGateAlignment({ rootDir = process.cwd() } = {}) {
  return validateCiGateAlignment({
    ciWorkflow: readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8'),
    releaseWorkflow: readFileSync(
      path.join(rootDir, '.github/workflows/release-linux.yml'),
      'utf8',
    ),
    playwrightConfig: readFileSync(path.join(rootDir, 'playwright.config.ts'), 'utf8'),
  });
}
