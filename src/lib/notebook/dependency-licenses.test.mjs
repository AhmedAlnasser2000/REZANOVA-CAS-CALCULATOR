import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const DIRECT_PACKAGES = [
  '@tiptap/core',
  '@tiptap/react',
  '@tiptap/starter-kit',
  '@tiptap/extension-highlight',
  '@tiptap/extension-text-style',
  '@tiptap/extension-color',
];
const ALLOWED_LICENSES = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
]);

function packageName(location) {
  const tail = location.slice(location.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const parts = tail.split('/');
  return tail.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

test('Notebook editor dependencies remain pinned and permissively licensed', () => {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const entriesByName = new Map();
  Object.entries(lock.packages).forEach(([location, entry]) => {
    if (!location.includes('node_modules/')) {
      return;
    }
    const name = packageName(location);
    entriesByName.set(name, [...(entriesByName.get(name) ?? []), entry]);
  });

  const queue = [...DIRECT_PACKAGES];
  const visited = new Set();
  const audited = [];
  while (queue.length > 0) {
    const name = queue.shift();
    if (!name || visited.has(name)) {
      continue;
    }
    visited.add(name);
    const entries = entriesByName.get(name) ?? [];
    assert.ok(entries.length > 0, `${name} must be present in package-lock.json`);
    entries.forEach((entry) => {
      audited.push({
        name,
        license: entry.license ?? 'UNIDENTIFIED',
        version: entry.version ?? 'UNVERSIONED',
      });
      Object.keys({
        ...entry.dependencies,
        ...entry.optionalDependencies,
        ...Object.fromEntries(Object.entries(entry.peerDependencies ?? {})
          .filter(([dependency]) => dependency.startsWith('@tiptap/'))),
      }).forEach((dependency) => queue.push(dependency));
    });
  }

  DIRECT_PACKAGES.forEach((name) => {
    assert.ok(audited.some((entry) =>
      entry.name === name && entry.license === 'MIT' && entry.version === '3.27.3'));
  });
  assert.deepEqual(audited.filter(({ license }) => !ALLOWED_LICENSES.has(license)), []);
  assert.equal(audited.some(({ name }) => /(?:^|\/)pro(?:$|[-/])|cloud/i.test(name)), false);
});
