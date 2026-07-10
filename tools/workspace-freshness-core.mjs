import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const WORKSPACE_FRESHNESS_WORKSPACES = [
  'calculate',
  'equation',
  'calculus',
  'trigonometry',
  'geometry',
  'statistics',
  'matrix',
  'vector',
  'table',
];

export const WORKSPACE_FRESHNESS_ALIAS_REGISTRY = [
  { alias: 'anti-regression', workspaces: WORKSPACE_FRESHNESS_WORKSPACES },
  { alias: 'workspace-canary', workspaces: WORKSPACE_FRESHNESS_WORKSPACES },
  { alias: 'canary', workspaces: WORKSPACE_FRESHNESS_WORKSPACES },
  { alias: 'linear-algebra', workspaces: ['matrix', 'vector'] },
  { alias: 'calculate', workspaces: ['calculate'] },
  { alias: 'equation', workspaces: ['equation'] },
  { alias: 'calculus', workspaces: ['calculus'] },
  { alias: 'trigonometry', workspaces: ['trigonometry'] },
  { alias: 'trig', workspaces: ['trigonometry'] },
  { alias: 'geometry', workspaces: ['geometry'] },
  { alias: 'statistics', workspaces: ['statistics'] },
  { alias: 'matrix', workspaces: ['matrix'] },
  { alias: 'vector', workspaces: ['vector'] },
  { alias: 'table', workspaces: ['table'] },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseIsoDate(value, label = 'date') {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value ?? '')) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is not a real calendar date.`);
  }
  return parsed;
}

function matchesAlias(slug, alias) {
  return new RegExp(`(?:^|-)${alias.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}(?:-|$)`, 'u').test(slug);
}

function workspacesForSlug(slug) {
  const normalized = slug.toLowerCase().replace(/_/gu, '-');
  return [...new Set(WORKSPACE_FRESHNESS_ALIAS_REGISTRY
    .filter((entry) => matchesAlias(normalized, entry.alias))
    .flatMap((entry) => entry.workspaces))];
}

export function scanWorkspaceSessionEvidence(rootDir) {
  const sessionsDir = join(rootDir, '.memory', 'sessions');
  try {
    if (!statSync(sessionsDir).isDirectory()) {
      throw new Error('not a directory');
    }
  } catch (error) {
    throw new Error(`Unreadable session repository: ${sessionsDir}`, { cause: error });
  }

  const evidence = [];
  for (const month of readdirSync(sessionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}$/u.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))) {
    const monthDir = join(sessionsDir, month.name);
    for (const day of readdirSync(monthDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/u.test(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name))) {
      parseIsoDate(day.name, 'session date');
      const dayDir = join(monthDir, day.name);
      for (const session of readdirSync(dayDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name))) {
        const workspaces = workspacesForSlug(session.name);
        if (workspaces.length > 0) {
          evidence.push({ date: day.name, session: session.name, workspaces });
        }
      }
    }
  }
  return evidence;
}

export function buildWorkspaceFreshnessReport(rootDir, asOfValue) {
  const asOf = parseIsoDate(asOfValue, '--as-of');
  const evidence = scanWorkspaceSessionEvidence(rootDir)
    .filter((entry) => parseIsoDate(entry.date, 'session date').getTime() <= asOf.getTime());
  const results = WORKSPACE_FRESHNESS_WORKSPACES.map((workspace) => {
    const latest = evidence
      .filter((entry) => entry.workspaces.includes(workspace))
      .sort((left, right) => left.date.localeCompare(right.date) || left.session.localeCompare(right.session))
      .at(-1);
    if (!latest) {
      return { workspace, status: 'missing', latestDate: null, latestSession: null, ageDays: null };
    }
    const ageDays = Math.floor((asOf.getTime() - parseIsoDate(latest.date).getTime()) / DAY_MS);
    return {
      workspace,
      status: ageDays > 14 ? 'stale' : 'fresh',
      latestDate: latest.date,
      latestSession: latest.session,
      ageDays,
    };
  });
  return { schemaVersion: 1, asOf: asOfValue, staleAfterDays: 14, results };
}

export function formatWorkspaceFreshnessHuman(report) {
  const lines = [
    'Workspace Freshness Report',
    `As of: ${report.asOf}`,
    'Warning threshold: older than 14 full days',
    '',
    'WORKSPACE      STATUS   LATEST       AGE',
  ];
  for (const result of report.results) {
    lines.push([
      result.workspace.padEnd(14),
      result.status.padEnd(8),
      (result.latestDate ?? '-').padEnd(12),
      result.ageDays === null ? '-' : `${result.ageDays}d`,
    ].join(' '));
  }
  const warnings = report.results.filter((result) => result.status !== 'fresh').length;
  lines.push('', `Warnings: ${warnings}; freshness is operational evidence, not a correctness gate.`);
  return `${lines.join('\n')}\n`;
}

export function parseWorkspaceFreshnessArgs(args) {
  let asOf;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--json') {
      json = true;
    } else if (argument === '--as-of') {
      if (asOf !== undefined) throw new Error('--as-of may be provided only once.');
      asOf = args[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!asOf) throw new Error('--as-of YYYY-MM-DD is required.');
  parseIsoDate(asOf, '--as-of');
  return { asOf, json };
}
