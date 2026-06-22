import type { AffineCarrierBase, MathJson } from './node-helpers';

export type ProductFactor = {
  node: MathJson;
  multiplicity: number;
  hasTarget: boolean;
};

export type ProductDecompositionResult =
  | { kind: 'ok'; factors: ProductFactor[] }
  | {
    kind: 'unsupported';
    reason: 'target-power';
    message: string;
    node: MathJson;
  };

export type SymbolicFactorPatternStopReason =
  | 'degree-limit'
  | 'unsupported-factor'
  | 'unsupported-expanded-polynomial';

export type SymbolicFactorPatternId =
  | 'common-carrier-power'
  | 'shared-carrier-grouping'
  | 'grouped-carrier-quadratic'
  | 'difference-of-powers';

export type SymbolicFactorPatternFactor = {
  node: MathJson;
  multiplicity: number;
  degree: number;
};

export type SymbolicFactorPatternMetadata =
  | {
    pattern: 'common-carrier-power';
    carrier: AffineCarrierBase;
    commonPower: number;
    residualDegree: number;
  }
  | {
    pattern: 'shared-carrier-grouping';
    carrier: AffineCarrierBase;
    commonPower: number;
    residualDegree: number;
  }
  | {
    pattern: 'grouped-carrier-quadratic';
    carrier: AffineCarrierBase;
    repeated: boolean;
  }
  | {
    pattern: 'difference-of-powers';
    carrier: AffineCarrierBase;
    valueNode: MathJson;
    exponent: number;
    branchKind: 'single-real' | 'two-real';
  };

export type SymbolicFactorPatternResult =
  | {
      kind: 'ok';
      factors: SymbolicFactorPatternFactor[];
      totalDegree: number;
      metadata: SymbolicFactorPatternMetadata;
    }
  | { kind: 'unsupported'; reason: SymbolicFactorPatternStopReason; message: string }
  | { kind: 'no-special-form' };
