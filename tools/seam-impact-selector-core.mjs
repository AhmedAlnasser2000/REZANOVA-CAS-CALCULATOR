import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  BASELINE_EVIDENCE,
  LANE_REGISTRY,
  SEAM_COMMANDS,
  SEAM_REGISTRY,
} from './seam-impact-registry.mjs';

const ZERO_SHA = /^0+$/u;
const SAFE_REVISION = /^[A-Za-z0-9._/@{}^~:+-]+$/u;
const EMPTY_TREE_SHA = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

function matches(repoPath, matcher) {
  return matcher.kind === 'exact'
    ? repoPath === matcher.value
    : repoPath.startsWith(matcher.value);
}

export function normalizeRepoPath(input) {
  if (typeof input !== 'string' || input.length === 0 || input.includes('\0')) {
    throw new Error('Changed paths must be non-empty strings without NUL bytes');
  }
  const slashed = input.replaceAll('\\', '/').replace(/^\.\//u, '');
  if (path.posix.isAbsolute(slashed) || /^[A-Za-z]:\//u.test(slashed)) {
    throw new Error(`Changed path must be repository-relative: ${input}`);
  }
  const segments = slashed.split('/');
  if (segments.some((segment) => segment === '..' || segment === '')) {
    throw new Error(`Changed path contains an invalid segment: ${input}`);
  }
  const normalized = segments.filter((segment) => segment !== '.').join('/');
  if (!normalized || normalized === '.git' || normalized.startsWith('.git/')) {
    throw new Error(`Changed path is not selectable: ${input}`);
  }
  return normalized;
}

export function validateRevision(input, label) {
  if (
    typeof input !== 'string'
    || !input
    || input.startsWith('-')
    || !SAFE_REVISION.test(input)
  ) {
    throw new Error(`${label} is not a safe Git revision: ${String(input)}`);
  }
  return input;
}

export function parseGitNameStatusZ(output) {
  if (typeof output !== 'string') {
    throw new Error('Git name-status output must be a string');
  }
  const fields = output.split('\0');
  if (fields.at(-1) === '') fields.pop();
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (!/^(?:[ACDMRTUXB]|[RC][0-9]{1,3})$/u.test(status)) {
      throw new Error(`Unsupported Git name-status record: ${status || '<empty>'}`);
    }
    if (status.startsWith('R') || status.startsWith('C')) {
      if (index + 1 >= fields.length) {
        throw new Error(`Incomplete Git rename/copy record: ${status}`);
      }
      changes.push({
        status,
        oldPath: normalizeRepoPath(fields[index++]),
        newPath: normalizeRepoPath(fields[index++]),
      });
    } else {
      if (index >= fields.length) {
        throw new Error(`Incomplete Git path record: ${status}`);
      }
      changes.push({ status, path: normalizeRepoPath(fields[index++]) });
    }
  }
  return changes;
}

