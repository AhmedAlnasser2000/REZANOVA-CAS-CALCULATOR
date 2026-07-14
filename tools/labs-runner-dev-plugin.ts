import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer, Plugin } from 'vite';
import {
  getLabRunnerDefinitionById,
  getLabRunnerDefinitions,
} from '../src/lib/labs/runner-registry';
import type {
  LabRunComparisonRow,
  LabRunRequest,
  LabRunResult,
  LabRunnerCorpusCase,
  LabRunnerInputKind,
  LabRunnerSummary,
} from '../src/lib/labs/runner-types';
import type { ResultProducerDraft } from '../src/types/calculator/display-types';

const LAB_RUNNER_PREFIX = '/__calcwiz_labs';
const ALL_CORPUS_CASE_ID = '__all__';

type SymbolicSearchCorpusCase = {
  id: string;
  equationLatex: string;
  tags: string[];
};

type SymbolicSearchComparison = {
  caseId: string;
  equationLatex: string;
  baselineWinningStage: string | null;
  alternateWinningStage: string | null;
  baselineAttemptCount: number;
  alternateAttemptCount: number;
  classification: string;
};

type SymbolicSearchExperimentResult = {
  corpusSize: number;
  baselineParityMismatches: unknown[];
  orderings: Record<
    'recursive-first' | 'trig-rewrite-first',
    {
      summary: {
        classificationCounts: Record<string, number>;
        cleanerBoundedPathWins: number;
        exactImprovements: string[];
        regressions: string[];
      };
      comparisons: SymbolicSearchComparison[];
    }
  >;
};

type SymbolicSearchModule = {
  runSymbolicSearchPlannerOrderingExperiment: (
    cases?: SymbolicSearchCorpusCase[],
  ) => SymbolicSearchExperimentResult;
};

type SymbolicSearchCorpusModule = {
  SYMBOLIC_SEARCH_CORPUS: SymbolicSearchCorpusCase[];
};

type ExpressionProbeModule = {
  runExpressionBaselineProbe: (latex: string) => {
    inputLatex: string;
    outcome: ResultProducerDraft;
  };
};

type LabsRunnerDevPluginOptions = {
  enabled: boolean;
};

function jsonResponse(response: ServerResponse, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(payload));
}

