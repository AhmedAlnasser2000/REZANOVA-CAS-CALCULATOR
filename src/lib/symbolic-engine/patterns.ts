export { isFiniteNumber, isNodeArray } from './patterns/guards';
export {
  boxLatex,
  divideByNumericCoefficient,
  multiplyLatex,
  wrapGroupedLatex,
} from './patterns/latex';
export type { FactorMap } from './patterns/structure';
export {
  addTerms,
  buildFactorNode,
  buildTermNode,
  compactRepeatedProductFactors,
  decomposeProduct,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  mergeFactor,
  termKey,
} from './patterns/structure';
export type { AffineForm, PolynomialTerm } from './patterns/polynomial';
export {
  numericConstant,
  parseAffine,
  parseLinearTerm,
  polynomialTerms,
  toPolynomialTerms,
} from './patterns/polynomial';
