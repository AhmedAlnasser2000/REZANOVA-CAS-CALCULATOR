import { createNotebookRichDocument } from './model';
import type {
  NotebookInlineNode,
  NotebookRichDocument,
} from './types';

export const NOTEBOOK_PERFORMANCE_PROFILES = {
  smoke: { blockCount: 100, inlineMathCount: 150 },
  medium: { blockCount: 1_000, inlineMathCount: 400 },
  live: { blockCount: 5_000, inlineMathCount: 2_000 },
  import: { blockCount: 50_000, inlineMathCount: 0 },
} as const;

export type NotebookPerformanceProfile = keyof typeof NOTEBOOK_PERFORMANCE_PROFILES;

export const NOTEBOOK_PERFORMANCE_BLOCK_COUNT = NOTEBOOK_PERFORMANCE_PROFILES.smoke.blockCount;
export const NOTEBOOK_PERFORMANCE_MATH_NODE_COUNT = NOTEBOOK_PERFORMANCE_PROFILES.smoke.inlineMathCount;
export const NOTEBOOK_LIVE_BLOCK_TARGET = NOTEBOOK_PERFORMANCE_PROFILES.live.blockCount;
export const NOTEBOOK_SAFE_IMPORT_BLOCK_TARGET = NOTEBOOK_PERFORMANCE_PROFILES.import.blockCount;

export function createNotebookPerformanceFixture(
  profile: NotebookPerformanceProfile = 'smoke',
): NotebookRichDocument {
  const fixtureProfile = NOTEBOOK_PERFORMANCE_PROFILES[profile];
  const document = createNotebookRichDocument({
    idPrefix: `notebook.performance.${profile}`,
    title: `Notebook ${profile} performance fixture`,
    now: () => new Date('2026-07-12T00:00:00.000Z'),
  });

  let mathNodeCount = 0;
  const content = Array.from({ length: fixtureProfile.blockCount }, (_, blockIndex) => {
    const targetAtBlockEnd = Math.floor(
      ((blockIndex + 1) * fixtureProfile.inlineMathCount) / fixtureProfile.blockCount,
    );
    const mathPerBlock = targetAtBlockEnd - mathNodeCount;
    const inline: NotebookInlineNode[] = [{
      type: 'text',
      text: `Observation ${blockIndex + 1} records a mathematical argument`,
    }];
    for (let index = 0; index < mathPerBlock; index += 1) {
      mathNodeCount += 1;
      inline.push({ type: 'text', text: index === 0 ? ' with ' : ' and ' });
      inline.push({
        type: 'inlineMath',
        id: `notebook.performance.${profile}.math.${mathNodeCount}`,
        sourceText: `x^${mathNodeCount}`,
        latex: `x^{${mathNodeCount}}`,
        workspaceTarget: 'calculate',
      });
    }
    inline.push({ type: 'text', text: '.' });
    return {
      type: 'paragraph' as const,
      id: `notebook.performance.${profile}.paragraph.${blockIndex + 1}`,
      content: inline,
    };
  });

  return {
    ...document,
    selectedNodeId: content[0]?.id ?? null,
    content,
  };
}
