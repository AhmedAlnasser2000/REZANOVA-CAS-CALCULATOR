import type { SolveDomainConstraint } from '../../../types/calculator';
import {
  buildExactScalarNode,
  multiplyExactScalars,
  negateExactScalar,
  readExactScalarNode,
  type ExactScalar,
} from '../polynomial-core';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { flattenAdd, isNodeArray } from '../../symbolic-engine/patterns';
import {
  expandAndSimplifyNode,
  mergeSolveDomainConstraints,
  simplifyNode,
} from './math-json';
import {
  isSupportedRadicand,
  isSupportedRadicandExpression,
  parseAffine,
  parseMonomial,
  parseSupportedBinomial,
} from './parsing';
import {
  buildEvenRootConditionConstraints,
  matchSupportedRadical,
} from './matching';
import type { SupportedRadical, SquareRootConjugateProfile } from './types';

type SupportedSquareRootConjugateTerm =
  | {
      kind: 'scalar';
      node: unknown;
      scalar: ExactScalar;
    }
  | {
      kind: 'other';
      node: unknown;
    }
  | {
      kind: 'radical';
      node: unknown;
      coefficient: ExactScalar;
      radical: SupportedRadical;
    };

function matchSupportedSquareRoot(node: unknown, variable?: string): SupportedRadical | null {
  const normalized = normalizeAst(node);
  if (variable) {
    const radical = matchSupportedRadical(normalized, variable);
    if (radical?.index === 2) {
      return radical;
    }

    if (isNodeArray(normalized) && normalized[0] === 'Sqrt' && normalized.length === 2) {
      const expandedRadicand = expandAndSimplifyNode(normalized[1]);
      if (isSupportedRadicand(expandedRadicand, variable)) {
        return {
          node: normalized,
          radicand: expandedRadicand,
          index: 2,
        };
      }
    }

    return null;
  }

  if (
    isNodeArray(normalized)
    && normalized[0] === 'Sqrt'
    && normalized.length === 2
    && (
      isSupportedRadicandExpression(normalized[1])
      || isSupportedRadicandExpression(expandAndSimplifyNode(normalized[1]))
    )
  ) {
    const expandedRadicand = expandAndSimplifyNode(normalized[1]);
    return {
      node: normalized,
      radicand: isSupportedRadicandExpression(normalized[1]) ? normalized[1] : expandedRadicand,
      index: 2,
    };
  }

  return null;
}

function isSupportedConjugateOther(node: unknown, variable?: string) {
  if (readExactScalarNode(node)) {
    return true;
  }

  if (parseSupportedBinomial(node)) {
    return true;
  }

  if (!variable) {
    return false;
  }

  const affine = parseAffine(node, variable);
  if (affine) {
    return true;
  }

  const monomial = parseMonomial(node);
  return Boolean(
    monomial
    && monomial.variable === variable
    && Math.abs(monomial.exponent) <= 1,
  );
}

