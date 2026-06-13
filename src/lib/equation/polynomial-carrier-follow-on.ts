// Compatibility facade: keep root imports stable for polynomial carrier follow-on solving.
export type {
  PolynomialCarrierSolvedRoot,
  PolynomialCarrierSolveAttempt,
} from './polynomial/carrier-follow-on';
export { solveBoundedPolynomialCarrierEquationAst } from './polynomial/carrier-follow-on';
