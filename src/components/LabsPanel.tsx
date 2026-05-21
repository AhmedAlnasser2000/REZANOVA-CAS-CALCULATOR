import { useEffect, useMemo, useState } from 'react';
import {
  LAB_LEVEL_LABELS,
  LAB_STATUS_LABELS,
  LABS_CATALOG_DIGEST,
  LABS_EXPERIMENTS,
  type LabExperimentSummary,
} from '../lib/labs/catalog';
import {
  fetchLabRunners,
  labsRunnerUiEnabled as defaultLabsRunnerUiEnabled,
  runLabExperiment,
} from '../lib/labs/runner-client';
import type {
  LabRunRequest,
  LabRunResult,
  LabRunnerInputKind,
  LabRunnerSummary,
} from '../lib/labs/runner-types';
import { MathEditor } from './MathEditor';
import { MathStatic } from './MathStatic';

type LabsPanelProps = {
  experiments?: readonly LabExperimentSummary[];
  runnerUiEnabled?: boolean;
  runnerClient?: {
    listRunners: () => Promise<LabRunnerSummary[]>;
    runExperiment: (request: LabRunRequest) => Promise<LabRunResult>;
  };
};

const INPUT_KIND_LABELS: Record<LabRunnerInputKind, string> = {
  equation: 'Equation',
  expression: 'Expression',
  'corpus-case': 'Corpus case',
};

const ALL_INPUT_KINDS: LabRunnerInputKind[] = ['equation', 'expression', 'corpus-case'];

const defaultRunnerClient = {
  listRunners: () => fetchLabRunners(),
  runExperiment: (request: LabRunRequest) => runLabExperiment(request),
};

function canUseInputKind(runner: LabRunnerSummary | undefined, inputKind: LabRunnerInputKind) {
  return Boolean(runner?.acceptedInputKinds.includes(inputKind));
}

function defaultLatexForRunner(runner: LabRunnerSummary | undefined, inputKind: LabRunnerInputKind) {
  if (!runner) {
    return '';
  }
  if (inputKind === 'corpus-case') {
    return runner.corpusCases?.[0]?.latex ?? runner.defaultLatex ?? '';
  }

  return runner.defaultLatex ?? '';
}

