import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { auditClipboardCapabilitySetup } from './clipboard-capability-audit-core.mjs';

const roots = [];

function fixture({ permissions, rustEntry = '', cargoDependency = true, jsDependency = true }) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calcwiz-clipboard-audit-'));
  roots.push(rootDir);
  fs.mkdirSync(path.join(rootDir, 'src-tauri/capabilities'), { recursive: true });
  fs.mkdirSync(path.join(rootDir, 'src-tauri/src'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'package.json'), JSON.stringify({
    dependencies: jsDependency ? { '@tauri-apps/plugin-clipboard-manager': '^2.3.2' } : {},
  }));
  fs.writeFileSync(
    path.join(rootDir, 'src-tauri/Cargo.toml'),
    cargoDependency ? 'tauri-plugin-clipboard-manager = "2.3.2"\n' : '',
  );
  fs.writeFileSync(path.join(rootDir, 'src-tauri/src/lib.rs'), rustEntry);
  fs.writeFileSync(path.join(rootDir, 'src-tauri/capabilities/default.json'), JSON.stringify({
    permissions,
  }));
  return rootDir;
}

afterEach(() => {
  while (roots.length > 0) fs.rmSync(roots.pop(), { recursive: true, force: true });
});

describe('clipboard capability audit', () => {
  it('accepts only the three approved Tauri clipboard permissions', () => {
    const rootDir = fixture({
      permissions: [
        'core:default',
        'clipboard-manager:allow-read-text',
        'clipboard-manager:allow-write-text',
        'clipboard-manager:allow-write-html',
      ],
      rustEntry: 'tauri::Builder::default().plugin(tauri_plugin_clipboard_manager::init());',
    });
    assert.equal(auditClipboardCapabilitySetup({ rootDir }).ok, true);
  });

  it('rejects broader clipboard authority or incomplete plugin wiring', () => {
    const rootDir = fixture({
      permissions: ['clipboard-manager:default', 'clipboard-manager:allow-read-image'],
      rustEntry: '',
      cargoDependency: false,
      jsDependency: false,
    });
    const report = auditClipboardCapabilitySetup({ rootDir });
    assert.equal(report.ok, false);
    assert.equal(report.errors.length, 4);
  });
});
