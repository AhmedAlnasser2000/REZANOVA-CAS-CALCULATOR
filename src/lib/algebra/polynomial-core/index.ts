export type {
  ExactPolynomial,
  ExactPolynomialDivisionResult,
  ExactScalar,
} from './types';
export {
  addExactScalars,
  divideExactScalars,
  exactScalarEquals,
  exactScalarIsZero,
  exactScalarToNumber,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  subtractExactScalars,
} from './scalars';
export {
  buildExactScalarNode,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  readExactScalarNode,
} from './math-json';
export {
  addExactPolynomials,
  buildExactPolynomialFromCoefficients,
  exactPolynomialCoefficientArray,
  exactPolynomialConstantTerm,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialLeadingCoefficient,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  normalizeExactPolynomial,
  scaleExactPolynomial,
} from './arithmetic';
export {
  exactPolynomialContent,
  makeMonicExactPolynomial,
  primitiveExactPolynomial,
} from './primitive';
export {
  divideExactPolynomials,
  exactPolynomialGcd,
} from './division';
export { quadraticDiscriminant } from './discriminant';
export { parseExactPolynomial } from './parser';

