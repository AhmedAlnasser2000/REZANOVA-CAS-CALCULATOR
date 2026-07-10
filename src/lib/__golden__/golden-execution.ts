import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import { buildGeometryModeRunPayload } from '../geometry/runtime-run';
import { runCalculateMode } from '../modes/calculate';
import { runCalculusMode } from '../modes/calculus';
import { runEquationMode } from '../modes/equation';
import { runMatrixMode } from '../modes/matrix';
import { runTableMode } from '../modes/table';
import { runVectorMode } from '../modes/vector';
import { buildStatisticsModeRunPayload } from '../statistics/runtime-run';
import { buildTrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import type { GoldenCase } from './golden-cases';

export type GoldenExecution = {
  outcome: DisplayOutcome;
  tableResponse?: TableResponse;
};

const system2 = [
  [1, 1, 3],
  [2, -1, 0],
];

const system3 = [
  [1, 1, 1, 6],
  [2, -1, 1, 3],
  [1, 2, -1, 3],
];

export async function runGoldenCase(goldenCase: GoldenCase): Promise<GoldenExecution> {
  switch (goldenCase.mode) {
    case 'calculate':
      return {
        outcome: runCalculateMode({
          action: goldenCase.action,
          latex: goldenCase.latex,
          angleUnit: goldenCase.angleUnit ?? 'deg',
          outputStyle: goldenCase.outputStyle ?? 'both',
          ansLatex: '0',
        }),
      };
    case 'equation':
      return {
        outcome: runEquationMode({
          equationScreen: goldenCase.equationScreen ?? 'symbolic',
          equationLatex: goldenCase.equationLatex,
          quadraticCoefficients: [1, -5, 6],
          cubicCoefficients: [1, -6, 11, -6],
          quarticCoefficients: [1, 0, -5, 0, 4],
          polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
          system2,
          system3,
          angleUnit: 'deg',
          outputStyle: 'both',
          ansLatex: '0',
        }),
      };
    case 'calculus':
      return { outcome: await runCalculusMode(goldenCase.request) };
    case 'trigonometry':
      return { outcome: buildTrigonometryModeRunPayload(goldenCase.request).outcome };
    case 'geometry':
      return { outcome: buildGeometryModeRunPayload(goldenCase.request).outcome };
    case 'statistics':
      return { outcome: buildStatisticsModeRunPayload(goldenCase.request).outcome };
    case 'matrix':
      return { outcome: runMatrixMode(goldenCase.request) };
    case 'vector':
      return { outcome: runVectorMode(goldenCase.request) };
    case 'table': {
      const result = runTableMode(goldenCase.request);
      return { outcome: result.outcome, tableResponse: result.response };
    }
  }
}