function parseSupportedSquareRootConjugateTerm(
  node: unknown,
  variable?: string,
): SupportedSquareRootConjugateTerm | null {
  const normalized = normalizeAst(node);
  const scalar = readExactScalarNode(normalized);
  if (scalar) {
    return {
      kind: 'scalar',
      node: normalized,
      scalar,
    };
  }

  if (isSupportedConjugateOther(normalized, variable)) {
    return {
      kind: 'other',
      node: normalized,
    };
  }

  const directRadical = matchSupportedSquareRoot(normalized, variable);
  if (directRadical) {
    return {
      kind: 'radical',
      node: normalized,
      coefficient: { numerator: 1, denominator: 1 },
      radical: directRadical,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseSupportedSquareRootConjugateTerm(normalized[1], variable);
    if (!child) {
      return null;
    }

    if (child.kind === 'scalar') {
      return {
        kind: 'scalar',
        node: normalized,
        scalar: negateExactScalar(child.scalar),
      };
    }

    if (child.kind === 'other') {
      return {
        kind: 'other',
        node: normalized,
      };
    }

    return {
      kind: 'radical',
      node: normalized,
      coefficient: negateExactScalar(child.coefficient),
      radical: child.radical,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply') {
    let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
    let radical: SupportedRadical | null = null;

    for (const child of normalized.slice(1)) {
      const childScalar = readExactScalarNode(child);
      if (childScalar) {
        scalarFactor = multiplyExactScalars(scalarFactor, childScalar);
        continue;
      }

      const childRadical = matchSupportedSquareRoot(child, variable);
      if (!childRadical || radical) {
        return null;
      }

      radical = childRadical;
    }

    if (!radical) {
      return null;
    }

    return {
      kind: 'radical',
      node: normalized,
      coefficient: scalarFactor,
      radical,
    };
  }

  return null;
}

function buildSquaredConjugateTermNode(term: SupportedSquareRootConjugateTerm) {
  if (term.kind === 'radical') {
    const coefficientSquared = multiplyExactScalars(term.coefficient, term.coefficient);
    if (!coefficientSquared) {
      return null;
    }

    if (coefficientSquared.numerator === 1 && coefficientSquared.denominator === 1) {
      return normalizeAst(term.radical.radicand);
    }

    return simplifyNode([
      'Multiply',
      buildExactScalarNode(coefficientSquared),
      term.radical.radicand,
    ]);
  }

  return simplifyNode(['Power', term.node, 2]);
}

export function buildSquareRootConjugateProfile(
  denominator: unknown,
  variable?: string,
  allowThreeTerm = true,
): SquareRootConjugateProfile | null {
  const normalized = normalizeAst(denominator);
  if (!isNodeArray(normalized) || normalized[0] !== 'Add') {
    return null;
  }

  const rawTerms = flattenAdd(normalized);
  if (rawTerms.length < 2) {
    return null;
  }

  const rawProfiles = rawTerms
    .map((term) => parseSupportedSquareRootConjugateTerm(term, variable))
    .filter((term): term is SupportedSquareRootConjugateTerm => Boolean(term));

  if (rawProfiles.length !== rawTerms.length) {
    return null;
  }

  const radicalProfiles = rawProfiles.filter(
    (term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'radical' }> => term.kind === 'radical',
  );
  const nonRadicalProfiles = rawProfiles.filter((term) => term.kind !== 'radical');
  let termProfiles = rawProfiles;

  if (nonRadicalProfiles.length > 1 && radicalProfiles.length > 0) {
    const combinedNonRadicalNode = normalizeAst(['Add', ...nonRadicalProfiles.map((term) => term.node)]);
    const combinedNonRadical = parseSupportedSquareRootConjugateTerm(combinedNonRadicalNode, variable);
    if (combinedNonRadical && combinedNonRadical.kind !== 'radical') {
      termProfiles = [combinedNonRadical, ...radicalProfiles];
    }
  }

  const terms = termProfiles.map((term) => term.node);
  if (terms.length < 2 || terms.length > 3 || (terms.length === 3 && !allowThreeTerm)) {
    return null;
  }

  const radicalTerms = termProfiles
    .filter((term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'radical' }> => term.kind === 'radical')
    .map((term) => term.radical);

  if (radicalTerms.length === 0) {
    return null;
  }

  const conditionConstraints = radicalTerms.reduce<SolveDomainConstraint[]>(
    (current, radical) => mergeSolveDomainConstraints(current, buildEvenRootConditionConstraints(radical.radicand)),
    [],
  );

  if (terms.length === 2) {
    const leftSquared = buildSquaredConjugateTermNode(termProfiles[0]);
    const rightSquared = buildSquaredConjugateTermNode(termProfiles[1]);
    if (!leftSquared || !rightSquared) {
      return null;
    }

    const conjugateNode = normalizeAst(['Add', terms[0], ['Negate', terms[1]]]);
    const denominatorProductNode = expandAndSimplifyNode([
      'Subtract',
      leftSquared,
      rightSquared,
    ]);

    return {
      denominatorNode: normalized,
      conjugateNode,
      denominatorProductNode,
      conditionConstraints,
      radicalCount: radicalTerms.length,
      familyId: radicalTerms.length === 1
        ? 'two-term-other-radical'
        : 'two-term-double-radical',
      residualCleanupEligible: false,
    };
  }

  const scalarTerm = termProfiles.find(
    (term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'scalar' }> => term.kind === 'scalar',
  );
  const radicalGroupTerms = termProfiles.filter(
    (term): term is Extract<SupportedSquareRootConjugateTerm, { kind: 'radical' }> => term.kind === 'radical',
  );

  if (!scalarTerm || radicalGroupTerms.length !== 2) {
    return null;
  }

  const radicalGroupNode = normalizeAst(['Add', radicalGroupTerms[0].node, radicalGroupTerms[1].node]);
  const conjugateNode = normalizeAst(['Add', scalarTerm.node, ['Negate', radicalGroupNode]]);
  const denominatorProductNode = expandAndSimplifyNode([
    'Subtract',
    ['Power', scalarTerm.node, 2],
    ['Power', radicalGroupNode, 2],
  ]);
  const residualCleanupEligible = Boolean(
    buildSquareRootConjugateProfile(denominatorProductNode, variable, false),
  );

  if (!residualCleanupEligible) {
    return null;
  }

  return {
    denominatorNode: normalized,
    conjugateNode,
    denominatorProductNode,
    conditionConstraints,
    radicalCount: radicalTerms.length,
    familyId: 'three-term-scalar-double-radical',
    residualCleanupEligible: true,
  };
}
