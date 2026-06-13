import {
  bivariateOptionsWithDefaults,
  bivariateStop,
  type BivariateResultantOptions,
  type BivariateResultantResult,
} from './types';
import { parseAndSubstituteExpression, substitutedNodeToLatex } from './stored-constants';
import { parseBivariateNode } from './parser';
import { buildBivariateSylvesterMatrix, determinantPolynomialMatrix } from './projection';
import { buildBivariateResultantSuccess, validateProjectedPolynomial } from './output';

export function projectBivariateResultant(
  leftLatex: string,
  rightLatex: string,
  retainedVariable: string,
  eliminatedVariable: string,
  options: BivariateResultantOptions = {},
): BivariateResultantResult {
  if (retainedVariable === eliminatedVariable) {
    return bivariateStop('projection-ambiguity');
  }
  const resolvedOptions = bivariateOptionsWithDefaults(options);
  const leftSubstitution = parseAndSubstituteExpression(
    leftLatex,
    retainedVariable,
    eliminatedVariable,
    options.storedVariables,
    resolvedOptions,
  );
  if (leftSubstitution.kind === 'stop') {
    return leftSubstitution;
  }
  const rightSubstitution = parseAndSubstituteExpression(
    rightLatex,
    retainedVariable,
    eliminatedVariable,
    options.storedVariables,
    resolvedOptions,
  );
  if (rightSubstitution.kind === 'stop') {
    return rightSubstitution;
  }

  const left = parseBivariateNode(leftSubstitution.node, retainedVariable, eliminatedVariable, resolvedOptions);
  if (left.kind === 'stop') {
    return left;
  }
  const right = parseBivariateNode(rightSubstitution.node, retainedVariable, eliminatedVariable, resolvedOptions);
  if (right.kind === 'stop') {
    return right;
  }

  const sylvester = buildBivariateSylvesterMatrix(left.polynomial, right.polynomial, resolvedOptions);
  if (sylvester.kind === 'stop') {
    return sylvester;
  }

  const determinant = determinantPolynomialMatrix(sylvester.matrix, retainedVariable, resolvedOptions);
  if (determinant.kind === 'stop') {
    return determinant;
  }
  const validated = validateProjectedPolynomial(determinant.polynomial, resolvedOptions);
  if (validated.kind === 'stop') {
    return validated;
  }

  return buildBivariateResultantSuccess({
    retainedVariable,
    eliminatedVariable,
    leftDegree: sylvester.leftDegree,
    rightDegree: sylvester.rightDegree,
    projectedPolynomial: validated.polynomial,
    substitutedLeftLatex: substitutedNodeToLatex(leftSubstitution.node),
    substitutedRightLatex: substitutedNodeToLatex(rightSubstitution.node),
    leftSubstitution,
    rightSubstitution,
  });
}