function stringifyRawResult(raw: unknown) {
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

export function LabsPanel({
  experiments = LABS_EXPERIMENTS,
  runnerUiEnabled = defaultLabsRunnerUiEnabled(),
  runnerClient = defaultRunnerClient,
}: LabsPanelProps) {
  const [selectedExperimentId, setSelectedExperimentId] = useState(experiments[0]?.experimentId ?? '');
  const [runners, setRunners] = useState<LabRunnerSummary[]>([]);
  const [runnerLoadStatus, setRunnerLoadStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    runnerUiEnabled ? 'loading' : 'idle',
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
  const effectiveInputKind = selectedRunner && canUseInputKind(selectedRunner, inputKind)
    ? inputKind
    : selectedRunner?.defaultInputKind ?? inputKind;
  const effectiveCorpusCaseId = corpusCaseId || selectedRunner?.corpusCases?.[0]?.id || '';
  const selectedCorpusCase = selectedRunner?.corpusCases?.find(
    (corpusCase) => corpusCase.id === effectiveCorpusCaseId,
  );
  const effectiveInputLatex = inputLatex || defaultLatexForRunner(selectedRunner, effectiveInputKind);

  useEffect(() => {
    if (!runnerUiEnabled) {
      return;
    }

    let cancelled = false;
    runnerClient.listRunners()
      .then((nextRunners) => {
        if (cancelled) {
          return;
        }
        setRunners(nextRunners);
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
  }, [runnerClient, runnerUiEnabled]);

  function handleInputKindChange(nextInputKind: LabRunnerInputKind) {
    if (!canUseInputKind(selectedRunner, nextInputKind)) {
      return;
    }

    setInputKind(nextInputKind);
    setInputLatex(defaultLatexForRunner(selectedRunner, nextInputKind));
    setCorpusCaseId(selectedRunner?.corpusCases?.[0]?.id ?? '');
    setRunResult(null);
    setRunError('');
    setRunStatus('idle');
  }

  async function handleRunExperiment() {
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

  return (
    <section className="mode-panel labs-panel" data-testid="labs-panel">
      <div className="equation-panel-header labs-panel-header">
        <div className="equation-panel-copy">
          <div className="equation-breadcrumbs">
            <span className="equation-breadcrumb">Incubation</span>
            <span className="equation-breadcrumb">Labs</span>
          </div>
          <div className="card-title-row">
            <strong>Labs</strong>
            <span className="labs-chip labs-chip--neutral">Developer only</span>
            <span className="labs-chip labs-chip--gold">
              {runnerUiEnabled ? 'Interactive console' : 'Read-only catalog'}
            </span>
          </div>
          <p className="equation-hint">
            This view reads a committed catalog snapshot generated from Playground records.
            Interactive runners are dev-only and do not make Playground product behavior.
          </p>
        </div>
      </div>

      <div className="editor-card labs-boundary-card">
        <div className="card-title-row">
          <strong>Boundary</strong>
          <span className="labs-chip labs-chip--neutral">One-way</span>
        </div>
        <p className="equation-hint">
          Stable app code imports only `src/lib/labs/*`. Catalog paths below are inert text links for humans; runner execution is available only through the local dev bridge.
        </p>
        <p className="equation-hint">Catalog digest: {LABS_CATALOG_DIGEST.slice(0, 12)}</p>
      </div>

      <div className="labs-layout">
        <div className="launcher-list labs-list" aria-label="Lab experiments">
          {experiments.map((experiment) => (
            <button
              key={experiment.experimentId}
              type="button"
              className={`launcher-entry labs-entry ${
                experiment.experimentId === selectedExperiment?.experimentId ? 'is-selected' : ''
              }`}
              onClick={() => setSelectedExperimentId(experiment.experimentId)}
            >
              <span className="labs-entry-content">
                <strong>{experiment.title}</strong>
                <small>{experiment.experimentId}</small>
              </span>
              <span className={`labs-status-chip labs-status-chip--${experiment.status}`}>
                {LAB_STATUS_LABELS[experiment.status]}
              </span>
            </button>
          ))}
        </div>

        {selectedExperiment ? (
          <article className="editor-card labs-detail-card" data-testid="labs-detail">
            <div className="card-title-row">
              <strong className="labs-detail-title">{selectedExperiment.title}</strong>
              <span className={`labs-status-chip labs-status-chip--${selectedExperiment.status}`}>
                {LAB_STATUS_LABELS[selectedExperiment.status]}
              </span>
              <span className="labs-level-chip">{LAB_LEVEL_LABELS[selectedExperiment.currentLevel]}</span>
            </div>
            <dl className="labs-fact-grid">
              <div>
                <dt>Experiment ID</dt>
                <dd>{selectedExperiment.experimentId}</dd>
              </div>
              <div>
                <dt>Lane</dt>
                <dd>{selectedExperiment.laneTopic}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{selectedExperiment.owner}</dd>
              </div>
              <div>
                <dt>Last Review</dt>
                <dd>{selectedExperiment.lastReviewed}</dd>
              </div>
              <div>
                <dt>Next Review</dt>
                <dd>{selectedExperiment.nextReview}</dd>
              </div>
              <div>
                <dt>Candidate Stable Home</dt>
                <dd>{selectedExperiment.candidateStableHome}</dd>
              </div>
              <div>
                <dt>Record Path</dt>
                <dd>{selectedExperiment.recordPath}</dd>
              </div>
              <div>
                <dt>Manifest Path</dt>
                <dd>{selectedExperiment.manifestPath}</dd>
              </div>
            </dl>
            <div className="labs-next-step">
              <strong>Next Step</strong>
              <p>{selectedExperiment.nextStep}</p>
            </div>
          </article>
        ) : (
          <div className="editor-card labs-detail-card" data-testid="labs-detail-empty">
            <strong>No lab experiments in the generated catalog.</strong>
          </div>
        )}
      </div>

      {runnerUiEnabled ? (
        <section className="editor-card labs-runner-card" data-testid="labs-runner-panel">
          <div className="card-title-row">
            <strong>Interactive Runner</strong>
            <span className="labs-chip labs-chip--danger">Experimental</span>
            <span className="labs-chip labs-chip--neutral">No history mixing</span>
          </div>

          {runnerLoadStatus === 'error' ? (
            <div className="labs-runner-message" role="status">
              Runner bridge unavailable: {runnerLoadError}
            </div>
          ) : null}

          {runnerLoadStatus === 'loading' ? (
            <div className="labs-runner-message" role="status">Loading dev-only runners...</div>
          ) : null}

          {runnerLoadStatus === 'ready' && selectedRunner ? (
            <>
              <div className="labs-runner-controls">
                <label>
                  Runner
                  <select
                    value={selectedRunner.runnerId}
                    onChange={(event) => {
                      const nextRunner = runners.find((runner) => runner.runnerId === event.target.value);
                      if (!nextRunner) {
                        return;
                      }
                      const nextInputKind = nextRunner.defaultInputKind;
                      setSelectedRunnerId(nextRunner.runnerId);
                      setSelectedExperimentId(nextRunner.experimentId);
                      setInputKind(nextInputKind);
                      setInputLatex(defaultLatexForRunner(nextRunner, nextInputKind));
                      setCorpusCaseId(nextRunner.corpusCases?.[0]?.id ?? '');
                      setRunStatus('idle');
                      setRunError('');
                      setRunResult(null);
                    }}
                  >
                    {runners.map((runner) => (
                      <option key={runner.runnerId} value={runner.runnerId}>
                        {runner.title}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="labs-input-kind-group" aria-label="Labs input kind">
                  {ALL_INPUT_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className={`labs-input-kind ${effectiveInputKind === kind ? 'is-selected' : ''}`}
                      disabled={!canUseInputKind(selectedRunner, kind)}
                      onClick={() => handleInputKindChange(kind)}
                    >
                      {INPUT_KIND_LABELS[kind]}
                    </button>
                  ))}
                </div>
              </div>

              <p className="equation-hint">{selectedRunner.description}</p>

              {effectiveInputKind === 'corpus-case' ? (
                <label className="labs-corpus-picker">
                  Corpus case
                  <select
                    value={effectiveCorpusCaseId}
                    onChange={(event) => {
                      const nextCorpusCaseId = event.target.value;
                      const nextCase = selectedRunner.corpusCases?.find(
                        (corpusCase) => corpusCase.id === nextCorpusCaseId,
                      );
                      setCorpusCaseId(nextCorpusCaseId);
                      setInputLatex(nextCase?.latex ?? '');
                      setRunResult(null);
                    }}
                  >
                    {selectedRunner.corpusCases?.map((corpusCase) => (
                      <option key={corpusCase.id} value={corpusCase.id}>
                        {corpusCase.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="labs-editor-grid">
                <div className="labs-editor-shell">
                  <span className="labs-editor-label">{INPUT_KIND_LABELS[effectiveInputKind]} input</span>
                  <MathEditor
                    value={effectiveInputKind === 'corpus-case' ? selectedCorpusCase?.latex ?? effectiveInputLatex : effectiveInputLatex}
                    onChange={setInputLatex}
                    className="secondary-mathfield labs-mathfield"
                    dataTestId="labs-runner-editor"
                    readOnly={effectiveInputKind === 'corpus-case'}
                    placeholder="Type a Labs experiment input"
                  />
                </div>
                <button
                  type="button"
                  className="action-button primary labs-run-button"
                  disabled={runStatus === 'running'}
                  onClick={handleRunExperiment}
                >
                  {runStatus === 'running' ? 'Running...' : 'Run Experiment'}
                </button>
              </div>

              {runError ? (
                <div className="labs-runner-message labs-runner-message--error" role="alert">
                  {runError}
                </div>
              ) : null}

              {runResult ? (
                <div className="labs-result" data-testid="labs-runner-result">
                  <div className="card-title-row">
                    <strong>{runResult.title}</strong>
                    <span className={`labs-status-chip labs-status-chip--${runResult.status === 'success' ? 'active' : 'paused'}`}>
                      {runResult.status === 'success' ? 'Success' : 'Error'}
                    </span>
                  </div>
                  <dl className="labs-fact-grid labs-summary-grid">
                    {runResult.summary.map((item) => (
                      <div key={`${item.label}:${item.value}`}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {runResult.outputLatex ? (
                    <MathStatic className="result-math labs-output-math" latex={runResult.outputLatex} />
                  ) : null}
                  {runResult.outputText ? (
                    <p className="equation-hint">{runResult.outputText}</p>
                  ) : null}
                  {runResult.comparisonRows.length > 0 ? (
                    <div className="labs-comparison-table" role="table" aria-label="Labs comparison rows">
                      <div className="labs-comparison-row labs-comparison-header" role="row">
                        <span>Case</span>
                        <span>Classification</span>
                        <span>Stages</span>
                        <span>Attempts</span>
                      </div>
                      {runResult.comparisonRows.slice(0, 24).map((row) => (
                        <div key={`${row.label}:${row.classification ?? ''}`} className="labs-comparison-row" role="row">
                          <span>
                            <strong>{row.label}</strong>
                            {row.inputLatex ? <small>{row.inputLatex}</small> : null}
                          </span>
                          <span>{row.classification ?? '-'}</span>
                          <span>{row.baselineWinningStage ?? '-'} / {row.alternateWinningStage ?? '-'}</span>
                          <span>{row.baselineAttemptCount ?? '-'} / {row.alternateAttemptCount ?? '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {runResult.warnings.length > 0 ? (
                    <div className="labs-runner-message">
                      {runResult.warnings.map((warning) => (
                        <p key={warning}>{warning}</p>
                      ))}
                    </div>
                  ) : null}
                  <details className="labs-raw-details">
                    <summary>Raw runner envelope</summary>
                    <pre>{stringifyRawResult(runResult.raw)}</pre>
                  </details>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
