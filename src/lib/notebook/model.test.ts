import { describe, expect, it } from 'vitest';

import {
  NOTEBOOK_DTO_VERSION,
  NOTEBOOK_PACKAGE_BOUNDARY,
  acceptNotebookMathCandidate,
  applyNotebookTextMark,
  availableNotebookMathCandidates,
  createNotebookDocument,
  createNotebookSurfaceState,
  detectNotebookMathCandidates,
  isNotebookSurfaceState,
  revertNotebookMathSpan,
} from './index';
import type { NotebookTextBlock } from './types';

const fixedNow = () => new Date('2026-07-06T12:00:00.000Z');

function firstTextBlock(): NotebookTextBlock {
  const block = createNotebookDocument({ now: fixedNow }).blocks
    .find((candidate) => candidate.kind === 'text');
  if (!block || block.kind !== 'text') {
    throw new Error('missing text block');
  }
  return block;
}

describe('Notebook document model', () => {
  it('creates versioned session documents with JSON-serializable blocks', () => {
    const state = createNotebookSurfaceState({ now: fixedNow, title: 'Limits Lab' });

    expect(state.kind).toBe('notebook-surface-state');
    expect(state.document.version).toBe(NOTEBOOK_DTO_VERSION);
    expect(state.document.title).toBe('Limits Lab');
    expect(state.document.blocks.map((block) => block.kind)).toEqual([
      'heading',
      'text',
      'math-editor',
      'evidence-snapshot',
    ]);
    expect(isNotebookSurfaceState(JSON.parse(JSON.stringify(state)))).toBe(true);
  });

  it('records package boundaries without leaking internal app objects', () => {
    expect(NOTEBOOK_PACKAGE_BOUNDARY.futurePackageKinds).toEqual([
      'notebook',
      'guidance-pack',
      'learner-copy',
    ]);
    expect(NOTEBOOK_PACKAGE_BOUNDARY.forbiddenFields).toContain('history');
    expect(NOTEBOOK_PACKAGE_BOUNDARY.forbiddenFields).toContain('solverObject');
    expect(NOTEBOOK_PACKAGE_BOUNDARY.forbiddenFields).toContain('orderOfExecutionEnvelope');
    expect(NOTEBOOK_PACKAGE_BOUNDARY.forbiddenFields).toContain('executableCode');
  });
});

describe('Notebook math-aware text', () => {
  it('detects natural math spans for review without mutating source text', () => {
    const text = 'Use lim x->0 sin(x)/x = 1 before solving x^2-5x+6=0.';
    const candidates = detectNotebookMathCandidates(text);

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0]).toMatchObject({
      parser: 'canonicalizeMathInput',
      status: 'pending',
    });
    expect(text).toContain('lim x->0');
  });

  it('accepts and reverts math spans non-destructively', () => {
    const block = {
      ...firstTextBlock(),
      text: 'Solve x^2-5x+6=0.',
    };
    const [candidate] = availableNotebookMathCandidates(block, { mode: 'equation' });
    const accepted = acceptNotebookMathCandidate(block, candidate);

    expect(accepted.text).toBe(block.text);
    expect(accepted.mathSpans).toHaveLength(1);
    expect(accepted.mathSpans[0]).toMatchObject({
      mode: 'equation',
      sourceText: 'x^2-5x+6=0',
      status: 'accepted',
    });

    const reverted = revertNotebookMathSpan(accepted, accepted.mathSpans[0].id);
    expect(reverted.text).toBe(block.text);
    expect(reverted.mathSpans).toHaveLength(0);
  });

  it('stores bounded rich text marks separately from prose', () => {
    const block = firstTextBlock();
    const marked = applyNotebookTextMark(block, 'highlight', {
      start: 0,
      end: 5,
      color: '#d7dfab',
    });

    expect(marked.text).toBe(block.text);
    expect(marked.marks).toEqual([
      expect.objectContaining({
        kind: 'highlight',
        start: 0,
        end: 5,
        color: '#d7dfab',
      }),
    ]);
  });
});
