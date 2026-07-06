import type { DisplayDetailLinePart, LimitTargetKind } from '../../../types/calculator';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import { dependsOnVariable, isNodeArray } from '../patterns';
import { limitMathPart, limitTextPart } from './detail-readback';
import {
  buildGruntzRewriteToWContract,
  gruntzNodeToLatex,
  type GruntzBranchAssumption,
  type GruntzCoefficientDriver,
  type GruntzMrvAtom,
  type GruntzMrvSetOptions,
  type GruntzRewriteToWContract,
} from './gruntz-foundation';

type LeadingTerm =
  | { kind: 'success'; order: number; coefficientLatex: string; residualLatex?: string }
  | { kind: 'stop'; reason: string };

export type GruntzSeriesInWContract = {
  supported: boolean;
  variable: string;
  rewrite?: GruntzRewriteToWContract;
  wLatex?: string;
  rewrittenLatex?: string;
  leadingOrder?: number;
  leadingCoefficientLatex?: string;
  branchAssumptions?: GruntzBranchAssumption[];
  coefficientDrivers?: GruntzCoefficientDriver[];
  parameterConditions?: string[];
  evidenceRows?: DisplayDetailLinePart[][];
  stopReason?: string;
};

function negateCoefficient(coefficient: string) {
  if (coefficient === '1') {
    return '-1';
  }
  if (coefficient.startsWith('-')) {
    return coefficient.slice(1);
  }
  return `-${coefficient}`;
}

function multiplyCoefficient(left: string, right: string) {
  if (left === '1') {
    return right;
  }
  if (right === '1') {
    return left;
  }
  if (left === '-1') {
    return negateCoefficient(right);
  }
  if (right === '-1') {
    return negateCoefficient(left);
  }
  return `${left}${right}`;
}

function divideCoefficient(left: string, right: string) {
  return right === '1' ? left : `\\frac{${left}}{${right}}`;
}

function addCoefficients(coefficients: string[]) {
  return coefficients.length === 1 ? coefficients[0] : coefficients.join('+');
}

function powerCoefficient(coefficient: string, exponent: number) {
  if (exponent === 0 || coefficient === '1') {
    return '1';
  }
  return exponent === 1 ? coefficient : `${coefficient}^{${exponent}}`;
}

function combineAdditiveTerms(terms: Array<{ order: number; coefficientLatex: string; residualLatex?: string }>) {
  const minOrder = Math.min(...terms.map((term) => term.order));
  const leading = terms.filter((term) => term.order === minOrder);
  return {
    kind: 'success' as const,
    order: minOrder,
    coefficientLatex: addCoefficients(leading.map((term) => term.coefficientLatex)),
    residualLatex: leading.find((term) => term.residualLatex)?.residualLatex,
  };
}

function leadingTermInW(node: unknown, atom: GruntzMrvAtom, variable: string): LeadingTerm {
  const latex = gruntzNodeToLatex(node);
  if (latex === atom.latex) {
    return { kind: 'success', order: -1, coefficientLatex: '1' };
  }

  if (!dependsOnVariable(node, variable)) {
    return { kind: 'success', order: 0, coefficientLatex: latex };
  }

  if (!isNodeArray(node)) {
    return { kind: 'success', order: 0, coefficientLatex: '1', residualLatex: latex };
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const inner = leadingTermInW(node[1], atom, variable);
    return inner.kind === 'success'
      ? { ...inner, coefficientLatex: negateCoefficient(inner.coefficientLatex) }
      : inner;
  }

  if (node[0] === 'Add') {
    const terms = node.slice(1).map((term) => leadingTermInW(term, atom, variable));
    const stop = terms.find((term) => term.kind === 'stop');
    if (stop) {
      return stop;
    }
    return combineAdditiveTerms(terms as Extract<LeadingTerm, { kind: 'success' }>[]);
  }

  if (node[0] === 'Multiply') {
    return node.slice(1).reduce<LeadingTerm>((accumulator, factor) => {
      if (accumulator.kind === 'stop') {
        return accumulator;
      }
      const next = leadingTermInW(factor, atom, variable);
      return next.kind === 'success'
        ? {
          kind: 'success',
          order: accumulator.order + next.order,
          coefficientLatex: multiplyCoefficient(accumulator.coefficientLatex, next.coefficientLatex),
          residualLatex: accumulator.residualLatex ?? next.residualLatex,
        }
        : next;
    }, { kind: 'success', order: 0, coefficientLatex: '1' });
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = leadingTermInW(node[1], atom, variable);
    const denominator = leadingTermInW(node[2], atom, variable);
    if (numerator.kind === 'stop') {
      return numerator;
    }
    if (denominator.kind === 'stop') {
      return denominator;
    }
    return {
      kind: 'success',
      order: numerator.order - denominator.order,
      coefficientLatex: divideCoefficient(numerator.coefficientLatex, denominator.coefficientLatex),
      residualLatex: numerator.residualLatex ?? denominator.residualLatex,
    };
  }

  if (node[0] === 'Power' && node.length === 3) {
    const exponent = readExactScalarNode(node[2]);
    if (!exponent || exponent.denominator !== 1 || Math.abs(exponent.numerator) > 10) {
      return { kind: 'stop', reason: 'Power expansion in w is outside the capped integer-exponent contract.' };
    }
    const base = leadingTermInW(node[1], atom, variable);
    return base.kind === 'success'
      ? {
        kind: 'success',
        order: base.order * exponent.numerator,
        coefficientLatex: powerCoefficient(base.coefficientLatex, exponent.numerator),
        residualLatex: base.residualLatex,
      }
      : base;
  }

  return { kind: 'success', order: 0, coefficientLatex: '1', residualLatex: latex };
}

function seriesEvidenceRows(input: {
  rewrittenLatex: string;
  order: number;
  coefficientLatex: string;
}): DisplayDetailLinePart[][] {
  return [[
    limitTextPart('Leading term in w: '),
    limitMathPart(`${input.coefficientLatex}w^{${input.order}}`),
    limitTextPart(' from transformed expression '),
    limitMathPart(input.rewrittenLatex),
    limitTextPart('.'),
  ]];
}

export function buildGruntzSeriesInWContract(
  node: unknown,
  variable = 'x',
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
  options: GruntzMrvSetOptions = {},
): GruntzSeriesInWContract {
  const rewrite = buildGruntzRewriteToWContract(node, variable, targetKind, options);
  if (!rewrite.supported || !rewrite.dominantAtom || !rewrite.rewrittenLatex) {
    return {
      supported: false,
      variable,
      rewrite,
      stopReason: rewrite.stopReason ?? 'Rewrite-to-w did not produce a supported transformed expression.',
    };
  }

  const leading = leadingTermInW(node, rewrite.dominantAtom, variable);
  if (leading.kind === 'stop') {
    return { supported: false, variable, rewrite, stopReason: leading.reason };
  }

  return {
    supported: true,
    variable,
    rewrite,
    wLatex: rewrite.wLatex,
    rewrittenLatex: rewrite.rewrittenLatex,
    leadingOrder: leading.order,
    leadingCoefficientLatex: leading.coefficientLatex,
    branchAssumptions: rewrite.branchAssumptions,
    coefficientDrivers: rewrite.coefficientDrivers,
    parameterConditions: rewrite.parameterConditions,
    evidenceRows: [
      ...(rewrite.evidenceRows ?? []),
      ...seriesEvidenceRows({
        rewrittenLatex: rewrite.rewrittenLatex,
        order: leading.order,
        coefficientLatex: leading.coefficientLatex,
      }),
    ],
  };
}
