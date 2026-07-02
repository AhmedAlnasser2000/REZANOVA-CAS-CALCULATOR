import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { buildAlgebraicGenus1NormalForm } from './normal-form';
import { buildAlgebraicGenus1RealBranchFacts } from './real-branch-facts';

export type AlgebraicGenus1EndpointReadinessKind =
  | 'canonical-legendre-template'
  | 'exact-root-branch-readiness'
  | 'symbolic-generic-readiness';

export type AlgebraicGenus1EndpointRow = {
  intervalLatex: string;
  endpointPolicy: 'closed-radical-endpoint' | 'excluded-singular-endpoint' | 'branch-ordering-deferred';
  convergence: 'proper' | 'improper-integrable' | 'pole-excluded' | 'deferred';
  notes: string[];
};

export type AlgebraicGenus1EndpointReadinessResult =
  | {
      kind: 'success';
      readinessKind: AlgebraicGenus1EndpointReadinessKind;
      variable: string;
      endpointRows: AlgebraicGenus1EndpointRow[];
      singularityFacts: ExactSupplementEntry[];
      completeIntegralReadiness: string[];
      convergenceNotes: string[];
      exactSupplementEntries: ExactSupplementEntry[];
      detailLines: string[];
    }
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'normal-form-stop'
        | 'real-branch-stop'
        | 'unsupported-readiness-kind';
      detail?: string;
    };

function canonicalLegendreRows(input: {
  variable: string;
  hasCharacteristic: boolean;
}): AlgebraicGenus1EndpointRow[] {
  const baseRows: AlgebraicGenus1EndpointRow[] = [
    {
      intervalLatex: `-1<${input.variable}<1`,
      endpointPolicy: 'excluded-singular-endpoint',
      convergence: 'improper-integrable',
      notes: [
        `The endpoints ${input.variable}=\\pm1 are radical endpoints from 1-${input.variable}^2=0.`,
        'Endpoint singularities are simple square-root singularities in the canonical Legendre templates.',
      ],
    },
  ];

  if (input.hasCharacteristic) {
    baseRows.push({
      intervalLatex: `1-n${input.variable}^2\\ne0`,
      endpointPolicy: 'excluded-singular-endpoint',
      convergence: 'pole-excluded',
      notes: [
        'Third-kind templates also require excluding characteristic-pole points before any definite integral is evaluated.',
      ],
    });
  }

  return baseRows;
}

function canonicalCompleteReadiness(input: {
  head: string;
  variable: string;
  parameterLatex: string;
  characteristicLatex?: string;
}) {
  if (input.head === 'EllipticF') {
    return [
      `${input.variable}=1 maps to amplitude \\phi=\\pi/2, so the complete first-kind candidate is K(${input.parameterLatex}) once endpoint orientation and branch facts are fixed.`,
    ];
  }

  if (input.head === 'EllipticE') {
    return [
      `${input.variable}=1 maps to amplitude \\phi=\\pi/2, so the complete second-kind candidate is E(${input.parameterLatex}) once endpoint orientation and branch facts are fixed.`,
    ];
  }

  return [
    `${input.variable}=1 maps to amplitude \\phi=\\pi/2, so the complete third-kind candidate is Pi(${input.characteristicLatex ?? 'n'},${input.parameterLatex}) after characteristic-pole exclusions are checked.`,
  ];
}

function canonicalLegendreReadiness(
  normal: Extract<ReturnType<typeof buildAlgebraicGenus1NormalForm>, { kind: 'success' }>,
): Extract<AlgebraicGenus1EndpointReadinessResult, { kind: 'success' }> | undefined {
  if (!normal.legendreData) {
    return undefined;
  }

  return {
    kind: 'success',
    readinessKind: 'canonical-legendre-template',
    variable: normal.variable,
    endpointRows: canonicalLegendreRows({
      variable: normal.variable,
      hasCharacteristic: normal.legendreData.characteristicNode !== undefined,
    }),
    singularityFacts: normal.exactSupplementEntries,
    completeIntegralReadiness: canonicalCompleteReadiness({
      head: normal.legendreData.head,
      variable: normal.variable,
      parameterLatex: normal.legendreData.parameterLatex,
      characteristicLatex: normal.legendreData.characteristicLatex,
    }),
    convergenceNotes: [
      'This is endpoint readiness only; definite integral evaluation is not live.',
      'Future definite integration must choose orientation, branch interval, and principal real branch before substituting endpoints.',
    ],
    exactSupplementEntries: normal.exactSupplementEntries,
    detailLines: [
      `amplitude: ${normal.legendreData.amplitudeLatex}`,
      `parameter m: ${normal.legendreData.parameterLatex}`,
      ...(normal.legendreData.characteristicLatex
        ? [`characteristic n: ${normal.legendreData.characteristicLatex}`]
        : []),
      `inverse map: ${normal.legendreData.inverseMapLatex}`,
    ],
  };
}

