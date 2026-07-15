import { describe, expect, it } from 'vitest';
import type {
  CanonicalResultDocumentV1,
  CanonicalResultDocumentV2,
} from '../../types/calculator';
import {
  canonicalMathValueV2FromProof,
  declareProducerOwnedAnswerMathJson,
  proveStandardAnswerMathJson,
} from './proven-answer-mathjson';
import {
  buildCanonicalResultDocumentV2,
  buildCanonicalRuntimeActionV2,
} from './producer-v2';
import {
  CANONICAL_RESULT_PRODUCER_VERSION_REGISTRY,
  CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES,
  CANONICAL_RESULT_V2_PRODUCER_SELECTORS,
  CANONICAL_RESULT_V3_PRODUCER_SELECTORS,
  FROZEN_V1_PRODUCER_ROUTE_IDS,
  canonicalResultVersionForProducer,
} from './producer-version-registry';
import { MATHJSON_ROUTE_REGISTRY } from './mathjson-route-registry';
import { validateCanonicalRuntimeVersionedResultOutcome } from './runtime-outcome-versioned';
import { validateCanonicalResultDocumentV2 } from './validation-v2';
import { validateCanonicalResultDocumentVersioned } from './validation-router';

function proven(canonicalLatex: string, mathJson: unknown) {
  const result = proveStandardAnswerMathJson({
    canonicalLatex,
    candidate: declareProducerOwnedAnswerMathJson({
      mathJson,
      owner: 'calculate',
      routeId: 'calculate.arithmetic',
      source: 'v2-contract-test',
    }),
  });
  if (!result.ok) {
    throw new Error(result.failure.reason + ': ' + result.failure.message);
  }
  return canonicalMathValueV2FromProof(result.evidence);
}

function comprehensiveDocument(): CanonicalResultDocumentV2 {
  const x = proven('x', 'x');
  const k = proven('k', 'k');
  const zero = proven('0', 0);
  const one = proven('1', 1);
  const two = proven('2', 2);
  const negativeTwo = proven('-2', -2);
  const equation = proven('x=1', ['Equal', 'x', 1]);
  return buildCanonicalResultDocumentV2({
    outcomeKind: 'success',
    title: 'Typed V2 result',
    primary: {
      kind: 'period-phase',
      presentation: {
        primaryLatex: 'x=1;\\quad P=2;\\quad \\phi=0',
        answerRows: {
          label: 'Profile',
          rows: [{ latex: 'P=2', label: 'Period' }],
        },
      },
      normalizedEquation: equation,
      period: two,
      phaseShift: zero,
    },
    request: {
      kind: 'derivative-at-point',
      presentationLatex: '\\left.\\frac{d}{dx}\\left(x\\right)\\right|_{x=1}',
      body: x,
      appliedVariablePath: [x],
      point: one,
    },
    answerRows: { rows: [{ math: one, label: 'Answer' }] },
    branchReadback: {
      target: x,
      relation: '=',
      branches: [one],
    },
    systemReadback: {
      variables: [x],
      rows: [{ values: [one] }],
    },
    periodicFamily: {
      carrier: x,
      parameter: k,
      parameterConstraints: [equation],
      branches: [one],
    },
    supplements: [{
      role: 'exclusion',
      presentationLatex: 'x\\ne 0',
      math: proven('x\\ne 0', ['NotEqual', 'x', 0]),
    }],
    details: [{
      title: 'Elimination',
      lines: [[{
        kind: 'row-operation',
        presentationLatex: 'R_2\\leftarrow R_2-2R_1',
        operation: {
          kind: 'eliminate',
          targetRow: 2,
          sourceRow: 1,
          factor: negativeTwo,
        },
      }]],
    }],
    summaries: {
      solve: [[{ kind: 'math', math: equation }]],
      transform: { text: 'Normalized', math: equation },
    },
    warnings: [],
    metadata: {
      resolvedInput: x,
      variableSubstitutions: [{ name: 'x', value: one, numericValue: 1 }],
    },
    table: {
      headers: ['x', 'f(x)'],
      rows: [
        { x: zero, primary: { kind: 'value', value: one } },
        {
          x: one,
          primary: {
            kind: 'undefined',
            reason: 'pole',
            presentationLatex: '\\text{undefined}',
          },
        },
      ],
    },
  });
}

