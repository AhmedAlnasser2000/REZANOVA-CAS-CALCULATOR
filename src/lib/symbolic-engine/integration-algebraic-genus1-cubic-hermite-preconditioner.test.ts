import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { getExactPolynomialCoefficient } from '../algebra/polynomial-core';
import {
  buildAlgebraicGenus1CubicHermitePreconditioner,
} from './integration/algebraic-genus1/cubic-hermite-preconditioner';

const ce = new ComputeEngine();

function surface(latex: string, variable = 'x') {
  return buildAlgebraicGenus1CubicHermitePreconditioner(
    ce.parse(latex).json,
    variable,
  );
}

function success(latex: string, variable = 'x') {
  const result = surface(latex, variable);
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error(`expected cubic Hermite preconditioner for ${latex}: ${result.detail}`);
  }
  return result;
}

describe('algebraic genus-1 cubic Hermite preconditioner', () => {
  it('reduces raw squarefree cubic radicals to correction plus first/second-kind residual basis', () => {
    const result = success('\\sqrt{x^3-x}');

    expect(result.status).toBe('cubic-hermite-preconditioner-ready');
    expect(getExactPolynomialCoefficient(result.correctionPolynomial, 1)).toEqual({
      numerator: 2,
      denominator: 5,
    });
    expect(getExactPolynomialCoefficient(result.residualPolynomial, 1)).toEqual({
      numerator: -2,
      denominator: 5,
    });
    expect(result.residualBasisKinds).toEqual(['second-kind']);
    expect(result.canMapResidualLive).toBe(false);
    expect(result.canAdoptLive).toBe(false);
    expect(result.detailSections.map((section) => section.title)).toContain(
      'Genus-1 Cubic Hermite Preconditioner',
    );
  });

  it('normalizes the selected radical product only with explicit real-branch facts', () => {
    const result = success('\\sqrt{x^3}\\sqrt{x^2+1}');

    expect(getExactPolynomialCoefficient(result.radicandPolynomial, 3)).toEqual({
      numerator: 1,
      denominator: 1,
    });
    expect(getExactPolynomialCoefficient(result.radicandPolynomial, 1)).toEqual({
      numerator: 1,
      denominator: 1,
    });
    expect(getExactPolynomialCoefficient(result.numeratorPolynomial, 4)).toEqual({
      numerator: 1,
      denominator: 1,
    });
    expect(getExactPolynomialCoefficient(result.numeratorPolynomial, 2)).toEqual({
      numerator: 1,
      denominator: 1,
    });
    expect(result.exactSupplementEntries).toContainEqual({
      kind: 'condition',
      expressionLatex: 'x',
      relation: '\\ge0',
      source: 'radical-domain',
    });
    expect(result.detailSections.map((section) => section.title)).toContain(
      'Genus-1 Radical Product Normalization',
    );
  });

  it('routes repeated-root cubics back to the degeneration lane', () => {
    expect(surface('\\sqrt{x^3-2x^2+x}')).toMatchObject({
      kind: 'stop',
      reason: 'repeated-root-degeneration',
    });
  });

  it('fails closed for radical products without a proven bounded real branch', () => {
    expect(surface('\\sqrt{x^3-x}\\sqrt{x+1}')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-radical-product',
    });
  });
});
