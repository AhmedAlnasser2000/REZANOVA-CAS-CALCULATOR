import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  CanonicalMathValueV1,
  CanonicalMathValueV2,
  SerializableMathJson,
} from '../../types/calculator';
import {
  printCompatibilityLatex,
  validateSerializableMathJson,
  type MathJsonValidationFailure,
} from '../display/printer';
import { printValidatedBoxedMathJson } from '../display/printer/printer';
import type { CanonicalMathJsonProducerOwner, MathJsonRouteId } from './mathjson-route-registry';
import { findCustomMathJsonOperator } from './standard-mathjson-operators';
import { compareFormalMathJson } from './formal-mathjson-comparison';
import {
  activeMathJsonProofVerificationSession,
  mathJsonProofComparisonCacheKey,
  type MathJsonProofComparisonMode,
} from './mathjson-proof-verification-session';
export { findCustomMathJsonOperator } from './standard-mathjson-operators';

declare const producerOwnedCandidateBrand: unique symbol;
declare const provenAnswerMathJsonBrand: unique symbol;
declare const provenStandardAnswerMathJsonBrand: unique symbol;

export type ProducerOwnedAnswerMathJsonCandidate = {
  readonly mathJson: unknown;
  readonly provenance: {
    readonly kind: 'producer-answer-tree';
    readonly owner: CanonicalMathJsonProducerOwner;
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
  owner: CanonicalMathJsonProducerOwner;
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
const LARGE_DETERMINISTIC_PROOF_NODE_THRESHOLD = 13;

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

function normalizedExactSerialization(latex: string) {
  return latex
    .replace(/\s+/gu, '')
    .replace(/\\left|\\right/gu, '')
    .replace(/\\lbrace|\\rbrace/gu, (token) => token === '\\lbrace' ? '\\{' : '\\}');
}

export function declareProducerOwnedAnswerMathJson(input: {
  mathJson: unknown;
  owner: CanonicalMathJsonProducerOwner;
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

type ProveAnswerMathJsonInput = {
  canonicalLatex: string;
  candidate: ProducerOwnedAnswerMathJsonCandidate;
};

type InternalProvenAnswerMathJsonResult = ProvenAnswerMathJsonResult | {
  ok: false;
  failure: Extract<ProvenStandardAnswerMathJsonFailure, { reason: 'custom-operator' }>;
};

function proveAnswerMathJsonForMode(
  input: ProveAnswerMathJsonInput,
  comparisonMode: MathJsonProofComparisonMode,
): InternalProvenAnswerMathJsonResult {
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
  if (comparisonMode === 'standard') {
    const customOperator = findCustomMathJsonOperator(validation.validated.value);
    if (customOperator) {
      return {
        ok: false,
        failure: {
          reason: 'custom-operator',
          message: `V2 answer MathJSON uses the non-standard operator ${customOperator}.`,
        },
      };
    }
  }

  let cloned: SerializableMathJson;
  try {
    cloned = structuredClone(validation.validated.value);
  } catch {
    return failure('clone-failure', 'Answer MathJSON could not cross a structured-clone boundary.');
  }

  const session = provenance.owner === 'equation'
    ? activeMathJsonProofVerificationSession()
    : undefined;
  const cacheKey = mathJsonProofComparisonCacheKey({
    canonicalLatex,
    serializedMathJson: JSON.stringify(cloned),
    mode: comparisonMode,
  });
  const cached = session?.getCachedSuccess(cacheKey);
  if (cached) {
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
        ...cached,
      },
    };
  }
  const ce = session?.getComputeEngine() ?? new ComputeEngine();
  session?.recordComparisonExecution();
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

  const formalComparison = compareFormalMathJson(cloned, canonicalExpression.json, canonicalLatex);
  const deterministicallySame = !formalComparison.applicable && formalComparison.equal;
  const reuseDeterministicCanonical = deterministicallySame
    && validation.validated.nodeCount >= LARGE_DETERMINISTIC_PROOF_NODE_THRESHOLD;
  let producerSerializedSame = false;
  if (!formalComparison.equal || !reuseDeterministicCanonical) {
    try {
      const preparedSerialization = printValidatedBoxedMathJson({
        boxedExpression: answerExpression,
        profile: 'pedagogical-v1',
        target: 'canonical-latex',
      });
      const canonicalSerialization = normalizedExactSerialization(canonicalLatex);
      producerSerializedSame = (
        preparedSerialization.ok
        && normalizedExactSerialization(preparedSerialization.canonicalLatex)
          === canonicalSerialization
      ) || normalizedExactSerialization(answerExpression.latex) === canonicalSerialization;
    } catch {
      return failure(
        'compute-engine-invalid',
        'Compute Engine could not serialize the answer MathJSON for comparison.',
      );
    }
  }
  let structurallySame = false;
  let canonicalSerializationSame = false;
  let canonicalizedSame = false;
  if (!formalComparison.applicable && !producerSerializedSame && !deterministicallySame) {
    try {
      structurallySame = answerExpression.isSame(canonicalExpression);
      if (!structurallySame) {
        const canonicalAnswerExpression = answerExpression.canonical;
        const canonicalPresentationExpression = canonicalExpression.canonical;
        canonicalSerializationSame = canonicalAnswerExpression.latex === canonicalLatex;
        canonicalizedSame = canonicalSerializationSame
          || canonicalAnswerExpression.isSame(canonicalPresentationExpression);
      }
    } catch {
      return failure(
        'compute-engine-invalid',
        'Compute Engine could not compare the answer MathJSON with canonical LaTeX.',
      );
    }
  }
  if (
    formalComparison.applicable
    && !producerSerializedSame
    && !formalComparison.equal
  ) {
    return failure(
      'semantic-mismatch',
      'Producer MathJSON does not represent the same formal value as the canonical LaTeX.',
    );
  }

  let directlyEqual = producerSerializedSame
    || canonicalSerializationSame
    || deterministicallySame
    || (!formalComparison.applicable && structurallySame)
    || (!formalComparison.applicable && canonicalizedSame)
    || (formalComparison.applicable && formalComparison.equal);
  let simplifiedSame = false;
  if (!directlyEqual && !formalComparison.applicable) {
    try {
      directlyEqual = answerExpression.isEqual(canonicalExpression) === true;
      simplifiedSame = directlyEqual
        ? false
        : answerExpression.simplify().latex === canonicalExpression.simplify().latex;
    } catch {
      return failure(
        'compute-engine-invalid',
        'Compute Engine could not compare the answer MathJSON with canonical LaTeX.',
      );
    }
  }
  const mathematicallyEqual = directlyEqual
    || simplifiedSame;
  if (!mathematicallyEqual) {
    return failure(
      'semantic-mismatch',
      'Producer MathJSON does not represent the same value as the canonical LaTeX.',
    );
  }

  const printed = formalComparison.applicable || reuseDeterministicCanonical
    ? printCompatibilityLatex(canonicalLatex, {
        profile: 'compatibility-v1',
        target: 'canonical-latex',
      }, 'compatibility-fallback')
    : printValidatedBoxedMathJson({
        boxedExpression: answerExpression,
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

  const cachedSuccess = {
    semanticRelation: (producerSerializedSame
      || canonicalSerializationSame
      || deterministicallySame
      || (!formalComparison.applicable && structurallySame)
      ? 'structural'
      : formalComparison.applicable
        ? 'equal'
      : canonicalizedSame || simplifiedSame
        ? 'simplified'
        : 'equal') as ProvenAnswerMathJsonEvidence['semanticRelation'],
    serializedLatex: printed.serializedLatex ?? printed.canonicalLatex,
    printerSource: (printed.source === 'math-json'
      ? 'math-json'
      : 'compatibility-fallback') as ProvenAnswerMathJsonEvidence['printerSource'],
  };
  session?.setCachedSuccess(cacheKey, cachedSuccess);
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
      ...cachedSuccess,
    },
  };
}

export function proveAnswerMathJson(input: ProveAnswerMathJsonInput): ProvenAnswerMathJsonResult {
  return proveAnswerMathJsonForMode(input, 'answer') as ProvenAnswerMathJsonResult;
}

export function proveStandardAnswerMathJson(input: {
  canonicalLatex: string;
  candidate: ProducerOwnedAnswerMathJsonCandidate;
}): ProvenStandardAnswerMathJsonResult {
  const result = proveAnswerMathJsonForMode(input, 'standard');
  if (!result.ok) return result;
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
  owner: CanonicalMathJsonProducerOwner;
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
  owner: CanonicalMathJsonProducerOwner;
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
  owner: CanonicalMathJsonProducerOwner;
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
