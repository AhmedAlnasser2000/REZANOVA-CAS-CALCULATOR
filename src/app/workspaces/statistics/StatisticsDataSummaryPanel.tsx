import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SignedNumberDraftInput } from '../../../components/SignedNumberDraftInput';
import type {
  FrequencyTable,
  StatisticsDataSummaryState,
  StatisticsScreen,
  StatisticsWorkingSource,
} from '../../../types/calculator';

type StatisticsDataSummaryPanelProps = {
  screen: StatisticsScreen;
  state: StatisticsDataSummaryState;
  setState: Dispatch<SetStateAction<StatisticsDataSummaryState>>;
  workingSource: StatisticsWorkingSource;
  onSwitchSource: (source: StatisticsWorkingSource) => void;
  onOpenScreen: (screen: StatisticsScreen) => void;
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
  onUseInStatistics: () => void;
  workbenchExpression: string;
  onCopyWorkbenchExpression: () => void;
};

function StatisticsDataSummaryPanel({
  screen,
  state,
  setState,
  workingSource,
  onSwitchSource,
  onOpenScreen,
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
  onUseInStatistics,
  workbenchExpression,
  onCopyWorkbenchExpression,
}: StatisticsDataSummaryPanelProps) {
  const activeAnalysis = screen === 'frequency' ? 'frequency' : 'descriptive';
  return (
    <div className="statistics-data-summary">
      <div className="statistics-control-bar">
        <div className="statistics-control-group">
          <span>Analysis</span>
          <div className="statistics-segmented-control" role="radiogroup" aria-label="Data analysis">
            <button
              type="button"
              role="radio"
              aria-checked={activeAnalysis === 'descriptive'}
              className={activeAnalysis === 'descriptive' ? 'is-active' : ''}
              onClick={() => onOpenScreen('descriptive')}
            >
              Summary
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={activeAnalysis === 'frequency'}
              className={activeAnalysis === 'frequency' ? 'is-active' : ''}
              onClick={() => onOpenScreen('frequency')}
            >
              Frequency counts
            </button>
          </div>
        </div>
        <div className="statistics-control-group">
          <span>Representation</span>
          <div className="statistics-segmented-control" role="radiogroup" aria-label="Data representation">
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

      <p className="statistics-source-status" role="status">{sourceSyncSummary}</p>

      <div className="grid-two statistics-data-grid">
        <div className="editor-card statistics-data-editor">
          <div className="card-title-row">
            <strong>{workingSource === 'dataset' ? 'List' : 'Frequency table'}</strong>
            <span className="equation-badge">
              {workingSource === 'dataset'
                ? `${datasetValueCount} values`
                : `${filledFrequencyRowCount} rows`}
            </span>
          </div>
          {workingSource === 'dataset' ? (
            <label className="statistics-text-block">
              <span>Values</span>
              <textarea
                ref={datasetRef}
                className="statistics-textarea"
                value={datasetText}
                onChange={(event) => onUpdateDataset(event.target.value)}
                placeholder="12, 15, 15, 18, 20"
              />
            </label>
          ) : (
            <>
              <div className="statistics-table-labels" aria-hidden="true">
                <span>Value</span>
                <span>Frequency</span>
                <span>Action</span>
              </div>
              <div className="statistics-edit-table">
                {frequencyTable.rows.map((row, index) => (
                  <div key={`statistics-frequency-${index}`} className="statistics-edit-row">
                    <SignedNumberDraftInput
                      ref={index === 0 ? frequencyValueRef : undefined}
                      ariaLabel={`Value row ${index + 1}`}
                      className="statistics-cell-input"
                      value={row.value}
                      onValueChange={(value) => onUpdateFrequencyRow(index, 'value', value)}
                    />
                    <SignedNumberDraftInput
                      ariaLabel={`Frequency row ${index + 1}`}
                      className="statistics-cell-input"
                      value={row.frequency}
                      onValueChange={(value) => onUpdateFrequencyRow(index, 'frequency', value)}
                    />
                    <button type="button" onClick={() => onRemoveFrequencyRow(index)}>Remove</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={onAddFrequencyRow}>Add row</button>
            </>
          )}
          <div className="display-card-actions">
            {workingSource === 'dataset' ? (
              <button type="button" onClick={onImportDatasetIntoFrequencyTable}>
                Build frequency table
              </button>
            ) : (
              <button type="button" onClick={onExpandTableToDataset}>
                Expand to list
              </button>
            )}
          </div>
        </div>

        <div className="editor-card statistics-summary-options">
          <div className="card-title-row">
            <strong>{activeAnalysis === 'descriptive' ? 'Summary options' : 'Frequency output'}</strong>
            <span className="equation-subtitle">Generated request</span>
          </div>
          {activeAnalysis === 'descriptive' ? (
            <>
              <label>
                <span>Quartile method</span>
                <select
                  value={state.quartiles}
                  onChange={(event) => setState((current) => ({
                    ...current,
                    quartiles: event.target.value as StatisticsDataSummaryState['quartiles'],
                  }))}
                >
                  <option value="halves">Median of halves</option>
                  <option value="linear">Linear (Type 7)</option>
                </select>
              </label>
              <label>
                <span>Spread context</span>
                <select
                  value={state.context}
                  onChange={(event) => setState((current) => ({
                    ...current,
                    context: event.target.value as StatisticsDataSummaryState['context'],
                  }))}
                >
                  <option value="compare">Compare both</option>
                  <option value="sample">Sample emphasis</option>
                  <option value="population">Population emphasis</option>
                </select>
              </label>
            </>
          ) : (
            <p className="equation-hint">
              Evaluate compact value-frequency counts without expanding the observations.
            </p>
          )}
          <code className="statistics-request-preview">{workbenchExpression}</code>
          <div className="display-card-actions">
            <button type="button" onClick={onUseInStatistics}>Edit expression</button>
            <button type="button" onClick={onCopyWorkbenchExpression}>Copy expression</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { StatisticsDataSummaryPanel };
