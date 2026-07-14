import { ComputeEngine } from '@cortex-js/compute-engine';
import { runExpressionAction } from '../../engine/math-engine';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber, solutionsToLatex } from '../../display/format';
import { normalizeExactRadicalNode } from '../../symbolic-engine/radical';
import { normalizeExactRationalNode } from '../../symbolic-engine/rational';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import { mergeSolveDomainConstraints } from '../../algebra/radical-core';
import {
  assumptionFactsFromCandidateRejection,
} from '../../algebra/assumption-adapters';
import {
  assumptionFactsFromDomainConstraints,
  mergeAssumptionFacts,
} from '../../algebra/assumptions-core';
import { mergeAssumptionDetailSections } from '../../algebra/assumption-readback';
import { validateCandidateRoots } from '../candidate-validation';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../candidate/extraneous';
import {
  buildEquationCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import type {
  DisplayDetailSection,
  ResultProducerDraft,
  GuardedSolveRequest,
  SerializableMathJson,
  SolveDomainConstraint,
} from '../../../types/calculator';
import { errorOutcome } from './outcome';
import {
  mathDetailSection,
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../display/result-detail-lines';
import {
  createEquationResultOutcome,
  type EquationResultProducerInput,
} from '../solve-result/producer';
import { tryProvenCanonicalMathValue } from '../../result-contract';
import {
  equationMathValuesFromOwnedLeaves,
  equationOwnedMathJsonLeavesFromDocument,
  inferEquationMathJsonRoute,
} from '../solve-result/math-values';

const ce = new ComputeEngine();
const NUMERIC_MATCH_TOLERANCE = 1e-6;

function isMathJsonArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isZeroNode(node: unknown) {
  return node === 0
    || (
      isMathJsonArray(node)
      && node[0] === 'Rational'
      && node.length === 3
      && node[1] === 0
    );
}

function findOwnedExpressionMathJson(
  root: SerializableMathJson | undefined,
  canonicalLatex: string,
): SerializableMathJson | undefined {
  if (root === undefined) return undefined;
  const visit = (node: SerializableMathJson): SerializableMathJson | undefined => {
    try {
      if (ce.box(node as Parameters<typeof ce.box>[0]).latex === canonicalLatex) {
        return node;
      }
    } catch {
      // Keep searching descendants when a container is not directly boxable.
    }
    if (Array.isArray(node)) {
      for (const child of node.slice(1)) {
        const found = visit(child);
        if (found !== undefined) return found;
      }
    } else if (node && typeof node === 'object') {
      for (const child of Object.values(node)) {
        if (child === undefined) continue;
        const found = visit(child);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  return visit(root);
}

function mergeDomainConstraints(
  left: SolveDomainConstraint[] = [],
  right: SolveDomainConstraint[] = [],
) {
  return mergeSolveDomainConstraints(left, right);
}

function formatAcceptedApproximations(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  const parts = values.map((value) => formatApproxNumber(value));
  return parts.length === 1 ? `x ~= ${parts[0]}` : `x ~= ${parts.join(', ')}`;
}

function branchReadbackForAcceptedCandidates(
  acceptedLatex: string[],
  acceptedValues: number[],
  exactLatex: string | undefined,
  source: string,
) {
  if (exactLatex && acceptedLatex.length >= 2) {
    return finiteBranchReadbackMetadata({
      targetLatex: 'x',
      relationLatex: '\\in',
      branchesLatex: acceptedLatex,
      source,
    });
  }

  return finiteBranchReadbackMetadata({
    targetLatex: 'x',
    relationLatex: '\\approx',
    branchesLatex: acceptedValues.map((value) => formatApproxNumber(value)),
    source,
  });
}

function normalizeDisplayFactLine(line: string) {
  return line
    .replace(/\s+/gu, ' ')
    .replace(/\s*\\ne(?![A-Za-z])\s*/gu, '\\ne ')
    .replace(/\s*\\ge(?![A-Za-z])\s*/gu, '\\ge ')
    .replace(/\s*\\le(?![A-Za-z])\s*/gu, '\\le ')
    .replace(/\s*>=\s*/gu, ' >= ')
    .replace(/\s*<=\s*/gu, ' <= ')
    .replace(/\s*>\s*/gu, ' > ')
    .replace(/\s*<\s*/gu, ' < ')
    .trim();
}

function intervalConstraintLatex(input: {
  min?: number;
  minInclusive: boolean;
  max?: number;
  maxInclusive: boolean;
}) {
  const lower = input.min === undefined ? '-\\infty' : `${input.min}`;
  const upper = input.max === undefined ? '\\infty' : `${input.max}`;
  return `${input.minInclusive ? '[' : '('}${lower}, ${upper}${input.maxInclusive ? ']' : ')'}`;
}

function domainConstraintLine(constraint: SolveDomainConstraint) {
  switch (constraint.kind) {
    case 'nonzero':
      return `${constraint.expressionLatex}\\ne 0`;
    case 'positive':
      return `${constraint.expressionLatex}>0`;
    case 'nonnegative':
      return `${constraint.expressionLatex}\\ge 0`;
    case 'expression-interval':
      return `${constraint.expressionLatex}\\in ${intervalConstraintLatex(constraint)}`;
    case 'interval':
      return `${constraint.variable}\\in ${intervalConstraintLatex(constraint)}`;
    case 'carrier-range':
      return `${constraint.carrier} carrier stays in [-1, 1]`;
    case 'carrier-square-range':
      return `${constraint.carrier} carrier stays in [0, 1]`;
    case 'exp-positive':
      return 'exponential output >0';
  }
}

function uniqueDisplayFactLines(lines: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const normalized = normalizeDisplayFactLine(line);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function usesNumericTrustTaxonomy(outcome: ResultProducerDraft) {
  return outcome.kind !== 'prompt'
    && (
      Boolean(outcome.numericMethod)
      || outcome.solveBadges?.includes('Numeric Interval')
      || outcome.solveBadges?.includes('Range Guard')
    );
}

function mergeDomainConstraintDetailSection(
  detailSections: readonly DisplayDetailSection[] | undefined,
  constraints: readonly SolveDomainConstraint[] = [],
) {
  const incoming = uniqueDisplayFactLines(constraints.map(domainConstraintLine));
  const sections = (detailSections ?? []).filter((section) => section.title !== 'Domain Facts');
  if (incoming.length === 0) {
    return sections.length > 0 ? sections : undefined;
  }

  const existingIndex = sections.findIndex((section) => section.title === 'Domain and Exclusions');
  if (existingIndex >= 0) {
    return sections.map((section, index) =>
      index === existingIndex
        ? mixedDetailSection(
            section.title,
            uniqueDisplayFactLines([...section.lines, ...incoming]).map((line) => {
              const existingLineIndex = section.lines.indexOf(line);
              if (existingLineIndex < 0) return [mathPart(line)];
              const parts = section.lineParts?.[existingLineIndex];
              if (parts?.length) return parts;
              const kind = section.lineKinds?.[existingLineIndex] ?? section.lineKind;
              return kind === 'text' ? [textPart(line)] : [mathPart(line)];
            }),
          )
        : section);
  }

  const insertionIndex = sections.findIndex((section) =>
    section.title === 'Numeric Confidence'
    || section.title === 'Numeric Interval Scope');
  const domainSection = mathDetailSection('Domain and Exclusions', incoming);
  if (insertionIndex < 0) {
    return [...sections, domainSection];
  }
  return [
    ...sections.slice(0, insertionIndex + 1),
    domainSection,
    ...sections.slice(insertionIndex + 1),
  ];
}

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
}

function attachAlgebraMetadata(
  outcome: ResultProducerDraft,
  originalResolvedLatex: string,
  request: GuardedSolveRequest,
): ResultProducerDraft {
  if (outcome.kind === 'prompt') {
    return outcome;
  }

  const exactSupplementLatex = mergeExactSupplementLatex(
    { latex: outcome.exactSupplementLatex, source: 'legacy' },
    { latex: request.exactSupplementLatex, source: 'legacy' },
  );
  const assumptionFacts = mergeAssumptionFacts(
    assumptionFactsFromDomainConstraints(request.domainConstraints ?? [], {
      source: 'legacy',
      scope: 'result',
      trust: 'validated',
    }),
    outcome.rejectedCandidateCount
      ? assumptionFactsFromCandidateRejection({
        kind: classifyCandidateRejections([], request.domainConstraints),
        constraints: request.domainConstraints,
        reasons: [`${outcome.rejectedCandidateCount} candidate${outcome.rejectedCandidateCount === 1 ? '' : 's'} rejected during validation.`],
      })
      : [],
  );

  const resolvedInputLatex = outcome.resolvedInputLatex
    ?? (request.resolvedLatex !== originalResolvedLatex ? request.resolvedLatex : undefined);
  const producerInput: EquationResultProducerInput = {
    ...outcome,
    exactSupplementLatex: exactSupplementLatex.length > 0 ? exactSupplementLatex : undefined,
    detailSections: usesNumericTrustTaxonomy(outcome)
      ? mergeDomainConstraintDetailSection(outcome.detailSections, request.domainConstraints)
      : mergeAssumptionDetailSections(outcome.detailSections, assumptionFacts),
    resolvedInputLatex,
  };
  const nativeLeaves = equationOwnedMathJsonLeavesFromDocument(
    outcome.canonicalResult,
    'equation-algebra-metadata-input',
  );
  const routeId = inferEquationMathJsonRoute(producerInput);
  const addConstraintLeaf = (
    canonicalLatex: string,
    mathJson: SerializableMathJson,
    source: string,
  ) => {
    const proof = tryProvenCanonicalMathValue({
      canonicalLatex,
      mathJson,
      owner: 'equation',
      routeId,
      source,
    });
    if (proof) nativeLeaves.push({ canonicalLatex, mathJson, source });
  };
  for (const constraint of request.domainConstraints ?? []) {
    if (!('expressionLatex' in constraint)) continue;
    const expressionMathJson = constraint.expressionMathJson
      ?? findOwnedExpressionMathJson(request.resolvedMathJson, constraint.expressionLatex)
      ?? (/^[A-Za-z]$/u.test(constraint.expressionLatex)
        ? constraint.expressionLatex
        : undefined);
    if (expressionMathJson === undefined) continue;
    addConstraintLeaf(
      constraint.expressionLatex,
      expressionMathJson,
      `equation-domain-constraint:${constraint.kind}:expression`,
    );
    const relation = constraint.kind === 'nonzero'
      ? { operator: 'NotEqual', latex: `${constraint.expressionLatex}\\ne 0` }
      : constraint.kind === 'positive'
        ? { operator: 'Greater', latex: `${constraint.expressionLatex}>0` }
        : constraint.kind === 'nonnegative'
          ? { operator: 'GreaterEqual', latex: `${constraint.expressionLatex}\\ge 0` }
          : constraint.kind === 'expression-interval'
            && constraint.min === 0
            && constraint.minInclusive
            && constraint.max === undefined
            ? { operator: 'GreaterEqual', latex: `${constraint.expressionLatex}\\ge 0` }
          : undefined;
    if (relation) {
      addConstraintLeaf(
        relation.latex,
        [relation.operator, expressionMathJson, 0],
        `equation-domain-constraint:${constraint.kind}:relation`,
      );
    }
  }
  if (resolvedInputLatex && request.resolvedMathJson !== undefined) {
    addConstraintLeaf(
      resolvedInputLatex,
      request.resolvedMathJson,
      'equation-algebra-resolved-input',
    );
  }
  return createEquationResultOutcome(producerInput, {
    mathValues: equationMathValuesFromOwnedLeaves({
      outcome: producerInput,
      routeId,
      leaves: nativeLeaves,
    }),
  });
}

function prepareAlgebraSolveRequest(request: GuardedSolveRequest): GuardedSolveRequest {
  const parsed = ce.parse(request.resolvedLatex);
  const json = parsed.json;
  if (!isMathJsonArray(json) || json[0] !== 'Equal' || json.length !== 3) {
    return request;
  }

  const leftRadical = normalizeExactRadicalNode(json[1], 'equation');
  const rightRadical = normalizeExactRadicalNode(json[2], 'equation');

  const leftRadicalNode = leftRadical?.normalizedNode ?? json[1];
  const rightRadicalNode = rightRadical?.normalizedNode ?? json[2];

  const leftNormalization = normalizeExactRationalNode(leftRadicalNode, 'simplify');
  const rightNormalization = normalizeExactRationalNode(rightRadicalNode, 'simplify');

  const leftNode = leftNormalization?.normalizedNode ?? leftRadicalNode;
  const rightNode = rightNormalization?.normalizedNode ?? rightRadicalNode;
  const leftLatex = leftNormalization?.normalizedLatex
    ?? leftRadical?.normalizedLatex
    ?? ce.box(json[1] as Parameters<typeof ce.box>[0]).latex;
  const rightLatex = rightNormalization?.normalizedLatex
    ?? rightRadical?.normalizedLatex
    ?? ce.box(json[2] as Parameters<typeof ce.box>[0]).latex;

  const domainConstraints = mergeDomainConstraints(
    request.domainConstraints,
    mergeDomainConstraints(
      mergeDomainConstraints(
        leftRadical?.conditionConstraints,
        rightRadical?.conditionConstraints,
      ),
      mergeDomainConstraints(
        leftNormalization?.exclusionConstraints,
        rightNormalization?.exclusionConstraints,
      ),
    ),
  );
  const exactSupplementLatex = mergeExactSupplementLatex(
    { latex: request.exactSupplementLatex, source: 'legacy' },
    { latex: leftRadical?.exactSupplementLatex, source: 'radical-domain' },
    { latex: rightRadical?.exactSupplementLatex, source: 'radical-domain' },
    { latex: leftNormalization?.exactSupplementLatex, source: 'denominator' },
    { latex: rightNormalization?.exactSupplementLatex, source: 'denominator' },
  );

  let resolvedLatex = ce.box(['Equal', leftNode, rightNode] as Parameters<typeof ce.box>[0]).latex;
  let resolvedMathJson = ['Equal', leftNode, rightNode] as SerializableMathJson;

  if (leftNormalization?.denominatorNode && isZeroNode(rightNode)) {
    resolvedLatex = `${leftNormalization.numeratorLatex}=0`;
    resolvedMathJson = ['Equal', leftNormalization.numeratorNode as SerializableMathJson, 0];
  } else if (rightNormalization?.denominatorNode && isZeroNode(leftNode)) {
    resolvedLatex = `${rightNormalization.numeratorLatex}=0`;
    resolvedMathJson = ['Equal', rightNormalization.numeratorNode as SerializableMathJson, 0];
  } else if (leftLatex !== ce.box(json[1] as Parameters<typeof ce.box>[0]).latex || rightLatex !== ce.box(json[2] as Parameters<typeof ce.box>[0]).latex) {
    resolvedLatex = `${leftLatex}=${rightLatex}`;
  }

  return {
    ...request,
    resolvedLatex,
    resolvedMathJson,
    validationLatex: request.validationLatex ?? request.resolvedLatex,
    domainConstraints,
    exactSupplementLatex,
  };
}

function validateDirectSymbolicOutcome(
  request: GuardedSolveRequest,
  symbolic: ReturnType<typeof runExpressionAction>,
): ResultProducerDraft | null {
  const needsValidation =
    (request.domainConstraints?.length ?? 0) > 0
    || Boolean(request.validationLatex && request.validationLatex !== request.resolvedLatex);
  if (!needsValidation) {
    return null;
  }

  const numericSolutions = symbolic.numericSolutions;
  const rawSolutionLatex = symbolic.rawSolutionLatex;
  if (
    !symbolic.exactLatex
    || !numericSolutions
    || !rawSolutionLatex
    || numericSolutions.length === 0
  ) {
    return null;
  }

  const numericPairs = rawSolutionLatex.flatMap((latex, index) => {
    const value = numericSolutions[index];
    return value === null ? [] : [{ latex, value }];
  });
  const finiteSolutions = numericPairs.map((entry) => entry.value);
  if (finiteSolutions.length === 0) {
    return errorOutcome(
      'Solve',
      'No real solutions remain after resolving the bounded transformed branches.',
      symbolic.warnings,
      [],
      ['Candidate Checked'],
    );
  }

  const answerRoot = Array.isArray(symbolic.answerMathJson) ? symbolic.answerMathJson : undefined;
  const solutionMathJson: SerializableMathJson[] = answerRoot?.[0] === 'Equal'
    && answerRoot.length === 3
      ? [answerRoot[2] as SerializableMathJson]
      : answerRoot?.[0] === 'Element'
        && Array.isArray(answerRoot[2])
        && answerRoot[2][0] === 'Set'
          ? answerRoot[2].slice(1) as SerializableMathJson[]
          : [];
  const candidateLeaves = rawSolutionLatex.flatMap((canonicalLatex, index) =>
    solutionMathJson[index] === undefined
      ? []
      : [{
          canonicalLatex,
          mathJson: solutionMathJson[index],
          source: `equation-symbolic-candidate:${index}`,
        }]);

  const validation = validateCandidateRoots(
    request.validationLatex ?? request.resolvedLatex,
    finiteSolutions,
    request.domainConstraints,
    'symbolic-direct',
    request.angleUnit,
  );

  if (validation.accepted.length === 0) {
    const outcome = errorOutcome(
        'Solve',
        buildEquationCandidateRejectionMessage(
          classifyCandidateRejections(validation.rejected, request.domainConstraints),
        ),
        symbolic.warnings,
        [],
        ['Candidate Checked'],
      undefined,
      validation.rejected.length,
    );
    const producerInput = {
      ...outcome,
      detailSections: appendExtraneousSolutionsDetailSection(
        outcome.detailSections,
        extraneousEvidenceFromRejectedCandidates(validation.rejected, {
          exactCandidatesLatex: rawSolutionLatex,
        }),
      ),
    };
    return createEquationResultOutcome(producerInput, {
      mathValues: equationMathValuesFromOwnedLeaves({
        outcome: producerInput,
        routeId: inferEquationMathJsonRoute(producerInput),
        leaves: candidateLeaves,
      }),
    });
  }

  const acceptedLatex: string[] = [];
  const acceptedValues: number[] = [];
  const acceptedMathJson: SerializableMathJson[] = [];
  for (const acceptedValue of validation.accepted) {
    const matchIndex = numericPairs.findIndex((entry) =>
      Math.abs(entry.value - acceptedValue) <= NUMERIC_MATCH_TOLERANCE
      && !acceptedValues.some((usedValue) => Math.abs(usedValue - entry.value) <= NUMERIC_MATCH_TOLERANCE)
      && !acceptedLatex.includes(entry.latex));
    if (matchIndex >= 0) {
      acceptedValues.push(numericPairs[matchIndex].value);
      acceptedLatex.push(numericPairs[matchIndex].latex);
      if (solutionMathJson[matchIndex] !== undefined) {
        acceptedMathJson.push(solutionMathJson[matchIndex]);
      }
    }
  }

  const exactLatex = acceptedLatex.length > 0 && acceptedLatex.every((value) => !isApproximateOnlySolutionLatex(value))
    ? solutionsToLatex('x', acceptedLatex)
    : undefined;
  const primaryMath = exactLatex && acceptedMathJson.length === acceptedLatex.length
    ? {
        version: 1 as const,
        canonicalLatex: exactLatex,
        mathJson: acceptedMathJson.length === 1
          ? ['Equal', 'x', acceptedMathJson[0]] as SerializableMathJson
          : ['Element', 'x', ['Set', ...acceptedMathJson]] as SerializableMathJson,
      }
    : undefined;

  const extraneousEvidence = extraneousEvidenceFromRejectedCandidates(validation.rejected, {
    exactCandidatesLatex: rawSolutionLatex,
  });

  const producerInput: EquationResultProducerInput = {
    kind: 'success',
    title: 'Solve',
    exactLatex,
    ...(primaryMath ? { primaryMath } : {}),
    branchReadback: branchReadbackForAcceptedCandidates(
      acceptedLatex,
      acceptedValues,
      exactLatex,
      'equation-symbolic-candidate-validation',
    ),
    approxText: formatAcceptedApproximations(acceptedValues),
    warnings: symbolic.warnings,
    resultOrigin: 'symbolic',
    plannerBadges: [],
    solveBadges: ['Candidate Checked'],
    candidateValues: acceptedValues,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
    detailSections: appendExtraneousSolutionsDetailSection(undefined, extraneousEvidence),
  };
  const candidateMathValues = equationMathValuesFromOwnedLeaves({
    outcome: producerInput,
    routeId: inferEquationMathJsonRoute(producerInput),
    leaves: candidateLeaves,
  });
  const supplementalMathValues = { ...candidateMathValues };
  delete supplementalMathValues.primaryMath;
  delete supplementalMathValues.branchReadback;
  return createEquationResultOutcome(producerInput, {
    mathValues: supplementalMathValues,
  });
}

export {
  NUMERIC_MATCH_TOLERANCE,
  attachAlgebraMetadata,
  branchReadbackForAcceptedCandidates,
  formatAcceptedApproximations,
  isApproximateOnlySolutionLatex,
  isMathJsonArray,
  prepareAlgebraSolveRequest,
  validateDirectSymbolicOutcome,
};
