import { BarChart3, Keyboard } from 'lucide-react';
import { useState } from 'react';
import type {
  StatisticsHistogramBinCount,
  StatisticsInputMode,
  StatisticsSection,
  StatisticsVisualizationKind,
  StatisticsVisualizationPayloadV1,
} from '../../../types/calculator';
import { KeypadPanel, type KeypadPanelProps } from '../KeypadPanel';

const VISUALIZATION_LABELS: Record<StatisticsVisualizationKind, string> = {
  histogram: 'Histogram',
  boxPlot: 'Box plot',
  frequencyBars: 'Frequency bars',
  probabilityBars: 'Probability bars',
  normalCurve: 'Normal curve',
  scatterFit: 'Scatter and fit',
  residuals: 'Residuals',
  correlationScatter: 'Scatter',
  confidenceInterval: 'Confidence interval',
  testDistribution: 'Test distribution',
};

type StatisticsVisualizationDockProps = KeypadPanelProps & {
  section: StatisticsSection;
  inputMode: StatisticsInputMode;
  payload?: StatisticsVisualizationPayloadV1;
  selectedKind?: StatisticsVisualizationKind;
  histogramBinCount: StatisticsHistogramBinCount;
  stale: boolean;
  outcomeKind?: 'success' | 'error' | 'prompt';
  runtimeStatusLabel?: string;
  resultRevision?: string;
  onSelectedKindChange: (kind: StatisticsVisualizationKind) => void;
  onHistogramBinCountChange: (count: StatisticsHistogramBinCount) => void;
};

export function StatisticsVisualizationDock({
  section,
  inputMode,
  payload,
  selectedKind,
  histogramBinCount,
  stale,
  outcomeKind,
  runtimeStatusLabel,
  resultRevision,
  onSelectedKindChange,
  onHistogramBinCountChange,
  ...keypadProps
}: StatisticsVisualizationDockProps) {
  const contextKey = `${section}:${inputMode}:${resultRevision ?? 'none'}`;
  const [keypadView, setKeypadView] = useState({ contextKey, open: false });
  const showExpressionKeypad = keypadView.contextKey === contextKey && keypadView.open;
  const activeKind = payload?.views.some((view) => view.kind === selectedKind)
    ? selectedKind
    : payload?.defaultKind;
  const activeView = payload?.views.find((view) => view.kind === activeKind);
  const pending = runtimeStatusLabel?.startsWith('Running')
    || runtimeStatusLabel?.startsWith('Queued');

  return (
    <section className="statistics-visualization-dock" data-testid="statistics-visualization-dock">
      <header className="statistics-visualization-header">
        <div className="statistics-visualization-title">
          <BarChart3 aria-hidden="true" size={18} />
          <h2>Visualization</h2>
          {stale ? <span className="statistics-visualization-badge">Stale</span> : null}
        </div>
        <div className="statistics-visualization-controls">
          {payload && payload.views.length > 1 ? (
            <label>
              <span className="sr-only">Visualization</span>
              <select
                aria-label="Visualization"
                value={activeKind}
                onChange={(event) => onSelectedKindChange(
                  event.currentTarget.value as StatisticsVisualizationKind,
                )}
              >
                {payload.views.map((view) => (
                  <option key={view.kind} value={view.kind}>
                    {VISUALIZATION_LABELS[view.kind]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {activeKind === 'histogram' ? (
            <label className="statistics-histogram-bin-control">
              <span>Bins</span>
              <input
                aria-label="Histogram bins"
                type="number"
                min={1}
                max={50}
                value={histogramBinCount === 'auto' ? '' : histogramBinCount}
                placeholder="Auto"
                onChange={(event) => onHistogramBinCountChange(
                  event.currentTarget.value
                    ? Math.min(50, Math.max(1, Number(event.currentTarget.value)))
                    : 'auto',
                )}
              />
            </label>
          ) : null}
          {inputMode === 'expression' ? (
            <button
              type="button"
              className={`statistics-visualization-icon-button ${showExpressionKeypad ? 'is-active' : ''}`}
              aria-label={showExpressionKeypad ? 'Show visualization' : 'Show keypad'}
              aria-pressed={showExpressionKeypad}
              title={showExpressionKeypad ? 'Show visualization' : 'Show keypad'}
              onClick={() => setKeypadView({ contextKey, open: !showExpressionKeypad })}
            >
              <Keyboard aria-hidden="true" size={18} />
            </button>
          ) : null}
        </div>
      </header>
      <div className="statistics-visualization-body">
        {showExpressionKeypad ? (
          <div className="statistics-visualization-keypad" data-testid="statistics-expression-keypad">
            <KeypadPanel {...keypadProps} />
          </div>
        ) : activeView ? (
          <div
            className="statistics-visualization-chart-placeholder"
            data-testid="statistics-visualization-chart"
            role="img"
            aria-label={activeView.ariaDescription}
          >
            <BarChart3 aria-hidden="true" size={32} />
            <strong>{activeView.title}</strong>
          </div>
        ) : (
          <div className="statistics-visualization-empty" data-testid="statistics-visualization-empty">
            <BarChart3 aria-hidden="true" size={30} />
            <strong>{pending ? 'Evaluating' : outcomeKind === 'error' ? 'No visualization' : 'Awaiting result'}</strong>
          </div>
        )}
      </div>
    </section>
  );
}
