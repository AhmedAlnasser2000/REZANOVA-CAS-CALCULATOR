/** Independent replay tests forbid every search/derivative producer in the tower. */
import { vi } from 'vitest';
import { DifferentialField } from '../differential-field';
import * as rde from '../recursive-rde';
import * as polynomial from '../recursive-rde-polynomial';
import * as limited from '../recursive-limited-integration';
import * as relations from '../recursive-logarithmic-relations';
import * as membership from '../recursive-logarithmic-membership';
import * as admission from '../recursive-differential-admission';
import * as factor from '../recursive-polynomial-factorization';
import * as linear from '../linear-system';
import * as roots from '../recursive-integer-roots';
import * as integerRoots from '../rde-integer-roots';
import * as derivative from '../differential-derivative';
import * as rationalRde from '../rational-parametric-rde';
import * as rationalRelations from '../rational-logarithmic-relations';
export function disableRecursiveProducers(): void {
  const forbidden = () => { throw Error('producer invoked during independent recursive replay'); };
  vi.spyOn(rde, 'solveRecursiveParametricRde').mockImplementation(forbidden);
  vi.spyOn(rde, 'solveRecursiveParametricRdeWithin').mockImplementation(forbidden);
  vi.spyOn(rde, 'solveRecursiveHomogeneousRdeWithin').mockImplementation(forbidden);
  vi.spyOn(polynomial, 'solveRecursivePolynomial').mockImplementation(forbidden);
  vi.spyOn(limited, 'solveRecursiveLimitedIntegration').mockImplementation(forbidden);
  vi.spyOn(limited, 'solveRecursiveLimitedIntegrationWithin').mockImplementation(forbidden);
  vi.spyOn(relations, 'solveRecursiveLogarithmicDerivativeRelations').mockImplementation(forbidden);
  vi.spyOn(relations, 'solveRecursiveLogarithmicRelationsWithin').mockImplementation(forbidden);
  vi.spyOn(membership, 'solveRecursiveLogarithmicMembershipWithin').mockImplementation(forbidden);
  vi.spyOn(admission, 'certifyRecursiveDifferentialExtension').mockImplementation(forbidden);
  vi.spyOn(factor, 'factorRecursivePolynomial').mockImplementation(forbidden);
  vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
  vi.spyOn(roots, 'integerRootsRecursive').mockImplementation(forbidden);
  vi.spyOn(integerRoots, 'positiveIntegerRoots').mockImplementation(forbidden);
  vi.spyOn(derivative, 'differentiate').mockImplementation(forbidden);
  vi.spyOn(rationalRde, 'solveRationalParametricRde').mockImplementation(forbidden);
  vi.spyOn(rationalRelations, 'solveRationalLogarithmicDerivativeRelations').mockImplementation(forbidden);
  vi.spyOn(DifferentialField, 'certified').mockImplementation(forbidden);
}
