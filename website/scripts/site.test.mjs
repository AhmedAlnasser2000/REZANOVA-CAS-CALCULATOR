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
test('Screenshot tabs refer to unique real panels and shipped images', () => {
  for (const lang of ['en', 'ar']) {
    const body = html[`${lang}/index.html`];
    for (const id of ['calculate', 'graphing', 'matrix', 'notebook']) {
      assert.equal((body.match(new RegExp(`id="panel-${id}"`, 'g')) || []).length, 1);
      assert.ok(body.includes(`aria-controls="panel-${id}"`));
      assert.ok(statSync(`dist/images/${id}.webp`).size > 10000);
    }
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
