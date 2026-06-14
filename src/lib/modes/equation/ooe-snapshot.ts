import { canonicalizeMathInput } from '../../input/input-canonicalization';
import { buildOoeInputRevisionId } from '../../ooe/job-launch/job-contract';
import type { RunEquationModeRequest } from './types';

export function buildEquationOoeSnapshot(request: RunEquationModeRequest) {
  return {
    route: request.numericInterval ? 'numeric-interval' : 'symbolic',
    request,
  };
}

function canonicalizeEquationLatexForOoeRevision(latex: string) {
  const canonicalized = canonicalizeMathInput(latex, { mode: 'equation' });
  return (canonicalized.ok ? canonicalized.canonicalLatex : latex)
    .replace(/\\left\s*/gu, '')
    .replace(/\\right\s*/gu, '');
}

export function buildEquationOoeRevisionSnapshot(request: RunEquationModeRequest) {
  return {
    route: request.numericInterval ? 'numeric-interval' : 'symbolic',
    request: {
      ...request,
      equationLatex: canonicalizeEquationLatexForOoeRevision(request.equationLatex),
    },
  };
}

export function buildEquationOoeInputRevisionId(
  request: RunEquationModeRequest,
): string {
  return buildOoeInputRevisionId(
    'equation.solve',
    buildEquationOoeRevisionSnapshot(request),
  );
}
