import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SESSION_REQUIRED_FIELDS = [
  'primary_agent',
  'primary_agent_model',
  'recorded_by_agent',
  'recorded_by_agent_model',
  'verified_by_agent',
  'verified_by_agent_model',
  'attribution_basis',
];

const JOURNAL_REQUIRED_FIELDS = [
  'primary_agent',
  'primary_agent_model',
  'attribution_basis',
];

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

function parseMetadataSection(text, heading) {
  const normalized = normalizeNewlines(text);
  const lines = normalized.split('\n');
  const headingIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (headingIndex === -1) {
    return null;
  }

  const data = {};
  for (const rawLine of lines.slice(headingIndex + 1)) {
    if (rawLine.startsWith('## ')) {
      break;
    }
    const line = rawLine.trim();
    if (!line.startsWith('- ')) {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(2, separator).trim();
    const value = line.slice(separator + 1).trim();
    data[key] = value;
  }

  return data;
}

function assertFieldsPresent(data, fields, label) {
  if (!data) {
    throw new Error(`${label} is missing required metadata section`);
  }
  for (const field of fields) {
    if (!(field in data) || data[field] === '') {
      throw new Error(`${label} is missing required field: ${field}`);
    }
  }
}

function hasAgentPrefixEntry(text) {
  return /^\s*-\s*\[agent:\s*[a-z0-9-]+\s*\|\s*model:\s*.+?\]/m.test(normalizeNewlines(text));
}

function validateCompatibilityStub(text, label) {
  const normalized = normalizeNewlines(text);
  if (!normalized.includes('AGENTS.md')) {
    throw new Error(`${label} must point to AGENTS.md`);
  }
  if (!normalized.includes('.memory/PROTOCOL.md')) {
    throw new Error(`${label} must point to .memory/PROTOCOL.md`);
  }
  if (!normalized.includes('.memory/current-state.md')) {
    throw new Error(`${label} must point to .memory/current-state.md`);
  }
  if (!/authoritative/i.test(normalized)) {
    throw new Error(`${label} must state that AGENTS.md is authoritative`);
  }
}

function validateCommitLogMetadata(text, label) {
  const attribution = parseMetadataSection(text, 'Attribution');
  assertFieldsPresent(attribution, [
    'primary_agent',
    'primary_agent_model',
    'recorded_by_agent',
    'recorded_by_agent_model',
    'attribution_basis',
  ], label);

  const hasCommitHashInBody = /`[0-9a-f]{7,40}`/i.test(text);
  if (hasCommitHashInBody) {
    for (const field of ['committed_by_agent', 'committed_by_agent_model']) {
      if (!(field in attribution) || attribution[field] === '') {
        throw new Error(`${label} recorded a commit but is missing ${field}`);
      }
    }
  }
}

async function getSessionDirectories(root) {
  const sessionsDir = path.join(root, '.memory', 'sessions');
  const sessionDirs = [];
  const layoutErrors = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const hasCompletionReport = entries.some((entry) =>
      entry.isFile() && entry.name === 'completion-report.md');

    if (hasCompletionReport) {
      const relativeParts = path.relative(sessionsDir, dir).split(path.sep);
      const [month, day, leaf] = relativeParts;
      const validLayout =
        relativeParts.length === 3 &&
        /^\d{4}-\d{2}$/.test(month) &&
        /^\d{4}-\d{2}-\d{2}$/.test(day) &&
        leaf.startsWith(`${day}__`) &&
        day.startsWith(month);

      if (!validLayout) {
        layoutErrors.push(`${path.relative(root, dir)} must use .memory/sessions/YYYY-MM/YYYY-MM-DD/YYYY-MM-DD__slug`);
      }

      sessionDirs.push(dir);
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (dir === sessionsDir && /^\d{4}-\d{2}-\d{2}__/.test(entry.name)) {
        layoutErrors.push(`${path.relative(root, path.join(dir, entry.name))} uses the deprecated flat session layout`);
        continue;
      }

      await walk(path.join(dir, entry.name));
    }
  }

  await walk(sessionsDir);
  return { sessionDirs, layoutErrors };
}

async function getJournalFiles(root) {
  const journalDir = path.join(root, '.memory', 'journal');
  const journalFiles = [];
  const layoutErrors = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') {
        continue;
      }

      const relativeParts = path.relative(journalDir, fullPath).split(path.sep);
      const [month, fileName] = relativeParts;
      const validLayout =
        relativeParts.length === 2 &&
        /^\d{4}-\d{2}$/.test(month) &&
        /^\d{4}-\d{2}-\d{2}\.md$/.test(fileName) &&
        fileName.startsWith(month);

      if (!validLayout) {
        layoutErrors.push(`${path.relative(root, fullPath)} must use .memory/journal/YYYY-MM/YYYY-MM-DD.md`);
      }

      journalFiles.push(fullPath);
    }
  }

  await walk(journalDir);
  return { journalFiles, layoutErrors };
}

export async function validateRepo(root = process.cwd()) {
  const errors = [];

  const currentStatePath = path.join(root, '.memory', 'current-state.md');
  const currentStateText = await fs.readFile(currentStatePath, 'utf8');
  if (!normalizeNewlines(currentStateText).includes('## Agent Ownership')) {
    errors.push('.memory/current-state.md is missing ## Agent Ownership');
  }

  for (const stub of ['CLAUDE.md', 'GEMINI.md']) {
    const stubPath = path.join(root, stub);
    try {
      const stubText = await fs.readFile(stubPath, 'utf8');
      validateCompatibilityStub(stubText, stub);
    } catch (error) {
      errors.push(error.message);
    }
  }

  const { sessionDirs, layoutErrors: sessionLayoutErrors } = await getSessionDirectories(root);
  errors.push(...sessionLayoutErrors);
  for (const dir of sessionDirs) {
    const labelBase = path.relative(root, dir);
    const requiredPath = path.join(dir, 'completion-report.md');
    try {
      await fs.access(requiredPath);
    } catch {
      errors.push(`${labelBase} is missing completion-report.md`);
      continue;
    }

    for (const fileName of ['completion-report.md', 'verification-summary.md', 'commit-log.md']) {
      const filePath = path.join(dir, fileName);
      let text;
      try {
        text = await fs.readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      const label = `${labelBase}/${fileName}`;
      try {
        if (fileName === 'commit-log.md') {
          validateCommitLogMetadata(text, label);
        } else {
          const attribution = parseMetadataSection(text, 'Attribution');
          assertFieldsPresent(attribution, SESSION_REQUIRED_FIELDS, label);
        }
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  const { journalFiles, layoutErrors: journalLayoutErrors } = await getJournalFiles(root);
  errors.push(...journalLayoutErrors);
  for (const filePath of journalFiles) {
    const text = await fs.readFile(filePath, 'utf8');
    const label = path.relative(root, filePath);
    const historical = parseMetadataSection(text, 'Historical Attribution');
    if (historical) {
      try {
        assertFieldsPresent(historical, JOURNAL_REQUIRED_FIELDS, label);
      } catch (error) {
        errors.push(error.message);
      }
      continue;
    }

    if (!hasAgentPrefixEntry(text)) {
      errors.push(`${label} must contain either a Historical Attribution block or prefixed agent entries`);
    }
  }

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
}

const executedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executedDirectly) {
  try {
    await validateRepo();
    console.log('memory protocol validation passed');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
