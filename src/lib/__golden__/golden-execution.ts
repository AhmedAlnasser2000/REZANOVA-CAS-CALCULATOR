import type { CanonicalRuntimeOutcome, TableResponse } from '../../types/calculator';
import type { CanonicalResultDocument } from '../result-contract/current';
import { executeIntegration } from '../calculus/new-integration/service';
import { DEFAULT_INTEGRATION_LIMITS } from '../calculus/new-integration/types';
import { DEFAULT_EQUATION_LIMITS } from '../new-equation/types';
import { readIntegrationPresentation } from '../result-contract/integration-presentation';
import { executeEquation } from '../symbolic-engine/equation/service/service';
import { buildCanonicalGeometryModeRunPayload } from '../geometry/runtime-run';
import { runCalculateCanonicalRuntimeRequest } from '../modes/calculate';
import { runCalculusCanonicalRuntimeRequest } from '../modes/calculus';
import { runEquationModeForIsolatedWorker } from '../modes/equation';
import { runMatrixMode } from '../modes/matrix';
import { runTableMode } from '../modes/table';
import { runVectorMode } from '../modes/vector';
import { buildCanonicalStatisticsModeRunPayload } from '../statistics/runtime-run';
import { buildCanonicalTrigonometryModeRunPayload } from '../trigonometry/runtime-run';
import {
  buildCanonicalTableModeResult,
} from '../modes/table-core';
import {
  createCanonicalRuntimeResult,
  finalizeCanonicalRuntimeOutcomeFromProducer,
} from '../result-contract';
import { runGraphAnalysisRequest } from '../graphing/analysis';
import type { GoldenCase } from './golden-cases';

export type GoldenExecution = {
  outcome: CanonicalRuntimeOutcome;
  tableResponse?: TableResponse;
  /**
   * New Equation and New Integration schema-7 documents: read through their own typed answer kinds, never the
   * generic consumer (which refuses typed schema-7 kinds by design).
   */
  typed?: {
    document: CanonicalResultDocument;
    presentedText?: string;
    presentedLatex?: string;
  };
};

const typedOutcome = (document: CanonicalResultDocument) =>
  ({ kind: document.outcomeKind, canonicalResult: document }) as unknown as CanonicalRuntimeOutcome;

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
    case 'new-equation': {
      const response = executeEquation({ rows: goldenCase.rows, targets: goldenCase.targets, domain: 'real',
        limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6 });
      return { outcome: typedOutcome(response.document), typed: { document: response.document, presentedText: response.presentations?.exact?.plainText } };
    }
    case 'new-integration': {
      const response = executeIntegration({ request: { source: goldenCase.source, limits: { ...DEFAULT_INTEGRATION_LIMITS } } });
      return { outcome: typedOutcome(response.document), typed: { document: response.document, presentedLatex: readIntegrationPresentation(response.document)?.compact } };
    }
    case 'calculate':
      return {
        outcome: runCalculateCanonicalRuntimeRequest({
          kind: 'standard',
          request: {
            action: goldenCase.action,
            latex: goldenCase.latex,
            angleUnit: goldenCase.angleUnit ?? 'deg',
            outputStyle: goldenCase.outputStyle ?? 'both',
            ansLatex: '0',
          },
        }),
      };
    case 'equation':
      return {
        outcome: (await runEquationModeForIsolatedWorker({
          equationScreen: goldenCase.equationScreen ?? 'symbolic',
          equationLatex: goldenCase.equationLatex,
          equationSolveTarget: undefined,
          quadraticCoefficients: [1, -5, 6],
          cubicCoefficients: [1, -6, 11, -6],
          quarticCoefficients: [1, 0, -5, 0, 4],
          polynomialSystem2Latex: ['x+y=3', 'x-y=1'],
          system2,
          system3,
          angleUnit: 'deg',
          outputStyle: 'both',
          ansLatex: '0',
        })).outcome,
      };
    case 'calculus':
      return { outcome: await runCalculusCanonicalRuntimeRequest(goldenCase.request) };
    case 'trigonometry':
      return { outcome: buildCanonicalTrigonometryModeRunPayload(goldenCase.request).outcome };
    case 'geometry':
      return { outcome: buildCanonicalGeometryModeRunPayload(goldenCase.request).outcome };
    case 'statistics':
      return { outcome: buildCanonicalStatisticsModeRunPayload(goldenCase.request).outcome };
    case 'matrix':
      return {
        outcome: finalizeCanonicalRuntimeOutcomeFromProducer(
          runMatrixMode(goldenCase.request),
          'Matrix golden',
        ),
      };
    case 'vector':
      return {
        outcome: finalizeCanonicalRuntimeOutcomeFromProducer(
          runVectorMode(goldenCase.request),
          'Vector golden',
        ),
      };
    case 'table': {
      const result = buildCanonicalTableModeResult(runTableMode(goldenCase.request));
      return { outcome: result.outcome, tableResponse: result.response };
    }
    case 'graphing': {
      const result = await runGraphAnalysisRequest(goldenCase.request);
      return { outcome: createCanonicalRuntimeResult(result.canonicalResult) };
    }
  }
}
