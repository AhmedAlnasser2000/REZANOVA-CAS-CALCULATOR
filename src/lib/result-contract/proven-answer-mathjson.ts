import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  CanonicalMathValueV1,
  CanonicalMathValueV2,
  SerializableMathJson,
} from '../../types/calculator';
import {
  printMathJson,
  validateSerializableMathJson,
  type MathJsonValidationFailure,
} from '../display/printer';
import type { HistoryReplayWorkspace } from '../history-replay/fixture-contract';
import type { MathJsonRouteId } from './mathjson-route-registry';

declare const producerOwnedCandidateBrand: unique symbol;
declare const provenAnswerMathJsonBrand: unique symbol;
declare const provenStandardAnswerMathJsonBrand: unique symbol;

export type ProducerOwnedAnswerMathJsonCandidate = {
  readonly mathJson: unknown;
  readonly provenance: {
    readonly kind: 'producer-answer-tree';
    readonly owner: HistoryReplayWorkspace;
    readonly routeId: MathJsonRouteId;
    readonly source: string;
  };
  readonly [producerOwnedCandidateBrand]: true;
};

export type ProvenAnswerMathJson = SerializableMathJson & {
  readonly [provenAnswerMathJsonBrand]: true;
};

export type ProvenStandardAnswerMathJson = ProvenAnswerMathJson & {
  readonly [provenStandardAnswerMathJsonBrand]: true;
};

export type ProvenCanonicalMathValue = Omit<CanonicalMathValueV1, 'mathJson'> & {
  mathJson: ProvenAnswerMathJson;
};

export type ProvenCanonicalMathValueV2 = Omit<CanonicalMathValueV2, 'mathJson'> & {
  mathJson: ProvenStandardAnswerMathJson;
};

export type ProvenAnswerMathJsonEvidence = {
  canonicalLatex: string;
  mathJson: ProvenAnswerMathJson;
  owner: HistoryReplayWorkspace;
  routeId: MathJsonRouteId;
  source: string;
  nodeCount: number;
  depth: number;
  byteLength: number;
  semanticRelation: 'structural' | 'equal' | 'simplified';
  serializedLatex: string;
  printerSource: 'math-json' | 'compatibility-fallback';
};

export type ProvenStandardAnswerMathJsonEvidence = Omit<
  ProvenAnswerMathJsonEvidence,
  'mathJson'
> & {
  mathJson: ProvenStandardAnswerMathJson;
};

export type ProvenAnswerMathJsonFailure = {
  reason:
    | 'invalid-provenance'
    | 'invalid-math-json'
    | 'private-operator'
    | 'clone-failure'
    | 'compute-engine-invalid'
    | 'canonical-latex-invalid'
    | 'semantic-mismatch'
    | 'printer-failure'
    | 'printer-mismatch';
  message: string;
  mathJsonFailure?: MathJsonValidationFailure;
};

export type ProvenAnswerMathJsonResult =
  | { ok: true; evidence: ProvenAnswerMathJsonEvidence }
  | { ok: false; failure: ProvenAnswerMathJsonFailure };

export type ProvenStandardAnswerMathJsonFailure = ProvenAnswerMathJsonFailure | {
  reason: 'custom-operator';
  message: string;
};

export type ProvenStandardAnswerMathJsonResult =
  | { ok: true; evidence: ProvenStandardAnswerMathJsonEvidence }
  | { ok: false; failure: ProvenStandardAnswerMathJsonFailure };

const PRIVATE_OPERATOR_PREFIXES = ['Calcwiz', 'Rezanova'] as const;
const standardOperatorEngine = new ComputeEngine();

function failure(
  reason: ProvenAnswerMathJsonFailure['reason'],
  message: string,
  mathJsonFailure?: MathJsonValidationFailure,
): ProvenAnswerMathJsonResult {
  return {
    ok: false,
    failure: {
      reason,
      message,
      ...(mathJsonFailure ? { mathJsonFailure } : {}),
    },
  };
}

function privateOperator(value: unknown): string | undefined {
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      const [operator, ...operands] = current;
      if (
        typeof operator === 'string'
        && PRIVATE_OPERATOR_PREFIXES.some((prefix) => operator.startsWith(prefix))
      ) {
        return operator;
      }
      pending.push(...operands);
      continue;
    }
    if (current && typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if (Array.isArray(record.fn)) pending.push(record.fn);
      if (record.dict && typeof record.dict === 'object') {
        pending.push(...Object.values(record.dict));
      }
    }
  }
  return undefined;
}