export function readGitChanges({ base, head, cwd = process.cwd(), spawn = spawnSync }) {
  const safeBase = validateRevision(base, 'Base revision');
  const safeHead = validateRevision(head, 'Head revision');
  const result = spawn(
    'git',
    ['diff', '--name-status', '-z', '--find-renames', safeBase, safeHead, '--'],
    { cwd, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    const detail = String(result.stderr || result.error?.message || 'git diff failed').trim();
    throw new Error(`Unable to read Git changes for ${safeBase}..${safeHead}: ${detail}`);
  }
  return parseGitNameStatusZ(result.stdout ?? '');
}

export function selectGithubEventRange(eventName, event) {
  if (eventName === 'pull_request' || eventName === 'pull_request_target') {
    const base = event?.pull_request?.base?.sha;
    const head = event?.pull_request?.head?.sha;
    return {
      base: validateRevision(base, 'Pull request base SHA'),
      head: validateRevision(head, 'Pull request head SHA'),
    };
  }
  if (eventName === 'push') {
    const head = validateRevision(event?.after, 'Push after SHA');
    const before = event?.before;
    return {
      base: typeof before === 'string' && ZERO_SHA.test(before)
        ? EMPTY_TREE_SHA
        : validateRevision(before, 'Push before SHA'),
      head,
    };
  }
  throw new Error(`Unsupported GitHub event for seam selection: ${eventName || '<empty>'}`);
}

export function readGithubEventRange({
  eventName = process.env.GITHUB_EVENT_NAME,
  eventPath = process.env.GITHUB_EVENT_PATH,
} = {}) {
  if (!eventPath) {
    throw new Error('GITHUB_EVENT_PATH is required for --github-event');
  }
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  return selectGithubEventRange(eventName, event);
}

function pathsForChange(change) {
  return change.oldPath ? [change.oldPath, change.newPath] : [change.path];
}

function changeSortKey(change) {
  return change.newPath ?? change.path ?? change.oldPath;
}

function classifyPath(repoPath) {
  const seamIds = SEAM_REGISTRY
    .filter((entry) => entry.matchers.some((matcher) => matches(repoPath, matcher)))
    .map((entry) => entry.id)
    .sort();
  const laneIds = LANE_REGISTRY
    .filter((entry) => entry.matchers.some((matcher) => matches(repoPath, matcher)))
    .map((entry) => entry.id)
    .sort();
  return { path: repoPath, seamIds, laneIds: laneIds.length > 0 ? laneIds : ['other'] };
}

function selectRegistryItems(ids, registry) {
  const selected = new Set(ids);
  return registry.filter((entry) => selected.has(entry.id));
}

export function buildSeamImpactPlan({ changes, source }) {
  const normalizedChanges = changes.map((change) => {
    if (change.status === 'explicit') {
      return { status: 'explicit', path: normalizeRepoPath(change.path) };
    }
    if (change.oldPath) {
      return {
        status: change.status,
        oldPath: normalizeRepoPath(change.oldPath),
        newPath: normalizeRepoPath(change.newPath),
      };
    }
    return { status: change.status, path: normalizeRepoPath(change.path) };
  }).sort((left, right) => changeSortKey(left).localeCompare(changeSortKey(right)));

  const pathClassifications = [...new Set(normalizedChanges.flatMap(pathsForChange))]
    .sort()
    .map(classifyPath);
  const triggeredSeamIds = [...new Set(pathClassifications.flatMap((entry) => entry.seamIds))]
    .sort();
  const laneIds = [...new Set(pathClassifications.flatMap((entry) => entry.laneIds))].sort();
  const triggeredSeams = selectRegistryItems(triggeredSeamIds, SEAM_REGISTRY).map((seam) => ({
    id: seam.id,
    label: seam.label,
    paths: pathClassifications
      .filter((entry) => entry.seamIds.includes(seam.id))
      .map((entry) => entry.path),
  }));

  const commandReasons = new Map();
  const baselineIds = new Set();
  for (const seam of selectRegistryItems(triggeredSeamIds, SEAM_REGISTRY)) {
    for (const commandId of seam.additionalCommandIds) {
      const reasons = commandReasons.get(commandId) ?? [];
      reasons.push(seam.id);
      commandReasons.set(commandId, reasons);
    }
    for (const evidenceId of seam.baselineEvidenceIds) baselineIds.add(evidenceId);
  }

  const additionalCommands = SEAM_COMMANDS
    .filter((command) => commandReasons.has(command.id))
    .map((command) => ({
      id: command.id,
      label: command.label,
      argv: [...command.argv],
      command: command.argv.join(' '),
      triggeredBy: [...new Set(commandReasons.get(command.id))].sort(),
    }));
  const requiredBaselineEvidence = BASELINE_EVIDENCE
    .filter((entry) => baselineIds.has(entry.id));

  return {
    version: 1,
    source,
    baselinePolicy: {
      required: true,
      selectorMaySkipBaselineGates: false,
      note: 'Additional seam evidence never replaces repository baseline CI gates.',
    },
    summary: {
      changeCount: normalizedChanges.length,
      pathCount: pathClassifications.length,
      seamImpact: triggeredSeamIds.length > 0,
      laneOnly: pathClassifications.length > 0 && triggeredSeamIds.length === 0,
    },
    changes: normalizedChanges,
    paths: pathClassifications,
    triggeredSeams,
    laneIds,
    requiredBaselineEvidence,
    additionalCommands,
  };
}

export function buildExplicitPathPlan(paths) {
  return buildSeamImpactPlan({
    changes: paths.map((repoPath) => ({ status: 'explicit', path: repoPath })),
    source: { kind: 'explicit-paths' },
  });
}

export function formatHumanPlan(plan) {
  const lines = [
    `Seam impact plan v${plan.version}`,
    `Source: ${plan.source.kind}`,
    `Changes: ${plan.summary.changeCount}; paths: ${plan.summary.pathCount}`,
    `Seam impact: ${plan.summary.seamImpact ? 'yes' : 'no'}`,
    `Lane only: ${plan.summary.laneOnly ? 'yes' : 'no'}`,
  ];
  if (plan.source.base && plan.source.head) {
    lines.splice(2, 0, `Range: ${plan.source.base}..${plan.source.head}`);
  }
  lines.push('');
  lines.push('Classified paths:');
  if (plan.paths.length === 0) lines.push('  (none)');
  for (const entry of plan.paths) {
    lines.push(
      `  ${entry.path} | seams: ${entry.seamIds.join(', ') || 'none'} | lanes: ${entry.laneIds.join(', ')}`,
    );
  }
  lines.push('', 'Triggered seams:');
  if (plan.triggeredSeams.length === 0) lines.push('  (none)');
  for (const seam of plan.triggeredSeams) lines.push(`  ${seam.id}: ${seam.label}`);
  lines.push('', 'Required baseline evidence:');
  if (plan.requiredBaselineEvidence.length === 0) lines.push('  (baseline CI still required)');
  for (const evidence of plan.requiredBaselineEvidence) {
    lines.push(`  ${evidence.id}: ${evidence.command}`);
  }
  lines.push('', 'Additional allowlisted commands:');
  if (plan.additionalCommands.length === 0) lines.push('  (none)');
  for (const command of plan.additionalCommands) {
    lines.push(`  ${command.id}: ${command.command} [${command.triggeredBy.join(', ')}]`);
  }
  lines.push('', 'Baseline CI gates remain required and unchanged.');
  return lines.join('\n');
}

export function runAdditionalCommands(plan, {
  cwd = process.cwd(),
  spawn = spawnSync,
  logger = (line) => console.log(line),
} = {}) {
  const allowlist = new Map(SEAM_COMMANDS.map((command) => [command.id, command]));
  for (const selected of plan.additionalCommands) {
    const command = allowlist.get(selected.id);
    if (!command) throw new Error(`Plan contains non-allowlisted command: ${selected.id}`);
    logger(`Running ${command.id}: ${command.argv.join(' ')}`);
    const result = spawn(command.argv[0], command.argv.slice(1), { cwd, stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`Additional seam command failed (${command.id}) with status ${result.status}`);
    }
  }
}

export function parseSelectorArgs(argv) {
  const options = { paths: [], format: 'human', run: false, githubEvent: false };
  const takeValue = (index, flag) => {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    return value;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--base' || arg === '--head' || arg === '--path' || arg === '--format' || arg === '--event-file') {
      const value = takeValue(index, arg);
      index += 1;
      if (arg === '--path') options.paths.push(value);
      else if (arg === '--base') options.base = value;
      else if (arg === '--head') options.head = value;
      else if (arg === '--event-file') options.eventFile = value;
      else options.format = value;
    } else if (arg === '--github-event') options.githubEvent = true;
    else if (arg === '--run') options.run = true;
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown seam selector argument: ${arg}`);
  }
  if (!['human', 'json'].includes(options.format)) {
    throw new Error(`Unsupported output format: ${options.format}`);
  }
  if (options.run && options.format === 'json') {
    throw new Error('--run cannot be combined with --format json');
  }
  return options;
}

export function resolveSelectorPlan(options, {
  cwd = process.cwd(),
  spawn = spawnSync,
  githubEventReader = readGithubEventRange,
} = {}) {
  const hasRange = options.base !== undefined || options.head !== undefined;
  const modeCount = Number(hasRange) + Number(options.paths.length > 0) + Number(options.githubEvent);
  if (modeCount !== 1) {
    throw new Error('Choose exactly one input mode: --base/--head, --path, or --github-event');
  }
  if (hasRange) {
    if (!options.base || !options.head) throw new Error('--base and --head must be provided together');
    const changes = readGitChanges({ base: options.base, head: options.head, cwd, spawn });
    return buildSeamImpactPlan({
      changes,
      source: { kind: 'git-range', base: options.base, head: options.head },
    });
  }
  if (options.githubEvent) {
    const range = githubEventReader({ eventPath: options.eventFile });
    const changes = readGitChanges({ ...range, cwd, spawn });
    return buildSeamImpactPlan({
      changes,
      source: { kind: 'github-event', base: range.base, head: range.head },
    });
  }
  return buildExplicitPathPlan(options.paths);
}
