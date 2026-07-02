import type { DisplayDetailSection, ResultOrigin } from '../../../types/calculator';

export type FiniteLimitRuleValue = number | 'posInfinity' | 'negInfinity';
export type FiniteLimitRuleOrigin = Extract<ResultOrigin, 'symbolic' | 'rule-based-symbolic' | 'heuristic-symbolic'>;

export type FiniteLimitRuleSuccess = {
  kind: 'success';
  value: FiniteLimitRuleValue;
  exactLatex?: string;
  origin: FiniteLimitRuleOrigin;
  detailSections?: DisplayDetailSection[];
};

export type LocalEquivalent = {
  coefficient: number;
  order: number;
  reason: string;
};

export type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};