export function findCustomMathJsonOperator(value: unknown): string | undefined {
  const pending = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (Array.isArray(current)) {
      const [operator, ...operands] = current;
      if (
        typeof operator === 'string'
        && standardOperatorEngine.lookupDefinition(operator) === undefined
      ) {
        return operator;
      }
      pending.push(...operands);
      continue;
    }
    if (current && typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if (Array.isArray(record.fn)) pending.push(record.fn);
      if (record.dict && typeof record.dict === 'object') {
        pending.push(...Object.values(record.dict));
      }
    }
  }
  return undefined;
}

export function declareProducerOwnedAnswerMathJson(input: {
  mathJson: unknown;
  owner: HistoryReplayWorkspace;
  routeId: MathJsonRouteId;
  source: string;
}): ProducerOwnedAnswerMathJsonCandidate {
  return {
    mathJson: input.mathJson,
    provenance: {
      kind: 'producer-answer-tree',
      owner: input.owner,
      routeId: input.routeId,
      source: input.source,
    },
  } as ProducerOwnedAnswerMathJsonCandidate;
}

export function proveAnswerMathJson(input: {
  canonicalLatex: string;
  candidate: ProducerOwnedAnswerMathJsonCandidate;
}): ProvenAnswerMathJsonResult {
  const canonicalLatex = input.canonicalLatex.trim();
  const { provenance } = input.candidate;
  if (
    !canonicalLatex
    || !provenance.source.trim()
    || !provenance.routeId.startsWith(`${provenance.owner}.`)
  ) {
    return failure(
      'invalid-provenance',
      'Answer MathJSON proof requires canonical LaTeX and matching non-empty producer provenance.',
    );
  }

  const validation = validateSerializableMathJson(input.candidate.mathJson);
  if (!validation.ok) {
    return failure(
      'invalid-math-json',
      validation.failure.message,
      validation.failure,
    );
  }
  const forbiddenOperator = privateOperator(validation.validated.value);
  if (forbiddenOperator) {
    return failure(
      'private-operator',
      `Answer MathJSON uses the private operator ${forbiddenOperator}.`,
    );
  }

  let cloned: SerializableMathJson;
  try {
    cloned = structuredClone(validation.validated.value);
  } catch {
    return failure('clone-failure', 'Answer MathJSON could not cross a structured-clone boundary.');
  }

  const ce = new ComputeEngine();
  let answerExpression: ReturnType<typeof ce.box>;
  let canonicalExpression: ReturnType<typeof ce.parse>;
  try {
    answerExpression = ce.box(cloned, { form: 'structural' });
    canonicalExpression = ce.parse(canonicalLatex, { form: 'structural' });
  } catch {
    return failure('compute-engine-invalid', 'Compute Engine could not box the answer MathJSON.');
  }
  if (!answerExpression.isValid) {
    return failure('compute-engine-invalid', 'Compute Engine rejected the answer MathJSON.');
  }
  if (!canonicalExpression.isValid) {
    return failure('canonical-latex-invalid', 'Compute Engine rejected the canonical LaTeX proof value.');
  }

  let structurallySame: boolean;
  let directlyEqual: boolean;
  let simplifiedSame: boolean;
  try {
    structurallySame = answerExpression.isSame(canonicalExpression);
    directlyEqual = structurallySame || answerExpression.isEqual(canonicalExpression) === true;
    simplifiedSame = directlyEqual
      ? false
      : answerExpression.simplify().latex === canonicalExpression.simplify().latex;
  } catch {
    return failure(
      'compute-engine-invalid',
      'Compute Engine could not compare the answer MathJSON with canonical LaTeX.',
    );
  }
  const mathematicallyEqual = directlyEqual || simplifiedSame;
  if (!mathematicallyEqual) {
    return failure(
      'semantic-mismatch',
      'Producer MathJSON does not represent the same value as the canonical LaTeX.',
    );
  }

  const printed = printMathJson({
    mathJson: cloned,
    compatibilityLatex: canonicalLatex,
    profile: 'compatibility-v1',
    target: 'canonical-latex',
  });
  if (!printed.ok) {
    return failure('printer-failure', printed.message);
  }
  if (printed.canonicalLatex !== canonicalLatex) {
    return failure('printer-mismatch', 'Canonical printer changed the producer canonical LaTeX.');
  }

  return {
    ok: true,
    evidence: {
      canonicalLatex,
      mathJson: cloned as ProvenAnswerMathJson,
      owner: provenance.owner,
      routeId: provenance.routeId,
      source: provenance.source,
      nodeCount: validation.validated.nodeCount,
      depth: validation.validated.depth,
      byteLength: validation.validated.byteLength,
      semanticRelation: structurallySame
        ? 'structural'
        : simplifiedSame
          ? 'simplified'
          : 'equal',
      serializedLatex: printed.serializedLatex ?? printed.canonicalLatex,
      printerSource: printed.source === 'math-json' ? 'math-json' : 'compatibility-fallback',
    },
  };
}

