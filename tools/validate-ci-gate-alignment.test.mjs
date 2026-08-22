import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  CANARY_COMMAND,
  CODEX_AGENT_WORKFLOW_COMMAND,
  GUARDED_UNIT_CI_COMMAND,
  PACKAGE_COMMAND,
  SEAM_IMPACT_COMMAND,
  STATIC_GATE_COMMANDS,
  UNIT_CI_COMMAND,
  V2_ENFORCEMENT_COMMAND,
  validateCiGateAlignment,
  validateRepoCiGateAlignment,
} from './ci-gate-alignment-core.mjs';

function fixture(overrides = {}) {
  const staticSteps = STATIC_GATE_COMMANDS.map((command) => `      - run: ${command}`).join('\n');
  return {
    ciWorkflow: [
      'on:',
      '  pull_request:',
      '  push:',
      '    branches:',
      '      - main',
      'jobs:',
      '  codex-agent-workflow:',
      `      - run: ${CODEX_AGENT_WORKFLOW_COMMAND}`,
      '  canonical-result-v2-enforcement:',
      `      - run: ${V2_ENFORCEMENT_COMMAND}`,
      '  ci-linux:',
      staticSteps,
      '      - uses: actions/checkout@v4',
      '        with:',
      '          fetch-depth: 0',
      `      - run: ${SEAM_IMPACT_COMMAND}`,
      `      - run: ${GUARDED_UNIT_CI_COMMAND}`,
      '  e2e-linux:',
      `      - run: ${CANARY_COMMAND}`,
    ].join('\n'),
    releaseWorkflow: [
      'jobs:',
      '  linux-preview:',
      staticSteps,
      `      - run: ${CANARY_COMMAND}`,
      `      - run: ${GUARDED_UNIT_CI_COMMAND}`,
      `      - run: ${PACKAGE_COMMAND}`,
    ].join('\n'),
    playwrightConfig: 'export default { retries: 0, workers: 1 };\n',
    ...overrides,
  };
}

