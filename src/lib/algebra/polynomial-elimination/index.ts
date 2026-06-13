export {
  DEFAULT_BIVARIATE_RESULTANT_MAX_ELIMINATED_DEGREE,
  DEFAULT_BIVARIATE_RESULTANT_MAX_RETAINED_DEGREE,
  DEFAULT_BIVARIATE_RESULTANT_MAX_SCALAR_ABS,
  DEFAULT_BIVARIATE_RESULTANT_MAX_SYLVESTER_DIMENSION,
  DEFAULT_BIVARIATE_RESULTANT_MAX_TERMS,
  DEFAULT_RESULTANT_MAX_SYLVESTER_DIMENSION,
} from './types';
export type {
  BivariatePolynomial,
  BivariateResultantOptions,
  BivariateResultantResult,
  BivariateResultantStop,
  BivariateResultantStopReason,
  BivariateResultantSuccess,
  PolynomialEliminationOptions,
  PolynomialEliminationStop,
  PolynomialEliminationStopReason,
} from './types';
export type {
  ResultantResult,
  ResultantSuccess,
  SylvesterMatrixResult,
  SylvesterMatrixSuccess,
} from './univariate-resultant';
export {
  buildSylvesterMatrix,
  resultantExactPolynomials,
} from './univariate-resultant';
export {
  getProjectedPolynomialCoefficient,
} from './output';
export {
  projectBivariateResultant,
} from './solve';