function notFound(response: ServerResponse) {
  jsonResponse(response, 404, { error: 'Labs runner bridge is not enabled.' });
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

async function readJsonRequest(request: IncomingMessage): Promise<LabRunRequest> {
  const rawBody = await readRequestBody(request);
  if (!rawBody.trim()) {
    throw new Error('Request body is empty.');
  }

  return JSON.parse(rawBody) as LabRunRequest;
}

function isAcceptedInputKind(value: string): value is LabRunnerInputKind {
  return value === 'equation' || value === 'expression' || value === 'corpus-case';
}

function assertRunRequest(request: LabRunRequest) {
  const runner = getLabRunnerDefinitionById(request.runnerId);
  if (!runner) {
    throw new Error(`Unknown Labs runner "${request.runnerId}".`);
  }
  if (!isAcceptedInputKind(request.inputKind)) {
    throw new Error(`Unsupported Labs input kind "${request.inputKind}".`);
  }
  if (!runner.acceptedInputKinds.some((kind) => kind === request.inputKind)) {
    throw new Error(`${runner.runnerId} does not accept ${request.inputKind} input.`);
  }
  if (
    (request.inputKind === 'equation' || request.inputKind === 'expression')
    && !request.latex?.trim()
  ) {
    throw new Error(`${request.inputKind} input requires LaTeX.`);
  }
  if (request.inputKind === 'corpus-case' && !request.corpusCaseId) {
    throw new Error('Corpus input requires a corpus case.');
  }
}

async function loadSymbolicSearchCorpus(server: ViteDevServer) {
  const corpusModule = await server.ssrLoadModule(
    '/playground/level-0-research/symbolic-search/corpus.ts',
  ) as SymbolicSearchCorpusModule;
  return corpusModule.SYMBOLIC_SEARCH_CORPUS;
}

function buildCorpusCases(cases: SymbolicSearchCorpusCase[]): LabRunnerCorpusCase[] {
  return [
    {
      id: ALL_CORPUS_CASE_ID,
      label: 'Full fixed corpus',
      latex: `${cases.length} tracked equation cases`,
    },
    ...cases.map((corpusCase) => ({
      id: corpusCase.id,
      label: corpusCase.id,
      latex: corpusCase.equationLatex,
    })),
  ];
}

async function buildRunnerSummaries(server: ViteDevServer): Promise<LabRunnerSummary[]> {
  const corpusCases = buildCorpusCases(await loadSymbolicSearchCorpus(server));
  return getLabRunnerDefinitions().map((runner) => (
    runner.runnerId === 'sym-search-planner-ordering'
      ? { ...runner, corpusCases }
      : runner
  ));
}

function flattenSymbolicRows(result: SymbolicSearchExperimentResult): LabRunComparisonRow[] {
  return Object.entries(result.orderings).flatMap(([orderingName, ordering]) =>
    ordering.comparisons.map((comparison) => ({
      label: `${comparison.caseId} / ${orderingName}`,
      inputLatex: comparison.equationLatex,
      classification: comparison.classification,
      baselineWinningStage: comparison.baselineWinningStage,
      alternateWinningStage: comparison.alternateWinningStage,
      baselineAttemptCount: comparison.baselineAttemptCount,
      alternateAttemptCount: comparison.alternateAttemptCount,
    })),
  );
}

function summarizeSymbolicSearch(result: SymbolicSearchExperimentResult) {
  const recursiveFirst = result.orderings['recursive-first'].summary;
  const trigRewriteFirst = result.orderings['trig-rewrite-first'].summary;
  return [
    { label: 'Corpus size', value: String(result.corpusSize) },
    { label: 'Baseline mismatches', value: String(result.baselineParityMismatches.length) },
    { label: 'Recursive-first regressions', value: String(recursiveFirst.regressions.length) },
    { label: 'Trig-rewrite-first regressions', value: String(trigRewriteFirst.regressions.length) },
    { label: 'Recursive-first exact improvements', value: String(recursiveFirst.exactImprovements.length) },
    { label: 'Trig-rewrite-first exact improvements', value: String(trigRewriteFirst.exactImprovements.length) },
  ];
}

async function runSymbolicSearch(
  server: ViteDevServer,
  request: LabRunRequest,
): Promise<LabRunResult> {
  const runner = getLabRunnerDefinitionById('sym-search-planner-ordering');
  if (!runner) {
    throw new Error('Missing symbolic-search runner definition.');
  }

  const corpus = await loadSymbolicSearchCorpus(server);
  const experimentModule = await server.ssrLoadModule(
    '/playground/level-0-research/symbolic-search/run-experiment.ts',
  ) as SymbolicSearchModule;

  const selectedCases = (() => {
    if (request.inputKind === 'equation') {
      return [
        {
          id: 'custom-equation',
          equationLatex: request.latex?.trim() ?? '',
          tags: ['honest-stop-preserved'],
        },
      ];
    }
    if (request.corpusCaseId === ALL_CORPUS_CASE_ID) {
      return corpus;
    }

    const corpusCase = corpus.find((candidate) => candidate.id === request.corpusCaseId);
    if (!corpusCase) {
      throw new Error(`Unknown symbolic-search corpus case "${request.corpusCaseId}".`);
    }
    return [corpusCase];
  })();

  const result = experimentModule.runSymbolicSearchPlannerOrderingExperiment(selectedCases);
  return {
    runnerId: runner.runnerId,
    experimentId: runner.experimentId,
    title: runner.title,
    inputKind: request.inputKind,
    status: 'success',
    summary: summarizeSymbolicSearch(result),
    comparisonRows: flattenSymbolicRows(result),
    warnings: [
      'Experimental planner comparison only. Stable Equation behavior is unchanged.',
    ],
    logs: [
      `Ran ${result.corpusSize} equation case(s) through baseline replay and alternate planner orders.`,
    ],
    raw: result,
  };
}

function outcomeText(outcome: ResultProducerDraft) {
  if (outcome.kind === 'success') {
    return outcome.exactLatex ?? outcome.approxText ?? outcome.title;
  }
  if (outcome.kind === 'prompt') {
    return outcome.message;
  }
  return outcome.error;
}

async function runExpressionProbe(
  server: ViteDevServer,
  request: LabRunRequest,
): Promise<LabRunResult> {
  const runner = getLabRunnerDefinitionById('expression-baseline-probe');
  if (!runner) {
    throw new Error('Missing expression probe runner definition.');
  }

  const module = await server.ssrLoadModule(
    '/playground/level-0-research/expression-baseline-probe/run-experiment.ts',
  ) as ExpressionProbeModule;
  const probe = module.runExpressionBaselineProbe(request.latex?.trim() ?? '');
  const { outcome } = probe;

  return {
    runnerId: runner.runnerId,
    experimentId: runner.experimentId,
    title: runner.title,
    inputKind: request.inputKind,
    status: outcome.kind === 'error' ? 'error' : 'success',
    summary: [
      { label: 'Stable outcome kind', value: outcome.kind },
      { label: 'Title', value: outcome.title },
      { label: 'Warnings', value: String(outcome.warnings.length) },
    ],
    comparisonRows: [
      {
        label: 'Stable Calculate probe',
        inputLatex: probe.inputLatex,
        classification: outcome.kind,
      },
    ],
    warnings: [
      'Expression probe uses stable Calculate behavior for visual incubation only; it adds no product math.',
      ...outcome.warnings,
    ],
    logs: ['Ran expression through the Playground-owned baseline probe.'],
    outputLatex: outcome.kind === 'success' || outcome.kind === 'error'
      ? outcome.exactLatex
      : undefined,
    outputText: outcomeText(outcome),
    raw: probe,
  };
}

async function runLabRequest(
  server: ViteDevServer,
  request: LabRunRequest,
): Promise<LabRunResult> {
  assertRunRequest(request);
  if (request.runnerId === 'sym-search-planner-ordering') {
    return runSymbolicSearch(server, request);
  }
  if (request.runnerId === 'expression-baseline-probe') {
    return runExpressionProbe(server, request);
  }

  throw new Error(`No dev runner is registered for "${request.runnerId}".`);
}

export function labsRunnerDevPlugin(options: LabsRunnerDevPluginOptions): Plugin {
  return {
    name: 'calcwiz-labs-runner-dev-bridge',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith(LAB_RUNNER_PREFIX)) {
          next();
          return;
        }

        if (!options.enabled) {
          notFound(response);
          return;
        }

        try {
          if (request.method === 'GET' && url.pathname === `${LAB_RUNNER_PREFIX}/runners`) {
            jsonResponse(response, 200, await buildRunnerSummaries(server));
            return;
          }

          if (request.method === 'POST' && url.pathname === `${LAB_RUNNER_PREFIX}/run`) {
            jsonResponse(response, 200, await runLabRequest(server, await readJsonRequest(request)));
            return;
          }

          jsonResponse(response, 404, { error: `Unknown Labs runner endpoint "${url.pathname}".` });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown Labs runner error.';
          jsonResponse(response, 400, { error: message });
        }
      });
    },
  };
}
