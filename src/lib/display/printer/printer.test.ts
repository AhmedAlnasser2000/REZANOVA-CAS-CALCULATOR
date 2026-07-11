import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { printMathJson } from './printer';

const ce = new ComputeEngine();

function canonical(mathJson: unknown) {
  return printMathJson({
    mathJson,
    profile: 'pedagogical-v1',
    target: 'canonical-latex',
  });
}

describe('pure structural printer', () => {
  it('preserves the producer tree while applying unambiguous presentation', () => {
    expect(canonical(['Add', 'x', 0])).toMatchObject({ ok: true, text: 'x+0' });
    expect(canonical(['Multiply', 1, 'x'])).toMatchObject({ ok: true, text: '1x' });
    expect(canonical(['Multiply', 'B', 'A'])).toMatchObject({ ok: true, text: 'BA' });
    expect(canonical(['Add', 'x', ['Negate', 'y']])).toMatchObject({ ok: true, text: 'x-y' });
    expect(canonical(['Power', ['Negate', 'x'], 2])).toMatchObject({ ok: true, text: '(-x)^2' });
    expect(canonical(['Multiply', ['Add', 'x', 'y'], 'z']))
      .toMatchObject({ ok: true, text: '(x+y)z' });
  });

  it('keeps compatibility output byte-stable until a producer opts into the profile', () => {
    const result = printMathJson({
      mathJson: ['Divide', 1, 2],
      compatibilityLatex: String.raw`\frac{ 1 }{ 2 }`,
      profile: 'compatibility-v1',
      target: 'canonical-latex',
    });

    expect(result).toMatchObject({
      ok: true,
      text: String.raw`\frac{ 1 }{ 2 }`,
      serializedLatex: String.raw`\frac{1}{2}`,
      source: 'compatibility-fallback',
    });
  });

  it('derives visible and plain-text targets without changing canonical output', () => {
    const visible = printMathJson({
      mathJson: ['Power', 'x', ['Divide', 1, 3]],
      profile: 'pedagogical-v1',
      target: 'visible-latex',
      displayPrefs: { symbolicDisplayMode: 'roots', flattenNestedRootsWhenSafe: true },
    });
    const plain = printMathJson({
      mathJson: ['Divide', ['Add', 'x', 1], 2],
      profile: 'pedagogical-v1',
      target: 'plain-text',
    });

    expect(visible).toMatchObject({ ok: true, text: String.raw`\sqrt[3]{x}` });
    expect(plain).toMatchObject({ ok: true, text: '(x+1)/2' });
  });

  it('falls back explicitly when an untrusted node is invalid', () => {
    const result = printMathJson({
      mathJson: { boxed: true },
      compatibilityLatex: 'x=1',
      profile: 'pedagogical-v1',
      target: 'canonical-latex',
    });
    expect(result).toMatchObject({
      ok: true,
      text: 'x=1',
      source: 'compatibility-fallback',
      fallbackReason: 'invalid-root',
    });
  });

  it('is parse-back stable over the supported scalar subset', () => {
    const nodes = [
      ['Add', 'x', ['Negate', 'y']],
      ['Multiply', ['Add', 'x', 1], 'z'],
      ['Divide', ['Power', 'x', 2], ['Add', 'y', 1]],
      ['Equal', 'x', ['Set', 1, 2]],
    ];

    for (const node of nodes) {
      const first = canonical(node);
      expect(first.ok).toBe(true);
      if (!first.ok) {
        continue;
      }
      const parsed = ce.parse(first.canonicalLatex, { form: 'structural' });
      const second = canonical(parsed.json);
      expect(second.ok).toBe(true);
      if (second.ok) {
        expect(second.canonicalLatex).toBe(first.canonicalLatex);
      }
    }
  });
});
