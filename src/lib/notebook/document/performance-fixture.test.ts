import { describe, expect, it } from 'vitest';

import { isNotebookRichDocument, measureNotebookDocument } from './model';
import {
  createNotebookPerformanceFixture,
  NOTEBOOK_PERFORMANCE_BLOCK_COUNT,
  NOTEBOOK_PERFORMANCE_MATH_NODE_COUNT,
  NOTEBOOK_PERFORMANCE_PROFILES,
} from './performance-fixture';

describe('Notebook performance fixture', () => {
  it('contains exactly 100 blocks and 150 inline math nodes', () => {
    const fixture = createNotebookPerformanceFixture();
    const metrics = measureNotebookDocument(fixture.content);

    expect(metrics.blockCount).toBe(NOTEBOOK_PERFORMANCE_BLOCK_COUNT);
    expect(metrics.inlineMathCount).toBe(NOTEBOOK_PERFORMANCE_MATH_NODE_COUNT);
    expect(isNotebookRichDocument(JSON.parse(JSON.stringify(fixture)))).toBe(true);
  });

  it.each(Object.entries(NOTEBOOK_PERFORMANCE_PROFILES))(
    'builds the %s fixture at its committed block and inline-math scale',
    (profile, expected) => {
      const fixture = createNotebookPerformanceFixture(
        profile as keyof typeof NOTEBOOK_PERFORMANCE_PROFILES,
      );
      expect(measureNotebookDocument(fixture.content)).toMatchObject(expected);
      expect(isNotebookRichDocument(fixture)).toBe(true);
    },
    20_000,
  );
});
