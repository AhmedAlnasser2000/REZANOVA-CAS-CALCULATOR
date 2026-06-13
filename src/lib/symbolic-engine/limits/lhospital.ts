import { differentiateAst } from '../differentiation';
import { isNodeArray } from '../patterns';
import {
  evaluateNodeAt,
  isHuge,
  isZeroish,
} from './evaluation';

export function attemptLHospital(node: unknown, target: number, variable = 'x', remaining = 3): number | undefined {
  if (remaining <= 0 || !isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const numerator = node[1];
  const denominator = node[2];
  const numeratorValue = evaluateNodeAt(numerator, target, variable);
  const denominatorValue = evaluateNodeAt(denominator, target, variable);

  const zeroOverZero = isZeroish(numeratorValue) && isZeroish(denominatorValue);
  const infinityOverInfinity = isHuge(numeratorValue) && isHuge(denominatorValue);
  if (!zeroOverZero && !infinityOverInfinity) {
    return undefined;
  }

  const nextNode = ['Divide', differentiateAst(numerator, variable), differentiateAst(denominator, variable)];
  const evaluated = evaluateNodeAt(nextNode, target, variable);
  if (evaluated !== undefined) {
    return evaluated;
  }

  return attemptLHospital(nextNode, target, variable, remaining - 1);
}