export function proveStandardAnswerMathJson(input: {
  canonicalLatex: string;
  candidate: ProducerOwnedAnswerMathJsonCandidate;
}): ProvenStandardAnswerMathJsonResult {
  const result = proveAnswerMathJson(input);
  if (!result.ok) return result;
  const customOperator = findCustomMathJsonOperator(result.evidence.mathJson);
  if (customOperator) {
    return {
      ok: false,
      failure: {
        reason: 'custom-operator',
        message: `V2 answer MathJSON uses the non-standard operator ${customOperator}.`,
      },
    };
  }
  return {
    ok: true,
    evidence: {
      ...result.evidence,
      mathJson: result.evidence.mathJson as ProvenStandardAnswerMathJson,
    },
  };
}

export function canonicalMathValueV2FromProof(
  evidence: ProvenStandardAnswerMathJsonEvidence,
): ProvenCanonicalMathValueV2 {
  return {
    canonicalLatex: evidence.canonicalLatex,
    mathJson: evidence.mathJson,
  };
}

export function requireProvenCanonicalMathValueV2(input: {
  canonicalLatex: string;
  mathJson: unknown;
  owner: HistoryReplayWorkspace;
  routeId: MathJsonRouteId;
  source: string;
}): ProvenCanonicalMathValueV2 {
  const result = proveStandardAnswerMathJson({
    canonicalLatex: input.canonicalLatex,
    candidate: declareProducerOwnedAnswerMathJson({
      mathJson: input.mathJson,
      owner: input.owner,
      routeId: input.routeId,
      source: input.source,
    }),
  });
  if (result.ok) return canonicalMathValueV2FromProof(result.evidence);
  throw new Error(
    `V2 producer MathJSON proof failed for ${input.routeId}: ${result.failure.reason}: ${result.failure.message}`,
  );
}

export function canonicalMathValueFromProof(
  evidence: ProvenAnswerMathJsonEvidence,
): ProvenCanonicalMathValue {
  return {
    canonicalLatex: evidence.canonicalLatex,
    mathJson: evidence.mathJson,
  };
}

export function requireProvenCanonicalMathValue(input: {
  canonicalLatex: string;
  mathJson: unknown;
  owner: HistoryReplayWorkspace;
  routeId: MathJsonRouteId;
  source: string;
}): ProvenCanonicalMathValue {
  const value = tryProvenCanonicalMathValue(input);
  if (!value) {
    const result = proveAnswerMathJson({
      canonicalLatex: input.canonicalLatex,
      candidate: declareProducerOwnedAnswerMathJson({
        mathJson: input.mathJson,
        owner: input.owner,
        routeId: input.routeId,
        source: input.source,
      }),
    });
    if (result.ok) return canonicalMathValueFromProof(result.evidence);
    throw new Error(
      `Producer MathJSON proof failed for ${input.routeId}: ${result.failure.reason}: ${result.failure.message}`,
    );
  }
  return value;
}

export function tryProvenCanonicalMathValue(input: {
  canonicalLatex: string;
  mathJson: unknown;
  owner: HistoryReplayWorkspace;
  routeId: MathJsonRouteId;
  source: string;
}): ProvenCanonicalMathValue | undefined {
  const result = proveAnswerMathJson({
    canonicalLatex: input.canonicalLatex,
    candidate: declareProducerOwnedAnswerMathJson({
      mathJson: input.mathJson,
      owner: input.owner,
      routeId: input.routeId,
      source: input.source,
    }),
  });
  return result.ok ? canonicalMathValueFromProof(result.evidence) : undefined;
}
