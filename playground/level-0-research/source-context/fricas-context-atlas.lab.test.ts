import { describe, expect, it } from 'vitest';
import { FRICAS_REFERENCE_CORPUS } from './fricas-reference-corpus';

describe('FriCAS context atlas corpus', () => {
  it('keeps the first context corpus bounded and useful', () => {
    expect(FRICAS_REFERENCE_CORPUS.length).toBeGreaterThanOrEqual(30);
    expect(FRICAS_REFERENCE_CORPUS.length).toBeLessThanOrEqual(50);
  });

  it('uses unique ids and source paths inside the ignored FriCAS mirror shape', () => {
    const ids = new Set<string>();

    for (const entry of FRICAS_REFERENCE_CORPUS) {
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      expect(entry.sourcePath).toMatch(/^(doc|src)\//);
      expect(entry.boundaryNotes.length).toBeGreaterThan(20);
    }
  });

  it('covers the intended architecture and math capability areas', () => {
    const areas = new Set(FRICAS_REFERENCE_CORPUS.map((entry) => entry.area));

    for (const required of [
      'architecture',
      'type-system',
      'expression-model',
      'integration',
      'limits',
      'polynomial-algebra',
      'groebner-elimination',
      'regular-chains',
      'linear-algebra',
      'solving',
      'simplification',
      'series-special-functions',
    ]) {
      expect(areas.has(required)).toBe(true);
    }
  });
});
