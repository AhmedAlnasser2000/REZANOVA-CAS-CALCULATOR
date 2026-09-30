import type { DifferentialField, DifferentialElement as E } from './differential-field';
import type { DerivativeEvidence } from './differential-derivative';
import type { FormalPrimitiveDomain } from './formal-primitive';
import type { RationalDecision } from './rational-decision';
import type { RationalRdeDecision } from './rational-rde';

export const EXPONENTIAL_SUM_REDUCTION = 'rational-exponential-sum-liouville-v1' as const;
export interface ExponentialSumInput {
  readonly rationalPart: E;
  readonly terms: readonly Readonly<{ coefficient: E; argument: E }>[];
}
export interface ExponentialSumGroup {
  readonly argument: E;
  readonly indices: readonly number[];
  readonly coefficient: E;
}
export interface ExponentialSumNormalization {
  readonly groups: readonly ExponentialSumGroup[];
  readonly rationalPart: E;
}
export interface ExponentialSumComponent {
  readonly group: number;
  readonly exponent: bigint;
  readonly alias: E;
}
export interface ExponentialSumSolvedComponent {
  readonly component: number;
  readonly rde: RationalRdeDecision;
}
export interface ExponentialSumCondition {
  readonly kind: 'input-rational' | 'input-coefficient' | 'input-argument' | 'normalized-rational'
    | 'primitive-rational' | 'primitive-log-norm' | 'primitive-coefficient';
  readonly index: number;
  /** A polynomial embedded in the explicitly owned base Q(x). */
  readonly value: E;
}
interface Common {
  readonly owner: DifferentialField;
  readonly input: ExponentialSumInput;
  readonly normalization: ExponentialSumNormalization;
  readonly field: DifferentialField | null;
  readonly components: readonly ExponentialSumComponent[];
  readonly solved: readonly ExponentialSumSolvedComponent[];
  readonly integrand: E;
  readonly reduction: typeof EXPONENTIAL_SUM_REDUCTION;
  readonly conditions: readonly ExponentialSumCondition[];
}
export interface ExponentialSumPrimitive {
  readonly domain: FormalPrimitiveDomain;
  readonly rational: RationalDecision;
  readonly exponential: E;
  readonly derivative: DerivativeEvidence;
  readonly assembledDerivative: E;
}
export type ExponentialSumDecision = Readonly<Common & (
  { kind: 'elementary'; primitive: ExponentialSumPrimitive }
  | { kind: 'non-elementary'; primitive: null }
)>;
export type ExponentialSumResult = ExponentialSumDecision | Readonly<{
  kind: 'unsupported'; reason: 'constant-exponent' | 'not-rational-multiples';
}>;
