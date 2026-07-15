import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SignedNumberDraftInput } from '../../../components/SignedNumberDraftInput';
import type {
  FrequencyTable,
  MeanInferenceState,
  MeanTestAlternative,
  StatisticsWorkingSource,
} from '../../../types/calculator';

type StatisticsInferencePanelProps = {
  state: MeanInferenceState;
  setState: Dispatch<SetStateAction<MeanInferenceState>>;
  workingSource: StatisticsWorkingSource;
  onSwitchSource: (source: StatisticsWorkingSource) => void;
  datasetText: string;
  datasetValueCount: number;
  datasetRef: RefObject<HTMLTextAreaElement | null>;
  onUpdateDataset: (text: string) => void;
  frequencyTable: FrequencyTable;
  filledFrequencyRowCount: number;
  frequencyValueRef: RefObject<HTMLInputElement | null>;
  onUpdateFrequencyRow: (index: number, field: 'value' | 'frequency', value: string) => void;
  onRemoveFrequencyRow: (index: number) => void;
  onAddFrequencyRow: () => void;
  sourceSyncSummary: string;
  onImportDatasetIntoFrequencyTable: () => void;
  onExpandTableToDataset: () => void;
  levelRef: RefObject<HTMLInputElement | null>;
  expression: string;
  onEditExpression: () => void;
  onCopyExpression: () => void;
};

const TEST_ALTERNATIVES: Array<{ value: MeanTestAlternative; label: string }> = [
  { value: 'twoSided', label: 'Two-sided (mu != mu0)' },
  { value: 'less', label: 'Less than (mu < mu0)' },
  { value: 'greater', label: 'Greater than (mu > mu0)' },
];

export function StatisticsInferencePanel({
  state,
  setState,
  workingSource,
  onSwitchSource,
  datasetText,
  datasetValueCount,
  datasetRef,
  onUpdateDataset,
  frequencyTable,
  filledFrequencyRowCount,
  frequencyValueRef,
  onUpdateFrequencyRow,
  onRemoveFrequencyRow,
  onAddFrequencyRow,
  sourceSyncSummary,
  onImportDatasetIntoFrequencyTable,
  onExpandTableToDataset,
  levelRef,
  expression,
  onEditExpression,
  onCopyExpression,
}: StatisticsInferencePanelProps) {
  return (
    <div className="statistics-inference-layout">
      <div className="editor-card statistics-inference-form">
        <div className="card-title-row">
          <strong>One-sample mean</strong>
          <span className="equation-badge">
            {workingSource === 'dataset'
              ? `${datasetValueCount} values`
              : `${filledFrequencyRowCount} rows`}
          </span>
        </div>

        <div className="statistics-control-bar">
          <div className="statistics-control-group">
            <span id="statistics-inference-goal-label">Goal</span>
            <div
              className="statistics-segmented-control"
              role="radiogroup"
              aria-labelledby="statistics-inference-goal-label"
            >
              <button
                type="button"
                role="radio"
                aria-checked={state.mode === 'ci'}
                className={state.mode === 'ci' ? 'is-active' : ''}
                onClick={() => setState((current) => ({ ...current, mode: 'ci' }))}
              >
                Confidence interval
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={state.mode === 'test'}
                className={state.mode === 'test' ? 'is-active' : ''}
                onClick={() => setState((current) => ({ ...current, mode: 'test' }))}
              >
                Hypothesis test
              </button>
            </div>
          </div>
          <div className="statistics-control-group">
            <span id="statistics-inference-source-label">Data source</span>
            <div
              className="statistics-segmented-control"
              role="radiogroup"
              aria-labelledby="statistics-inference-source-label"
            >
              <button
                type="button"
                role="radio"
                aria-checked={workingSource === 'dataset'}
                className={workingSource === 'dataset' ? 'is-active' : ''}
                onClick={() => onSwitchSource('dataset')}
              >
                List
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={workingSource === 'frequencyTable'}
                className={workingSource === 'frequencyTable' ? 'is-active' : ''}
                onClick={() => onSwitchSource('frequencyTable')}
              >
                Frequency table
              </button>
            </div>
          </div>
        </div>

        <div className="statistics-input-grid statistics-inference-options">
          <label>
            <span>Confidence level</span>
            <SignedNumberDraftInput
              ref={levelRef}
              ariaLabel="Mean inference confidence level"
              value={state.level}
              onValueChange={(level) => setState((current) => ({ ...current, level }))}
              className="statistics-cell-input"
            />
          </label>
          {state.mode === 'test' ? (
            <label>
              <span>Null mean (mu0)</span>
              <SignedNumberDraftInput
                ariaLabel="Mean inference null mean"
                value={state.mu0}
                onValueChange={(mu0) => setState((current) => ({ ...current, mu0 }))}
                className="statistics-cell-input"
              />
            </label>
          ) : null}
          {state.mode === 'test' ? (
            <label>
              <span>Alternative</span>
              <select
                aria-label="Mean test alternative"
                value={state.alternative}
                onChange={(event) => setState((current) => ({
                  ...current,
                  alternative: event.target.value as MeanTestAlternative,
                }))}
              >
                {TEST_ALTERNATIVES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <p className="statistics-source-status">{sourceSyncSummary}</p>

        {workingSource === 'dataset' ? (
          <label className="statistics-text-block">
            <span>Sample values</span>
            <textarea
              ref={datasetRef}
              aria-label="Mean inference sample values"
              className="statistics-textarea"
              value={datasetText}
              onChange={(event) => onUpdateDataset(event.target.value)}
              placeholder="12, 15, 15, 18, 20"
            />
          </label>
        ) : (
          <div>
            <div className="statistics-table-labels" aria-hidden="true">
              <span>Value</span>
              <span>Freq</span>
              <span>Action</span>
            </div>
            <div className="statistics-edit-table">
              {frequencyTable.rows.map((row, index) => (
                <div key={`statistics-inference-frequency-${index}`} className="statistics-edit-row">
                  <SignedNumberDraftInput
                    ref={index === 0 ? frequencyValueRef : undefined}
                    ariaLabel={`Inference frequency row ${index + 1} value`}
                    className="statistics-cell-input"
                    value={row.value}
                    onValueChange={(value) => onUpdateFrequencyRow(index, 'value', value)}
                  />
                  <SignedNumberDraftInput
                    ariaLabel={`Inference frequency row ${index + 1} count`}
                    className="statistics-cell-input"
                    value={row.frequency}
                    onValueChange={(value) => onUpdateFrequencyRow(index, 'frequency', value)}
                  />
                  <button type="button" onClick={() => onRemoveFrequencyRow(index)}>Remove</button>
                </div>
              ))}
            </div>
            <div className="display-card-actions">
              <button type="button" onClick={onAddFrequencyRow}>Add row</button>
            </div>
          </div>
        )}

        <div className="display-card-actions">
          <button type="button" onClick={onImportDatasetIntoFrequencyTable}>Build table from list</button>
          <button type="button" onClick={onExpandTableToDataset}>Expand table to list</button>
        </div>
      </div>

      <div className="editor-card statistics-request-card">
        <div className="card-title-row">
          <strong>Generated request</strong>
          <span className="equation-subtitle">Student t procedure</span>
        </div>
        <code className="statistics-request-preview">{expression}</code>
        <div className="display-card-actions">
          <button type="button" onClick={onEditExpression}>Edit expression</button>
          <button type="button" onClick={onCopyExpression}>Copy expression</button>
        </div>
      </div>
    </div>
  );
}
