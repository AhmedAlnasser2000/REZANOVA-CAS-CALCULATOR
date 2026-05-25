#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLinuxWatchLimitFixInstructions } from './fix-linux-watch-limits.mjs';

export const requiredLinuxRuntimeLibraries = [
  {
    library: 'libwebkit2gtk-4.1.so.0',
    packages: ['libwebkit2gtk-4.1-0'],
    purpose: 'Tauri WebView runtime',
  },
];

export const recommendedLinuxFileWatchLimits = {
  max_user_watches: 524288,
  max_user_instances: 512,
  max_queued_events: 32768,
};

const commonLibraryDirs = [
  '/lib',
  '/lib64',
  '/usr/lib',
  '/usr/lib64',
  '/usr/local/lib',
  '/usr/lib/x86_64-linux-gnu',
  '/usr/lib/aarch64-linux-gnu',
  '/usr/lib/arm-linux-gnueabihf',
];

export function isFlatpakSandbox(env = process.env, existsSync = fs.existsSync) {
  return env.container === 'flatpak' || Boolean(env.FLATPAK_ID) || existsSync('/.flatpak-info');
}

function ldconfigOutput() {
  try {
    return execFileSync('ldconfig', ['-p'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

function defaultLookupLibrary(library) {
  const cache = ldconfigOutput();
  if (cache.includes(library)) {
    return true;
  }

  return commonLibraryDirs.some((dir) => fs.existsSync(path.join(dir, library)));
}

export function findMissingTauriLinuxRuntimeLibraries({
  platform = os.platform(),
  lookupLibrary = defaultLookupLibrary,
} = {}) {
  if (platform !== 'linux') {
    return [];
  }

  return requiredLinuxRuntimeLibraries.filter(({ library }) => !lookupLibrary(library));
}

export function buildMissingDependencyMessage(missing) {
  const packageNames = [...new Set(missing.flatMap(({ packages }) => packages))];
  const libraryLines = missing.map(({ library, purpose }) => `  - ${library} (${purpose})`).join('\n');

  return [
    'Missing Linux runtime dependencies for the Tauri desktop app.',
    '',
    'Missing libraries:',
    libraryLines,
    '',
    'Install them with:',
    `  sudo apt update && sudo apt install -y ${packageNames.join(' ')}`,
    '',
    'After installing, rerun:',
    '  npm run tauri:dev',
  ].join('\n');
}

function quoteShellPath(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function readProcSysInt(name) {
  try {
    const raw = fs.readFileSync(`/proc/sys/fs/inotify/${name}`, 'utf8').trim();
    const value = Number(raw);
    return Number.isInteger(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function readLinuxFileWatchLimits({
  platform = os.platform(),
  readLimit = readProcSysInt,
} = {}) {
  if (platform !== 'linux') {
    return {};
  }

  return {
    max_user_watches: readLimit('max_user_watches'),
    max_user_instances: readLimit('max_user_instances'),
    max_queued_events: readLimit('max_queued_events'),
  };
}

export function findInsufficientLinuxFileWatchLimits({
  platform = os.platform(),
  limits = readLinuxFileWatchLimits({ platform }),
  recommended = recommendedLinuxFileWatchLimits,
} = {}) {
  if (platform !== 'linux') {
    return [];
  }

  return Object.entries(recommended)
    .map(([name, minimum]) => ({
      name,
      current: limits[name],
      minimum,
    }))
    .filter(({ current, minimum }) => typeof current === 'number' && current < minimum);
}

export function buildFileWatchLimitMessage(insufficient) {
  const limitLines = insufficient
    .map(({ name, current, minimum }) => `  - fs.inotify.${name} = ${current} (recommended at least ${minimum})`)
    .join('\n');

  return [
    'Linux file-watch limits are too low for this Calcwiz workspace.',
    '',
    'Current limits:',
    limitLines,
    '',
    'The ignored source-mirror research trees and editor watchers can exhaust the default limit before Tauri starts.',
    '',
    'Raise the limits once on the host OS.',
    '',
    buildLinuxWatchLimitFixInstructions(),
    '',
    'Then close/reopen VS Code or close other watcher-heavy apps, and rerun:',
    '  npm run tauri:dev',
  ].join('\n');
}

export function buildFlatpakSandboxMessage(projectPath = process.cwd()) {
  const quotedProjectPath = quoteShellPath(projectPath);

  return [
    'This terminal is running inside the VS Code Flatpak sandbox.',
    '',
    'Tauri desktop dev must run on the host OS so the native WebKitGTK runtime is visible.',
    'Even if libwebkit2gtk-4.1-0 is installed on the host, the Flatpak sandbox can hide it from this process.',
    '',
    'Use one of these host-side launch paths:',
    '  1. Open a normal system terminal and run:',
    `     cd ${quotedProjectPath} && npm run tauri:dev`,
    '',
    '  2. Open the native .deb VS Code build, then run:',
    `     cd ${quotedProjectPath} && code .`,
    '',
    'If the host also reports a missing library, install it there with:',
    '  sudo apt update && sudo apt install -y libwebkit2gtk-4.1-0',
  ].join('\n');
}

export function checkTauriLinuxRuntimeDependencies(options) {
  const {
    platform = os.platform(),
    flatpakSandbox = isFlatpakSandbox(),
    enforceFileWatchLimits = false,
  } = options ?? {};

  if (platform === 'linux' && flatpakSandbox) {
    return {
      ok: false,
      missing: [],
      blockedByFlatpakSandbox: true,
      blockedByFileWatchLimit: false,
      message: buildFlatpakSandboxMessage(),
    };
  }

  const insufficientFileWatchLimits = enforceFileWatchLimits
    ? findInsufficientLinuxFileWatchLimits(options)
    : [];
  if (insufficientFileWatchLimits.length > 0) {
    return {
      ok: false,
      missing: [],
      blockedByFlatpakSandbox: false,
      blockedByFileWatchLimit: true,
      message: buildFileWatchLimitMessage(insufficientFileWatchLimits),
    };
  }

  const missing = findMissingTauriLinuxRuntimeLibraries(options);
  return {
    ok: missing.length === 0,
    missing,
    blockedByFlatpakSandbox: false,
    blockedByFileWatchLimit: false,
    message: missing.length === 0 ? 'Tauri Linux runtime dependency check passed.' : buildMissingDependencyMessage(missing),
  };
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const lifecycleEvent = process.env.npm_lifecycle_event;
  const enforceFileWatchLimits = process.argv.includes('--check-watch-limits')
    || lifecycleEvent === 'pretauri:dev'
    || lifecycleEvent === 'pretauri:dev:watch';
  const result = checkTauriLinuxRuntimeDependencies({
    enforceFileWatchLimits,
  });
  if (!result.ok) {
    console.error(result.message);
    process.exitCode = 1;
  } else {
    console.log(result.message);
  }
}
