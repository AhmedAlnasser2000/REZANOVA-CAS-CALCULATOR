import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import type {
  AlgebraicGenus1RootLegendreData,
  AlgebraicGenus1RootLegendreDataResult,
} from './root-legendre-data';

export type AlgebraicGenus1RootBasisCoefficientObligation = {
  kind: 'first-kind' | 'second-kind' | 'third-kind';
  kernelLatex: string;
  coefficientScopeLatex: string;
  status: 'explicit-coefficient' | 'basis-template-ready';
  note: string;
};

export type AlgebraicGenus1RootBasisCoefficientProof = {
  kind: 'success';
  variable: string;
  dataKind: AlgebraicGenus1RootLegendreData['dataKind'];
  proofStatus: 'root-basis-coefficients-ready';
  coefficientFieldLatex: string;
  firstKindCoefficientLatex: string;
  secondKindCoefficientTemplateLatex: string;
  thirdKindCoefficientTemplateLatex: string;
  obligations: AlgebraicGenus1RootBasisCoefficientObligation[];
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
};

export type AlgebraicGenus1RootBasisCoefficientProofResult =
  | AlgebraicGenus1RootBasisCoefficientProof
  | {
      kind: 'stop';
      variable: string;
      reason: 'root-legendre-stop' | 'unsupported-root-chart';
      detail: string;
      rootLegendreData?: AlgebraicGenus1RootLegendreDataResult;
    };

type RootBasisInput =
  Omit<
    AlgebraicGenus1RootLegendreData,
    'changeOfVariableProof' | 'rootBasisCoefficientProof'
  > & {
    rootBasisCoefficientProof?: AlgebraicGenus1RootBasisCoefficientProof;
  };

function rootField(symbols: string[]) {
  return `\\mathbb{Q}\\left(${symbols.join(',')}\\right)`;
}

function coefficientField(symbols: string[]) {
  return `${rootField(symbols)}\\left(\\sin^2\\phi\\right)`;
}

function firstKindKernel(parameterLatex: string) {
  return `\\frac{d\\phi}{\\sqrt{1-${parameterLatex}\\sin^2\\phi}}`;
}

function secondKindKernel(parameterLatex: string) {
  return `\\sqrt{1-${parameterLatex}\\sin^2\\phi}\\,d\\phi`;
}

function thirdKindKernel(parameterLatex: string) {
  return `\\frac{d\\phi}{\\left(1-n\\sin^2\\phi\\right)\\sqrt{1-${parameterLatex}\\sin^2\\phi}}`;
}

export function buildAlgebraicGenus1RootBasisCoefficientProofFromData(
  data: RootBasisInput,
): AlgebraicGenus1RootBasisCoefficientProof {
  const fieldLatex = coefficientField(data.rootSymbolsLatex);
  const firstKindCoefficientLatex = data.multiplierLatex;
  const secondKindCoefficientTemplateLatex =
    `A\\left(\\sin^2\\phi\\right)\\in ${fieldLatex}`;
  const thirdKindCoefficientTemplateLatex =
    `B_p\\left(\\sin^2\\phi\\right)\\in ${fieldLatex},\\quad n=n(p)`;
  const obligations: AlgebraicGenus1RootBasisCoefficientObligation[] = [
    {
      kind: 'first-kind',
      kernelLatex: firstKindKernel(data.parameterLatex),
      coefficientScopeLatex: firstKindCoefficientLatex,
      status: 'explicit-coefficient',
      note: 'The first-kind coefficient is fixed by the named-root change of variable.',
    },
    {
      kind: 'second-kind',
      kernelLatex: secondKindKernel(data.parameterLatex),
      coefficientScopeLatex: secondKindCoefficientTemplateLatex,
      status: 'basis-template-ready',
      note: 'Second-kind adoption must solve for a bounded coefficient in the displayed root field.',
    },
    {
      kind: 'third-kind',
      kernelLatex: thirdKindKernel(data.parameterLatex),
      coefficientScopeLatex: thirdKindCoefficientTemplateLatex,
      status: 'basis-template-ready',
      note: 'Third-kind adoption must solve pole characteristics against the displayed template.',
    },
  ];
  const detailSections: DisplayDetailSection[] = [
    mixedDetailSection(
      'Genus-1 Root Basis Coefficient Obligations',
      [
        [textPart('coefficient field: '), mathPart(fieldLatex)],
        [textPart('first-kind coefficient: '), mathPart(firstKindCoefficientLatex)],
        [textPart('second-kind template: '), mathPart(secondKindCoefficientTemplateLatex)],
        [textPart('third-kind template: '), mathPart(thirdKindCoefficientTemplateLatex)],
        ...obligations.map((obligation) => [
          textPart(`${obligation.kind}: ${obligation.status}; `),
          mathPart(obligation.kernelLatex),
        ]),
      ],
    ),
  ];

  return {
    kind: 'success',
    variable: data.variable,
    dataKind: data.dataKind,
    proofStatus: 'root-basis-coefficients-ready',
    coefficientFieldLatex: fieldLatex,
    firstKindCoefficientLatex,
    secondKindCoefficientTemplateLatex,
    thirdKindCoefficientTemplateLatex,
    obligations,
    detailSections,
    readinessNotes: [
      'Root-based first-kind coefficient evidence is explicit and already matches the change-of-variable proof.',
      'Second-kind and third-kind live gates must solve bounded coefficients inside the displayed named-root coefficient field before adoption.',
    ],
  };
}

export function buildAlgebraicGenus1RootBasisCoefficientProof(
  rootLegendreData: AlgebraicGenus1RootLegendreDataResult,
): AlgebraicGenus1RootBasisCoefficientProofResult {
  if (rootLegendreData.kind === 'stop') {
    return {
      kind: 'stop',
      variable: rootLegendreData.variable,
      reason: 'root-legendre-stop',
      detail: rootLegendreData.detail,
      rootLegendreData,
    };
  }

  if (
    rootLegendreData.dataKind !== 'cubic-three-real-roots'
    && rootLegendreData.dataKind !== 'quartic-four-real-roots'
  ) {
    return {
      kind: 'stop',
      variable: rootLegendreData.variable,
      reason: 'unsupported-root-chart',
      detail: 'Only the three-real-root cubic and four-real-root quartic charts have root-basis coefficient obligations.',
      rootLegendreData,
    };
  }

  return buildAlgebraicGenus1RootBasisCoefficientProofFromData(rootLegendreData);
}
