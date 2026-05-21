import { useEffect, useMemo, useState } from 'react';
import { LABS_EXPERIMENTS, type LabExperimentSummary } from '../../lib/labs/catalog';
import {
  fetchLabRunners,
  labsRunnerUiEnabled as defaultLabsRunnerUiEnabled,
  runLabExperiment,
} from '../../lib/labs/runner-client';
import type {
  LabRunRequest,
  LabRunResult,
  LabRunnerInputKind,
  LabRunnerSummary,
} from '../../lib/labs/runner-types';

export const LAB_INPUT_KIND_LABELS: Record<LabRunnerInputKind, string> = {
  equation: 'Equation',
  expression: 'Expression',
  'corpus-case': 'Corpus case',
};

export const LAB_INPUT_KINDS: LabRunnerInputKind[] = ['equation', 'expression', 'corpus-case'];

export type LabsRunnerClient = {
  listRunners: () => Promise<LabRunnerSummary[]>;
  runExperiment: (request: LabRunRequest) => Promise<LabRunResult>;
};

export type LabsRuntime = ReturnType<typeof useLabsRuntime>;

const defaultRunnerClient: LabsRunnerClient = {
  listRunners: () => fetchLabRunners(),
  runExperiment: (request: LabRunRequest) => runLabExperiment(request),
};

export function canUseLabInputKind(
  runner: LabRunnerSummary | undefined,
  inputKind: LabRunnerInputKind,
) {
  return Boolean(runner?.acceptedInputKinds.includes(inputKind));
}

export function defaultLatexForLabRunner(
  runner: LabRunnerSummary | undefined,
  inputKind: LabRunnerInputKind,
) {
  if (!runner) {
    return '';
  }

  if (inputKind === 'corpus-case') {
    return runner.corpusCases?.[0]?.latex ?? runner.defaultLatex ?? '';
  }

  return runner.defaultLatex ?? '';
}

type UseLabsRuntimeOptions = {
  experiments?: readonly LabExperimentSummary[];
  labsEnabled?: boolean;
  runnerUiEnabled?: boolean;
  runnerClient?: LabsRunnerClient;
};

