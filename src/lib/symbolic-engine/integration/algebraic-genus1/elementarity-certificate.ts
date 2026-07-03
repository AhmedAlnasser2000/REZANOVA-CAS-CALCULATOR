import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';

export type AlgebraicGenus1ElementarityBasisKind =
  | 'first-kind'
  | 'second-kind'
  | 'third-kind';

export type AlgebraicGenus1ElementarityCertificateInput = {
  variable: string;
  basisKinds: readonly AlgebraicGenus1ElementarityBasisKind[];
  answerLatex: string;
  source:
    | 'legendre-template'
    | 'named-root-chart'
    | 'complex-pair-chart'
    | 'hermite-reduction';
};

const BASIS_LABELS: Record<AlgebraicGenus1ElementarityBasisKind, string> = {
  'first-kind': 'first-kind',
  'second-kind': 'second-kind',
  'third-kind': 'third-kind',
};

function uniqueBasisKinds(
  basisKinds: readonly AlgebraicGenus1ElementarityBasisKind[],
) {
  return [...new Set(basisKinds)];
}

function basisKindsText(
  basisKinds: readonly AlgebraicGenus1ElementarityBasisKind[],
) {
  const labels = uniqueBasisKinds(basisKinds).map((kind) => BASIS_LABELS[kind]);
  return labels.length > 0 ? labels.join(' and ') : 'elliptic';
}

function sourceText(source: AlgebraicGenus1ElementarityCertificateInput['source']) {
  switch (source) {
    case 'legendre-template':
      return 'canonical Legendre template';
    case 'named-root-chart':
      return 'named-root Legendre chart';
    case 'complex-pair-chart':
      return 'complex-pair Legendre chart';
    case 'hermite-reduction':
      return 'bounded Hermite reduction';
  }
}

export function buildAlgebraicGenus1ElementarityCertificate(
  input: AlgebraicGenus1ElementarityCertificateInput,
): DisplayDetailSection {
  const basis = basisKindsText(input.basisKinds);
  return mixedDetailSection(
    'Genus-1 Elementarity Certificate',
    [
      [
        textPart('field: '),
        mathPart(`\\mathbb{C}(${input.variable},y),\\ y^2=P(${input.variable})`),
      ],
      [
        textPart('elliptic basis: '),
        textPart(basis),
      ],
      [
        textPart('answer layer: '),
        mathPart(input.answerLatex),
      ],
      [
        textPart(`The ${sourceText(input.source)} reduces the integral to a non-degenerate genus-1 elliptic differential, so the displayed antiderivative is not elementary in the stated elementary field.`),
      ],
      [
        textPart('Degenerate root coincidences, branch-heavy cases, or coefficient specializations that cancel every elliptic basis term are handled by separate fallback routes or controlled stops.'),
      ],
    ],
  );
}
