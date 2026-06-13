import type { GeometryEvaluation } from '../shared';

export type SolveMissingResult = {
  evaluation: GeometryEvaluation;
  handoffEquationLatex?: string;
  handoffWarning?: string;
};