describe('CI gate alignment validation', () => {
  it('accepts the committed workflows', () => {
    assert.doesNotThrow(() => validateRepoCiGateAlignment());
  });

  it('rejects a missing required static gate', () => {
    const input = fixture();
    const command = 'npm run test:ci-gate-alignment';
    input.ciWorkflow = input.ciWorkflow.replace(
      `      - run: ${command}\n`,
      '',
    );

    assert.throws(
      () => validateCiGateAlignment(input),
      new RegExp(`CI ci-linux job must include run: ${command}`),
    );
  });

  it('rejects a missing or late dedicated V2 enforcement job', () => {
    const missing = fixture();
    missing.ciWorkflow = missing.ciWorkflow.replace(
      `  canonical-result-v2-enforcement:\n      - run: ${V2_ENFORCEMENT_COMMAND}\n`,
      '',
    );
    assert.throws(
      () => validateCiGateAlignment(missing),
      /independent canonical-result-v2-enforcement job/u,
    );

    const late = fixture();
    late.ciWorkflow = late.ciWorkflow
      .replace(`  canonical-result-v2-enforcement:\n      - run: ${V2_ENFORCEMENT_COMMAND}\n`, '')
      .concat(`\n  canonical-result-v2-enforcement:\n      - run: ${V2_ENFORCEMENT_COMMAND}`);
    assert.throws(
      () => validateCiGateAlignment(late),
      /before ci-linux/u,
    );
  });

  it('rejects a missing or late dedicated Codex agent workflow job', () => {
    const missing = fixture();
    missing.ciWorkflow = missing.ciWorkflow.replace(
      `  codex-agent-workflow:\n      - run: ${CODEX_AGENT_WORKFLOW_COMMAND}\n`,
      '',
    );
    assert.throws(
      () => validateCiGateAlignment(missing),
      /independent codex-agent-workflow job/u,
    );

    const late = fixture();
    late.ciWorkflow = late.ciWorkflow
      .replace(`  codex-agent-workflow:\n      - run: ${CODEX_AGENT_WORKFLOW_COMMAND}\n`, '')
      .concat(`\n  codex-agent-workflow:\n      - run: ${CODEX_AGENT_WORKFLOW_COMMAND}`);
    assert.throws(() => validateCiGateAlignment(late), /before ci-linux/u);

    const missingCommand = fixture();
    missingCommand.ciWorkflow = missingCommand.ciWorkflow.replace(
      `      - run: ${CODEX_AGENT_WORKFLOW_COMMAND}\n  canonical-result-v2-enforcement:`,
      '  canonical-result-v2-enforcement:',
    );
    assert.throws(
      () => validateCiGateAlignment(missingCommand),
      /independent codex-agent-workflow job/u,
    );
  });

  it('rejects CI without pull-request and main triggers', () => {
    const input = fixture({ ciWorkflow: fixture().ciWorkflow.replace('  pull_request:\n', '') });

    assert.throws(
      () => validateCiGateAlignment(input),
      /CI workflow must include\s+pull_request:/u,
    );
  });

  it('rejects a canary job blocked behind the static CI job', () => {
    const input = fixture();
    input.ciWorkflow = input.ciWorkflow.replace(
      '  e2e-linux:\n',
      '  e2e-linux:\n    needs: ci-linux\n',
    );

    assert.throws(
      () => validateCiGateAlignment(input),
      /CI e2e-linux job must run independently from ci-linux/u,
    );
  });

  it('rejects CI without the executable seam-impact runner and full history', () => {
    const missingRunner = fixture();
    missingRunner.ciWorkflow = missingRunner.ciWorkflow.replace(
      `      - run: ${SEAM_IMPACT_COMMAND}\n`,
      '',
    );
    assert.throws(
      () => validateCiGateAlignment(missingRunner),
      /CI workflow must include run: npm run seam:impact/u,
    );

    const shallow = fixture();
    shallow.ciWorkflow = shallow.ciWorkflow.replace('          fetch-depth: 0\n', '');
    assert.throws(
      () => validateCiGateAlignment(shallow),
      /CI workflow checkout must include fetch-depth: 0/u,
    );

    const lateRunner = fixture();
    lateRunner.ciWorkflow = lateRunner.ciWorkflow
      .replace(`      - run: ${SEAM_IMPACT_COMMAND}\n`, '')
      .replace(
        `      - run: ${GUARDED_UNIT_CI_COMMAND}\n`,
        `      - run: ${GUARDED_UNIT_CI_COMMAND}\n      - run: ${SEAM_IMPACT_COMMAND}\n`,
      );
    assert.throws(
      () => validateCiGateAlignment(lateRunner),
      /CI workflow must run seam impact evidence before broad unit tests/u,
    );
  });

  it('rejects Linux packaging before the workspace canaries', () => {
    const input = fixture();
    input.releaseWorkflow = input.releaseWorkflow.replace(
      `      - run: ${CANARY_COMMAND}\n      - run: ${GUARDED_UNIT_CI_COMMAND}\n      - run: ${PACKAGE_COMMAND}`,
      `      - run: ${PACKAGE_COMMAND}\n      - run: ${CANARY_COMMAND}\n      - run: ${GUARDED_UNIT_CI_COMMAND}`,
    );

    assert.throws(
      () => validateCiGateAlignment(input),
      /Linux release workflow must run .* before npm run tauri:build/u,
    );
  });

  it('rejects Linux packaging before any required static gate', () => {
    const input = fixture();
    const command = STATIC_GATE_COMMANDS[0];
    input.releaseWorkflow = input.releaseWorkflow
      .replace(`      - run: ${command}\n`, '')
      .concat(`\n      - run: ${command}`);

    assert.throws(
      () => validateCiGateAlignment(input),
      new RegExp(`Linux release workflow must run ${command} before npm run tauri:build`),
    );
  });

  it('rejects Playwright retry overrides and nonzero defaults', () => {
    assert.throws(
      () => validateCiGateAlignment(fixture({ playwrightConfig: 'retries: 1,\n' })),
      /Playwright configuration must pin retries to 0/u,
    );
    assert.throws(
      () => validateCiGateAlignment(fixture({
        ciWorkflow: `${fixture().ciWorkflow}\n      - run: playwright test --retries=2`,
      })),
      /CI workflow must not override Playwright retries/u,
    );
  });

  it('requires the guarded unit command in both workflows', () => {
    for (const field of ['ciWorkflow', 'releaseWorkflow']) {
      const input = fixture();
      input[field] = input[field].replace(GUARDED_UNIT_CI_COMMAND, UNIT_CI_COMMAND);
      assert.throws(
        () => validateCiGateAlignment(input),
        /must include run: timeout --signal=TERM --kill-after=30s 30m npm run test:unit:ci/u,
      );
    }
  });

  it('terminates a synchronous CPU-bound descendant with timeout status 124', () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-ci-watchdog-'));
    const childPidPath = path.join(tempDir, 'child.pid');
    let childPid;

    try {
      const script = [
        "const { spawn } = require('node:child_process');",
        "const { writeFileSync } = require('node:fs');",
        "const child = spawn(process.execPath, ['-e', 'while (true) {}'], { stdio: 'ignore' });",
        `writeFileSync(${JSON.stringify(childPidPath)}, String(child.pid));`,
        'while (true) {}',
      ].join('\n');
      const result = spawnSync(
        'timeout',
        ['--signal=TERM', '--kill-after=1s', '1s', process.execPath, '-e', script],
        { encoding: 'utf8', timeout: 5_000 },
      );

      assert.equal(result.status, 124, result.stderr || result.error?.message);
      childPid = Number.parseInt(readFileSync(childPidPath, 'utf8'), 10);
      assert.ok(Number.isSafeInteger(childPid) && childPid > 0);
      const reapDeadline = Date.now() + 3_000;
      let descendantGone = false;
      while (Date.now() < reapDeadline) {
        try {
          process.kill(childPid, 0);
        } catch (error) {
          if (error?.code === 'ESRCH') {
            descendantGone = true;
            break;
          }
          throw error;
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
      }
      assert.ok(descendantGone, `watchdog descendant ${childPid} still alive after timeout`);
    } finally {
      if (childPid) {
        try {
          process.kill(childPid, 'SIGKILL');
        } catch (error) {
          if (error?.code !== 'ESRCH') throw error;
        }
      }
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
