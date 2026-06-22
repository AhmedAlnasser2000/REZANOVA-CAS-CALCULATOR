import {
  discoverSymbolicFactorPattern as discoverPrimitiveSymbolicFactorPattern,
  type SymbolicFactorPatternMetadata,
  type SymbolicFactorPatternStopReason,
} from '../../symbolic-engine/primitives/factorization/factorization';
import {
  latexForNode,
  type MathJson,
} from './math-json';

export type SymbolicFactorPatternFactor = {
  node: MathJson;
  multiplicity: number;
  degree: number;
  latex: string;
};

export type SymbolicFactorPatternResult =
  | {
      kind: 'ok';
      factors: SymbolicFactorPatternFactor[];
      totalDegree: number;
      familyLines: string[];
    }
  | { kind: 'unsupported'; reason: SymbolicFactorPatternStopReason; message: string }
  | { kind: 'no-special-form' };

function metadataFamilyLines(metadata: SymbolicFactorPatternMetadata, totalDegree: number) {
  const carrierLatex = latexForNode(metadata.carrier.base as MathJson);

  if (metadata.pattern === 'common-carrier-power') {
    return [
      `Detected a symbolic common ${carrierLatex}-power factor of multiplicity ${metadata.commonPower}.`,
      `Delegated the residual degree-${metadata.residualDegree} target factor through the existing selected-target solvers.`,
      `Total selected-target degree: ${totalDegree}.`,
    ];
  }

  if (metadata.pattern === 'shared-carrier-grouping') {
    return [
      `Detected a symbolic factor-by-grouping pattern with shared carrier ${carrierLatex}.`,
      `Delegated the grouped residual degree-${metadata.residualDegree} target factor through the existing selected-target solvers.`,
      `Total selected-target degree: ${totalDegree}.`,
    ];
  }

  if (metadata.pattern === 'grouped-carrier-quadratic') {
    return [
      `Detected a symbolic grouped carrier quadratic in ${carrierLatex}.`,
      'Factored the carrier quadratic into supported linear selected-target factors.',
      `Total selected-target degree: ${totalDegree}.`,
    ];
  }

  const valueLatex = latexForNode(metadata.valueNode as MathJson);
  return [
    `Detected the real difference-of-powers pattern ${carrierLatex}^{${metadata.exponent}}=${valueLatex}^{${metadata.exponent}}.`,
    metadata.branchKind === 'two-real'
      ? `Solved the real branches ${carrierLatex}=${valueLatex} and ${carrierLatex}=-${valueLatex}.`
      : `Solved the real branch ${carrierLatex}=${valueLatex}.`,
    `Total selected-target degree: ${totalDegree}.`,
  ];
}

export function discoverSymbolicFactorPattern(
  zeroForm: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicFactorPatternResult {
  const result = discoverPrimitiveSymbolicFactorPattern(zeroForm, target, maxTotalDegree);
  if (result.kind !== 'ok') {
    return result;
  }

  return {
    kind: 'ok',
    totalDegree: result.totalDegree,
    factors: result.factors.map((factor) => ({
      node: factor.node as MathJson,
      multiplicity: factor.multiplicity,
      degree: factor.degree,
      latex: latexForNode(factor.node as MathJson),
    })),
    familyLines: metadataFamilyLines(result.metadata, result.totalDegree),
  };
}
