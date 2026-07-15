import {
  useRef,
  useState,
} from 'react';
import type { MathfieldElement } from 'mathlive';
import { createCoreDraftState, isCoreDraftEditable } from '../../lib/modes/core-mode';
import { trimHarmlessTrailingMathSpacing } from '../../lib/input/input-canonicalization';
import {
  buildStatisticsInputLatex,
  defaultStatisticsDraftForScreen,
  DEFAULT_BINOMIAL_STATE,
  DEFAULT_FREQUENCY_TABLE,
  DEFAULT_MEAN_INFERENCE_STATE,
  DEFAULT_NORMAL_STATE,
  DEFAULT_POISSON_STATE,
  DEFAULT_STATISTICS_RELATIONSHIPS_STATE,
  DEFAULT_STATISTICS_DATA_SUMMARY_STATE,
  DEFAULT_STATS_DATASET,
} from '../../lib/statistics/examples';
import {
  getStatisticsMenuEntries,
  getStatisticsMenuEntryAtIndex,
  getStatisticsMenuFooterText,
  getStatisticsParentScreen,
  getStatisticsRouteMeta,
  defaultStatisticsScreenForSection,
  isStatisticsMenuScreen,
  moveStatisticsMenuIndex,
  statisticsSectionForScreen,
  statisticsLeafScreenForContext,
  statisticsWorkspaceScreenForLegacyScreen,
} from '../../lib/statistics/navigation';
import {
  parseStatisticsDraft,
  statisticsDraftStyle,
  statisticsRequestToScreen,
  buildStatisticsOoeInputRevisionId,
  clearStatisticsSourceSyncState,
  DEFAULT_STATISTICS_SOURCE_SYNC_STATE,
  datasetTextFromValues,
  datasetValuesFromText,
  pointsTextFromState,
  statisticsRequestToWorkingSource,
  statisticsSourceSyncFromDatasetEdit,
  statisticsSourceSyncFromFrequencyEdit,
  type RunStatisticsRuntimeRequest,
} from '../../lib/statistics/runtime-request';
import type {
  CoreDraftState,
  HistoryEntry,
  StatisticsRequest,
  StatisticsScreen,
  StatisticsSection,
  StatisticsInputMode,
  StatisticsWorkingSource,
} from '../../types/calculator';
import { launchWorkspaceRuntimeJob } from './launchWorkspaceRuntimeJob';
import { createCanonicalRuntimeError } from '../../lib/result-contract';
import { statisticsRequestFromSurfaceStateForScreen } from './statistics-origin-request';
import {
  copyStatisticsSurfaceState,
  defaultStatisticsSectionScreens,
} from './statistics-surface-state';
import type { StatisticsSurfaceState } from './workspace-surface-state';
import type { UseStatisticsRuntimeOptions } from './statistics-runtime-types';
import {
  cacheStatisticsSectionOutcome,
  statisticsSectionIsActiveInOrigin,
} from './statistics-section-results';
import {
  prepareStatisticsDataset,
  prepareStatisticsFrequencyTable,
} from './statistics-data-conversion';
import {
  binomialStateFromRequest,
  normalStateFromRequest,
  poissonStateFromRequest,
} from './statistics-probability-state';

