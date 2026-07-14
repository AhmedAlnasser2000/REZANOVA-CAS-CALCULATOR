import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../../types/calculator';
import { buildFormulaViewerArtifact } from '../../../app/runtime/formula-viewer-artifacts';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../result-contract';
import { orderDisplayBlocksForReveal } from '../scheduling/display-render-scheduler';
import { buildDisplayBlocks } from './display-blocks';
import { displayResultReadModelFromOutcome } from './display-read-model';
import {
  canonicalRuntimeResultV2Fixture,
  standardV2MathValue,
} from '../../../test-utils/canonical-result-v2-fixture';

describe('display canonical read model', () => {
  it('keeps native canonical truth authoritative through blocks, scheduling, and Formula Viewer', () => {
    const canonicalResult = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Canonical title',
      primaryMath: canonicalMathValue('x=1'),
      detailSections: [{
        title: 'Canonical detail',
        lineKind: 'math',
        lines: ['x>0'],
      }],
      warnings: ['Canonical warning'],
    });
    const outcome = {
      kind: 'success' as const,
      canonicalResult,
    };

    expect(displayResultReadModelFromOutcome(outcome)).toMatchObject({
      authority: 'native',
      title: 'Canonical title',
      primaryLatex: 'x=1',
      warnings: ['Canonical warning'],
    });

    const blocks = buildDisplayBlocks(outcome);
    const ordered = orderDisplayBlocksForReveal(blocks);
    const answer = ordered.find((block) => block.id === 'answer');
    const detail = ordered.find((block) => block.id === 'detail-0');
    const warning = ordered.find((block) => block.id === 'warnings');

    expect(ordered.map((block) => block.id)).toEqual(['answer', 'warnings', 'detail-0']);
    expect(answer).toMatchObject({ latex: 'x=1', rawContent: ['x=1'] });
    expect(detail).toMatchObject({
      label: 'Canonical detail',
      lines: [{ lineKind: 'math', text: 'x>0' }],
    });
    expect(warning).toMatchObject({ rawContent: ['Canonical warning'] });

    const artifact = buildFormulaViewerArtifact({
      block: answer!,
      displayBlocks: blocks,
      now: () => 42,
    });
    expect(artifact).toMatchObject({
      copyLatex: 'x=1',
      createdAt: 42,
      primaryBlock: { latex: 'x=1' },
      detailBlocks: [{ label: 'Canonical detail' }],
    });
  });

  it('rejects compatibility-only outcomes and keeps canonical cancellation cards renderable', () => {
    const legacy = {
      kind: 'success' as const,
      title: 'Legacy typed result',
      exactLatex: 'y=2',
      detailSections: [{ title: 'Method', lineKind: 'text' as const, lines: ['Exact route'] }],
      warnings: [],
    };
    expect(() => displayResultReadModelFromOutcome(legacy as unknown as CanonicalRuntimeOutcome))
      .toThrow('missing-document');

    const cancelledDocument = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'error',
      title: 'Stopped',
      error: 'Calculation stopped.',
      warnings: [],
    });
    const cancelled = {
      kind: 'error' as const,
      canonicalResult: cancelledDocument,
    };
    expect(displayResultReadModelFromOutcome(cancelled)).toMatchObject({
      authority: 'native',
      outcomeKind: 'error',
      errorText: 'Calculation stopped.',
    });
    expect(buildDisplayBlocks(cancelled)).toEqual([
      expect.objectContaining({
        id: 'error-text',
        kind: 'errorText',
        text: 'Calculation stopped.',
      }),
    ]);
  });

  it('renders V2 adapter presentation while retaining typed semantics behind the authority', () => {
    const outcome = canonicalRuntimeResultV2Fixture({
      outcomeKind: 'success',
      title: 'Typed profile',
      primary: {
        kind: 'linear-map-profile',
        presentation: {
          primaryLatex: '\\operatorname{profile}(A)',
          answerRows: { rows: [{ label: 'Rank', latex: '2' }] },
        },
        operand: standardV2MathValue('A', 'A'),
        domainDimension: 2,
        codomainDimension: 2,
        rank: 2,
        nullity: 0,
      },
      details: [{
        title: 'Rows',
        lines: [[{
          kind: 'row-operation',
          presentationLatex: 'R_2\\leftarrow R_2-R_1',
          operation: {
            kind: 'eliminate',
            targetRow: 2,
            sourceRow: 1,
            factor: standardV2MathValue('-1', -1),
          },
        }]],
      }],
      warnings: [],
    });

    expect(displayResultReadModelFromOutcome(outcome)).toMatchObject({
      title: 'Typed profile',
      primaryLatex: '\\operatorname{profile}(A)',
      answerRows: { rows: [{ label: 'Rank', latex: '2' }] },
      detailSections: [{
        title: 'Rows',
        lines: ['R_2\\leftarrow R_2-R_1'],
        lineKind: 'math',
      }],
    });
  });
});
