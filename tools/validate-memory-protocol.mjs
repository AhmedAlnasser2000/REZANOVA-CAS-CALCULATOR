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

const RESEARCH_ALLOWED_ROOT_FILES = new Set(['README.md', 'INDEX.md']);
const RESEARCH_ALLOWED_ROOT_DIRS = new Set([
  'architecture',
  'audits',
  'checklists',
  'readiness',
  'references',
  'roadmaps',
  'source-context',
]);
const RESEARCH_ALLOWED_SOURCE_CONTEXT_DIRS = new Set(['fricas']);

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

function monthFromJournalPath(root, filePath) {
  const journalDir = path.join(root, '.memory', 'journal');
  return path.relative(journalDir, filePath).split(path.sep)[0];
}

function monthFromSessionDir(root, dir) {
  const sessionsDir = path.join(root, '.memory', 'sessions');
  return path.relative(sessionsDir, dir).split(path.sep)[0];
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

async function getResearchLayoutErrors(root) {
  const researchDir = path.join(root, '.memory', 'research');
  const errors = [];

  let rootEntries;
  try {
    rootEntries = await fs.readdir(researchDir, { withFileTypes: true });
  } catch (error) {
    errors.push(`.memory/research is not readable: ${error.message}`);
    return errors;
  }

  const rootNames = new Set(rootEntries.map((entry) => entry.name));
  for (const requiredFile of RESEARCH_ALLOWED_ROOT_FILES) {
    if (!rootNames.has(requiredFile)) {
      errors.push(`.memory/research is missing ${requiredFile}`);
    }
  }

  for (const entry of rootEntries) {
    const relativePath = `.memory/research/${entry.name}`;
    if (entry.isFile()) {
      if (!RESEARCH_ALLOWED_ROOT_FILES.has(entry.name)) {
        errors.push(`${relativePath} must move under an approved .memory/research category`);
      }
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    if (!RESEARCH_ALLOWED_ROOT_DIRS.has(entry.name)) {
      errors.push(`${relativePath} is not an approved .memory/research root category`);
      continue;
    }

    if (entry.name === 'checklists') {
      const checklistsDir = path.join(researchDir, entry.name);
      const checklistEntries = await fs.readdir(checklistsDir, { withFileTypes: true });
      for (const checklistEntry of checklistEntries) {
        const checklistRelative = `.memory/research/checklists/${checklistEntry.name}`;
        if (checklistEntry.isFile()) {
          errors.push(`${checklistRelative} must live under .memory/research/checklists/YYYY-MM/YYYY-MM-DD/`);
          continue;
        }
        if (!checklistEntry.isDirectory()) {
          continue;
        }
        if (!/^\d{4}-\d{2}$/.test(checklistEntry.name)) {
          errors.push(`${checklistRelative} must be a YYYY-MM checklist folder`);
          continue;
        }
        const monthDir = path.join(checklistsDir, checklistEntry.name);
        const monthEntries = await fs.readdir(monthDir, { withFileTypes: true });
        for (const monthEntry of monthEntries) {
          const monthRelative = `${checklistRelative}/${monthEntry.name}`;
          if (monthEntry.isFile()) {
            errors.push(`${monthRelative} must live under .memory/research/checklists/YYYY-MM/YYYY-MM-DD/`);
            continue;
          }
          if (!monthEntry.isDirectory()) {
            continue;
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(monthEntry.name) || !monthEntry.name.startsWith(`${checklistEntry.name}-`)) {
            errors.push(`${monthRelative} must be a YYYY-MM-DD checklist day folder under ${checklistEntry.name}`);
            continue;
          }
          const dayDir = path.join(monthDir, monthEntry.name);
          const dayEntries = await fs.readdir(dayDir, { withFileTypes: true });
          for (const dayEntry of dayEntries) {
            const dayRelative = `${monthRelative}/${dayEntry.name}`;
            if (dayEntry.isDirectory()) {
              errors.push(`${dayRelative} must be a checklist file, not a nested folder`);
              continue;
            }
            if (
              dayEntry.isFile() &&
              !/^(TRACK|REFACTOR)-.*MANUAL-VERIFICATION-CHECKLIST\.md$/.test(dayEntry.name)
            ) {
              errors.push(`${dayRelative} must be a TRACK/REFACTOR manual verification checklist`);
            }
          }
        }
      }
    }

    if (entry.name === 'source-context') {
      const sourceContextDir = path.join(researchDir, entry.name);
      const sourceContextEntries = await fs.readdir(sourceContextDir, { withFileTypes: true });
      for (const sourceEntry of sourceContextEntries) {
        const sourceRelative = `.memory/research/source-context/${sourceEntry.name}`;
        if (sourceEntry.isFile()) {
          errors.push(`${sourceRelative} must live under a named source-context folder`);
          continue;
        }
        if (sourceEntry.isDirectory() && !RESEARCH_ALLOWED_SOURCE_CONTEXT_DIRS.has(sourceEntry.name)) {
          errors.push(`${sourceRelative} is not an approved source-context folder`);
        }
      }
    }
  }

  return errors;
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
  const journalMonths = new Set(journalFiles.map((filePath) => monthFromJournalPath(root, filePath)));
  const sessionMonths = new Set(sessionDirs.map((dir) => monthFromSessionDir(root, dir)));
  for (const journalMonth of journalMonths) {
    if (!sessionMonths.has(journalMonth)) {
      errors.push(`.memory/sessions/${journalMonth} is missing for journal month ${journalMonth}`);
    }
  }

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

  errors.push(...await getResearchLayoutErrors(root));

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
