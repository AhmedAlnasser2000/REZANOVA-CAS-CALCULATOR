import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { validateRepo } from './validate-memory-protocol.mjs';

async function seedRepo(root, options = {}) {
  const {
    omitSessionField,
    omitJournalField,
    badStub = false,
  } = options;

  const sessionDir = options.flatSession
    ? path.join(root, '.memory', 'sessions', '2026-04-09__sample')
    : path.join(root, '.memory', 'sessions', '2026-04', '2026-04-09', '2026-04-09__sample');
  const journalDir = path.join(root, '.memory', 'journal');
  const journalPath = options.flatJournal
    ? path.join(journalDir, '2026-04-09.md')
    : path.join(journalDir, '2026-04', '2026-04-09.md');

  await fs.mkdir(sessionDir, { recursive: true });
  await fs.mkdir(path.dirname(journalPath), { recursive: true });

  const completionLines = [
    '# Completion Report',
    '',
    '## Attribution',
    '- primary_agent: codex',
    '- primary_agent_model: gpt-5.4',
    '- contributors:',
    '- recorded_by_agent: codex',
    '- recorded_by_agent_model: gpt-5.4',
    '- verified_by_agent: codex',
    '- verified_by_agent_model: gpt-5.4',
    '- attribution_basis: live',
    '',
    '## Task Goal',
    '- sample',
    '',
  ];

  const verificationLines = [
    '# Verification Summary',
    '',
    '## Attribution',
    '- primary_agent: codex',
    '- primary_agent_model: gpt-5.4',
    '- contributors:',
    '- recorded_by_agent: codex',
    '- recorded_by_agent_model: gpt-5.4',
    '- verified_by_agent: codex',
    '- verified_by_agent_model: gpt-5.4',
    '- attribution_basis: live',
    '- commit_hash:',
    '',
    '## Outcome',
    '- Passed',
    '',
  ];

  if (omitSessionField) {
    for (const lines of [completionLines, verificationLines]) {
      const index = lines.findIndex((line) => line.startsWith(`- ${omitSessionField}:`));
      if (index !== -1) {
        lines.splice(index, 1);
      }
    }
  }

  await fs.writeFile(path.join(sessionDir, 'completion-report.md'), completionLines.join('\n'));
  await fs.writeFile(path.join(sessionDir, 'verification-summary.md'), verificationLines.join('\n'));
  await fs.writeFile(
    path.join(sessionDir, 'commit-log.md'),
    [
      '# Commit Log',
      '',
      '## Attribution',
      '- primary_agent: codex',
      '- primary_agent_model: gpt-5.4',
      '- recorded_by_agent: codex',
      '- recorded_by_agent_model: gpt-5.4',
      '- attribution_basis: live',
      '',
      '- No commit recorded yet.',
      '',
    ].join('\n'),
  );

  const journalLines = [
    '# Journal',
    '',
    '## Historical Attribution',
    '- primary_agent: codex',
    '- primary_agent_model: gpt-5.4',
    '- attribution_basis: historical-user-confirmed',
    '- scope: all entries in this file',
    '',
    '- note',
    '',
  ];

  if (omitJournalField) {
    const index = journalLines.findIndex((line) => line.startsWith(`- ${omitJournalField}:`));
    if (index !== -1) {
      journalLines.splice(index, 1);
    }
  }

  await fs.writeFile(journalPath, journalLines.join('\n'));
  await fs.writeFile(path.join(root, '.memory', 'current-state.md'), '# Current State\n\n## Agent Ownership\n- owner: codex\n');

  const stubText = badStub
    ? '# Bad Stub\n\n- local rules only\n'
    : [
        '# Stub',
        '',
        '- `AGENTS.md` is authoritative.',
        '- Read `.memory/PROTOCOL.md` and `.memory/current-state.md`.',
        '- If anything conflicts, `AGENTS.md` wins.',
        '',
      ].join('\n');

  await fs.writeFile(path.join(root, 'CLAUDE.md'), stubText);
  await fs.writeFile(path.join(root, 'GEMINI.md'), stubText);
}

test('validator passes on a minimal compliant repo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'calcwiz-memory-protocol-pass-'));
  await seedRepo(root);
  await assert.doesNotReject(() => validateRepo(root));
});

test('validator fails when a session attribution field is missing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'calcwiz-memory-protocol-session-'));
  await seedRepo(root, { omitSessionField: 'primary_agent_model' });
  await assert.rejects(() => validateRepo(root), /primary_agent_model/);
});

test('validator fails on a malformed historical journal header', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'calcwiz-memory-protocol-journal-'));
  await seedRepo(root, { omitJournalField: 'primary_agent_model' });
  await assert.rejects(() => validateRepo(root), /primary_agent_model/);
});

test('validator fails on a deprecated flat session layout', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'calcwiz-memory-protocol-flat-session-'));
  await seedRepo(root, { flatSession: true });
  await assert.rejects(() => validateRepo(root), /deprecated flat session layout/);
});

test('validator fails on a deprecated flat journal layout', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'calcwiz-memory-protocol-flat-journal-'));
  await seedRepo(root, { flatJournal: true });
  await assert.rejects(() => validateRepo(root), /must use \.memory\/journal\/YYYY-MM\/YYYY-MM-DD\.md/);
});

test('validator fails when compatibility stubs do not defer to AGENTS', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'calcwiz-memory-protocol-stub-'));
  await seedRepo(root, { badStub: true });
  await assert.rejects(() => validateRepo(root), /AGENTS\.md/);
});
