import { ComputeEngine } from '@cortex-js/compute-engine';
import type { SolveDomainConstraint } from '../../types/calculator';
import { exactPolynomialCoefficientArray, exactScalarToNumber, parseExactPolynomial } from '../algebra/polynomial-core';
import { solvePolynomialRoots } from '../algebra/polynomial-roots';
import { formatApproxNumber } from '../display/format';
import type { EquationNumericDomainFact } from './numeric-domain-segmentation';

const ce = new ComputeEngine();
const REAL_ROOT_IMAGINARY_TOLERANCE = 1e-7;
const MAX_BOUNDARY_DEGREE = 64;

function addFact(
  facts: EquationNumericDomainFact[],
  fact: EquationNumericDomainFact,
) {
  const key = `${fact.kind}|${fact.expressionLatex ?? ''}|${fact.relationLatex ?? ''}|${fact.message}`;
  const exists = facts.some((entry) =>
    `${entry.kind}|${entry.expressionLatex ?? ''}|${entry.relationLatex ?? ''}|${entry.message}` === key);
  if (!exists) {
    facts.push(fact);
  }
}

function factMessage(expressionLatex: string | undefined, relationLatex: string, fallback: string) {
  return expressionLatex ? `${expressionLatex} ${relationLatex}` : fallback;
}

export function realRootsForPolynomialLatex(latex: string | undefined, target: string) {
  if (!latex) {
    return [];
  }
  try {
    const polynomial = parseExactPolynomial(ce.parse(latex).json, target, MAX_BOUNDARY_DEGREE);
    if (!polynomial) {
      return [];
    }
    const coefficients = exactPolynomialCoefficientArray(polynomial).map(exactScalarToNumber);
    if (coefficients.length < 2) {
      return [];
    }
    const roots = solvePolynomialRoots({ coefficients });
    if (roots.kind !== 'success') {
      return [];
    }
    return roots.roots
      .filter((root) => Math.abs(root.im) <= REAL_ROOT_IMAGINARY_TOLERANCE)
      .map((root) => root.re);
  } catch {
    return [];
  }
}

export function addSolvedDenominatorExclusions(
  facts: EquationNumericDomainFact[],
  denominatorLatex: string | undefined,
  target: string,
) {
  for (const root of realRootsForPolynomialLatex(denominatorLatex, target)) {
    const relationMathJson = ['NotEqual', target, root] as const;
    addFact(facts, {
      kind: 'solved-denominator-exclusion',
      expressionLatex: target,
      relationLatex: `\\ne ${formatApproxNumber(root)}`,
      relationCanonicalLatex: ce.box(relationMathJson).latex,
      relationMathJson: [...relationMathJson],
      message: `${target}\\ne ${formatApproxNumber(root)}`,
      source: 'polynomial-boundary',
    });
  }
}

export function addDomainConstraintFacts(
  facts: EquationNumericDomainFact[],
  constraints: readonly SolveDomainConstraint[],
  target: string,
) {
  for (const constraint of constraints) {
    if (constraint.kind === 'nonzero') {
      addFact(facts, {
        kind: 'denominator-exclusion',
        expressionLatex: constraint.expressionLatex,
        relationLatex: '\\ne0',
        message: factMessage(constraint.expressionLatex, '\\ne0', 'Denominator must be nonzero.'),
        source: 'symbolic-scan',
      });
      addSolvedDenominatorExclusions(facts, constraint.expressionLatex, target);
    }
    if (constraint.kind === 'positive') {
      addFact(facts, {
        kind: 'log-domain',
        expressionLatex: constraint.expressionLatex,
        relationLatex: '>0',
        message: factMessage(constraint.expressionLatex, '>0', 'Expression must be positive.'),
        source: 'symbolic-scan',
      });
    }
    if (constraint.kind === 'nonnegative') {
      addFact(facts, {
        kind: 'root-domain',
        expressionLatex: constraint.expressionLatex,
        relationLatex: '\\ge0',
        message: factMessage(constraint.expressionLatex, '\\ge0', 'Expression must be nonnegative.'),
        source: 'symbolic-scan',
      });
    }
  }
}
