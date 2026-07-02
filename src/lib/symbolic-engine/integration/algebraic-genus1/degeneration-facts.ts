import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
  ExactSupplementSource,
} from '../../../../types/calculator/exact-supplement-types';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  buildSymbolicPolynomialNode,
  derivativeSymbolicPolynomial,
  getSymbolicPolynomialCoefficient,
  resultantSymbolicPolynomials,
  squarefreeReadinessSymbolicPolynomial,
  type SymbolicPolynomial,
  type SymbolicPolynomialStop,
} from '../../primitives/symbolic-polynomial';
import {
  isSymbolicCoefficientZero,
  type SymbolicCoefficientFact,
} from '../../primitives/coefficient-domain';
import { simplifyMathJsonNodeOrOriginal } from '../../primitives/simplification/simplification';
import { boxLatex } from '../../patterns';
import {
  profileAlgebraicGenus1CurveCandidate,
  type AlgebraicGenus1CurveStoppedProfile,
} from './curve-profile';

export type AlgebraicGenus1DegenerationFactKind =
  | 'coefficient-denominator-nonzero'
  | 'genus1-squarefree-resultant-nonzero'
  | 'leading-coefficient-nonzero'
  | 'radicand-domain'
  | 'repeated-root-degeneration';

export type AlgebraicGenus1DegenerationClassification =
  | 'exact-squarefree-genus1'
  | 'generic-squarefree-genus1'
  | 'repeated-root-genus0-degeneration';

export type AlgebraicGenus1DegenerationFact = {
  kind: AlgebraicGenus1DegenerationFactKind;
  expressionLatex: string;
  relation: ExactSupplementRelation;
  source: ExactSupplementSource;
};

export type AlgebraicGenus1DegenerationFactResult =
  | {
      kind: 'success';
      variable: string;
      classification: AlgebraicGenus1DegenerationClassification;
      radicandDegree: 3 | 4;
      radicandLatex: string;
      repeatedFactorLatex?: string;
      squarefreePartLatex?: string;
      globalFacts: AlgebraicGenus1DegenerationFact[];
      exactSupplementEntries: ExactSupplementEntry[];
      exactSupplementLatex: string[];
      readinessNotes: string[];
    }
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'curve-profile-stop'
        | 'derivative-stop'
        | 'resultant-stop'
        | 'squarefree-stop';
      profileStop?: AlgebraicGenus1CurveStoppedProfile;
      polynomialStop?: SymbolicPolynomialStop;
      detail?: string;
    };

function normalizeFactLatex(expressionLatex: string) {
  return expressionLatex.trim();
}

function fact(
  kind: AlgebraicGenus1DegenerationFactKind,
  expressionLatex: string,
  relation: ExactSupplementRelation,
  source: ExactSupplementSource,
): AlgebraicGenus1DegenerationFact {
  return {
    kind,
    expressionLatex: normalizeFactLatex(expressionLatex),
    relation,
    source,
  };
}

function exactEntry(factEntry: AlgebraicGenus1DegenerationFact): ExactSupplementEntry {
  return {
    kind: factEntry.relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex: normalizeFactLatex(factEntry.expressionLatex),
    relation: factEntry.relation,
    source: factEntry.source,
  };
}

