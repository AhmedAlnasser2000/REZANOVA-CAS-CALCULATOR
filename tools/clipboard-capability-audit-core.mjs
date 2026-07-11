import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_PERMISSIONS = [
  'clipboard-manager:allow-read-text',
  'clipboard-manager:allow-write-html',
  'clipboard-manager:allow-write-text',
];

const SOURCE_PATTERNS = [
  ['navigator.clipboard', /\bnavigator\s*\.\s*clipboard\b/u],
  ['clipboard event data', /\.\s*clipboardData\b/u],
  ['ClipboardItem', /\b(?:new\s+)?ClipboardItem\b/u],
  ['legacy copy command', /\bexecCommand\s*\(\s*['"]copy['"]/u],
  ['Tauri clipboard plugin import', /@tauri-apps\/plugin-clipboard-manager/u],
];

function read(rootDir, repoPath) {
  return fs.readFileSync(path.join(rootDir, repoPath), 'utf8');
}

function productionSourceFiles(rootDir) {
  const sourceRoot = path.join(rootDir, 'src');
  if (!fs.existsSync(sourceRoot)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!/\.(?:ts|tsx)$/u.test(entry.name)) continue;
      const repoPath = path.relative(rootDir, absolute).split(path.sep).join('/');
      if (
        repoPath.startsWith('src/lib/clipboard/')
        || repoPath.startsWith('src/test/')
        || /(?:^|\/)__tests__\//u.test(repoPath)
        || /\.(?:test|spec|stories)\.[^.]+$/u.test(repoPath)
      ) {
        continue;
      }
      files.push(repoPath);
    }
  };
  visit(sourceRoot);
  return files.sort();
}

export function auditClipboardSourceAuthority({ rootDir = process.cwd() } = {}) {
  const violations = [];
  for (const repoPath of productionSourceFiles(rootDir)) {
    const source = read(rootDir, repoPath);
    const lines = source.split(/\r?\n/u);
    for (const [authority, pattern] of SOURCE_PATTERNS) {
      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          violations.push({ authority, path: repoPath, line: index + 1 });
        }
      });
    }
  }
  return violations;
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
  const directApiViolations = auditClipboardSourceAuthority({ rootDir });
  for (const violation of directApiViolations) {
    errors.push(
      `Direct ${violation.authority} authority is forbidden outside src/lib/clipboard: `
      + `${violation.path}:${violation.line}`,
    );
  }

  return {
    version: 2,
    ok: errors.length === 0,
    errors,
    permissions: clipboardPermissions,
    directApiViolations,
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
    `Direct production Clipboard API violations: ${report.directApiViolations.length}`,
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
