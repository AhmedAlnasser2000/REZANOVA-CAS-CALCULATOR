import {
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import { createCoreDraftState, isCoreDraftEditable } from '../../lib/modes/core-mode';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import {
  buildStatisticsInputLatex,
  defaultStatisticsDraftForScreen,
  DEFAULT_BINOMIAL_STATE,
  DEFAULT_CORRELATION_STATE,
  DEFAULT_FREQUENCY_TABLE,
  DEFAULT_MEAN_INFERENCE_STATE,
  DEFAULT_NORMAL_STATE,
  DEFAULT_POISSON_STATE,
  DEFAULT_REGRESSION_STATE,
  DEFAULT_STATS_DATASET,
} from '../../lib/statistics/examples';
import {
  getStatisticsMenuEntries,
  getStatisticsMenuEntryAtIndex,
  getStatisticsMenuFooterText,
  getStatisticsParentScreen,
  getStatisticsRouteMeta,
  isStatisticsMenuScreen,
  moveStatisticsMenuIndex,
} from '../../lib/statistics/navigation';
import {
  parseStatisticsDraft,
  statisticsDraftStyle,
  statisticsRequestToScreen,
  buildStatisticsOoeInputRevisionId,
  clearStatisticsSourceSyncState,
  collapseDatasetToFrequencyTable,
  DEFAULT_STATISTICS_SOURCE_SYNC_STATE,
  datasetTextFromValues,
  expandFrequencyTableToDataset,
  pointsTextFromState,
  statisticsRequestToWorkingSource,
  statisticsSourceSyncFromDatasetEdit,
  statisticsSourceSyncFromFrequencyEdit,
  type RunStatisticsRuntimeRequest,
} from '../../lib/statistics/runtime-request';
import type {
  CoreDraftState,
  DisplayOutcome,
  HistoryEntry,
  ModeId,
  StatisticsRequest,
  StatisticsScreen,
  StatisticsWorkingSource,
} from '../../types/calculator';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { launchWorkspaceRuntimeJob } from './launchWorkspaceRuntimeJob';
import { statisticsRequestFromSurfaceState } from './statistics-origin-request';
import { copyStatisticsSurfaceState } from './statistics-surface-state';
import type { StatisticsSurfaceState } from './workspace-surface-state';
import type { WorkspaceInstance } from './workspace-instances';

type CommitStatisticsOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'statistics',
  context?: Partial<Pick<HistoryEntry, 'statisticsScreen' | 'statisticsSeed'>> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

type UseStatisticsRuntimeOptions = {
  activeFieldRef: MutableRefObject<MathfieldElement | null>;
  commitOutcome: CommitStatisticsOutcome;
  currentMode: ModeId;
  currentModeRef: MutableRefObject<ModeId>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  openLauncher: () => void;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  setClipboardNotice: (notice: string | null) => void;
  setDisplayOutcome: (outcome: DisplayOutcome | null) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  startTransition: (callback: () => void) => void;
};

export function useStatisticsRuntime({
  activeFieldRef,
  commitOutcome,
  currentMode,
  currentModeRef,
  discardHistoryTicket,
  getActiveWorkspaceInstanceRuntimeContext,
  getWorkspaceInstances,
  isLauncherOpen,
  openLauncher,
  reserveHistoryTicket,
  setClipboardNotice,
  setDisplayOutcome,
  setRuntimeStatusOverride,
  startTransition,
}: UseStatisticsRuntimeOptions) {
  const [statisticsScreen, setStatisticsScreen] = useState<StatisticsScreen>('home');
  const [statisticsMenuSelection, setStatisticsMenuSelection] = useState({
    home: 0,
    probabilityHome: 0,
    inferenceHome: 0,
  });
  const [statisticsWorkingSource, setStatisticsWorkingSource] =
    useState<StatisticsWorkingSource>('dataset');
  const [statisticsSourceSyncState, setStatisticsSourceSyncState] = useState(
    DEFAULT_STATISTICS_SOURCE_SYNC_STATE,
  );
  const [statsDataset, setStatsDataset] = useState(DEFAULT_STATS_DATASET);
  const [frequencyTable, setFrequencyTable] = useState(DEFAULT_FREQUENCY_TABLE);
  const [binomialState, setBinomialState] = useState(DEFAULT_BINOMIAL_STATE);
  const [normalState, setNormalState] = useState(DEFAULT_NORMAL_STATE);
  const [poissonState, setPoissonState] = useState(DEFAULT_POISSON_STATE);
  const [meanInferenceState, setMeanInferenceState] =
    useState(DEFAULT_MEAN_INFERENCE_STATE);
  const [regressionState, setRegressionState] = useState(DEFAULT_REGRESSION_STATE);
  const [correlationState, setCorrelationState] = useState(DEFAULT_CORRELATION_STATE);
  const [statisticsDraftState, setStatisticsDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState('', 'structured', 'guided', true),
  );
  const statisticsMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const statisticsDraftFieldRef = useRef<MathfieldElement | null>(null);
  const statisticsBinomialNRef = useRef<HTMLInputElement | null>(null);
  const statisticsNormalMeanRef = useRef<HTMLInputElement | null>(null);
  const statisticsPoissonLambdaRef = useRef<HTMLInputElement | null>(null);
  const statisticsMeanInferenceLevelRef = useRef<HTMLInputElement | null>(null);
  const statisticsRegressionXRef = useRef<HTMLInputElement | null>(null);
  const statisticsCorrelationXRef = useRef<HTMLInputElement | null>(null);
  const statisticsFrequencyValueRef = useRef<HTMLInputElement | null>(null);
  const statisticsDatasetRef = useRef<HTMLTextAreaElement | null>(null);

  const statisticsRouteMeta = currentMode === 'statistics'
    ? getStatisticsRouteMeta(statisticsScreen)
    : null;
  const isStatisticsMenuOpen =
    !isLauncherOpen && currentMode === 'statistics' && isStatisticsMenuScreen(statisticsScreen);
  const statisticsMenuEntries = isStatisticsMenuOpen
    ? getStatisticsMenuEntries(statisticsScreen)
    : [];
  const currentStatisticsMenuIndex = isStatisticsMenuOpen
    ? statisticsMenuSelection[statisticsScreen as keyof typeof statisticsMenuSelection]
    : 0;
  const selectedStatisticsMenuEntry = isStatisticsMenuOpen
    ? getStatisticsMenuEntryAtIndex(statisticsScreen, currentStatisticsMenuIndex)
    : undefined;
  const statisticsMenuFooterText = currentMode === 'statistics'
    ? getStatisticsMenuFooterText(statisticsScreen)
    : '';
  const statisticsStateSnapshot = {
    dataset: statsDataset,
    frequencyTable,
    binomial: binomialState,
    normal: normalState,
    poisson: poissonState,
    meanInference: meanInferenceState,
    regression: regressionState,
    correlation: correlationState,
  };
  const statisticsWorkbenchExpression =
    currentMode === 'statistics'
      ? buildStatisticsInputLatex(
        statisticsScreen,
        statisticsStateSnapshot,
        statisticsWorkingSource,
      )
      : '';
  const statisticsDraftLatex =
    currentMode === 'statistics'
      ? statisticsDraftState.rawLatex
      : '';
  const statisticsEditorIsEditable =
    currentMode === 'statistics'
    && statisticsRouteMeta?.editorMode === 'editable'
    && isCoreDraftEditable(statisticsDraftState);
  const statisticsDatasetText = datasetTextFromValues(statsDataset.values);
  const statisticsRegressionText = pointsTextFromState(regressionState);
  const statisticsCorrelationText = pointsTextFromState(correlationState);
  const statisticsFilledFrequencyRowCount = frequencyTable.rows.filter(
    (row) => row.value.trim() && row.frequency.trim(),
  ).length;
  const statisticsSourceSyncSummary =
    statisticsSourceSyncState.datasetStale
      ? 'Dataset is stale relative to the manual frequency table.'
      : statisticsSourceSyncState.frequencyTableStale
        ? 'Frequency table is stale relative to the dataset.'
        : 'Dataset and frequency table are in sync.';

  function statisticsDraftStateForScreen(
    _screen: StatisticsScreen,
    rawLatex: string,
    source: CoreDraftState['source'],
  ) {
    return createCoreDraftState(
      rawLatex,
      statisticsDraftStyle(rawLatex),
      source,
      true,
    );
  }

  function statisticsWorkingSourceForScreen(screen: StatisticsScreen): StatisticsWorkingSource {
    if (screen === 'home' || screen === 'probabilityHome' || screen === 'inferenceHome') {
      return statisticsWorkingSource;
    }

    if (screen === 'dataEntry') {
      return 'dataset';
    }

    if (screen === 'descriptive' || screen === 'frequency' || screen === 'meanInference') {
      return statisticsWorkingSource;
    }

    return 'dataset';
  }

  function defaultStatisticsLeafForMenu(screen: StatisticsScreen): StatisticsScreen {
    if (screen === 'probabilityHome') {
      return getStatisticsMenuEntryAtIndex(
        'probabilityHome',
        statisticsMenuSelection.probabilityHome,
      )?.target ?? 'binomial';
    }

    if (screen === 'inferenceHome') {
      return getStatisticsMenuEntryAtIndex(
        'inferenceHome',
        statisticsMenuSelection.inferenceHome,
      )?.target ?? 'meanInference';
    }

    const homeTarget = getStatisticsMenuEntryAtIndex(
      'home',
      statisticsMenuSelection.home,
    )?.target ?? 'dataEntry';

    if (homeTarget === 'probabilityHome') {
      return getStatisticsMenuEntryAtIndex(
        'probabilityHome',
        statisticsMenuSelection.probabilityHome,
      )?.target ?? 'binomial';
    }

    if (homeTarget === 'inferenceHome') {
      return getStatisticsMenuEntryAtIndex(
        'inferenceHome',
        statisticsMenuSelection.inferenceHome,
      )?.target ?? 'meanInference';
    }

    return homeTarget;
  }

  function statisticsLeafScreenForContext(screen: StatisticsScreen): StatisticsScreen {
    if (screen === 'home' || screen === 'probabilityHome') {
      return defaultStatisticsLeafForMenu(screen);
    }

    return screen;
  }

  function buildStatisticsDraftForScreen(
    screen: StatisticsScreen,
    workingSource = statisticsWorkingSourceForScreen(screen),
  ) {
    if (isStatisticsMenuScreen(screen)) {
      return '';
    }

    return buildStatisticsInputLatex(screen, statisticsStateSnapshot, workingSource);
  }

  function updateStatisticsDraft(
    rawLatex: string,
    source: CoreDraftState['source'],
    executable = true,
  ) {
    setStatisticsDraftState({
      rawLatex,
      style: statisticsDraftStyle(rawLatex),
      source,
      executable,
    });
  }

  function focusStatisticsEditor() {
    statisticsDraftFieldRef.current?.focus?.();
    activeFieldRef.current = statisticsDraftFieldRef.current;
  }

  function loadStatisticsDraft(
    rawLatex: string,
    source: CoreDraftState['source'] = 'guided',
    focusEditor = true,
  ) {
    updateStatisticsDraft(rawLatex, source, true);
    if (focusEditor) {
      setTimeout(() => {
        focusStatisticsEditor();
      }, 0);
    }
  }

  function loadStatisticsExample(screen: StatisticsScreen, latex: string) {
    openStatisticsScreen(screen);
    if (latex) {
      setStatisticsDraftState({
        rawLatex: latex,
        style: statisticsDraftStyle(latex),
        source: 'manual',
        executable: !isStatisticsMenuScreen(screen),
      });
    }
  }

  function loadStatisticsDraftForLatex(rawLatex: string) {
    const parsed = parseStatisticsDraft(rawLatex);
    openStatisticsScreen(parsed.ok ? statisticsRequestToScreen(parsed.request) : 'dataEntry');
    loadStatisticsDraft(rawLatex, 'guided', true);
  }

  function isStatisticsDraftFocused(target?: EventTarget | null) {
    if (!statisticsEditorIsEditable || !statisticsDraftFieldRef.current) {
      return false;
    }

    if (target) {
      return target === statisticsDraftFieldRef.current;
    }

    return activeFieldRef.current === statisticsDraftFieldRef.current;
  }

  function readLiveStatisticsInputLatex(screenHint: StatisticsScreen, editorFocused: boolean) {
    const shouldUseGuidedForm =
      !editorFocused && statisticsRouteMeta?.focusTarget === 'guidedForm';
    if (shouldUseGuidedForm) {
      return buildStatisticsDraftForScreen(screenHint);
    }

    let inputLatex = statisticsDraftState.rawLatex.trim();
    if (currentModeRef.current === 'statistics' && statisticsEditorIsEditable) {
      const liveField = statisticsDraftFieldRef.current
        ?? (document.querySelector('[data-testid="main-editor"]') as MathfieldElement | null);
      const fieldLatex = liveField?.getValue?.('latex');
      if (typeof fieldLatex === 'string') {
        inputLatex = trimHarmlessTrailingMathSpacing(fieldLatex).trim();
      }
    }

    return inputLatex;
  }

  function readLiveStatisticsRuntimeRequest() {
    if (currentModeRef.current !== 'statistics') {
      return null;
    }

    const screenHint = statisticsLeafScreenForContext(statisticsScreen);
    const inputLatex = readLiveStatisticsInputLatex(screenHint, isStatisticsDraftFocused());
    if (!inputLatex) {
      return null;
    }

    return {
      inputLatex,
      screenHint,
      workingSourceHint: statisticsWorkingSource,
    } satisfies RunStatisticsRuntimeRequest;
  }

  function openStatisticsScreen(screen: StatisticsScreen) {
    setStatisticsScreen(screen);
    const nextWorkingSource = statisticsWorkingSourceForScreen(screen);
    setStatisticsWorkingSource(nextWorkingSource);
    if (!isStatisticsMenuScreen(screen)) {
      setStatisticsDraftState(
        statisticsDraftStateForScreen(
          screen,
          buildStatisticsDraftForScreen(screen, nextWorkingSource)
            || defaultStatisticsDraftForScreen(screen, nextWorkingSource),
          'guided',
        ),
      );
    }
    setDisplayOutcome(null);
  }

  function setCurrentStatisticsMenuIndex(screen: keyof typeof statisticsMenuSelection, index: number) {
    setStatisticsMenuSelection((currentSelection) => ({
      ...currentSelection,
      [screen]: index,
    }));
  }

  function moveCurrentStatisticsMenuSelection(delta: number) {
    if (!isStatisticsMenuOpen) {
      return;
    }

    setCurrentStatisticsMenuIndex(
      statisticsScreen as keyof typeof statisticsMenuSelection,
      moveStatisticsMenuIndex(statisticsScreen, currentStatisticsMenuIndex, delta),
    );
  }

  function openSelectedStatisticsMenuEntry() {
    if (!selectedStatisticsMenuEntry) {
      return;
    }

    openStatisticsScreen(selectedStatisticsMenuEntry.target);
  }

  function goBackInStatistics() {
    const parentScreen = getStatisticsParentScreen(statisticsScreen);
    if (parentScreen) {
      openStatisticsScreen(parentScreen);
    } else {
      openLauncher();
    }
  }

  function updateStatisticsDataset(text: string) {
    const values = text
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    setStatsDataset({ values });
    setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
  }

  function updateStatisticsFrequencyRow(
    index: number,
    key: 'value' | 'frequency',
    value: string,
  ) {
    setFrequencyTable((currentTable) => ({
      rows: currentTable.rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row,
      ),
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function addStatisticsFrequencyRow() {
    setFrequencyTable((currentTable) => ({
      rows: [...currentTable.rows, { value: '', frequency: '' }],
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function removeStatisticsFrequencyRow(index: number) {
    setFrequencyTable((currentTable) => ({
      rows: currentTable.rows.length <= 1
        ? [{ value: '', frequency: '' }]
        : currentTable.rows.filter((_, rowIndex) => rowIndex !== index),
    }));
    setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
  }

  function updateRegressionPointDraft(
    kind: 'regression' | 'correlation',
    index: number,
    key: 'x' | 'y',
    value: string,
  ) {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: currentState.points.map((point, pointIndex) =>
        pointIndex === index
          ? {
              ...point,
              [key]: value,
            }
          : point,
      ),
    }));
  }

  function addRegressionPoint(kind: 'regression' | 'correlation') {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: [...currentState.points, { x: '', y: '' }],
    }));
  }

  function removeRegressionPoint(kind: 'regression' | 'correlation', index: number) {
    const setter = kind === 'regression' ? setRegressionState : setCorrelationState;
    setter((currentState) => ({
      points: currentState.points.length <= 1
        ? [{ x: '', y: '' }]
        : currentState.points.filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  function switchStatisticsSource(source: StatisticsWorkingSource) {
    setStatisticsWorkingSource(source);
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      !isStatisticsMenuScreen(statisticsScreen)
      && (statisticsScreen === 'descriptive'
        || statisticsScreen === 'frequency'
        || statisticsScreen === 'meanInference')
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(statisticsScreen, statisticsStateSnapshot, source),
        'guided',
        true,
      );
    }
  }

  function importDatasetIntoFrequencyTable() {
    const nextTable = collapseDatasetToFrequencyTable(statsDataset);
    setFrequencyTable(nextTable);
    setStatisticsWorkingSource('frequencyTable');
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      statisticsScreen === 'frequency'
      || statisticsScreen === 'descriptive'
      || statisticsScreen === 'meanInference'
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(
          statisticsScreen,
          {
            ...statisticsStateSnapshot,
            frequencyTable: nextTable,
          },
          'frequencyTable',
        ),
        'guided',
        true,
      );
    }
    setClipboardNotice('Frequency table built from dataset');
  }

  function expandStatisticsTableToDataset() {
    const nextDataset = expandFrequencyTableToDataset(frequencyTable);
    setStatsDataset(nextDataset);
    setStatisticsWorkingSource('dataset');
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
    if (
      statisticsScreen === 'dataEntry'
      || statisticsScreen === 'descriptive'
      || statisticsScreen === 'frequency'
      || statisticsScreen === 'meanInference'
    ) {
      updateStatisticsDraft(
        buildStatisticsInputLatex(
          statisticsScreen,
          {
            ...statisticsStateSnapshot,
            dataset: nextDataset,
          },
          'dataset',
        ),
        'guided',
        true,
      );
    }
    setClipboardNotice('Dataset expanded from frequency table');
  }

  function applyStatisticsRequest(request: StatisticsRequest) {
    if (request.kind === 'dataset') {
      setStatsDataset({ values: request.values });
      setStatisticsWorkingSource('dataset');
      setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
      return;
    }

    if (
      request.kind === 'descriptive'
      || request.kind === 'frequency'
      || request.kind === 'meanInference'
    ) {
      const nextSource = request.source;
      setStatisticsWorkingSource(nextSource);
      if (nextSource === 'dataset') {
        setStatsDataset({ values: request.values });
        setStatisticsSourceSyncState(statisticsSourceSyncFromDatasetEdit());
      } else {
        setFrequencyTable({ rows: request.rows });
        setStatisticsSourceSyncState(statisticsSourceSyncFromFrequencyEdit());
      }

      if (request.kind === 'meanInference') {
        setMeanInferenceState({
          mode: request.mode,
          level: request.level,
          mu0: request.mu0 ?? '',
        });
      }
      return;
    }

    if (request.kind === 'binomial') {
      setBinomialState({
        n: request.n,
        p: request.p,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'normal') {
      setNormalState({
        mean: request.mean,
        standardDeviation: request.standardDeviation,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'poisson') {
      setPoissonState({
        lambda: request.lambda,
        x: request.x,
        mode: request.mode,
      });
      return;
    }

    if (request.kind === 'regression') {
      setRegressionState({ points: request.points });
      return;
    }

    setCorrelationState({ points: request.points });
  }

  function restoreStatisticsHistoryEntry(entry: HistoryEntry) {
    if (entry.statisticsSeed) {
      openStatisticsScreen(entry.statisticsSeed.screen);
      applyStatisticsRequest(entry.statisticsSeed.request);
      setStatisticsWorkingSource(entry.statisticsSeed.workingSource);
      setStatisticsDraftState({
        rawLatex: entry.inputLatex,
        style: statisticsDraftStyle(entry.inputLatex),
        source: 'manual',
        executable: true,
      });
      return;
    }

    const parsed = parseStatisticsDraft(entry.inputLatex, {
      screenHint: entry.statisticsScreen,
      workingSourceHint: statisticsWorkingSource,
    });
    if (parsed.ok) {
      const replayScreen = entry.statisticsScreen
        ? statisticsRequestToScreen(parsed.request, entry.statisticsScreen)
        : statisticsRequestToScreen(parsed.request);
      openStatisticsScreen(replayScreen);
      applyStatisticsRequest(parsed.request);
      const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
      if (nextSource) {
        setStatisticsWorkingSource(nextSource);
      }
      setStatisticsDraftState({
        rawLatex: entry.inputLatex,
        style: statisticsDraftStyle(entry.inputLatex),
        source: 'manual',
        executable: true,
      });
    } else if (entry.statisticsScreen) {
      openStatisticsScreen(entry.statisticsScreen);
      setStatisticsDraftState({
        rawLatex: entry.inputLatex,
        style: statisticsDraftStyle(entry.inputLatex),
        source: 'manual',
        executable: true,
      });
    } else {
      openStatisticsScreen('home');
    }
  }

  function resetStatisticsSourceState(source: StatisticsWorkingSource) {
    if (source === 'dataset') {
      setStatsDataset(DEFAULT_STATS_DATASET);
      setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
      setStatisticsWorkingSource('dataset');
    } else {
      setStatsDataset(DEFAULT_STATS_DATASET);
      setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
      setStatisticsWorkingSource('frequencyTable');
    }
    setStatisticsSourceSyncState(clearStatisticsSourceSyncState());
  }

  function resetStatisticsDraftForScreen(
    screen: StatisticsScreen,
    workingSource?: StatisticsWorkingSource,
  ) {
    setStatisticsDraftState(
      statisticsDraftStateForScreen(
        screen,
        defaultStatisticsDraftForScreen(screen, workingSource),
        'guided',
      ),
    );
  }

  function resetCurrentStatisticsScreen() {
    if (isStatisticsMenuOpen) {
      goBackInStatistics();
      return;
    }

    switch (statisticsScreen) {
      case 'dataEntry':
      case 'descriptive':
        resetStatisticsSourceState('dataset');
        resetStatisticsDraftForScreen(statisticsScreen, 'dataset');
        break;
      case 'frequency':
        resetStatisticsSourceState('frequencyTable');
        resetStatisticsDraftForScreen('frequency', 'frequencyTable');
        break;
      case 'binomial':
        setBinomialState(DEFAULT_BINOMIAL_STATE);
        resetStatisticsDraftForScreen('binomial');
        break;
      case 'normal':
        setNormalState(DEFAULT_NORMAL_STATE);
        resetStatisticsDraftForScreen('normal');
        break;
      case 'poisson':
        setPoissonState(DEFAULT_POISSON_STATE);
        resetStatisticsDraftForScreen('poisson');
        break;
      case 'meanInference':
        resetStatisticsSourceState('dataset');
        setMeanInferenceState(DEFAULT_MEAN_INFERENCE_STATE);
        resetStatisticsDraftForScreen('meanInference', 'dataset');
        break;
      case 'regression':
        setRegressionState(DEFAULT_REGRESSION_STATE);
        resetStatisticsDraftForScreen('regression');
        break;
      case 'correlation':
        setCorrelationState(DEFAULT_CORRELATION_STATE);
        resetStatisticsDraftForScreen('correlation');
        break;
      default:
        break;
    }
  }

  function resetStatisticsRuntime() {
    setStatisticsScreen('home');
    setStatisticsMenuSelection({ home: 0, probabilityHome: 0, inferenceHome: 0 });
    setStatisticsWorkingSource('dataset');
    setStatisticsSourceSyncState(DEFAULT_STATISTICS_SOURCE_SYNC_STATE);
    setStatsDataset(DEFAULT_STATS_DATASET); setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
    setBinomialState(DEFAULT_BINOMIAL_STATE); setNormalState(DEFAULT_NORMAL_STATE);
    setPoissonState(DEFAULT_POISSON_STATE); setMeanInferenceState(DEFAULT_MEAN_INFERENCE_STATE);
    setRegressionState(DEFAULT_REGRESSION_STATE); setCorrelationState(DEFAULT_CORRELATION_STATE);
    setStatisticsDraftState(createCoreDraftState('', 'structured', 'guided', true));
  }

  function captureStatisticsSurfaceState(): StatisticsSurfaceState {
    return copyStatisticsSurfaceState({
      statisticsScreen, statisticsMenuSelection, statisticsWorkingSource,
      statisticsSourceSyncState, statsDataset, frequencyTable, binomialState,
      normalState, poissonState, meanInferenceState, regressionState,
      correlationState, statisticsDraftState,
    });
  }

  function restoreStatisticsSurfaceState(state: StatisticsSurfaceState | null) {
    if (!state) {
      resetStatisticsRuntime();
      return;
    }

    const copy = copyStatisticsSurfaceState(state);
    setStatisticsScreen(copy.statisticsScreen);
    setStatisticsMenuSelection(copy.statisticsMenuSelection); setStatisticsWorkingSource(copy.statisticsWorkingSource);
    setStatisticsSourceSyncState(copy.statisticsSourceSyncState); setStatsDataset(copy.statsDataset);
    setFrequencyTable(copy.frequencyTable); setBinomialState(copy.binomialState); setNormalState(copy.normalState);
    setPoissonState(copy.poissonState); setMeanInferenceState(copy.meanInferenceState);
    setRegressionState(copy.regressionState); setCorrelationState(copy.correlationState);
    setStatisticsDraftState(copy.statisticsDraftState);
  }

  function runStatisticsAction() {
    const editorFocused = isStatisticsDraftFocused();
    if (isStatisticsMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const screenHint = statisticsLeafScreenForContext(statisticsScreen);
      const inputLatex = readLiveStatisticsInputLatex(screenHint, editorFocused);

      if (!inputLatex) {
        setDisplayOutcome({
          kind: 'error',
          title: statisticsRouteMeta?.label ?? 'Statistics',
          error: 'Enter a Statistics request or use a guided statistics tool before evaluating.',
          warnings: [],
        });
        return;
      }

      if (!editorFocused || statisticsDraftState.rawLatex.trim() !== inputLatex) {
        setStatisticsDraftState(statisticsDraftStateForScreen(screenHint, inputLatex, 'guided'));
      }

      const request: RunStatisticsRuntimeRequest = {
        inputLatex,
        screenHint,
        workingSourceHint: statisticsWorkingSource,
      };
      launchWorkspaceRuntimeJob({
        mode: 'statistics',
        modeLabel: 'Statistics',
        capabilityId: 'statistics.evaluate',
        request,
        ticketInputLatex: inputLatex,
        buildInputRevisionId: buildStatisticsOoeInputRevisionId,
        readLiveRequest: readLiveStatisticsRuntimeRequest,
        getActiveWorkspaceInstanceRuntimeContext,
        getWorkspaceInstances,
        readRequestFromSurfaceState: statisticsRequestFromSurfaceState,
        isModeVisible: () => currentModeRef.current === 'statistics',
        loadRunner: async () =>
          (await import('../../lib/modes/statistics')).runStatisticsModeWithOoePilot,
        reserveHistoryTicket,
        discardHistoryTicket,
        setDisplayOutcome,
        setRuntimeStatusOverride,
        commit: (payload, ticket, visible) => {
          if (visible && payload.replaySeed) {
            setStatisticsWorkingSource(payload.replaySeed.workingSource);
          }

          commitOutcome(payload.outcome, inputLatex, 'statistics', {
            statisticsScreen: payload.replayScreen,
            statisticsSeed: payload.replaySeed,
            historyTicketId: ticket?.id,
            historyLaunchOrder: ticket?.historyLaunchOrder,
            suppressDisplayCommit: !visible,
          });
        },
      });
    });
  }

  return {
    addRegressionPoint, addStatisticsFrequencyRow, applyStatisticsRequest,
    binomialState, buildStatisticsDraftForScreen, captureStatisticsSurfaceState, correlationState,
    currentStatisticsMenuIndex, expandStatisticsTableToDataset, focusStatisticsEditor, frequencyTable,
    goBackInStatistics, importDatasetIntoFrequencyTable, isStatisticsDraftFocused,
    isStatisticsMenuOpen, loadStatisticsDraft, loadStatisticsDraftForLatex, loadStatisticsExample,
    meanInferenceState, moveCurrentStatisticsMenuSelection, normalState, openSelectedStatisticsMenuEntry,
    openStatisticsScreen, poissonState, regressionState, removeRegressionPoint, removeStatisticsFrequencyRow,
    resetCurrentStatisticsScreen, resetStatisticsRuntime,
    restoreStatisticsHistoryEntry, restoreStatisticsSurfaceState, runStatisticsAction,
    selectedStatisticsMenuEntry, setBinomialState, setCurrentStatisticsMenuIndex, setMeanInferenceState, setNormalState,
    setPoissonState, statisticsBinomialNRef, statisticsCorrelationText, statisticsCorrelationXRef,
    statisticsDatasetRef, statisticsDatasetText, statisticsDraftFieldRef, statisticsDraftLatex,
    statisticsDraftState, statisticsEditorIsEditable, statisticsFilledFrequencyRowCount, statisticsFrequencyValueRef,
    statisticsMeanInferenceLevelRef, statisticsMenuEntries, statisticsMenuFooterText, statisticsMenuPanelRef,
    statisticsMenuSelection, statisticsNormalMeanRef, statisticsPoissonLambdaRef, statisticsRegressionText,
    statisticsRegressionXRef, statisticsRouteMeta, statisticsScreen, statisticsSourceSyncState,
    statisticsSourceSyncSummary, statisticsWorkbenchExpression,
    statisticsWorkingSource, statsDataset, switchStatisticsSource,
    updateRegressionPointDraft, updateStatisticsDataset, updateStatisticsDraft,
    updateStatisticsFrequencyRow,
  };
}
