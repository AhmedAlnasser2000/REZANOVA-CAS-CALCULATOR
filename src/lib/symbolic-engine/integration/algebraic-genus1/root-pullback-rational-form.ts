import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  buildAlgebraicGenus1RootBasisCoefficientSystem,
  type AlgebraicGenus1RootBasisCoefficientSystem,
} from './root-basis-coefficient-system';

export type AlgebraicGenus1RootPullbackRationalFormStatus =
  | 'constant-first-kind-rational-form'
  | 'basis-coefficient-rational-form'
  | 'hermite-rational-form';

export type AlgebraicGenus1RootPullbackRationalForm = {
  kind: 'success';
  variable: string;
  status: AlgebraicGenus1RootPullbackRationalFormStatus;
  chartVariableLatex: string;
  selectedVariableInChartLatex: string;
  coefficientFieldLatex: string;
  kernelLatex: string;
  rationalCoefficientLatex: string;
  pullbackIdentityLatex: string;
  coefficientSystem: AlgebraicGenus1RootBasisCoefficientSystem;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1RootPullbackRationalFormResult =
  | AlgebraicGenus1RootPullbackRationalForm
  | {
      kind: 'stop';
      variable: string;
      reason: 'coefficient-system-stop';
      detail: string;
    };

function inverseMapRhs(inverseMapLatex: string) {
  const equals = inverseMapLatex.indexOf('=');
  return equals >= 0 ? inverseMapLatex.slice(equals + 1) : inverseMapLatex;
}

function fieldFromSystem(system: AlgebraicGenus1RootBasisCoefficientSystem) {
  const firstUnknown = system.unknowns[0];
  if (firstUnknown) {
    return firstUnknown.coefficientFieldLatex;
  }
  return `\\mathbb{Q}\\left(${system.rootLegendreData.rootSymbolsLatex.join(',')}\\right)`;
}

function firstKindKernel(parameterLatex: string) {
  return `\\frac{d\\phi}{\\sqrt{1-${parameterLatex}\\sin^2\\phi}}`;
}

function chartVariableLatex(dataKind: string) {
  return dataKind === 'cubic-one-real-root-complex-pair'
    ? 'z=\\tan^2\\left(\\frac{\\phi}{2}\\right)'
    : 'z=\\sin^2\\phi';
}

function statusForSystem(
  system: AlgebraicGenus1RootBasisCoefficientSystem,
): AlgebraicGenus1RootPullbackRationalFormStatus {
  if (system.status === 'first-kind-coefficient-solved') {
    return 'constant-first-kind-rational-form';
  }
  if (system.status === 'linear-basis-system-required') {
    return 'basis-coefficient-rational-form';
  }
  return 'hermite-rational-form';
}

function rationalCoefficient(input: {
  system: AlgebraicGenus1RootBasisCoefficientSystem;
  selectedVariableInChartLatex: string;
}) {
  const multiplier = input.system.rootLegendreData.multiplierLatex;
  if (input.system.status === 'first-kind-coefficient-solved') {
    return input.system.solvedCoefficientLatex ?? 'C_F';
  }
  if (input.system.status === 'linear-basis-system-required') {
    return `${multiplier}\\cdot P\\left(${input.selectedVariableInChartLatex}\\right)`;
  }
  return `${multiplier}\\cdot R\\left(${input.selectedVariableInChartLatex},\\sqrt{P\\left(${input.selectedVariableInChartLatex}\\right)}\\right)`;
}

function pullbackIdentity(input: {
  status: AlgebraicGenus1RootPullbackRationalFormStatus;
  coefficientLatex: string;
  kernelLatex: string;
}) {
  if (input.status === 'constant-first-kind-rational-form') {
    return `\\text{pullback}=\\left(${input.coefficientLatex}\\right)${input.kernelLatex}`;
  }
  if (input.status === 'basis-coefficient-rational-form') {
    return `\\text{pullback}=\\left(${input.coefficientLatex}\\right)${input.kernelLatex}\\quad\\text{before }F/E/\\Pi\\text{ basis solving}`;
  }
  return `\\text{pullback}=dS+L+\\left(${input.coefficientLatex}\\right)${input.kernelLatex}\\quad\\text{before Hermite plus elliptic-basis solving}`;
}

function detailSection(input: {
  status: AlgebraicGenus1RootPullbackRationalFormStatus;
  chartVariableLatex: string;
  selectedVariableInChartLatex: string;
  coefficientFieldLatex: string;
  rationalCoefficientLatex: string;
  pullbackIdentityLatex: string;
}) {
  return mixedDetailSection(
    'Genus-1 Root Pullback Rational Form',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('chart variable: '), mathPart(input.chartVariableLatex)],
      [textPart('selected variable: '), mathPart(input.selectedVariableInChartLatex)],
      [textPart('coefficient field: '), mathPart(input.coefficientFieldLatex)],
      [textPart('rational coefficient: '), mathPart(input.rationalCoefficientLatex)],
      [textPart('pullback identity: '), mathPart(input.pullbackIdentityLatex)],
    ],
  );
}

export function buildAlgebraicGenus1RootPullbackRationalForm(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1RootPullbackRationalFormResult {
  const system = buildAlgebraicGenus1RootBasisCoefficientSystem(node, variable);
  if (system.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'coefficient-system-stop',
      detail: system.detail,
    };
  }

  const rootLegendreData = system.rootLegendreData;
  const selectedVariableInChartLatex = inverseMapRhs(rootLegendreData.inverseMapLatex);
  const status = statusForSystem(system);
  const coefficientFieldLatex = fieldFromSystem(system);
  const kernelLatex = firstKindKernel(rootLegendreData.parameterLatex);
  const chartVariable = chartVariableLatex(rootLegendreData.dataKind);
  const rationalCoefficientLatex = rationalCoefficient({
    system,
    selectedVariableInChartLatex,
  });
  const pullbackIdentityLatex = pullbackIdentity({
    status,
    coefficientLatex: rationalCoefficientLatex,
    kernelLatex,
  });

  return {
    kind: 'success',
    variable,
    status,
    chartVariableLatex: chartVariable,
    selectedVariableInChartLatex,
    coefficientFieldLatex,
    kernelLatex,
    rationalCoefficientLatex,
    pullbackIdentityLatex,
    coefficientSystem: system,
    detailSections: [
      ...system.detailSections,
      detailSection({
        status,
        chartVariableLatex: chartVariable,
        selectedVariableInChartLatex,
        coefficientFieldLatex,
        rationalCoefficientLatex,
        pullbackIdentityLatex,
      }),
    ],
    readinessNotes: [
      ...system.readinessNotes,
      status === 'constant-first-kind-rational-form'
        ? 'The rational pullback coefficient is constant, matching the live first-kind route.'
        : 'The rational pullback coefficient is now explicit; live adoption still waits for basis coefficient solving.',
    ],
  };
}
