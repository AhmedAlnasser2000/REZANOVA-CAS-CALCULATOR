#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const requiredLinuxRuntimeLibraries = [
  {
    library: 'libwebkit2gtk-4.1.so.0',
    packages: ['libwebkit2gtk-4.1-0'],
    purpose: 'Tauri WebView runtime',
  },
];

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

export function buildFlatpakSandboxMessage() {
  return [
    'This terminal is running inside the VS Code Flatpak sandbox.',
    '',
    'Tauri desktop dev must run on the host OS so the native WebKitGTK runtime is visible.',
    'Even if libwebkit2gtk-4.1-0 is installed on the host, the Flatpak sandbox can hide it from this process.',
    '',
    'Use one of these host-side launch paths:',
    '  1. Open a normal system terminal and run:',
    '     cd "/home/ahmed/Downloads/tests and learn/Calculator" && npm run tauri:dev',
    '',
    '  2. Open the native .deb VS Code build, then run:',
    '     cd "/home/ahmed/Downloads/tests and learn/Calculator" && code .',
    '',
    'If the host also reports a missing library, install it there with:',
    '  sudo apt update && sudo apt install -y libwebkit2gtk-4.1-0',
  ].join('\n');
}

export function checkTauriLinuxRuntimeDependencies(options) {
  const {
    platform = os.platform(),
    flatpakSandbox = isFlatpakSandbox(),
  } = options ?? {};

  if (platform === 'linux' && flatpakSandbox) {
    return {
      ok: false,
      missing: [],
      blockedByFlatpakSandbox: true,
      message: buildFlatpakSandboxMessage(),
    };
  }

  const missing = findMissingTauriLinuxRuntimeLibraries(options);
  return {
    ok: missing.length === 0,
    missing,
    blockedByFlatpakSandbox: false,
    message: missing.length === 0 ? 'Tauri Linux runtime dependency check passed.' : buildMissingDependencyMessage(missing),
  };
}

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const result = checkTauriLinuxRuntimeDependencies();
  if (!result.ok) {
    console.error(result.message);
    process.exitCode = 1;
  } else {
    console.log(result.message);
  }
}
