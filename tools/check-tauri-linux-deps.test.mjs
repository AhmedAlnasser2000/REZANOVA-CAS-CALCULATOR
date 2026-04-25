import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMissingDependencyMessage,
  buildFlatpakSandboxMessage,
  checkTauriLinuxRuntimeDependencies,
  findMissingTauriLinuxRuntimeLibraries,
  isFlatpakSandbox,
} from './check-tauri-linux-deps.mjs';

test('Tauri dependency preflight is a no-op outside Linux', () => {
  const missing = findMissingTauriLinuxRuntimeLibraries({
    platform: 'win32',
    lookupLibrary: () => false,
  });

  assert.deepEqual(missing, []);
});

test('Tauri dependency preflight passes when the WebKitGTK runtime is visible', () => {
  const result = checkTauriLinuxRuntimeDependencies({
    platform: 'linux',
    flatpakSandbox: false,
    lookupLibrary: (library) => library === 'libwebkit2gtk-4.1.so.0',
  });

  assert.equal(result.ok, true);
  assert.equal(result.missing.length, 0);
});

test('Tauri dependency preflight reports the apt package for missing WebKitGTK runtime', () => {
  const result = checkTauriLinuxRuntimeDependencies({
    platform: 'linux',
    flatpakSandbox: false,
    lookupLibrary: () => false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.missing.map(({ library }) => library).join(','), 'libwebkit2gtk-4.1.so.0');
  assert.match(result.message, /sudo apt update && sudo apt install -y libwebkit2gtk-4\.1-0/);
  assert.match(result.message, /npm run tauri:dev/);
});

test('missing dependency message lists libraries and purpose', () => {
  const message = buildMissingDependencyMessage([
    {
      library: 'libwebkit2gtk-4.1.so.0',
      packages: ['libwebkit2gtk-4.1-0'],
      purpose: 'Tauri WebView runtime',
    },
  ]);

  assert.match(message, /libwebkit2gtk-4\.1\.so\.0 \(Tauri WebView runtime\)/);
});

test('Tauri dependency preflight detects the VS Code Flatpak sandbox before library checks', () => {
  const result = checkTauriLinuxRuntimeDependencies({
    platform: 'linux',
    flatpakSandbox: true,
    lookupLibrary: () => true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.blockedByFlatpakSandbox, true);
  assert.match(result.message, /VS Code Flatpak sandbox/);
  assert.match(result.message, /native \.deb VS Code/);
});

test('Flatpak sandbox detection supports environment and marker-file signals', () => {
  assert.equal(isFlatpakSandbox({ container: 'flatpak' }, () => false), true);
  assert.equal(isFlatpakSandbox({ FLATPAK_ID: 'com.visualstudio.code' }, () => false), true);
  assert.equal(isFlatpakSandbox({}, (filePath) => filePath === '/.flatpak-info'), true);
  assert.equal(isFlatpakSandbox({}, () => false), false);
});

test('Flatpak sandbox message points to host-side launch commands', () => {
  const message = buildFlatpakSandboxMessage();

  assert.match(message, /normal system terminal/);
  assert.match(message, /npm run tauri:dev/);
});
