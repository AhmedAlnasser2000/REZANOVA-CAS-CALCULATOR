export type LinearAlgebraEquationHandoff = {
  source: 'linear-algebra';
  sourceMode: 'matrix' | 'vector';
  latex: string;
  reason: 'unsupported-equation-shape' | 'free-form-equation';
  suggestedTarget?: string;
};

export function buildLinearAlgebraEquationHandoff(input: {
  sourceMode: 'matrix' | 'vector';
  latex: string;
  reason?: LinearAlgebraEquationHandoff['reason'];
  suggestedTarget?: string;
}): LinearAlgebraEquationHandoff {
  return {
    source: 'linear-algebra',
    sourceMode: input.sourceMode,
    latex: input.latex,
    reason: input.reason ?? 'unsupported-equation-shape',
    ...(input.suggestedTarget ? { suggestedTarget: input.suggestedTarget } : {}),
  };
}