function exactRootReadiness(node: unknown, variable: string) {
  const branches = buildAlgebraicGenus1RealBranchFacts(node, variable);
  if (branches.kind !== 'success') {
    return {
      kind: 'stop' as const,
      variable,
      reason: 'real-branch-stop' as const,
      detail: branches.detail ?? branches.reason,
    };
  }

  return {
    kind: 'success' as const,
    readinessKind: 'exact-root-branch-readiness' as const,
    variable,
    endpointRows: branches.realDomainRows.map((row) => ({
      intervalLatex: row.intervalLatex,
      endpointPolicy: row.endpointPolicy === 'excluded'
        ? 'excluded-singular-endpoint' as const
        : 'closed-radical-endpoint' as const,
      convergence: row.endpointPolicy === 'excluded'
        ? 'improper-integrable' as const
        : 'proper' as const,
      notes: [
        row.endpointPolicy === 'excluded'
          ? 'Reciprocal-radical endpoints require singular endpoint checks before definite evaluation.'
          : 'Radical endpoints are included in the real radical branch when the radicand vanishes.',
      ],
    })),
    singularityFacts: branches.endpointExclusionFacts,
    completeIntegralReadiness: [
      'Root-based complete-integral recognition waits for Legendre normalization of the chosen branch interval.',
    ],
    convergenceNotes: [
      ...branches.readinessNotes,
      'This is endpoint readiness only; no definite genus-1 evaluation is live.',
    ],
    exactSupplementEntries: branches.endpointExclusionFacts,
    detailLines: [
      `radicand: ${branches.radicandLatex}`,
      ...branches.roots.map((root) => root.definitionLatex),
    ],
  };
}

function symbolicGenericReadiness(
  normal: Extract<ReturnType<typeof buildAlgebraicGenus1NormalForm>, { kind: 'success' }>,
): Extract<AlgebraicGenus1EndpointReadinessResult, { kind: 'success' }> {
  return {
    kind: 'success',
    readinessKind: 'symbolic-generic-readiness',
    variable: normal.variable,
    endpointRows: [
      {
        intervalLatex: 'symbolic branch ordering deferred',
        endpointPolicy: 'branch-ordering-deferred',
        convergence: 'deferred',
        notes: [
          'Symbolic root ordering and radicand-sign intervals are not enumerated until branch counts and readback stay capped.',
        ],
      },
    ],
    singularityFacts: normal.exactSupplementEntries,
    completeIntegralReadiness: [
      'Symbolic complete-integral recognition waits for capped branch ordering and explicit endpoint facts.',
    ],
    convergenceNotes: [
      ...normal.readinessNotes,
      'No definite symbolic genus-1 evaluation is live.',
    ],
    exactSupplementEntries: normal.exactSupplementEntries,
    detailLines: normal.detailSections.flatMap((section) => [
      section.title,
      ...section.lines,
    ]),
  };
}

export function buildAlgebraicGenus1EndpointReadiness(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1EndpointReadinessResult {
  const normal = buildAlgebraicGenus1NormalForm(node, variable);
  if (normal.kind !== 'success') {
    return {
      kind: 'stop',
      variable,
      reason: 'normal-form-stop',
      detail: normal.detail ?? normal.reason,
    };
  }

  const canonical = canonicalLegendreReadiness(normal);
  if (canonical) {
    return canonical;
  }

  if (normal.normalFormKind === 'root-based-readiness') {
    return exactRootReadiness(node, variable);
  }

  if (normal.normalFormKind === 'symbolic-generic-readiness') {
    return symbolicGenericReadiness(normal);
  }

  return {
    kind: 'stop',
    variable,
    reason: 'unsupported-readiness-kind',
    detail: `Endpoint readiness is not available for ${normal.normalFormKind}.`,
  };
}