describe('Canonical Result V2 contract', () => {
  it('builds a strict typed document from producer-proven standard MathJSON', () => {
    const document = comprehensiveDocument();
    const validation = validateCanonicalResultDocumentV2(structuredClone(document));
    expect(validation).toMatchObject({
      ok: true,
      validated: {
        value: { version: 2, title: 'Typed V2 result' },
      },
    });
    if (validation.ok) {
      expect(validation.validated.mathValueCount).toBeGreaterThan(15);
    }
  });

  it('requires MathJSON at every V2 math leaf and keeps builder failures closed', () => {
    const invalid = {
      version: 2,
      outcomeKind: 'success',
      title: 'Missing proof',
      primary: { kind: 'math', value: { canonicalLatex: '1' } },
      warnings: [],
    };
    expect(validateCanonicalResultDocumentV2(invalid)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape', path: '$.primary.value.mathJson' },
    });
    expect(() => buildCanonicalResultDocumentV2(
      invalid as unknown as Parameters<typeof buildCanonicalResultDocumentV2>[0],
    )).toThrow('Invalid producer canonical result V2');
  });

  it('rejects private and arbitrary custom MathJSON operators', () => {
    const customProof = proveStandardAnswerMathJson({
      canonicalLatex: '\\mathrm{PrivateFunction}(1)',
      candidate: declareProducerOwnedAnswerMathJson({
        mathJson: ['PrivateFunction', 1],
        owner: 'calculate',
        routeId: 'calculate.arithmetic',
        source: 'custom-v2-operator',
      }),
    });
    expect(customProof).toMatchObject({
      ok: false,
      failure: { reason: 'custom-operator' },
    });

    const document = comprehensiveDocument() as unknown as Record<string, unknown>;
    document.primary = {
      kind: 'math',
      value: {
        canonicalLatex: '\\mathrm{CalcwizSecret}(1)',
        mathJson: ['CalcwizSecret', 1],
      },
    };
    expect(validateCanonicalResultDocumentV2(document)).toMatchObject({
      ok: false,
      failure: {
        reason: 'custom-math-json-operator',
        path: '$.primary.value.mathJson',
      },
    });
  });

  it('rejects malformed compound presentation and readback shapes', () => {
    const presentation = structuredClone(comprehensiveDocument());
    if (presentation.primary?.kind !== 'period-phase') throw new Error('Expected period-phase.');
    presentation.primary.presentation.primaryLatex = '';
    expect(validateCanonicalResultDocumentV2(presentation)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape' },
    });

    const readback = structuredClone(comprehensiveDocument()) as unknown as Record<string, unknown>;
    readback.branchReadback = {
      target: { canonicalLatex: 'x', mathJson: 'x' },
      relation: '<',
      branches: [{ canonicalLatex: '1', mathJson: 1 }],
    };
    expect(validateCanonicalResultDocumentV2(readback)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape', path: '$.branchReadback.relation' },
    });
  });

  it('routes only active V1 and V2 documents and preserves their source version', () => {
    const v1: CanonicalResultDocumentV1 = {
      version: 1,
      outcomeKind: 'success',
      title: 'V1',
      primaryMath: { canonicalLatex: '1' },
      warnings: [],
    };
    expect(validateCanonicalResultDocumentVersioned(v1)).toMatchObject({
      ok: true,
      validated: { value: { version: 1 } },
    });
    expect(validateCanonicalResultDocumentVersioned(comprehensiveDocument())).toMatchObject({
      ok: true,
      validated: { value: { version: 2 } },
    });
    expect(validateCanonicalResultDocumentVersioned({
      version: 4,
      outcomeKind: 'success',
      title: 'Future',
      warnings: [],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'unsupported-version', path: '$.version' },
    });
  });

  it('pairs V1 documents with V1 actions and V2 documents with V2 actions', () => {
    const v1: CanonicalResultDocumentV1 = {
      version: 1,
      outcomeKind: 'success',
      title: 'V1',
      primaryMath: { canonicalLatex: '1' },
      warnings: [],
    };
    expect(validateCanonicalRuntimeVersionedResultOutcome({
      kind: 'success',
      canonicalResult: v1,
      actions: [{
        version: 2,
        kind: 'send',
        target: 'calculate',
        math: { canonicalLatex: '1', mathJson: 1 },
      }],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'action-version-mismatch' },
    });

    const v2 = comprehensiveDocument();
    const action = buildCanonicalRuntimeActionV2({
      kind: 'send',
      target: 'calculate',
      math: proven('1', 1),
    });
    expect(validateCanonicalRuntimeVersionedResultOutcome({
      kind: 'success',
      canonicalResult: v2,
      actions: [{
        kind: 'send',
        target: 'calculate',
        math: { canonicalLatex: '1' },
      }],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'action-version-mismatch' },
    });
    expect(validateCanonicalRuntimeVersionedResultOutcome({
      kind: 'success',
      canonicalResult: v2,
      actions: [action],
    })).toMatchObject({
      ok: true,
      validated: { value: { canonicalResult: { version: 2 } } },
    });
  });

  it('enforces document limits and strict row-operation laws', () => {
    expect(validateCanonicalResultDocumentV2(comprehensiveDocument(), { maxNodes: 1 }))
      .toMatchObject({ ok: false, failure: { reason: 'node-limit' } });

    const invalid = structuredClone(comprehensiveDocument());
    if (!invalid.details) throw new Error('Expected details.');
    invalid.details[0] = {
      title: 'Invalid swap',
      lines: [[{
        kind: 'row-operation',
        presentationLatex: 'R_1\\leftrightarrow R_1',
        operation: { kind: 'swap', firstRow: 1, secondRow: 1 },
      }]],
    };
    expect(validateCanonicalResultDocumentV2(invalid)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape' },
    });
  });

  it('keeps the frozen 57-route inventory while enabling the reviewed V2 producer gates', () => {
    const routeIds = Object.keys(MATHJSON_ROUTE_REGISTRY).sort();
    expect(FROZEN_V1_PRODUCER_ROUTE_IDS).toHaveLength(57);
    expect(routeIds.filter((routeId) =>
      (FROZEN_V1_PRODUCER_ROUTE_IDS as readonly string[]).includes(routeId)))
      .toEqual([...FROZEN_V1_PRODUCER_ROUTE_IDS].sort());
    expect(Object.keys(CANONICAL_RESULT_PRODUCER_VERSION_REGISTRY).sort()).toEqual(routeIds);
    expect(CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES)
      .toEqual([
        'trigonometry.angle-conversion',
        'trigonometry.period-phase',
        'table.domain-boundary',
        'table.rational-function',
        'statistics.descriptive',
        'statistics.frequency',
        'statistics.probability',
        'statistics.relationship',
        'statistics.inference',
        'matrix.matrix-arithmetic',
        'matrix.determinant',
        'matrix.inverse',
        'matrix.rank',
        'matrix.linear-system',
        'matrix.profile',
        'matrix.definiteness',
        'vector.dot-product',
        'vector.cross-product',
        'vector.norm',
        'vector.angle',
        'vector.orthogonalization',
        'vector.span-independence',
        'vector.geometric-measures',
      ]);
    expect(CANONICAL_RESULT_V2_PRODUCER_SELECTORS).toEqual({
      'calculus.derivatives': ['derivativePoint'],
      'equation.domain-boundary': ['typedLabeledSupplement'],
      'equation.rational-radical': ['typedLabeledSupplement'],
      'trigonometry.right-triangle': ['rightTriangle'],
    });
    expect(CANONICAL_RESULT_V3_PRODUCER_SELECTORS).toEqual({
      'vector.angle': ['angle:grad'],
    });
    for (const routeId of FROZEN_V1_PRODUCER_ROUTE_IDS) {
      const defaultVersion = [
        'trigonometry.angle-conversion',
        'trigonometry.period-phase',
        'table.domain-boundary',
        'table.rational-function',
        'statistics.descriptive',
        'statistics.frequency',
        'statistics.probability',
        'statistics.relationship',
        'statistics.inference',
        'matrix.matrix-arithmetic',
        'matrix.determinant',
        'matrix.inverse',
        'matrix.rank',
        'matrix.linear-system',
        'matrix.profile',
        'vector.dot-product',
        'vector.cross-product',
        'vector.norm',
        'vector.angle',
        'vector.orthogonalization',
        'vector.span-independence',
      ].includes(routeId) ? 2 : 1;
      const selectorVersions = routeId === 'calculus.derivatives'
        ? { derivativePoint: 2 }
        : routeId === 'equation.domain-boundary' || routeId === 'equation.rational-radical'
          ? { typedLabeledSupplement: 2 }
        : routeId === 'trigonometry.right-triangle'
          ? { rightTriangle: 2 }
        : routeId === 'vector.angle'
          ? { 'angle:grad': 3 }
          : {};
      expect(canonicalResultVersionForProducer({ routeId })).toBe(defaultVersion);
      expect(CANONICAL_RESULT_PRODUCER_VERSION_REGISTRY[routeId]).toEqual({
        defaultVersion,
        selectorVersions,
      });
    }
    expect(canonicalResultVersionForProducer({
      routeId: 'calculus.derivatives',
      selector: 'derivativePoint',
    })).toBe(2);
    expect(canonicalResultVersionForProducer({
      routeId: 'equation.rational-radical',
      selector: 'typedLabeledSupplement',
    })).toBe(2);
    expect(canonicalResultVersionForProducer({
      routeId: 'trigonometry.right-triangle',
      selector: 'rightTriangle',
    })).toBe(2);
    expect(canonicalResultVersionForProducer({
      routeId: 'vector.span-independence',
      selector: 'independent',
    })).toBe(2);
    expect(canonicalResultVersionForProducer({
      routeId: 'vector.geometric-measures',
      selector: 'volume',
    })).toBe(2);
    expect(canonicalResultVersionForProducer({
      routeId: 'vector.angle',
      selector: 'angle:grad',
    })).toBe(3);
  });
});