export function useLabsRuntime({
  experiments = LABS_EXPERIMENTS,
  labsEnabled = true,
  runnerUiEnabled = defaultLabsRunnerUiEnabled(),
  runnerClient = defaultRunnerClient,
}: UseLabsRuntimeOptions = {}) {
  const effectiveRunnerUiEnabled = labsEnabled && runnerUiEnabled;
  const [selectedExperimentId, setSelectedExperimentId] = useState(experiments[0]?.experimentId ?? '');
  const [runners, setRunners] = useState<LabRunnerSummary[]>([]);
  const [runnerLoadStatus, setRunnerLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    effectiveRunnerUiEnabled ? 'loading' : 'idle',
  );
  const [runnerLoadError, setRunnerLoadError] = useState('');
  const [selectedRunnerId, setSelectedRunnerId] = useState('');
  const [inputKind, setInputKind] = useState<LabRunnerInputKind>('corpus-case');
  const [inputLatex, setInputLatex] = useState('');
  const [corpusCaseId, setCorpusCaseId] = useState('');
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [runError, setRunError] = useState('');
  const [runResult, setRunResult] = useState<LabRunResult | null>(null);

  const selectedExperiment = useMemo(
    () =>
      experiments.find((experiment) => experiment.experimentId === selectedExperimentId)
      ?? experiments[0],
    [experiments, selectedExperimentId],
  );
  const selectedRunner = useMemo(
    () => runners.find((runner) => runner.runnerId === selectedRunnerId) ?? runners[0],
    [runners, selectedRunnerId],
  );
  const effectiveInputKind = selectedRunner && canUseLabInputKind(selectedRunner, inputKind)
    ? inputKind
    : selectedRunner?.defaultInputKind ?? inputKind;
  const effectiveCorpusCaseId = corpusCaseId || selectedRunner?.corpusCases?.[0]?.id || '';
  const selectedCorpusCase = selectedRunner?.corpusCases?.find(
    (corpusCase) => corpusCase.id === effectiveCorpusCaseId,
  );
  const effectiveInputLatex =
    inputLatex || defaultLatexForLabRunner(selectedRunner, effectiveInputKind);

  useEffect(() => {
    if (!effectiveRunnerUiEnabled) {
      return;
    }

    let cancelled = false;

    runnerClient.listRunners()
      .then((nextRunners) => {
        if (cancelled) {
          return;
        }
        const nextRunner = nextRunners[0];
        setRunners(nextRunners);
        if (nextRunner) {
          const nextInputKind = nextRunner.defaultInputKind;
          setSelectedRunnerId(nextRunner.runnerId);
          setSelectedExperimentId(nextRunner.experimentId);
          setInputKind(nextInputKind);
          setInputLatex(defaultLatexForLabRunner(nextRunner, nextInputKind));
          setCorpusCaseId(nextRunner.corpusCases?.[0]?.id ?? '');
        }
        setRunnerLoadStatus('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setRunnerLoadStatus('error');
        setRunnerLoadError(error instanceof Error ? error.message : 'Labs runner bridge is unavailable.');
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveRunnerUiEnabled, runnerClient]);

  function resetRunState() {
    setRunResult(null);
    setRunError('');
    setRunStatus('idle');
  }

  function selectRunner(nextRunnerId: string) {
    const nextRunner = runners.find((runner) => runner.runnerId === nextRunnerId);
    if (!nextRunner) {
      return;
    }

    const nextInputKind = nextRunner.defaultInputKind;
    setSelectedRunnerId(nextRunner.runnerId);
    setSelectedExperimentId(nextRunner.experimentId);
    setInputKind(nextInputKind);
    setInputLatex(defaultLatexForLabRunner(nextRunner, nextInputKind));
    setCorpusCaseId(nextRunner.corpusCases?.[0]?.id ?? '');
    resetRunState();
  }

  function selectInputKind(nextInputKind: LabRunnerInputKind) {
    if (!canUseLabInputKind(selectedRunner, nextInputKind)) {
      return;
    }

    setInputKind(nextInputKind);
    setInputLatex(defaultLatexForLabRunner(selectedRunner, nextInputKind));
    setCorpusCaseId(selectedRunner?.corpusCases?.[0]?.id ?? '');
    resetRunState();
  }

  function selectCorpusCase(nextCorpusCaseId: string) {
    const nextCase = selectedRunner?.corpusCases?.find(
      (corpusCase) => corpusCase.id === nextCorpusCaseId,
    );
    setCorpusCaseId(nextCorpusCaseId);
    setInputLatex(nextCase?.latex ?? '');
    resetRunState();
  }

  function updateInputLatex(nextLatex: string) {
    setInputLatex(nextLatex);
    resetRunState();
  }

  async function runSelectedExperiment() {
    if (!selectedRunner) {
      return;
    }

    setRunStatus('running');
    setRunError('');
    setRunResult(null);

    try {
      const result = await runnerClient.runExperiment({
        runnerId: selectedRunner.runnerId,
        inputKind: effectiveInputKind,
        latex: effectiveInputKind === 'corpus-case' ? undefined : effectiveInputLatex,
        corpusCaseId: effectiveInputKind === 'corpus-case' ? effectiveCorpusCaseId : undefined,
      });
      setRunResult(result);
      setRunStatus(result.status === 'error' ? 'error' : 'success');
      setRunError(result.status === 'error' ? result.outputText ?? 'Experiment returned an error.' : '');
    } catch (error) {
      setRunStatus('error');
      setRunError(error instanceof Error ? error.message : 'Labs runner request failed.');
    }
  }

  return {
    experiments,
    runnerUiEnabled: effectiveRunnerUiEnabled,
    selectedExperiment,
    selectedExperimentId,
    setSelectedExperimentId,
    runners,
    runnerLoadStatus,
    runnerLoadError,
    selectedRunner,
    inputKind,
    effectiveInputKind,
    effectiveInputLatex,
    effectiveCorpusCaseId,
    selectedCorpusCase,
    runStatus,
    runError,
    runResult,
    selectRunner,
    selectInputKind,
    selectCorpusCase,
    updateInputLatex,
    runSelectedExperiment,
  };
}
