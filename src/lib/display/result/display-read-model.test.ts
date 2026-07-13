import { describe, expect, it } from 'vitest';
import { buildFormulaViewerArtifact } from '../../../app/runtime/formula-viewer-artifacts';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../../result-contract';
import { orderDisplayBlocksForReveal } from '../scheduling/display-render-scheduler';
import { buildDisplayBlocks } from './display-blocks';
import { displayResultReadModelFromOutcome } from './display-read-model';

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
      title: 'Stale compatibility title',
      exactLatex: 'x=999',
      detailSections: [{
        title: 'Stale compatibility detail',
        lineKind: 'text' as const,
        lines: ['not canonical'],
      }],
      warnings: ['Stale compatibility warning'],
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
    expect(JSON.stringify(blocks)).not.toContain('999');
    expect(JSON.stringify(blocks)).not.toContain('Stale compatibility');

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
    expect(() => displayResultReadModelFromOutcome(legacy))
      .toThrow('missing-document');

    const cancelledDocument = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'error',
      title: 'Stopped',
      error: 'Calculation stopped.',
      warnings: [],
    });
    const cancelled = {
      kind: 'error' as const,
      title: 'Stopped',
      error: 'Calculation stopped.',
      warnings: [],
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
});
