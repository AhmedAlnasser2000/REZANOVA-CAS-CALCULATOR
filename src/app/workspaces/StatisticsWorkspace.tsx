import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SignedNumberDraftInput } from '../../components/SignedNumberDraftInput';
import type {
  BinomialState,
  FrequencyTable,
  MeanInferenceState,
  NormalState,
  PoissonState,
  StatisticsRelationshipsState,
  StatisticsScreen,
  StatisticsDataSummaryState,
  StatisticsSection,
  StatisticsWorkingSource,
  StatsDataset,
} from '../../types/calculator';
import { StatisticsDataSummaryPanel } from './statistics/StatisticsDataSummaryPanel';
import { StatisticsProbabilityPanel } from './statistics/StatisticsProbabilityPanel';
import { StatisticsRelationshipsPanel } from './statistics/StatisticsRelationshipsPanel';

type StatisticsRouteMetaLike = {
  breadcrumb: string[];
  label: string;
  description: string;
};

type StatisticsMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: StatisticsScreen;
};

const SECTION_TOOLS: Record<StatisticsSection, Array<{
  label: string;
  screen: StatisticsScreen;
}>> = {
  dataSummary: [
    { label: 'Data Entry', screen: 'dataEntry' },
    { label: 'Descriptive', screen: 'descriptive' },
    { label: 'Frequency', screen: 'frequency' },
  ],
  probability: [
    { label: 'Binomial', screen: 'binomial' },
    { label: 'Normal', screen: 'normal' },
    { label: 'Poisson', screen: 'poisson' },
  ],
  inference: [{ label: 'Mean', screen: 'meanInference' }],
  relationships: [
    { label: 'Regression', screen: 'regression' },
    { label: 'Correlation', screen: 'correlation' },
  ],
};

type StatisticsWorkspaceProps = {
  routeMeta: StatisticsRouteMetaLike | null;
  screen: StatisticsScreen;
  activeSection: StatisticsSection;
  resultIsStale: boolean;
  onOpenSection: (section: StatisticsSection) => void;
  isMenuOpen: boolean;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: StatisticsMenuEntryLike[];
  currentMenuIndex: number;
  menuFooterText: string;
  onOpenScreen: (screen: StatisticsScreen) => void;
  onHoverMenuIndex: (screen: 'home' | 'probabilityHome' | 'inferenceHome', index: number) => void;
  onOpenToolGuide: () => void;
  onOpenModeGuide: () => void;
  dataset: StatsDataset;
  datasetText: string;
  datasetRef: RefObject<HTMLTextAreaElement | null>;
  onUpdateDataset: (text: string) => void;
  filledFrequencyRowCount: number;
  sourceSyncSummary: string;
  workingSource: StatisticsWorkingSource;
  onSwitchSource: (source: StatisticsWorkingSource) => void;
  onImportDatasetIntoFrequencyTable: () => void;
  onExpandTableToDataset: () => void;
  onUseInStatistics: () => void;
  workbenchExpression: string;
  onCopyWorkbenchExpression: () => void;
  frequencyTable: FrequencyTable;
  dataSummaryState: StatisticsDataSummaryState;
  setDataSummaryState: Dispatch<SetStateAction<StatisticsDataSummaryState>>;
  frequencyValueRef: RefObject<HTMLInputElement | null>;
  onUpdateFrequencyRow: (index: number, field: 'value' | 'frequency', value: string) => void;
  onRemoveFrequencyRow: (index: number) => void;
  onAddFrequencyRow: () => void;
  binomialState: BinomialState;
  setBinomialState: Dispatch<SetStateAction<BinomialState>>;
  normalState: NormalState;
  setNormalState: Dispatch<SetStateAction<NormalState>>;
  poissonState: PoissonState;
  setPoissonState: Dispatch<SetStateAction<PoissonState>>;
  meanInferenceState: MeanInferenceState;
  setMeanInferenceState: Dispatch<SetStateAction<MeanInferenceState>>;
  statisticsBinomialNRef: RefObject<HTMLInputElement | null>;
  statisticsNormalMeanRef: RefObject<HTMLInputElement | null>;
  statisticsPoissonLambdaRef: RefObject<HTMLInputElement | null>;
  statisticsMeanInferenceLevelRef: RefObject<HTMLInputElement | null>;
  relationshipsState: StatisticsRelationshipsState;
  statisticsRegressionXRef: RefObject<HTMLInputElement | null>;
  statisticsCorrelationXRef: RefObject<HTMLInputElement | null>;
  onUpdateRegressionPointDraft: (
    screen: 'regression' | 'correlation',
    index: number,
    field: 'x' | 'y',
    value: string,
  ) => void;
  onRemoveRegressionPoint: (screen: 'regression' | 'correlation', index: number) => void;
  onAddRegressionPoint: (screen: 'regression' | 'correlation') => void;
  statisticsRelationshipsText: string;
};

