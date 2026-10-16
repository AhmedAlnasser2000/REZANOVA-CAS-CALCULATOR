import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
const pages = [
  'en/index.html',
  'ar/index.html',
  'en/capabilities/index.html',
  'ar/capabilities/index.html',
  'en/history/index.html',
  'ar/history/index.html',
];
const html = Object.fromEntries(pages.map((p) => [p, readFileSync(join('dist', p), 'utf8')]));
test('Every bilingual route has correct language, direction, alternate URLs and appropriate indexing metadata', () => {
  for (const [page, body] of Object.entries(html)) {
    const lang = page.slice(0, 2);
    assert.match(body, new RegExp(`<html[^>]*lang="${lang}"`));
    assert.match(body, new RegExp(`dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`));
    assert.match(body, /hreflang="en"/);
    assert.match(body, /hreflang="ar"/);
    assert.match(body, /rel="canonical"|name="robots" content="noindex, nofollow"/);
    assert.equal((body.match(/<h1[ >]/g) || []).length, 1);
  }
});
test('All generated local links, fragments and assets resolve', () => {
  for (const [page, body] of Object.entries(html))
    for (const match of body.matchAll(/(?:href|src)="([^"\s]+)"/g)) {
      const value = match[1];
      if (!value.startsWith('/') && !value.startsWith('#')) continue;
      const [path, hash] = value.split('#');
      let target = path ? resolve('dist', '.' + path) : resolve('dist', page);
      if (path.endsWith('/')) target = join(target, 'index.html');
      assert.ok(existsSync(target), `${page}: missing ${value}`);
      if (hash)
        assert.ok(
          readFileSync(target, 'utf8').includes(`id="${hash}"`),
          `${page}: missing fragment ${value}`,
        );
    }
});
test('Every pre-computed example is a window with a maximized view and rendered math', () => {
  const examples = JSON.parse(readFileSync('src/data/examples.json', 'utf8'));
  for (const lang of ['en', 'ar']) {
    const body = html[`${lang}/index.html`];
    const ids = [
      ...examples.equation.map((e) => `eq-${e.id}`),
      ...examples.integration.map((e) => `int-${e.id}`),
      'graph-0',
      'graph-1',
      'graph-2',
      'notebook',
    ];
    for (const id of ids) {
      assert.equal((body.match(new RegExp(`id="window-${id}"`, 'g')) || []).length, 1, `${lang}: window ${id}`);
      assert.ok(body.includes(`id="dialog-title-${id}"`), `${lang}: dialog for ${id}`);
    }
    assert.ok((body.match(/class="katex"/g) || []).length > 40, `${lang}: KaTeX output`);
    assert.ok(!/katex-error/.test(body), `${lang}: a formula failed to render`);
  }
});
test('Retired workspaces have no screenshots and the site offers no stale download', () => {
  for (const file of ['calculate.webp', 'matrix.webp', 'graphing.webp'])
    assert.ok(!existsSync(`dist/images/${file}`), `${file} should be gone`);
  for (const [page, body] of Object.entries(html)) {
    assert.ok(!/Download for Linux|تنزيل لنظام لينكس/.test(body), `${page}: download button`);
    assert.ok(!/university commitments|الالتزامات الجامعية/.test(body), `${page}: old pause wording`);
  }
});
test('JavaScript and hero images stay within the initial performance budget', () => {
  const js = readdirSync('dist/_astro')
    .filter((f) => f.endsWith('.js'))
    .reduce((sum, f) => sum + statSync(join('dist/_astro', f)).size, 0);
  assert.ok(js < 15000, `JS payload ${js} exceeds 15 KB uncompressed`);
  for (const file of ['coast-wide.webp', 'coast-tablet.webp'])
    assert.ok(statSync(`dist/images/${file}`).size < 450000);
});
