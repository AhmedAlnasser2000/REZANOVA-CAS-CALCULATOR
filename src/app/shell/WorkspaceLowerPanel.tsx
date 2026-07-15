import type {
  ModeId,
  StatisticsHistogramBinCount,
  StatisticsInputMode,
  StatisticsSection,
  StatisticsVisualizationKind,
  StatisticsVisualizationPayloadV1,
} from '../../types/calculator';
import { KeypadPanel, type KeypadPanelProps } from './KeypadPanel';
import { StatisticsVisualizationDock } from './statistics/StatisticsVisualizationDock';

type WorkspaceLowerPanelProps = KeypadPanelProps & {
  currentMode: ModeId;
  statisticsSection: StatisticsSection;
  statisticsInputMode: StatisticsInputMode;
  statisticsVisualization?: StatisticsVisualizationPayloadV1;
  statisticsVisualizationKind?: StatisticsVisualizationKind;
  statisticsHistogramBinCount: StatisticsHistogramBinCount;
  approxDigits: number;
  statisticsResultIsStale: boolean;
  statisticsOutcomeKind?: 'success' | 'error' | 'prompt';
  runtimeStatusLabel?: string;
  statisticsResultRevision?: string;
  onStatisticsVisualizationKindChange: (kind: StatisticsVisualizationKind) => void;
  onStatisticsHistogramBinCountChange: (count: StatisticsHistogramBinCount) => void;
};

export function WorkspaceLowerPanel({
  currentMode,
  statisticsSection,
  statisticsInputMode,
  statisticsVisualization,
  statisticsVisualizationKind,
  statisticsHistogramBinCount,
  approxDigits,
  statisticsResultIsStale,
  statisticsOutcomeKind,
  runtimeStatusLabel,
  statisticsResultRevision,
  onStatisticsVisualizationKindChange,
  onStatisticsHistogramBinCountChange,
  ...keypadProps
}: WorkspaceLowerPanelProps) {
  if (currentMode !== 'statistics') return <KeypadPanel {...keypadProps} />;

  return (
    <StatisticsVisualizationDock
      {...keypadProps}
      section={statisticsSection}
      inputMode={statisticsInputMode}
      payload={statisticsVisualization}
      selectedKind={statisticsVisualizationKind}
      histogramBinCount={statisticsHistogramBinCount}
      approxDigits={approxDigits}
      stale={statisticsResultIsStale}
      outcomeKind={statisticsOutcomeKind}
      runtimeStatusLabel={runtimeStatusLabel}
      resultRevision={statisticsResultRevision}
      onSelectedKindChange={onStatisticsVisualizationKindChange}
      onHistogramBinCountChange={onStatisticsHistogramBinCountChange}
    />
  );
}
