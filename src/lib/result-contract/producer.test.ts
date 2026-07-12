import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { projectDisplayOutcomeToCanonicalResult } from './projection';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from './producer';

describe('canonical result producer builder', () => {
  it('matches the typed compatibility projection without parsing LaTeX', () => {
    const outcome: Extract<DisplayOutcome, { kind: 'success' }> = {
      kind: 'success',
      title: 'Solve',
      exactLatex: 'x=1',
      canonicalMath: {
        version: 1,
        canonicalLatex: 'x=1',
        mathJson: ['Equal', 'x', 1],
      },
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '=',
        branchesLatex: ['1'],
        source: 'fixture',
      },
      detailSections: [{
        title: 'Proof',
        lines: ['x=1', 'Validated exactly.'],
        lineParts: [
          [{ kind: 'math', latex: 'x=1' }],
          [{ kind: 'text', text: 'Validated exactly.' }],
        ],
      }],
      warnings: [],
      resultOrigin: 'symbolic',
      plannerBadges: ['Canonicalized'],
      resolvedInputLatex: 'x+0=1',
    };
    const document = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: outcome.title,
      primaryMath: canonicalMathValue(
        outcome.exactLatex!,
        outcome.canonicalMath?.mathJson,
      ),
      branchReadback: outcome.branchReadback,
      detailSections: outcome.detailSections,
      warnings: outcome.warnings,
      metadata: {
        resultOrigin: outcome.resultOrigin,
        plannerBadges: outcome.plannerBadges,
        resolvedInput: canonicalMathValue(outcome.resolvedInputLatex!),
      },
    });
    const compatibility = projectDisplayOutcomeToCanonicalResult(outcome);
    expect(compatibility.ok).toBe(true);
    if (!compatibility.ok) return;
    expect(document).toEqual(compatibility.document);
    expect(structuredClone(document)).toEqual(document);
  });

  it('fails closed when a producer detail line has no typed intent', () => {
    expect(() => buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Result',
      warnings: [],
      detailSections: [{ title: 'Undeclared', lines: ['x=1'] }],
    })).toThrow('has no typed intent');
  });
});
