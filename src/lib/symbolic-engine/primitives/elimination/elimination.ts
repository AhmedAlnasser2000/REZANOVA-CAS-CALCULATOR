import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  projectBivariateResultant,
  type BivariateResultantOptions,
  type BivariateResultantStop,
  type BivariateResultantStopReason,
} from '../../../algebra/polynomial-bivariate-elimination';
import {
  exactPolynomialToNode,
  type ExactPolynomial,
} from '../../../algebra/polynomial-core';
import { normalizeAst } from '../../normalize';
import type { VariableSubstitutionSnapshot } from '../../../../types/calculator';

const ce = new ComputeEngine();

export type SymbolicEliminationStopReason =
  | BivariateResultantStopReason
  | 'engine-error';

export type SymbolicEliminationSuccess = {
  kind: 'success';
  retainedVariable: string;
  eliminatedVariable: string;
  leftDegree: number;
  rightDegree: number;
  sylvesterDimension: number;
  projectedPolynomial: ExactPolynomial;
  projectedNode: unknown;
  projectedLatex: string;
  substitutedLeftLatex: string;
  substitutedRightLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

export type SymbolicEliminationStop =
  | BivariateResultantStop
  | {
      kind: 'stop';
      reason: 'engine-error';
      message: string;
    };

export type SymbolicEliminationResult =
  | SymbolicEliminationSuccess
  | SymbolicEliminationStop;

function nodeToLatex(node: unknown): string | null {
  try {
    return ce.box(normalizeAst(node) as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return null;
  }
}

export function eliminateBivariateResultantNodes(
  leftZeroNode: unknown,
  rightZeroNode: unknown,
  retainedVariable: string,
  eliminatedVariable: string,
  options: BivariateResultantOptions = {},
): SymbolicEliminationResult {
  const leftLatex = nodeToLatex(leftZeroNode);
  const rightLatex = nodeToLatex(rightZeroNode);
  if (!leftLatex || !rightLatex) {
    return {
      kind: 'stop',
      reason: 'engine-error',
      message: 'Elimination could not render zero-form MathJSON for projection.',
    };
  }

  const projection = projectBivariateResultant(
    leftLatex,
    rightLatex,
    retainedVariable,
    eliminatedVariable,
    options,
  );
  if (projection.kind === 'stop') {
    return projection;
  }

  return {
    ...projection,
    projectedNode: exactPolynomialToNode(projection.projectedPolynomial),
  };
}