type StatisticsStateSnapshot = Parameters<typeof buildStatisticsInputLatex>[1];

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
  updateWorkspaceInstanceSurfaceState,
}: UseStatisticsRuntimeOptions) {
  const [statisticsScreen, setStatisticsScreen] = useState<StatisticsScreen>('descriptive');
  const [statisticsSection, setStatisticsSection] =
    useState<StatisticsSection>('dataSummary');
  const [statisticsInputMode, setStatisticsInputMode] =
    useState<StatisticsInputMode>('guided');
  const [statisticsSectionScreens, setStatisticsSectionScreens] = useState(
    defaultStatisticsSectionScreens,
  );
  const [statisticsSectionResults, setStatisticsSectionResults] = useState<
    StatisticsSurfaceState['statisticsSectionResults']
  >({});
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
  const [statisticsDatasetDraftText, setStatisticsDatasetDraftText] = useState(datasetTextFromValues(DEFAULT_STATS_DATASET.values));
  const [frequencyTable, setFrequencyTable] = useState(DEFAULT_FREQUENCY_TABLE);
  const [dataSummaryState, setDataSummaryState] = useState(
    DEFAULT_STATISTICS_DATA_SUMMARY_STATE,
  );
  const [binomialState, setBinomialState] = useState(DEFAULT_BINOMIAL_STATE);
  const [normalState, setNormalState] = useState(DEFAULT_NORMAL_STATE);
  const [poissonState, setPoissonState] = useState(DEFAULT_POISSON_STATE);
  const [meanInferenceState, setMeanInferenceState] =
    useState(DEFAULT_MEAN_INFERENCE_STATE);
  const [relationshipsState, setRelationshipsState] = useState(
    DEFAULT_STATISTICS_RELATIONSHIPS_STATE,
  );
  const [statisticsDraftState, setStatisticsDraftState] = useState<CoreDraftState>(() =>
    createCoreDraftState(
      defaultStatisticsDraftForScreen('descriptive', 'dataset'),
      'structured',
      'guided',
      true,
    ),
  );
  const statisticsSectionRef = useRef(statisticsSection);
  const statisticsWorkingSourceRef = useRef(statisticsWorkingSource);
  const statisticsStateSnapshotRef = useRef<StatisticsStateSnapshot | null>(null);
  const statisticsDraftStateRef = useRef(statisticsDraftState);
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
  const regressionState = { points: relationshipsState.points };
  const correlationState = { points: relationshipsState.points };
  const statisticsStateSnapshot = {
    dataset: statsDataset,
    frequencyTable,
    dataSummary: dataSummaryState,
    binomial: binomialState,
    normal: normalState,
    poisson: poissonState,
    meanInference: meanInferenceState,
    regression: regressionState,
    correlation: correlationState,
  };
  statisticsSectionRef.current = statisticsSection;
  statisticsWorkingSourceRef.current = statisticsWorkingSource;
  statisticsStateSnapshotRef.current = statisticsStateSnapshot;
  statisticsDraftStateRef.current = statisticsDraftState;
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
  const statisticsDatasetText = statisticsDatasetDraftText;
  const statisticsRelationshipsText = pointsTextFromState(relationshipsState);
  const statisticsFilledFrequencyRowCount = frequencyTable.rows.filter(
    (row) => row.value.trim() && row.frequency.trim(),
  ).length;
  const statisticsSourceSyncSummary =
    statisticsSourceSyncState.datasetStale
      ? 'Frequency table has newer edits; the list draft is preserved.'
      : statisticsSourceSyncState.frequencyTableStale
        ? 'List has newer edits; the frequency-table draft is preserved.'
        : 'List and frequency table currently represent the same data.';
  const activeStatisticsSectionResult = statisticsSectionResults[statisticsSection] ?? null;
  const activeStatisticsInputLatex = buildStatisticsInputLatex(
    statisticsSectionScreens[statisticsSection],
    statisticsStateSnapshot,
    statisticsWorkingSource,
  );
  const activeStatisticsInputRevisionId = buildStatisticsOoeInputRevisionId({
    inputLatex: activeStatisticsInputLatex,
    screenHint: statisticsSectionScreens[statisticsSection],
    workingSourceHint: statisticsWorkingSource,
  });
  const activeStatisticsResultIsStale = Boolean(
    activeStatisticsSectionResult
    && activeStatisticsSectionResult.inputRevisionId !== activeStatisticsInputRevisionId,
  );

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

    let inputLatex = statisticsDraftStateRef.current.rawLatex.trim();
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

  function readLiveStatisticsRuntimeRequestForScreen(
    screenHint: StatisticsScreen,
    useExpressionDraft: boolean,
  ) {
    if (currentModeRef.current !== 'statistics') {
      return null;
    }

    const liveSnapshot = statisticsStateSnapshotRef.current;
    const inputLatex = useExpressionDraft
      ? readLiveStatisticsInputLatex(screenHint, true)
      : liveSnapshot
        ? buildStatisticsInputLatex(
            screenHint,
            liveSnapshot,
            statisticsWorkingSourceRef.current,
          )
        : '';
    if (!inputLatex) {
      return null;
    }

    return {
      inputLatex,
      screenHint,
      workingSourceHint: statisticsWorkingSourceRef.current,
    } satisfies RunStatisticsRuntimeRequest;
  }

  function openStatisticsScreen(screen: StatisticsScreen) {
    const workspaceScreen = statisticsWorkspaceScreenForLegacyScreen(screen);
    const nextSection = statisticsSectionForScreen(workspaceScreen);
    if (workspaceScreen === 'descriptive' || workspaceScreen === 'frequency') {
      setDataSummaryState((currentState) => ({
        ...currentState,
        analysis: workspaceScreen,
      }));
    }
    if (workspaceScreen === 'regression' || workspaceScreen === 'correlation') {
      setRelationshipsState((currentState) => ({
        ...currentState,
        analysis: workspaceScreen,
      }));
    }
    setStatisticsScreen(workspaceScreen);
    setStatisticsSection(nextSection);
    setStatisticsSectionScreens((currentScreens) => ({
      ...currentScreens,
      [nextSection]: workspaceScreen,
    }));
    const nextWorkingSource = statisticsWorkingSourceForScreen(workspaceScreen);
    setStatisticsWorkingSource(nextWorkingSource);
    if (!isStatisticsMenuScreen(workspaceScreen)) {
      setStatisticsDraftState(
        statisticsDraftStateForScreen(
          workspaceScreen,
          buildStatisticsDraftForScreen(workspaceScreen, nextWorkingSource)
            || defaultStatisticsDraftForScreen(workspaceScreen, nextWorkingSource),
          'guided',
        ),
      );
    }
    setDisplayOutcome(statisticsSectionResults[nextSection]?.outcome ?? null);
  }

  function openStatisticsSection(section: StatisticsSection) {
    const screen = statisticsSectionScreens[section]
      ?? defaultStatisticsScreenForSection(section);
    setStatisticsSection(section);
    setStatisticsScreen(screen);
    setDisplayOutcome(statisticsSectionResults[section]?.outcome ?? null);
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
    setStatisticsDatasetDraftText(text);
    setStatsDataset({ values: datasetValuesFromText(text) });
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
    setRelationshipsState((currentState) => ({
      ...currentState,
      analysis: kind,
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
    setRelationshipsState((currentState) => ({
      ...currentState,
      analysis: kind,
      points: [...currentState.points, { x: '', y: '' }],
    }));
  }

  function removeRegressionPoint(kind: 'regression' | 'correlation', index: number) {
    setRelationshipsState((currentState) => ({
      ...currentState,
      analysis: kind,
      points: currentState.points.length <= 1
        ? [{ x: '', y: '' }]
        : currentState.points.filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  function switchStatisticsSource(source: StatisticsWorkingSource) {
    setStatisticsWorkingSource(source);
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
    const nextTable = prepareStatisticsFrequencyTable({
      dataset: statsDataset,
      syncState: statisticsSourceSyncState,
      confirmReplace: (message) => typeof window === 'undefined' || window.confirm(message),
    });
    if (!nextTable) return;
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
    const conversion = prepareStatisticsDataset({
      table: frequencyTable,
      syncState: statisticsSourceSyncState,
      confirmReplace: (message) => typeof window === 'undefined' || window.confirm(message),
    });
    if (!conversion.ok) {
      if (conversion.notice) setClipboardNotice(conversion.notice);
      return;
    }
    const nextDataset = conversion.dataset;
    setStatsDataset(nextDataset);
    setStatisticsDatasetDraftText(datasetTextFromValues(nextDataset.values));
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
      setDataSummaryState((currentState) => ({ ...currentState, analysis: 'descriptive' }));
      setStatsDataset({ values: request.values });
      setStatisticsDatasetDraftText(datasetTextFromValues(request.values));
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
      if (request.kind === 'descriptive') {
        setDataSummaryState({
          analysis: 'descriptive',
          quartiles: request.quartiles ?? 'halves',
          context: request.context ?? 'compare',
        });
      } else if (request.kind === 'frequency') {
        setDataSummaryState((currentState) => ({ ...currentState, analysis: 'frequency' }));
      }
      setStatisticsWorkingSource(nextSource);
      if (nextSource === 'dataset') {
        setStatsDataset({ values: request.values });
        setStatisticsDatasetDraftText(datasetTextFromValues(request.values));
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
      setBinomialState(binomialStateFromRequest(request));
      return;
    }

    if (request.kind === 'normal') {
      setNormalState(normalStateFromRequest(request));
      return;
    }

    if (request.kind === 'poisson') {
      setPoissonState(poissonStateFromRequest(request));
      return;
    }

    if (request.kind === 'regression') {
      setRelationshipsState({ analysis: 'regression', points: request.points });
      return;
    }

    setRelationshipsState({ analysis: 'correlation', points: request.points });
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
    setStatisticsDatasetDraftText(datasetTextFromValues(DEFAULT_STATS_DATASET.values));
    setStatsDataset(DEFAULT_STATS_DATASET);
    setFrequencyTable(DEFAULT_FREQUENCY_TABLE);
    setStatisticsWorkingSource(source);
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
    switch (statisticsSection) {
      case 'dataSummary':
        resetStatisticsSourceState('dataset');
        setDataSummaryState(DEFAULT_STATISTICS_DATA_SUMMARY_STATE);
        resetStatisticsDraftForScreen(statisticsScreen, 'dataset');
        break;
      case 'probability':
        setBinomialState(DEFAULT_BINOMIAL_STATE);
        setNormalState(DEFAULT_NORMAL_STATE);
        setPoissonState(DEFAULT_POISSON_STATE);
        resetStatisticsDraftForScreen(statisticsScreen);
        break;
      case 'inference':
        setMeanInferenceState(DEFAULT_MEAN_INFERENCE_STATE);
        resetStatisticsDraftForScreen('meanInference', statisticsWorkingSource);
        break;
      case 'relationships':
        setRelationshipsState(DEFAULT_STATISTICS_RELATIONSHIPS_STATE);
        resetStatisticsDraftForScreen(statisticsScreen);
        break;
    }
    setStatisticsSectionResults((currentResults) => {
      const nextResults = { ...currentResults };
      delete nextResults[statisticsSection];
      return nextResults;
    });
    setDisplayOutcome(null);
  }

  function resetStatisticsRuntime() {
    setStatisticsScreen('descriptive');
    setStatisticsSection('dataSummary');
    setStatisticsInputMode('guided');
    setStatisticsSectionScreens(defaultStatisticsSectionScreens());
    setStatisticsSectionResults({});
    setStatisticsMenuSelection({ home: 0, probabilityHome: 0, inferenceHome: 0 });
    setStatisticsWorkingSource('dataset');
    setStatisticsSourceSyncState(DEFAULT_STATISTICS_SOURCE_SYNC_STATE);
    setStatsDataset(DEFAULT_STATS_DATASET); setFrequencyTable(DEFAULT_FREQUENCY_TABLE); setStatisticsDatasetDraftText(datasetTextFromValues(DEFAULT_STATS_DATASET.values));
    setDataSummaryState(DEFAULT_STATISTICS_DATA_SUMMARY_STATE);
    setBinomialState(DEFAULT_BINOMIAL_STATE); setNormalState(DEFAULT_NORMAL_STATE);
    setPoissonState(DEFAULT_POISSON_STATE); setMeanInferenceState(DEFAULT_MEAN_INFERENCE_STATE);
    setRelationshipsState(DEFAULT_STATISTICS_RELATIONSHIPS_STATE);
    setStatisticsDraftState(createCoreDraftState(
      defaultStatisticsDraftForScreen('descriptive', 'dataset'),
      'structured',
      'guided',
      true,
    ));
  }

  function captureStatisticsSurfaceState(): StatisticsSurfaceState {
    return copyStatisticsSurfaceState({
      statisticsScreen, statisticsSection, statisticsInputMode,
      statisticsSectionScreens, statisticsSectionResults,
      statisticsMenuSelection, statisticsWorkingSource,
      statisticsSourceSyncState, statsDataset, statisticsDatasetDraftText, frequencyTable,
      dataSummaryState, binomialState,
      normalState, poissonState, meanInferenceState, relationshipsState,
      statisticsDraftState,
    });
  }

  function restoreStatisticsSurfaceState(state: StatisticsSurfaceState | null) {
    if (!state) {
      resetStatisticsRuntime();
      return;
    }

    const copy = copyStatisticsSurfaceState(state);
    setStatisticsScreen(copy.statisticsScreen);
    setStatisticsSection(copy.statisticsSection);
    setStatisticsInputMode(copy.statisticsInputMode);
    setStatisticsSectionScreens(copy.statisticsSectionScreens);
    setStatisticsSectionResults(copy.statisticsSectionResults);
    setStatisticsMenuSelection(copy.statisticsMenuSelection); setStatisticsWorkingSource(copy.statisticsWorkingSource);
    setStatisticsSourceSyncState(copy.statisticsSourceSyncState); setStatsDataset(copy.statsDataset); setStatisticsDatasetDraftText(copy.statisticsDatasetDraftText);
    setFrequencyTable(copy.frequencyTable); setDataSummaryState(copy.dataSummaryState);
    setBinomialState(copy.binomialState); setNormalState(copy.normalState);
    setPoissonState(copy.poissonState); setMeanInferenceState(copy.meanInferenceState);
    setRelationshipsState(copy.relationshipsState);
    setStatisticsDraftState(copy.statisticsDraftState);
  }

  function runStatisticsAction() {
    const editorFocused = isStatisticsDraftFocused();
    if (isStatisticsMenuOpen && !editorFocused) {
      return;
    }

    startTransition(() => {
      const screenHint = statisticsLeafScreenForContext(
        statisticsScreen,
        statisticsMenuSelection,
      );
      const originSection = statisticsSectionForScreen(screenHint);
      const originWorkspace = getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
      const useExpressionDraft = editorFocused;
      const inputLatex = readLiveStatisticsInputLatex(screenHint, editorFocused);

      if (!inputLatex) {
        setDisplayOutcome(createCanonicalRuntimeError(
          statisticsRouteMeta?.label ?? 'Statistics',
          'Enter a Statistics request or use a guided statistics tool before evaluating.',
        ));
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
      const inputRevisionId = buildStatisticsOoeInputRevisionId(request);
      launchWorkspaceRuntimeJob({
        mode: 'statistics',
        modeLabel: 'Statistics',
        capabilityId: 'statistics.evaluate',
        request,
        ticketInputLatex: inputLatex,
        buildInputRevisionId: buildStatisticsOoeInputRevisionId,
        readLiveRequest: () => readLiveStatisticsRuntimeRequestForScreen(
          screenHint,
          useExpressionDraft,
        ),
        getActiveWorkspaceInstanceRuntimeContext,
        getWorkspaceInstances,
        readRequestFromSurfaceState: (surfaceState, instance) =>
          statisticsRequestFromSurfaceStateForScreen(
            surfaceState,
            instance,
            screenHint,
            useExpressionDraft,
          ),
        isModeVisible: () => {
          const activeWorkspace = getActiveWorkspaceInstanceRuntimeContext?.() ?? null;
          return currentModeRef.current === 'statistics'
            && statisticsSectionRef.current === originSection
            && (
              !originWorkspace
              || activeWorkspace?.workspaceInstanceId === originWorkspace.workspaceInstanceId
            );
        },
        loadRunner: async () =>
          (await import('../../lib/modes/statistics')).runStatisticsModeWithOoePilot,
        reserveHistoryTicket,
        discardHistoryTicket,
        setDisplayOutcome,
        setRuntimeStatusOverride,
        commit: (payload, ticket, visible) => {
          const originSectionActive = statisticsSectionIsActiveInOrigin({
            activeSection: statisticsSectionRef.current,
            originWorkspace,
            originSection,
            getActiveWorkspace: getActiveWorkspaceInstanceRuntimeContext,
            getWorkspaceInstances,
          });
          cacheStatisticsSectionOutcome({
            originWorkspace,
            originSection,
            entry: { outcome: payload.outcome, inputLatex, inputRevisionId },
            getActiveWorkspace: getActiveWorkspaceInstanceRuntimeContext,
            getWorkspaceInstances,
            setActiveResults: setStatisticsSectionResults,
            updateWorkspaceSurface: updateWorkspaceInstanceSurfaceState,
          });
          if (visible && payload.replaySeed) {
            setStatisticsWorkingSource(payload.replaySeed.workingSource);
          }

          commitOutcome(payload.outcome, inputLatex, 'statistics', {
            statisticsScreen: payload.replayScreen,
            statisticsSeed: payload.replaySeed,
            historyTicketId: ticket?.id,
            historyLaunchOrder: ticket?.historyLaunchOrder,
            suppressDisplayCommit: !visible,
            suppressWorkspaceDisplayCommit: !originSectionActive,
          });
        },
      });
    });
  }

  return {
    addRegressionPoint, addStatisticsFrequencyRow, applyStatisticsRequest,
    binomialState, buildStatisticsDraftForScreen, captureStatisticsSurfaceState, correlationState,
    dataSummaryState, setDataSummaryState,
    currentStatisticsMenuIndex, expandStatisticsTableToDataset, focusStatisticsEditor, frequencyTable,
    goBackInStatistics, importDatasetIntoFrequencyTable, isStatisticsDraftFocused,
    isStatisticsMenuOpen, loadStatisticsDraft, loadStatisticsDraftForLatex, loadStatisticsExample,
    meanInferenceState, moveCurrentStatisticsMenuSelection, normalState, openSelectedStatisticsMenuEntry,
    openStatisticsScreen, openStatisticsSection, poissonState, regressionState, removeRegressionPoint, removeStatisticsFrequencyRow,
    resetCurrentStatisticsScreen, resetStatisticsRuntime,
    restoreStatisticsHistoryEntry, restoreStatisticsSurfaceState, runStatisticsAction,
    selectedStatisticsMenuEntry, setBinomialState, setCurrentStatisticsMenuIndex, setMeanInferenceState, setNormalState,
    setPoissonState, statisticsBinomialNRef, statisticsCorrelationXRef,
    statisticsDatasetRef, statisticsDatasetText, statisticsDraftFieldRef, statisticsDraftLatex,
    statisticsDraftState, statisticsEditorIsEditable, statisticsFilledFrequencyRowCount, statisticsFrequencyValueRef,
    statisticsMeanInferenceLevelRef, statisticsMenuEntries, statisticsMenuFooterText, statisticsMenuPanelRef,
    statisticsMenuSelection, statisticsNormalMeanRef, statisticsPoissonLambdaRef, statisticsRelationshipsText,
    statisticsRegressionXRef, statisticsRouteMeta, statisticsScreen, statisticsSection,
    statisticsInputMode, setStatisticsInputMode, statisticsSectionScreens,
    activeStatisticsSectionResult, activeStatisticsResultIsStale,
    statisticsSourceSyncState,
    statisticsSourceSyncSummary, statisticsWorkbenchExpression,
    statisticsWorkingSource, statsDataset, switchStatisticsSource,
    relationshipsState, updateRegressionPointDraft, updateStatisticsDataset, updateStatisticsDraft,
    updateStatisticsFrequencyRow,
  };
}