function dedupeFacts(facts: AlgebraicGenus1DegenerationFact[]) {
  const seen = new Set<string>();
  const deduped: AlgebraicGenus1DegenerationFact[] = [];
  for (const item of facts) {
    const key = `${item.kind}:${item.expressionLatex}:${item.relation}:${item.source}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function polynomialLatex(polynomial: SymbolicPolynomial) {
  return boxLatex(simplifyMathJsonNodeOrOriginal(buildSymbolicPolynomialNode(polynomial)));
}

function coefficientDenominatorFacts(facts: SymbolicCoefficientFact[]) {
  return facts.map((item) =>
    fact(
      'coefficient-denominator-nonzero',
      item.expressionLatex,
      item.relation,
      'denominator',
    ));
}

function leadingCoefficientFact(polynomial: SymbolicPolynomial) {
  return fact(
    'leading-coefficient-nonzero',
    getSymbolicPolynomialCoefficient(polynomial, polynomial.degree).latex,
    '\\ne0',
    'candidate-validation',
  );
}

function isExactRationalPolynomial(polynomial: SymbolicPolynomial) {
  return polynomial.coefficients.every((coefficient) => Boolean(readExactScalarNode(coefficient.node)));
}

function algebraicGenus1FactsToExactSupplementEntries(
  facts: AlgebraicGenus1DegenerationFact[],
): ExactSupplementEntry[] {
  return dedupeFacts(facts).map(exactEntry);
}

function algebraicGenus1FactsToExactSupplementLatex(
  facts: AlgebraicGenus1DegenerationFact[],
) {
  return mergeExactSupplementLatex({
    entries: algebraicGenus1FactsToExactSupplementEntries(facts),
    source: 'candidate-validation',
  });
}

function success(
  variable: string,
  classification: AlgebraicGenus1DegenerationClassification,
  radicand: SymbolicPolynomial,
  facts: AlgebraicGenus1DegenerationFact[],
  readinessNotes: string[],
  repeated?: {
    repeatedFactorLatex: string;
    squarefreePartLatex: string;
  },
): AlgebraicGenus1DegenerationFactResult {
  const dedupedFacts = dedupeFacts(facts);
  return {
    kind: 'success',
    variable,
    classification,
    radicandDegree: radicand.degree as 3 | 4,
    radicandLatex: polynomialLatex(radicand),
    repeatedFactorLatex: repeated?.repeatedFactorLatex,
    squarefreePartLatex: repeated?.squarefreePartLatex,
    globalFacts: dedupedFacts,
    exactSupplementEntries: algebraicGenus1FactsToExactSupplementEntries(dedupedFacts),
    exactSupplementLatex: algebraicGenus1FactsToExactSupplementLatex(dedupedFacts),
    readinessNotes,
  };
}

export function buildAlgebraicGenus1DegenerationFacts(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1DegenerationFactResult {
  const profile = profileAlgebraicGenus1CurveCandidate(node, variable);
  if (profile.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'curve-profile-stop',
      profileStop: profile,
      detail: profile.reason,
    };
  }

  const radicand = profile.radicandPolynomial;
  const baseFacts = [
    leadingCoefficientFact(radicand),
    ...coefficientDenominatorFacts(radicand.facts),
    fact('radicand-domain', profile.radicandLatex, '\\ge0', 'radical-domain'),
  ];

  if (isExactRationalPolynomial(radicand)) {
    const squarefree = squarefreeReadinessSymbolicPolynomial(radicand, { maxDegree: 4 });
    if (squarefree.kind === 'stop') {
      return {
        kind: 'stop',
        variable,
        reason: 'squarefree-stop',
        polynomialStop: squarefree,
        detail: squarefree.reason,
      };
    }

    if (!squarefree.squarefree && squarefree.repeatedFactor) {
      const repeatedFacts = [
        ...baseFacts,
        fact(
          'repeated-root-degeneration',
          polynomialLatex(squarefree.repeatedFactor),
          '=0',
          'candidate-validation',
        ),
      ];
      return success(
        variable,
        'repeated-root-genus0-degeneration',
        radicand,
        repeatedFacts,
        [
          'The radicand shares a nonconstant factor with its derivative.',
          'This is a genus-0 degeneration candidate; elliptic routing should defer to the genus-0 radical layer when readback is available.',
        ],
        {
          repeatedFactorLatex: polynomialLatex(squarefree.repeatedFactor),
          squarefreePartLatex: polynomialLatex(squarefree.squarefreePart),
        },
      );
    }

    return success(
      variable,
      'exact-squarefree-genus1',
      radicand,
      baseFacts,
      ['The exact-rational radicand is squarefree and remains in the genus-1 elliptic candidate lane.'],
    );
  }

  const derivative = derivativeSymbolicPolynomial(radicand);
  if (derivative.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'derivative-stop',
      polynomialStop: derivative,
      detail: derivative.reason,
    };
  }
  const resultant = resultantSymbolicPolynomials(radicand, derivative.polynomial, {
    maxDegree: 4,
    maxSylvesterDimension: 7,
    maxDeterminantTerms: 720,
  });
  if (resultant.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'resultant-stop',
      polynomialStop: resultant,
      detail: resultant.reason,
    };
  }

  const resultantFacts = coefficientDenominatorFacts(resultant.facts);
  if (isSymbolicCoefficientZero(resultant.resultant)) {
    return success(
      variable,
      'repeated-root-genus0-degeneration',
      radicand,
      [
        ...baseFacts,
        ...resultantFacts,
        fact('repeated-root-degeneration', resultant.resultant.latex, '=0', 'candidate-validation'),
      ],
      [
        'The squarefree resultant vanished, so this cubic/quartic radical is a genus-0 degeneration candidate.',
        'Later routing should use genus-0 fallback readiness rather than elliptic normal-form adoption.',
      ],
    );
  }

  return success(
    variable,
    'generic-squarefree-genus1',
    radicand,
    [
      ...baseFacts,
      ...resultantFacts,
      fact(
        'genus1-squarefree-resultant-nonzero',
        resultant.resultant.latex,
        '\\ne0',
        'candidate-validation',
      ),
    ],
    ['The symbolic radicand remains in the generic genus-1 lane under the displayed nonzero squarefree-resultant facts.'],
  );
}
