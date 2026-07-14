import { describe, expect, it } from 'vitest';

import {
  acceptNotebookMathCandidate,
  applyNotebookTextMark,
  createNotebookDocument,
  detectNotebookMathCandidates,
} from '../index';
import type { NotebookTextBlock } from '../types';
import { migrateNotebookDocumentV1 } from './migrate-v1';

const fixedNow = () => new Date('2026-07-06T12:00:00.000Z');

describe('Notebook V1 to V2 migration', () => {
  it('preserves prose while converting valid accepted spans and marks', () => {
    const legacy = createNotebookDocument({ now: fixedNow, title: 'Migration Lab' });
    const index = legacy.blocks.findIndex((block) => block.kind === 'text');
    const original = legacy.blocks[index] as NotebookTextBlock;
    const text = 'Use x^2-5x+6=0 and explain the roots.';
    const base = { ...original, text, mathSpans: [], marks: [] };
    const candidate = detectNotebookMathCandidates(text, { mode: 'equation' })[0];
    const accepted = acceptNotebookMathCandidate(base, candidate);
    legacy.blocks[index] = applyNotebookTextMark(accepted, 'bold', { start: 0, end: 3 });

    const migrated = migrateNotebookDocumentV1(legacy);
    const paragraph = migrated.content[index];

    expect(migrated.version).toBe(6);
    expect(paragraph.type).toBe('paragraph');
    expect(paragraph).toMatchObject({ id: original.id });
    if (paragraph.type !== 'paragraph') {
      throw new Error('expected paragraph');
    }
    expect(paragraph.content).toContainEqual(expect.objectContaining({
      type: 'inlineMath',
      sourceText: candidate.sourceText,
      workspaceTarget: 'equation',
    }));
    expect(paragraph.content).toContainEqual(expect.objectContaining({
      type: 'text',
      text: 'Use',
      marks: [{ type: 'bold' }],
    }));
  });

  it('falls back to original text when an accepted span is stale', () => {
    const legacy = createNotebookDocument({ now: fixedNow });
    const index = legacy.blocks.findIndex((block) => block.kind === 'text');
    const original = legacy.blocks[index] as NotebookTextBlock;
    legacy.blocks[index] = {
      ...original,
      text: 'The expression changed.',
      mathSpans: [{
        id: 'stale.math',
        status: 'accepted',
        start: 0,
        end: 3,
        sourceText: 'x^2',
        normalizedLatex: 'x^2',
        parser: 'canonicalizeMathInput',
        mode: 'calculate',
        confidence: 'high',
      }],
    };

    const migrated = migrateNotebookDocumentV1(legacy);
    const paragraph = migrated.content[index];
    expect(paragraph).toMatchObject({
      type: 'paragraph',
      content: [{ type: 'text', text: 'The expression changed.' }],
    });
  });

  it('maps standalone math, evidence, and dividers without internal objects', () => {
    const legacy = createNotebookDocument({ now: fixedNow });
    legacy.blocks.push({
      id: 'divider.1',
      kind: 'divider',
      createdAt: fixedNow().toISOString(),
      updatedAt: fixedNow().toISOString(),
    });
    const migrated = migrateNotebookDocumentV1(legacy);

    expect(migrated.content.map((node) => node.type)).toEqual([
      'heading',
      'paragraph',
      'displayMath',
      'evidenceSnapshot',
      'horizontalRule',
    ]);
    expect(JSON.stringify(migrated)).not.toContain('orderOfExecutionEnvelope');
  });
});
