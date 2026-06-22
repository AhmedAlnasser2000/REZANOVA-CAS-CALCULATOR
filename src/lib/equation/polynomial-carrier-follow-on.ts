// Compatibility facade: keep root imports stable for polynomial carrier follow-on solving.
export type {
  PolynomialCarrierComplexBranch,
  PolynomialCarrierComplexSolveAttempt,
  PolynomialCarrierSolvedRoot,
  PolynomialCarrierSolveAttempt,
} from './polynomial/carrier-follow-on';
export {
  solveBoundedComplexPolynomialCarrierEquationAst,
  solveBoundedPolynomialCarrierEquationAst,
} from './polynomial/carrier-follow-on';
