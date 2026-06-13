export {
  DEFAULT_BIVARIATE_RESULTANT_MAX_ELIMINATED_DEGREE,
  DEFAULT_BIVARIATE_RESULTANT_MAX_RETAINED_DEGREE,
  DEFAULT_BIVARIATE_RESULTANT_MAX_SCALAR_ABS,
  DEFAULT_BIVARIATE_RESULTANT_MAX_SYLVESTER_DIMENSION,
  DEFAULT_BIVARIATE_RESULTANT_MAX_TERMS,
  getProjectedPolynomialCoefficient,
  projectBivariateResultant,
} from './polynomial-elimination';
export type {
  BivariatePolynomial,
  BivariateResultantOptions,
  BivariateResultantResult,
  BivariateResultantStop,
  BivariateResultantStopReason,
  BivariateResultantSuccess,
} from './polynomial-elimination';
