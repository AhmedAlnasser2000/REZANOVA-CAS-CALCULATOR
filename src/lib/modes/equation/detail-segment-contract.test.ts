import { describe, expect, it } from 'vitest';
import {
  detailLineIntentAt,
  resolveDetailLinePresentation,
} from '../../display/result-detail-lines';
import { solveFactorableComplexPolynomial } from '../../equation/complex/polynomial';
import type { DisplayDetailSection, ResultProducerDraft } from '../../../types/calculator';
import { runEquationMode } from '../equation';
import { makeRequest } from './test-support';

function expectDeclaredDetailIntent(sections: readonly DisplayDetailSection[]) {
  expect(sections.length).toBeGreaterThan(0);
  for (const section of sections) {
    section.lines.forEach((line, index) => {
      const intent = detailLineIntentAt(section, index);
      expect(intent, `${section.title}[${index}] ${line}`).not.toBe('undeclared');
      expect(resolveDetailLinePresentation({
        line,
        lineKind: section.lineKinds?.[index] ?? section.lineKind,
        parts: section.lineParts?.[index],
      }).source, `${section.title}[${index}] ${line}`).not.toBe('legacy-inference');
    });
  }
}

function sectionsNamed(outcome: ResultProducerDraft, titles: readonly string[]) {
  const sections = 'detailSections' in outcome ? outcome.detailSections ?? [] : [];
  return sections.filter((section) => titles.includes(section.title));
}

function runSymbolic(
  equationLatex: string,
  overrides: Partial<Parameters<typeof runEquationMode>[0]> = {},
) {
  return runEquationMode({
    ...makeRequest(),
    equationScreen: 'symbolic',
    equationLatex,
    equationSolveTarget: 'x',
    equationAnswerMode: 'exact',
    ...overrides,
  });
}

describe('Equation core detail-segment contract', () => {
  it('declares every live line in representative core outcomes', () => {
    const inequality = runSymbolic('x^2-1>0');
    const numeric = runSymbolic('\\cos(x)=x', {
      numericInterval: { start: '0', end: '1', subdivisions: 64 },
    });
    const system = runEquationMode({
      ...makeRequest(),
      equationScreen: 'polynomialSystem2',
    });
    const controlledStop = runSymbolic('x+1=0', { equationAnswerMode: 'approximate' });
    const complex = solveFactorableComplexPolynomial(
      'x^3-x^2+x-1=0',
      'x',
      'exact',
      'rectangular',
    );

    expectDeclaredDetailIntent(sectionsNamed(inequality, [
      'Inequality Route',
      'Inequality Proof',
    ]));
    expectDeclaredDetailIntent(sectionsNamed(numeric, [
      'Domain Probe',
      'Search Diagnostics',
      'Numeric Conditioning',
    ]));
    expectDeclaredDetailIntent(sectionsNamed(system, [
      'Polynomial System',
      'Resultant Projection',
      'Candidate Check',
    ]));
    expectDeclaredDetailIntent(sectionsNamed(controlledStop, [
      'Numeric Solve',
      'What To Try',
    ]));
    expect(complex).not.toBeNull();
    expectDeclaredDetailIntent(complex?.detailSections ?? []);
  });

  it('preserves typed mixed rendering for relation and factorization rows', () => {
    const inequality = runSymbolic('x^2-1>0');
    const inequalityRoute = sectionsNamed(inequality, ['Inequality Route'])[0];
    const relationIndex = inequalityRoute?.lines.findIndex((line) =>
      line.startsWith('Relation tested:')) ?? -1;

    expect(relationIndex).toBeGreaterThanOrEqual(0);
    expect(inequalityRoute?.lines[relationIndex]).toBe('Relation tested: p(x) > 0.');
    expect(inequalityRoute && detailLineIntentAt(inequalityRoute, relationIndex)).toBe('typed-parts');

    const complex = solveFactorableComplexPolynomial(
      'x^3-x^2+x-1=0',
      'x',
      'exact',
      'rectangular',
    );
    const polynomialRoute = complex?.detailSections.find((section) =>
      section.title === 'Complex Polynomial Route');
    const factorizationIndex = polynomialRoute?.lines.findIndex((line) =>
      line.startsWith('Factorization:')) ?? -1;

    expect(factorizationIndex).toBeGreaterThanOrEqual(0);
    expect(polynomialRoute && detailLineIntentAt(polynomialRoute, factorizationIndex))
      .toBe('typed-parts');
  });
});
