import { vi } from 'vitest';
import * as field from '../algebraic-field';
import * as constants from '../algebraic-constant-field';
import * as presentation from '../number-field-presentation';
import * as splitting from '../number-field-splitting';
import * as derivative from '../algebraic-derivative';
import * as primitive from '../algebraic-primitive';
import * as factor from '../algebraic-factorization';
import * as square from '../factorization-square-free';
import * as hermite from '../algebraic-hermite';
import * as infinity from '../algebraic-infinity-reduction';
import * as residues from '../algebraic-differential-residues';
import * as places from '../algebraic-place';
import * as local from '../algebraic-local';
import * as linear from '../linear-system';
import * as arithmeticLinear from '../arithmetic-linear';
import * as modules from '../arithmetic-polynomial-module';
import * as rr from '../algebraic-riemann-roch';
import * as principality from '../algebraic-rr-principality';
import * as good from '../algebraic-good-reduction';
import * as reducedFactor from '../positive-factorization';
import * as reducedPlaces from '../reduced-place';
import * as reducedRr from '../reduced-riemann-roch';
import * as reducedOrder from '../reduced-divisor-order';
import * as torsion from '../algebraic-divisor-torsion';
import * as primes from '../factorization-modular';
import * as exact from '../algebraic-exact-differential';
import * as reduction from '../algebraic-differential-reduction';
import * as residueSplitting from '../algebraic-residue-splitting';
import * as relations from '../algebraic-residue-relations';
import * as logarithms from '../algebraic-logarithmic-construction';
import * as integration from '../algebraic-decision';
import * as uniformizer from '../algebraic-covered-uniformizer';
import * as balanced from '../balanced-divisor-torsion';
import * as balancedNative from '../hyperelliptic-balanced-place';
import * as balancedPrincipal from '../hyperelliptic-balanced-divisor';
import * as balancedReduced from '../reduced-balanced-order';
import * as balancedModel from '../reduced-balanced-model';
import * as balancedOrder from '../positive-balanced-order';
import * as classSearch from '../finite-class-order-search';
import * as genusOne from '../genus-one-dispatch';
import * as genusOnePresentation from '../genus-one-presentation';
import * as genusOneCoordinates from '../genus-one-coordinates';
import * as genusOneClass from '../genus-one-divisor-class';
import * as genusOneTorsion from '../genus-one-torsion';
import * as polynomialNorm from '../number-field-polynomial-norm';
import * as polynomialResultant from '../number-field-polynomial-resultant';
import * as rationalOrderFilter from '../elliptic-rational-order-filter';

/** Search and evidence producers, as distinct from exact arithmetic/verifiers. */
export function disableAlgebraicIntegrationProducers() {
  const spies = [vi.spyOn(field, 'constructAlgebraicExtension'), vi.spyOn(field, 'constructAlgebraicExtensionWithin'), vi.spyOn(constants, 'certifyAlgebraicConstantFieldWithin'),
    vi.spyOn(presentation, 'constructNumberFieldPresentationWithin'), vi.spyOn(splitting, 'splitNumberFieldPolynomialWithin'),
    vi.spyOn(derivative, 'differentiateAlgebraicWithin'), vi.spyOn(primitive, 'differentiateAlgebraicPrimitiveWithin'),
    vi.spyOn(factor, 'produceAlgebraicFactorNormWithin'), vi.spyOn(polynomialNorm, 'produceNumberFieldPolynomialNormWithin'), vi.spyOn(polynomialResultant, 'produceNumberFieldPolynomialResultantWithin'), vi.spyOn(factor, 'factorAlgebraicPolynomialWithin'), vi.spyOn(square, 'checkedFactorSquareFree'),
    vi.spyOn(hermite, 'reduceAlgebraicHermiteWithin'), vi.spyOn(infinity, 'reduceAlgebraicInfinityWithin'), vi.spyOn(residues, 'algebraicDifferentialResiduesWithin'),
    vi.spyOn(places, 'decomposeAlgebraicPlacesWithin'), vi.spyOn(local, 'algebraicLocalParameterWithin'), vi.spyOn(local, 'expandAlgebraicPlaceWithin'), vi.spyOn(uniformizer, 'constructAlgebraicCoveredUniformizerWithin'),
    vi.spyOn(linear, 'solveLinearSystem'), vi.spyOn(arithmeticLinear, 'solveArithmeticLinearSystem'), vi.spyOn(modules, 'arithmeticModuleHermite'),
    vi.spyOn(rr, 'solveAlgebraicRiemannRochWithin'), vi.spyOn(principality, 'decideAlgebraicRrPrincipalityWithin'),
    vi.spyOn(good, 'findAlgebraicGoodReductionWithin'), vi.spyOn(reducedFactor, 'factorPositivePolynomial'), vi.spyOn(reducedPlaces, 'decomposeReducedPlaces'),
    vi.spyOn(reducedRr, 'solveReducedRiemannRoch'), vi.spyOn(reducedRr, 'decideReducedPrincipality'), vi.spyOn(reducedOrder, 'decideReducedDivisorOrder'),
    vi.spyOn(torsion, 'decideAlgebraicDivisorTorsionWithin'), vi.spyOn(primes, 'isFactorPrime'), vi.spyOn(exact, 'solveAlgebraicExactDifferentialWithin'),
    vi.spyOn(reduction, 'reduceAlgebraicDifferentialWithin'), vi.spyOn(residueSplitting, 'splitAlgebraicResiduesWithin'), vi.spyOn(relations, 'combineAlgebraicResiduesWithin'),
    vi.spyOn(logarithms, 'constructAlgebraicLogarithmsWithin'), vi.spyOn(integration, 'integrateAlgebraicWithin'),
    vi.spyOn(balanced, 'tryDecideBalancedDivisorTorsionWithin'), vi.spyOn(balancedNative, 'constructBalancedCurveModelWithin'), vi.spyOn(balancedNative, 'transportBalancedPlaceWithin'),
    vi.spyOn(balancedPrincipal, 'decideBalancedPrincipalityWithin'), vi.spyOn(balancedPrincipal, 'reduceBalancedDivisorWithin'),
    vi.spyOn(balancedReduced, 'decideReducedBalancedOrderWithin'), vi.spyOn(balancedModel, 'constructReducedBalancedModelWithin'), vi.spyOn(balancedModel, 'transportReducedBalancedPlaceWithin'),
    vi.spyOn(balancedOrder, 'decidePositiveBalancedOrderWithin'), vi.spyOn(classSearch, 'findFiniteClassOrderMultiple'),
    vi.spyOn(genusOne, 'tryDecideGeneralGenusOneTorsionWithin'), vi.spyOn(genusOnePresentation, 'constructGenusOnePresentationWithin'), vi.spyOn(genusOneCoordinates, 'constructGenusOneCoordinatesWithin'),
    vi.spyOn(genusOneClass, 'reduceGenusOneDivisorWithin'), vi.spyOn(genusOneTorsion, 'decideGenusOneRationalTorsionWithin'), vi.spyOn(rationalOrderFilter, 'produceRationalEllipticFiltersWithin')];
  for (const spy of spies) spy.mockImplementation(() => { throw Error('producer disabled'); });
  return () => { for (const spy of spies) spy.mockRestore(); };
}
