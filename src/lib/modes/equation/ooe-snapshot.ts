import { canonicalizeMathInput } from '../../input/input-canonicalization';
import { buildOoeInputRevisionId } from '../../ooe/job-launch/job-contract';
import { containsEquationImaginaryUnitLatex } from '../../equation/complex-input-policy';
import type { RunEquationModeRequest } from './types';

function equationOoeRoute(request: RunEquationModeRequest) {
  return request.numericInterval ? 'numeric-interval' : 'symbolic';
}

export function buildEquationOoeSnapshot(request: RunEquationModeRequest) {
  return {
    route: equationOoeRoute(request),
    explicitImaginaryInput: containsEquationImaginaryUnitLatex(request.equationLatex),
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
  const equationLatex = canonicalizeEquationLatexForOoeRevision(request.equationLatex);

  return {
    route: equationOoeRoute(request),
    explicitImaginaryInput: containsEquationImaginaryUnitLatex(equationLatex),
    request: {
      ...request,
      equationLatex,
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
