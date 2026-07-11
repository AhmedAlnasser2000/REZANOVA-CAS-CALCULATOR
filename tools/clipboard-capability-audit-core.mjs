import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_PERMISSIONS = [
  'clipboard-manager:allow-read-text',
  'clipboard-manager:allow-write-html',
  'clipboard-manager:allow-write-text',
];

function read(rootDir, repoPath) {
  return fs.readFileSync(path.join(rootDir, repoPath), 'utf8');
}

export function auditClipboardCapabilitySetup({ rootDir = process.cwd() } = {}) {
  const errors = [];
  const packageJson = JSON.parse(read(rootDir, 'package.json'));
  const cargoToml = read(rootDir, 'src-tauri/Cargo.toml');
  const rustEntry = read(rootDir, 'src-tauri/src/lib.rs');
  const capability = JSON.parse(read(rootDir, 'src-tauri/capabilities/default.json'));
  const clipboardPermissions = (capability.permissions ?? [])
    .filter((permission) => String(permission).startsWith('clipboard-manager:'))
    .sort();

  if (!packageJson.dependencies?.['@tauri-apps/plugin-clipboard-manager']) {
    errors.push('The official Tauri clipboard JavaScript package is missing.');
  }
  if (!/^tauri-plugin-clipboard-manager\s*=\s*"[^"]+"/mu.test(cargoToml)) {
    errors.push('The official Tauri clipboard Rust plugin is missing.');
  }
  if (!rustEntry.includes('.plugin(tauri_plugin_clipboard_manager::init())')) {
    errors.push('The Tauri clipboard plugin is not initialized.');
  }
  if (JSON.stringify(clipboardPermissions) !== JSON.stringify(REQUIRED_PERMISSIONS)) {
    errors.push(`Clipboard permissions must be exactly: ${REQUIRED_PERMISSIONS.join(', ')}`);
  }

  return {
    version: 1,
    ok: errors.length === 0,
    errors,
    permissions: clipboardPermissions,
    matrix: {
      browser: {
        textRead: true,
        textWrite: true,
        htmlRead: true,
        htmlWrite: true,
        customMimeRead: true,
        customMimeWrite: true,
        verification: 'real-chromium-gate',
      },
      tauri: {
        textRead: true,
        textWrite: true,
        htmlRead: false,
        htmlWrite: true,
        customMimeRead: false,
        customMimeWrite: false,
        verification: 'official-api-and-real-linux-gate',
      },
    },
  };
}

export function formatClipboardCapabilityAudit(report) {
  const lines = [
    `Clipboard capability audit v${report.version}: ${report.ok ? 'pass' : 'fail'}`,
    `Tauri permissions: ${report.permissions.join(', ') || 'none'}`,
  ];
  for (const [host, capability] of Object.entries(report.matrix)) {
    lines.push(
      `${host}: text r/w=${capability.textRead && capability.textWrite ? 'yes' : 'no'}, `
      + `HTML r/w=${capability.htmlRead ? 'yes' : 'no'}/${capability.htmlWrite ? 'yes' : 'no'}, `
      + `custom r/w=${capability.customMimeRead ? 'yes' : 'no'}/${capability.customMimeWrite ? 'yes' : 'no'} `
      + `(${capability.verification})`,
    );
  }
  for (const error of report.errors) lines.push(`error: ${error}`);
  return lines.join('\n');
}