function StatisticsWorkspace({
  routeMeta,
  screen,
  activeSection,
  resultIsStale,
  onOpenSection,
  isMenuOpen,
  menuPanelRef,
  menuEntries,
  currentMenuIndex,
  menuFooterText,
  onOpenScreen,
  onHoverMenuIndex,
  onOpenToolGuide,
  onOpenModeGuide,
  dataset,
  datasetText,
  datasetRef,
  onUpdateDataset,
  filledFrequencyRowCount,
  sourceSyncSummary,
  workingSource,
  onSwitchSource,
  onImportDatasetIntoFrequencyTable,
  onExpandTableToDataset,
  onUseInStatistics,
  workbenchExpression,
  onCopyWorkbenchExpression,
  frequencyTable,
  dataSummaryState,
  setDataSummaryState,
  frequencyValueRef: statisticsFrequencyValueRef,
  onUpdateFrequencyRow,
  onRemoveFrequencyRow,
  onAddFrequencyRow,
  binomialState,
  setBinomialState,
  normalState,
  setNormalState,
  poissonState,
  setPoissonState,
  meanInferenceState,
  setMeanInferenceState,
  statisticsBinomialNRef,
  statisticsNormalMeanRef,
  statisticsPoissonLambdaRef,
  statisticsMeanInferenceLevelRef,
  relationshipsState,
  statisticsRegressionXRef,
  statisticsCorrelationXRef,
  onUpdateRegressionPointDraft,
  onRemoveRegressionPoint,
  onAddRegressionPoint,
  statisticsRelationshipsText,
}: StatisticsWorkspaceProps) {
  if (!routeMeta) {
    return null;
  }
  const panelMeta = activeSection === 'dataSummary'
    ? {
        ...routeMeta,
        breadcrumb: ['Statistics', 'Data & Summary'],
        label: 'Data & Summary',
        description: 'Edit one reusable dataset, choose its representation, and evaluate summaries or compact counts.',
      }
    : activeSection === 'probability'
      ? {
          ...routeMeta,
          breadcrumb: ['Statistics', 'Probability'],
          label: 'Probability',
          description: 'Evaluate common events for Binomial, Normal, and Poisson distributions.',
        }
      : activeSection === 'relationships'
        ? {
            ...routeMeta,
            breadcrumb: ['Statistics', 'Relationships'],
            label: 'Relationships',
            description: 'Use one paired dataset for a least-squares line or Pearson correlation.',
          }
        : routeMeta;

  return (
    <section className={`mode-panel ${isMenuOpen ? 'statistics-menu-panel' : 'statistics-panel'}`}>
      <div className="statistics-section-tabs" role="tablist" aria-label="Statistics sections">
        {([
          ['dataSummary', 'Data & Summary'],
          ['probability', 'Probability'],
          ['inference', 'Inference'],
          ['relationships', 'Relationships'],
        ] as const).map(([section, label]) => (
          <button
            key={section}
            type="button"
            role="tab"
            aria-selected={activeSection === section}
            className={activeSection === section ? 'is-active' : ''}
            onClick={() => onOpenSection(section)}
          >
            {label}
          </button>
        ))}
      </div>
      {SECTION_TOOLS[activeSection].length > 1
        && activeSection !== 'dataSummary'
        && activeSection !== 'probability'
        && activeSection !== 'relationships' ? (
        <label className="statistics-tool-select">
          <span>Tool</span>
          <select
            aria-label="Statistics tool"
            value={screen}
            onChange={(event) => onOpenScreen(event.target.value as StatisticsScreen)}
          >
            {SECTION_TOOLS[activeSection].map((tool) => (
              <option key={tool.screen} value={tool.screen}>{tool.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="equation-panel-header statistics-panel-header">
        <div className="equation-panel-copy">
          <div className="equation-breadcrumbs">
            {panelMeta.breadcrumb.map((segment) => (
              <span key={`${screen}-${segment}`} className="equation-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="card-title-row">
            <strong>{panelMeta.label}</strong>
            <span className="equation-badge">
              {resultIsStale ? 'Result stale' : 'Statistics'}
            </span>
          </div>
          <p className="equation-hint statistics-panel-subtitle">{panelMeta.description}</p>
          <div className="guide-related-links">
            <button className="guide-chip" onClick={onOpenToolGuide}>
              Guide: This tool
            </button>
            <button className="guide-chip" onClick={onOpenModeGuide}>
              Guide: Statistics
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <div
            ref={menuPanelRef}
            className="launcher-list equation-menu-list statistics-menu-list"
            tabIndex={-1}
          >
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry statistics-menu-entry ${index === currentMenuIndex ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() => onHoverMenuIndex(screen as 'home' | 'probabilityHome' | 'inferenceHome', index)}
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help statistics-menu-footer">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : activeSection === 'dataSummary' ? (
        <StatisticsDataSummaryPanel
          screen={screen}
          state={dataSummaryState}
          setState={setDataSummaryState}
          workingSource={workingSource}
          onSwitchSource={onSwitchSource}
          onOpenScreen={onOpenScreen}
          datasetText={datasetText}
          datasetValueCount={dataset.values.length}
          datasetRef={datasetRef}
          onUpdateDataset={onUpdateDataset}
          frequencyTable={frequencyTable}
          filledFrequencyRowCount={filledFrequencyRowCount}
          frequencyValueRef={statisticsFrequencyValueRef}
          onUpdateFrequencyRow={onUpdateFrequencyRow}
          onRemoveFrequencyRow={onRemoveFrequencyRow}
          onAddFrequencyRow={onAddFrequencyRow}
          sourceSyncSummary={sourceSyncSummary}
          onImportDatasetIntoFrequencyTable={onImportDatasetIntoFrequencyTable}
          onExpandTableToDataset={onExpandTableToDataset}
          onUseInStatistics={onUseInStatistics}
          workbenchExpression={workbenchExpression}
          onCopyWorkbenchExpression={onCopyWorkbenchExpression}
        />
      ) : activeSection === 'probability' && (screen === 'binomial' || screen === 'normal' || screen === 'poisson') ? (
        <StatisticsProbabilityPanel
          screen={screen}
          onOpenScreen={onOpenScreen}
          binomialState={binomialState}
          setBinomialState={setBinomialState}
          normalState={normalState}
          setNormalState={setNormalState}
          poissonState={poissonState}
          setPoissonState={setPoissonState}
          binomialNRef={statisticsBinomialNRef}
          normalMeanRef={statisticsNormalMeanRef}
          poissonLambdaRef={statisticsPoissonLambdaRef}
          onEditExpression={onUseInStatistics}
          onCopyExpression={onCopyWorkbenchExpression}
          expression={workbenchExpression}
        />
      ) : screen === 'dataEntry' || screen === 'descriptive' || screen === 'frequency' || screen === 'meanInference' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>
                {screen === 'dataEntry'
                  ? 'Dataset'
                  : screen === 'descriptive'
                    ? 'Descriptive Source'
                    : screen === 'frequency'
                      ? 'Frequency Source'
                      : 'Inference Source'}
              </strong>
              <span className="equation-badge">
                {screen !== 'dataEntry' && workingSource === 'frequencyTable'
                  ? `${filledFrequencyRowCount} rows`
                  : `${dataset.values.length} values`}
              </span>
            </div>
            {screen !== 'dataEntry' ? (
              <div className="guide-chip-row">
                <button
                  className={`guide-chip ${workingSource === 'dataset' ? 'is-active' : ''}`}
                  onClick={() => onSwitchSource('dataset')}
                >
                  Use Dataset
                </button>
                <button
                  className={`guide-chip ${workingSource === 'frequencyTable' ? 'is-active' : ''}`}
                  onClick={() => onSwitchSource('frequencyTable')}
                >
                  Use Table
                </button>
              </div>
            ) : null}
            {screen !== 'dataEntry' ? (
              <p className="equation-hint">{sourceSyncSummary}</p>
            ) : null}
            {screen === 'meanInference' ? (
              <>
                <div className="guide-chip-row">
                  <button
                    className={`guide-chip ${meanInferenceState.mode === 'ci' ? 'is-active' : ''}`}
                    onClick={() => setMeanInferenceState((currentState) => ({ ...currentState, mode: 'ci' }))}
                  >
                    Confidence Interval
                  </button>
                  <button
                    className={`guide-chip ${meanInferenceState.mode === 'test' ? 'is-active' : ''}`}
                    onClick={() => setMeanInferenceState((currentState) => ({ ...currentState, mode: 'test' }))}
                  >
                    Two-Sided Test
                  </button>
                </div>
                <div className="statistics-input-grid">
                  <label>
                    <span>Level</span>
                    <SignedNumberDraftInput
                      ref={statisticsMeanInferenceLevelRef}
                      value={meanInferenceState.level}
                      onValueChange={(value) => setMeanInferenceState((currentState) => ({ ...currentState, level: value }))}
                      className="statistics-cell-input"
                    />
                  </label>
                  {meanInferenceState.mode === 'test' ? (
                    <label>
                      <span>mu0</span>
                      <SignedNumberDraftInput
                        value={meanInferenceState.mu0}
                        onValueChange={(value) => setMeanInferenceState((currentState) => ({ ...currentState, mu0: value }))}
                        className="statistics-cell-input"
                      />
                    </label>
                  ) : null}
                </div>
              </>
            ) : null}
            <label className="statistics-text-block">
              <span>{screen === 'meanInference' ? 'Dataset values' : 'Values'}</span>
              <textarea
                ref={datasetRef}
                className="statistics-textarea"
                value={datasetText}
                onChange={(event) => onUpdateDataset(event.target.value)}
                placeholder="12, 15, 15, 18, 20"
              />
            </label>
            <div className="guide-chip-row">
              <button className="guide-chip" onClick={onImportDatasetIntoFrequencyTable}>
                Build Table from Dataset
              </button>
              <button className="guide-chip" onClick={onExpandTableToDataset}>
                Expand Table -&gt; Dataset
              </button>
              <button className="guide-chip" onClick={onUseInStatistics}>
                Use in Statistics
              </button>
            </div>
            <p className="equation-hint">
              The top Statistics editor is the executable request surface. These dataset and table controls seed it when you press EXE/F1 or Use in Statistics.
            </p>
          </div>
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Frequency Table</strong>
              <span className="equation-badge">{filledFrequencyRowCount} rows</span>
            </div>
            <div className="statistics-table-labels" aria-hidden="true">
              <span>Value</span>
              <span>Freq</span>
              <span>Action</span>
            </div>
            <div className="statistics-edit-table">
              {frequencyTable.rows.map((row, index) => (
                <div key={`statistics-frequency-${index}`} className="statistics-edit-row">
                  <SignedNumberDraftInput
                    ref={index === 0 ? statisticsFrequencyValueRef : undefined}
                    className="statistics-cell-input"
                    value={row.value}
                    onValueChange={(value) => onUpdateFrequencyRow(index, 'value', value)}
                  />
                  <SignedNumberDraftInput
                    className="statistics-cell-input"
                    value={row.frequency}
                    onValueChange={(value) => onUpdateFrequencyRow(index, 'frequency', value)}
                  />
                  <button onClick={() => onRemoveFrequencyRow(index)}>Remove</button>
                </div>
              ))}
            </div>
            <div className="display-card-actions">
              <button onClick={onAddFrequencyRow}>Add Row</button>
              <button onClick={onCopyWorkbenchExpression}>Copy Expr</button>
            </div>
            {screen === 'dataEntry' ? (
              <div className="statistics-summary-card">
                <strong>Current Dataset</strong>
                <p>{datasetText || 'No dataset values entered yet.'}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : screen === 'regression' || screen === 'correlation' ? (
        <StatisticsRelationshipsPanel
          state={relationshipsState}
          firstXRef={screen === 'regression' ? statisticsRegressionXRef : statisticsCorrelationXRef}
          expression={workbenchExpression}
          pointsText={statisticsRelationshipsText}
          onOpenScreen={onOpenScreen}
          onUpdatePoint={onUpdateRegressionPointDraft}
          onRemovePoint={onRemoveRegressionPoint}
          onAddPoint={onAddRegressionPoint}
          onEditExpression={onUseInStatistics}
          onCopyExpression={onCopyWorkbenchExpression}
        />
      ) : (
        <div className="editor-card">
          <div className="card-title-row">
            <strong>{routeMeta.label}</strong>
            <span className="equation-badge">Statistics</span>
          </div>
          <p className="equation-hint">
            Use the top Statistics editor for the active request, or return to a guided tool from the menu.
          </p>
        </div>
      )}
    </section>
  );
}

export { StatisticsWorkspace };
