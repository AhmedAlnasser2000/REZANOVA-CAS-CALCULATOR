import {
  LAB_LEVEL_LABELS,
  LAB_STATUS_LABELS,
  LABS_CATALOG_DIGEST,
  LABS_EXPERIMENTS,
  type LabExperimentSummary,
} from '../lib/labs/catalog';
import type {
  LabRunnerInputKind,
} from '../lib/labs/runner-types';
import {
  canUseLabInputKind,
  LAB_INPUT_KIND_LABELS,
  LAB_INPUT_KINDS,
  type LabsRunnerClient,
  type LabsRuntime,
  useLabsRuntime,
} from '../app/runtime/useLabsRuntime';
import { MathEditor } from './MathEditor';
import { MathStatic } from './MathStatic';

type LabsPanelProps = {
  experiments?: readonly LabExperimentSummary[];
  runnerUiEnabled?: boolean;
  runnerClient?: LabsRunnerClient;
  runtime?: LabsRuntime;
};

function stringifyRawResult(raw: unknown) {
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

export function LabsPanel({
  experiments = LABS_EXPERIMENTS,
  runnerUiEnabled,
  runnerClient,
  runtime,
}: LabsPanelProps) {
  if (runtime) {
    return <LabsPanelContent runtime={runtime} />;
  }

  return (
    <LabsPanelWithRuntime
      experiments={experiments}
      runnerUiEnabled={runnerUiEnabled}
      runnerClient={runnerClient}
    />
  );
}

function LabsPanelWithRuntime({
  experiments,
  runnerUiEnabled,
  runnerClient,
}: Required<Pick<LabsPanelProps, 'experiments'>> & Pick<LabsPanelProps, 'runnerUiEnabled' | 'runnerClient'>) {
  const runtime = useLabsRuntime({ experiments, runnerUiEnabled, runnerClient });
  return <LabsPanelContent runtime={runtime} />;
}

function LabsPanelContent({ runtime }: { runtime: LabsRuntime }) {
  const {
    effectiveCorpusCaseId,
    effectiveInputKind,
    effectiveInputLatex,
    experiments: runtimeExperiments,
    runnerLoadError,
    runnerLoadStatus,
    runnerUiEnabled: effectiveRunnerUiEnabled,
    runError,
    runResult,
    runners,
    runSelectedExperiment,
    runStatus,
    selectCorpusCase,
    selectInputKind,
    selectRunner,
    selectedCorpusCase,
    selectedExperiment,
    selectedRunner,
    setSelectedExperimentId,
    updateInputLatex,
  } = runtime;

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
              {effectiveRunnerUiEnabled ? 'Interactive console' : 'Read-only catalog'}
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
          {runtimeExperiments.map((experiment) => (
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

      {effectiveRunnerUiEnabled ? (
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
                      selectRunner(nextRunner.runnerId);
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
                  {LAB_INPUT_KINDS.map((kind: LabRunnerInputKind) => (
                    <button
                      key={kind}
                      type="button"
                      className={`labs-input-kind ${effectiveInputKind === kind ? 'is-selected' : ''}`}
                      disabled={!canUseLabInputKind(selectedRunner, kind)}
                      onClick={() => selectInputKind(kind)}
                    >
                      {LAB_INPUT_KIND_LABELS[kind]}
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
                      selectCorpusCase(event.target.value);
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
                  <span className="labs-editor-label">{LAB_INPUT_KIND_LABELS[effectiveInputKind]} input</span>
                  <MathEditor
                    value={effectiveInputKind === 'corpus-case' ? selectedCorpusCase?.latex ?? effectiveInputLatex : effectiveInputLatex}
                    onChange={updateInputLatex}
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
                  onClick={runSelectedExperiment}
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
                            {row.inputLatex ? (
                              <MathStatic
                                className="labs-comparison-math"
                                latex={row.inputLatex}
                                block={false}
                              />
                            ) : null}
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
