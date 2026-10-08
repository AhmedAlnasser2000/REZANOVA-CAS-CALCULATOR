import type { DifferentialElement as E } from './differential-field';
import type { Rational } from './rational';
import type { LinearSolution } from './linear-system';
import type { RationalParametricRdeDecision } from './rational-parametric-rde';
import type { CertifiedTowerView } from './recursive-certified-tower';
import type { RecursiveCondition } from './recursive-conditions';
import type { RecursiveRdePair, RecursiveRdeFamily } from './recursive-rde-family';
import type { RecursiveWeakNormalization } from './recursive-rde-normalization';
import type { RecursiveDenominatorBound } from './recursive-rde-denominator';
import type { RecursivePolynomialEquation } from './recursive-rde-equation';
import type { RecursiveDegreeBound } from './recursive-rde-degree';
import type { RecursivePolynomialSolution } from './recursive-rde-polynomial';
import type { RationalCoefficientSystem } from './recursive-coefficient-system';

interface HomogeneousBase {
  readonly view: CertifiedTowerView;
  readonly a: E;
  readonly forcing: readonly E[];
  readonly basis: readonly RecursiveRdePair[];
  readonly independence: RationalCoefficientSystem;
  readonly independent: LinearSolution<Rational>;
}
export type RecursiveHomogeneousRde = Readonly<HomogeneousBase & (
  | {route: 'rational'; rational: RationalParametricRdeDecision}
  | {route: 'recursive'; normalization: RecursiveWeakNormalization; denominator: RecursiveDenominatorBound;
      equation: RecursivePolynomialEquation; degree: RecursiveDegreeBound; polynomial: RecursivePolynomialSolution}
)>;
export interface RecursiveParametricRdeDecision {
  readonly rule: 'recursive-parametric-rde-completeness-v1';
  readonly view: CertifiedTowerView;
  readonly a: E;
  readonly b: E;
  readonly forcing: readonly E[];
  readonly homogeneous: RecursiveHomogeneousRde;
  readonly slice: LinearSolution<Rational>;
  readonly kind: 'solutions' | 'no-field-solution';
  readonly family: RecursiveRdeFamily | null;
  readonly conditions: readonly RecursiveCondition[];
}
