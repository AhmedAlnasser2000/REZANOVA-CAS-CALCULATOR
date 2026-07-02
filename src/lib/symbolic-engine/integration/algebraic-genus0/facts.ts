import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
  ExactSupplementSource,
} from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import {
  buildSymbolicPolynomialNode,
  getSymbolicPolynomialCoefficient,
  parseSymbolicPolynomial,
  type SymbolicPolynomial,
  type SymbolicPolynomialStop,
} from '../../primitives/symbolic-polynomial';
import {
  multiplyMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import { boxLatex } from '../../patterns';

export type AlgebraicGenus0FactKind =
  | 'branch-validity'
  | 'coefficient-denominator-nonzero'
  | 'discriminant-sign'
  | 'leading-coefficient-nonzero'
  | 'radicand-domain'
  | 'slope-nonzero'
  | 'substitution-denominator-nonzero';

export type AlgebraicGenus0DiscriminantBranch =
  | 'positive'
  | 'zero'
  | 'negative';

export type AlgebraicGenus0Fact = {
  kind: AlgebraicGenus0FactKind;
  expressionLatex: string;
  relation: ExactSupplementRelation;
  source: ExactSupplementSource;
};

export type AlgebraicGenus0FactBranch = {
  kind: 'discriminant';
  branch: AlgebraicGenus0DiscriminantBranch;
  facts: AlgebraicGenus0Fact[];
};

export type AlgebraicGenus0RadicandFactResult =
  | {
      kind: 'success';
      variable: string;
      radicandLatex: string;
      degree: 1 | 2;
      globalFacts: AlgebraicGenus0Fact[];
      branches: AlgebraicGenus0FactBranch[];
      exactSupplementEntries: ExactSupplementEntry[];
      exactSupplementLatex: string[];
    }
  | (SymbolicPolynomialStop & { variable: string });

function normalizeFactLatex(expressionLatex: string) {
  return expressionLatex.trim();
}

function exactEntry(fact: AlgebraicGenus0Fact): ExactSupplementEntry {
  return {
    kind: fact.relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex: normalizeFactLatex(fact.expressionLatex),
    relation: fact.relation,
    source: fact.source,
  };
}

function fact(
  kind: AlgebraicGenus0FactKind,
  expressionLatex: string,
  relation: ExactSupplementRelation,
  source: ExactSupplementSource,
): AlgebraicGenus0Fact {
  return {
    kind,
    expressionLatex: normalizeFactLatex(expressionLatex),
    relation,
    source,
  };
}

function dedupeFacts(facts: AlgebraicGenus0Fact[]) {
  const seen = new Set<string>();
  const deduped: AlgebraicGenus0Fact[] = [];
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

function coefficientDenominatorFacts(polynomial: SymbolicPolynomial) {
  return polynomial.facts.map((item) =>
    fact(
      'coefficient-denominator-nonzero',
      item.expressionLatex,
      item.relation,
      'denominator',
    ));
}

function discriminantLatex(polynomial: SymbolicPolynomial) {
  const a = getSymbolicPolynomialCoefficient(polynomial, 2);
  const b = getSymbolicPolynomialCoefficient(polynomial, 1);
  const c = getSymbolicPolynomialCoefficient(polynomial, 0);
  const discriminant = subtractMathJsonNodes(
    multiplyMathJsonNodes(b.node, b.node),
    multiplyMathJsonNodes(4, a.node, c.node),
  );
  return boxLatex(simplifyMathJsonNodeOrOriginal(discriminant));
}

function discriminantBranches(discriminant: string): AlgebraicGenus0FactBranch[] {
  return [
    {
      kind: 'discriminant',
      branch: 'positive',
      facts: [fact('discriminant-sign', discriminant, '>0', 'candidate-validation')],
    },
    {
      kind: 'discriminant',
      branch: 'zero',
      facts: [fact('discriminant-sign', discriminant, '=0', 'candidate-validation')],
    },
    {
      kind: 'discriminant',
      branch: 'negative',
      facts: [fact('discriminant-sign', discriminant, '<0', 'candidate-validation')],
    },
  ];
}

export function algebraicGenus0FactsToExactSupplementEntries(
  facts: AlgebraicGenus0Fact[],
): ExactSupplementEntry[] {
  return dedupeFacts(facts).map(exactEntry);
}

export function algebraicGenus0FactsToExactSupplementLatex(
  facts: AlgebraicGenus0Fact[],
) {
  return mergeExactSupplementLatex({
    entries: algebraicGenus0FactsToExactSupplementEntries(facts),
    source: 'candidate-validation',
  });
}

export function algebraicGenus0SubstitutionDenominatorFact(
  expressionLatex: string,
): AlgebraicGenus0Fact {
  return fact(
    'substitution-denominator-nonzero',
    expressionLatex,
    '\\ne0',
    'denominator',
  );
}

export function algebraicGenus0BranchValidityFact(
  expressionLatex: string,
  relation: ExactSupplementRelation = '>0',
): AlgebraicGenus0Fact {
  return fact('branch-validity', expressionLatex, relation, 'radical-domain');
}

export function buildAlgebraicGenus0RadicandFacts(
  radicand: unknown,
  variable = 'x',
): AlgebraicGenus0RadicandFactResult {
  const parsed = parseSymbolicPolynomial(radicand, variable, 2);
  if (parsed.kind === 'stop') {
    return { ...parsed, variable };
  }

  const polynomial = parsed.polynomial;
  if (polynomial.degree !== 1 && polynomial.degree !== 2) {
    return {
      kind: 'stop',
      reason: polynomial.degree === 0 ? 'constant-polynomial' : 'over-cap-degree',
      variable,
    };
  }

  const radicandLatex = polynomialLatex(polynomial);
  const globalFacts = [
    ...coefficientDenominatorFacts(polynomial),
    fact(
      'radicand-domain',
      radicandLatex,
      '\\ge0',
      'radical-domain',
    ),
  ];

  const branches: AlgebraicGenus0FactBranch[] = [];
  if (polynomial.degree === 1) {
    globalFacts.unshift(fact(
      'slope-nonzero',
      getSymbolicPolynomialCoefficient(polynomial, 1).latex,
      '\\ne0',
      'candidate-validation',
    ));
  } else {
    globalFacts.unshift(fact(
      'leading-coefficient-nonzero',
      getSymbolicPolynomialCoefficient(polynomial, 2).latex,
      '\\ne0',
      'candidate-validation',
    ));
    branches.push(...discriminantBranches(discriminantLatex(polynomial)));
  }

  const dedupedGlobalFacts = dedupeFacts(globalFacts);
  const exactSupplementEntries = algebraicGenus0FactsToExactSupplementEntries(dedupedGlobalFacts);
  const exactSupplementLatex = algebraicGenus0FactsToExactSupplementLatex(dedupedGlobalFacts);

  return {
    kind: 'success',
    variable,
    radicandLatex,
    degree: polynomial.degree,
    globalFacts: dedupedGlobalFacts,
    branches,
    exactSupplementEntries,
    exactSupplementLatex,
  };
}
