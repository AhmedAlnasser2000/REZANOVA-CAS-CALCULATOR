import { createNotebookRichDocument } from './model';
import type {
  NotebookInlineNode,
  NotebookRichDocument,
} from './types';

export const NOTEBOOK_PERFORMANCE_BLOCK_COUNT = 100;
export const NOTEBOOK_PERFORMANCE_MATH_NODE_COUNT = 150;

export function createNotebookPerformanceFixture(): NotebookRichDocument {
  const document = createNotebookRichDocument({
    idPrefix: 'notebook.performance',
    title: 'Long Mathematics Notebook',
    now: () => new Date('2026-07-12T00:00:00.000Z'),
  });

  let mathNodeCount = 0;
  const content = Array.from({ length: NOTEBOOK_PERFORMANCE_BLOCK_COUNT }, (_, blockIndex) => {
    const mathPerBlock = blockIndex < 50 ? 2 : 1;
    const inline: NotebookInlineNode[] = [{
      type: 'text',
      text: `Observation ${blockIndex + 1}: `,
    }];
    for (let index = 0; index < mathPerBlock; index += 1) {
      mathNodeCount += 1;
      inline.push({
        type: 'inlineMath',
        id: `notebook.performance.math.${mathNodeCount}`,
        sourceText: `x^${mathNodeCount}`,
        latex: `x^{${mathNodeCount}}`,
        workspaceTarget: 'calculate',
      });
      inline.push({ type: 'text', text: index + 1 === mathPerBlock ? '.' : ' and ' });
    }
    return {
      type: 'paragraph' as const,
      id: `notebook.performance.paragraph.${blockIndex + 1}`,
      content: inline,
    };
  });

  return {
    ...document,
    selectedNodeId: content[0]?.id ?? null,
    content,
  };
}
