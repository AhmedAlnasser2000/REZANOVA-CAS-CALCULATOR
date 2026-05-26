import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const APP_TITLE = 'REZANOVA CLASSWIZ CALCULATOR';
const TAURI_IDENTIFIER = 'com.ahmed.calcwizdesktop';

test('browser and Tauri chrome use the REZANOVA title', () => {
  const html = readFileSync('index.html', 'utf8');
  const tauriConfig = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));

  assert.match(html, new RegExp(`<title>\\s*${APP_TITLE}\\s*</title>`));
  assert.equal(tauriConfig.productName, APP_TITLE);
  assert.equal(tauriConfig.app?.windows?.[0]?.title, APP_TITLE);
});

test('Tauri identifier remains stable for existing desktop storage', () => {
  const tauriConfig = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));

  assert.equal(tauriConfig.identifier, TAURI_IDENTIFIER);
});
