export type {
  MathJson,
  AffineCarrierBase,
} from './node-helpers';
export type {
  ProductDecompositionResult,
  ProductFactor,
  SymbolicFactorPatternFactor,
  SymbolicFactorPatternId,
  SymbolicFactorPatternMetadata,
  SymbolicFactorPatternResult,
  SymbolicFactorPatternStopReason,
} from './types';
export {
  decomposeExplicitProductFactors,
  explicitProductNodeFromZeroEquation,
} from './product';
export {
  discoverSymbolicFactorPattern,
} from './patterns';
