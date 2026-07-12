import { describe, expect, it } from 'vitest';

import { countNotebookBlocks, isNotebookRichDocument } from './model';
import {
  createNotebookPerformanceFixture,
  NOTEBOOK_PERFORMANCE_BLOCK_COUNT,
  NOTEBOOK_PERFORMANCE_MATH_NODE_COUNT,
} from './performance-fixture';

describe('Notebook performance fixture', () => {
  it('contains exactly 100 blocks and 150 inline math nodes', () => {
    const fixture = createNotebookPerformanceFixture();
    const mathNodes = fixture.content.flatMap((node) =>
      node.type === 'paragraph'
        ? node.content?.filter((child) => child.type === 'inlineMath') ?? []
        : []);

    expect(countNotebookBlocks(fixture.content)).toBe(NOTEBOOK_PERFORMANCE_BLOCK_COUNT);
    expect(mathNodes).toHaveLength(NOTEBOOK_PERFORMANCE_MATH_NODE_COUNT);
    expect(isNotebookRichDocument(JSON.parse(JSON.stringify(fixture)))).toBe(true);
  });
});
