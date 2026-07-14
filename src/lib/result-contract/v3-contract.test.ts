import { describe, expect, it } from 'vitest';
import type { CanonicalResultDocumentV3 } from '../../types/calculator';
import {
  canonicalMathValueV2FromProof,
  declareProducerOwnedAnswerMathJson,
  proveStandardAnswerMathJson,
} from './proven-answer-mathjson';
import {
  attachCanonicalResultV3ToProducerDraft,
  buildCanonicalResultDocumentV3,
  buildCanonicalRuntimeActionV3,
} from './producer-v3';
import { collectCanonicalMathLeaves } from './mathjson-coverage';
import { normalizeCanonicalResultDocument } from './normalized-result';
import { validateCanonicalRuntimeVersionedResultOutcome } from './runtime-outcome-versioned';
import {
  createCanonicalRuntimeResult,
  finalizeCanonicalRuntimeOutcomeFromProducer,
} from './runtime-outcome';
import {
  collectCanonicalResultMathValuesV3,
  validateCanonicalResultDocumentV3,
} from './validation-v3';

function proven(canonicalLatex: string, mathJson: unknown) {
  const result = proveStandardAnswerMathJson({
    canonicalLatex,
    candidate: declareProducerOwnedAnswerMathJson({
      mathJson,
      owner: 'vector',
      routeId: 'vector.angle',
      source: 'v3-contract-test',
    }),
  });
  if (!result.ok) throw new Error(`${result.failure.reason}: ${result.failure.message}`);
  return canonicalMathValueV2FromProof(result.evidence);
}

function gradDocument(): CanonicalResultDocumentV3 {
  return buildCanonicalResultDocumentV3({
    outcomeKind: 'success',
    title: 'Angle',
    primary: {
      kind: 'angle-quantity',
      presentation: { primaryLatex: '100^{g}' },
      magnitude: proven('100', 100),
      unit: 'grad',
    },
    warnings: [],
  });
}

describe('CanonicalResultDocumentV3 angle quantity contract', () => {
  it('preserves gradian presentation while exposing typed magnitude and unit semantics', () => {
    const document = gradDocument();
    expect(validateCanonicalResultDocumentV3(document)).toMatchObject({
      ok: true,
      validated: { value: { version: 3 }, mathValueCount: 1 },
    });
    expect(normalizeCanonicalResultDocument(document)).toMatchObject({
      sourceVersion: 3,
      presentation: { primaryLatex: '100^{g}' },
      semantics: {
        primary: {
          kind: 'angle-quantity',
          magnitude: { canonicalLatex: '100', mathJson: 100 },
          unit: 'grad',
        },
      },
    });
    expect(collectCanonicalResultMathValuesV3(document)).toEqual([{
      path: '$.primary.magnitude',
      value: { canonicalLatex: '100', mathJson: 100 },
    }]);
    expect(collectCanonicalMathLeaves(document)).toEqual([{
      path: 'primary.magnitude',
      leafPath: 'primary.magnitude',
      value: { canonicalLatex: '100', mathJson: 100 },
    }]);
  });

  it('inherits existing V2 primaries without changing their wire shape', () => {
    const document = buildCanonicalResultDocumentV3({
      outcomeKind: 'success',
      title: 'Math',
      primary: { kind: 'math', value: proven('2', 2) },
      warnings: [],
    });
    expect(validateCanonicalResultDocumentV3(document)).toMatchObject({
      ok: true,
      validated: { value: { primary: { kind: 'math' } } },
    });
  });

  it('rejects missing evidence, invalid units, undeclared fields, and custom operators', () => {
    const missingMagnitude = structuredClone(gradDocument()) as Record<string, unknown>;
    delete (missingMagnitude.primary as Record<string, unknown>).magnitude;
    expect(validateCanonicalResultDocumentV3(missingMagnitude)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape' },
    });

    const invalidUnit = structuredClone(gradDocument()) as Record<string, unknown>;
    (invalidUnit.primary as Record<string, unknown>).unit = 'turn';
    expect(validateCanonicalResultDocumentV3(invalidUnit)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape' },
    });

    const extraField = structuredClone(gradDocument()) as Record<string, unknown>;
    (extraField.primary as Record<string, unknown>).canonicalRadians = {
      canonicalLatex: '\\frac{\\pi}{2}',
      mathJson: ['Divide', 'Pi', 2],
    };
    expect(validateCanonicalResultDocumentV3(extraField)).toMatchObject({
      ok: false,
      failure: { reason: 'invalid-shape' },
    });

    const customOperator = structuredClone(gradDocument()) as Record<string, unknown>;
    ((customOperator.primary as Record<string, unknown>).magnitude as Record<string, unknown>)
      .mathJson = ['CalcwizGrad', 100];
    expect(validateCanonicalResultDocumentV3(customOperator)).toMatchObject({
      ok: false,
      failure: { reason: 'custom-math-json-operator' },
    });
  });

  it('enforces structured-value limits', () => {
    expect(validateCanonicalResultDocumentV3(gradDocument(), { maxNodes: 1 }))
      .toMatchObject({ ok: false, failure: { reason: 'node-limit' } });
  });

  it('requires V3 documents and runtime actions to carry matching versions', () => {
    const document = gradDocument();
    const action = buildCanonicalRuntimeActionV3({
      kind: 'send',
      target: 'calculate',
      math: proven('100', 100),
    });
    expect(validateCanonicalRuntimeVersionedResultOutcome({
      kind: 'success',
      canonicalResult: document,
      actions: [action],
    })).toMatchObject({
      ok: true,
      validated: { value: { canonicalResult: { version: 3 } } },
    });
    expect(validateCanonicalRuntimeVersionedResultOutcome({
      kind: 'success',
      canonicalResult: document,
      actions: [{ ...action, version: 2 }],
    })).toMatchObject({
      ok: false,
      failure: { reason: 'action-version-mismatch' },
    });

    expect(createCanonicalRuntimeResult(document, { actions: [action] })).toMatchObject({
      kind: 'success',
      canonicalResult: { version: 3 },
      actions: [{ version: 3, kind: 'send' }],
    });
    const draft = attachCanonicalResultV3ToProducerDraft(document, {
      kind: 'success',
      title: 'Angle',
      exactLatex: '100^{g}',
      warnings: [],
      actions: [action],
    });
    expect(finalizeCanonicalRuntimeOutcomeFromProducer(draft, 'V3 test')).toMatchObject({
      kind: 'success',
      canonicalResult: { version: 3 },
      actions: [{ version: 3, kind: 'send' }],
    });
  });
});
