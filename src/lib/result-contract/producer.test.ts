import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import { projectDisplayOutcomeToCanonicalResult } from './projection';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from './producer';
import {
  canonicalMathValueFromProof,
  declareProducerOwnedAnswerMathJson,
  proveAnswerMathJson,
} from './proven-answer-mathjson';

function provenValue(canonicalLatex: string, mathJson: unknown) {
  const proof = proveAnswerMathJson({
    canonicalLatex,
    candidate: declareProducerOwnedAnswerMathJson({
      mathJson,
      owner: 'equation',
      routeId: 'equation.linear',
      source: 'producer-builder-test',
    }),
  });
  if (!proof.ok) throw new Error(proof.failure.message);
  return canonicalMathValueFromProof(proof.evidence);
}

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

  it('accepts direct typed math enrichment without permitting structural drift', () => {
    const document = buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Typed values',
      primaryMath: canonicalMathValue('x=1'),
      answerRows: { rows: [{ latex: 'x=1' }] },
      detailSections: [{
        title: 'Proof',
        lines: ['x=1'],
        lineKind: 'math',
      }],
      warnings: [],
      metadata: { resolvedInput: canonicalMathValue('x+0=1') },
    }, {
      mathValues: {
        primaryMath: provenValue('x=1', ['Equal', 'x', 1]),
        answerRows: {
          rows: [{ math: provenValue('x=1', ['Equal', 'x', 1]) }],
        },
        details: [{
          title: 'Proof',
          lines: [[{
            kind: 'math',
            math: provenValue('x=1', ['Equal', 'x', 1]),
          }]],
        }],
        metadata: {
          resolvedInput: provenValue('x+0=1', ['Equal', ['Add', 'x', 0], 1]),
        },
      },
    });

    expect(document.primaryMath?.mathJson).toEqual(['Equal', 'x', 1]);
    expect(document.answerRows?.rows[0].math.mathJson).toEqual(['Equal', 'x', 1]);
    expect(document.details?.[0].lines[0][0]).toMatchObject({
      kind: 'math',
      math: { mathJson: ['Equal', 'x', 1] },
    });
    expect(document.metadata?.resolvedInput?.mathJson)
      .toEqual(['Equal', ['Add', 'x', 0], 1]);

    expect(() => buildCanonicalResultDocumentFromProducer({
      outcomeKind: 'success',
      title: 'Typed values',
      primaryMath: canonicalMathValue('x=1'),
      warnings: [],
    }, {
      mathValues: {
        primaryMath: provenValue('x=2', ['Equal', 'x', 2]),
      },
    })).toThrow('changed compatibility field primaryMath');
  });
});
