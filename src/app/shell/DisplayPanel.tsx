/* eslint-disable @typescript-eslint/no-explicit-any */
import { DisplayEditorSurface } from './display-panel/DisplayEditorSurface';
import { DisplayOutcomeShell } from './display-panel/DisplayOutcomeShell';
import { DisplayPreviewSurface } from './display-panel/DisplayPreviewSurface';
import { useDisplayRenderQueue } from './display-panel/useDisplayRenderQueue';

type DisplayPanelProps = Record<string, any>;

function DisplayPanel({
  activeAlgebraTransforms,
  activeExpressionLatex,
  activeFieldRef,
  activeLauncherCategory,
  activeResultCopyText,
  activeResultEditorLatex,
  calculusMenuFooterText,
  calculusRouteMeta,
  calculusScreen,
  calculateKeyboardLayouts,
  calculateLatex,
  calculateRouteMeta,
  calculateScreen,
  clipboardNotice,
  copyText,
  copyableGuideExampleLatex,
  currentMode,
  deferredDisplayLatex,
  displayHeaderLabel,
  displayMathLatex,
  displayOutcome,
  displayResultBadges,
  editorAnalysisStatusLabel = 'Ready',
  editorAnalysisStopped = false,
  editActiveExpression,
  equationKeyboardLayouts,
  equationLatex,
  equationMenuFooterText,
  equationResultTitle,
  equationRouteMeta,
  equationScreen,
  equationSolveTarget,
  geometryDraftFieldRef,
  geometryDraftLatex,
  geometryKeyboardLayouts,
  geometryMenuFooterText,
  geometryRouteMeta,
  geometryScreen,
  getAlgebraTransformLabel,
  getPeriodicStopReasonText,
  guideArticle,
  guideModeRef,
  guideRoute,
  guideRouteMeta,
  guideSearchInputRef,
  guideSearchQuery,
  hydrated,
  isCalculusMenuOpen,
  isEquationMenuOpen,
  isEquationWorkScreen,
  isGeometryMenuOpen,
  isLauncherOpen,
  isPending,
  isStatisticsMenuOpen,
  isTrigMenuOpen,
  labsRuntime,
  launchGuideExample,
  launcherState,
  loadLatexIntoEditor,
  mainFieldRef,
  onRestartEditorAnalysis,
  onRunEditor,
  onStopEditorAnalysis,
  openPromptTarget,
  pasteIntoEditor,
  runCalculateAction,
  runCalculateAlgebraTransformAction,
  runEquationAlgebraTransformAction,
  selectedCalculusMenuEntry,
  selectedEquationMenuEntry,
  selectedGeometryMenuEntry,
  selectedGuideExample,
  selectedGuideListEntry,
  selectedLauncherApp,
  selectedLauncherCategory,
  selectedStatisticsMenuEntry,
  selectedTrigMenuEntry,
  setCalculateLatex,
  setEquationLatex,
  setGuideQuery,
  settings,
  showEditorRuntimeControls = false,
  shouldShowCalculateAlgebraTray,
  shouldShowEquationAlgebraTray,
  statisticsDraftFieldRef,
  statisticsDraftLatex,
  statisticsKeyboardLayouts,
  statisticsMenuFooterText,
  statisticsRouteMeta,
  statisticsScreen,
  symbolicDisplayPrefs,
  trigDraftFieldRef,
  trigDraftLatex,
  trigMenuFooterText,
  trigRouteMeta,
  trigScreen,
  triggerDisplayOutcomeAction,
  trigonometryKeyboardLayouts,
  updateGeometryDraft,
  updateStatisticsDraft,
  updateTrigDraft,
  variableMemory,
}: DisplayPanelProps) {
  const showApproxReadback = Boolean(
    displayOutcome
    && (displayOutcome.kind === 'success' || displayOutcome.kind === 'error')
    && settings.outputStyle !== 'exact'
    && displayOutcome.approxText,
  );
  const {
    hasDisplayRenderQueue,
    scheduledDisplayBlocks,
    visibleDisplayBlockIds,
  } = useDisplayRenderQueue({
    displayOutcome,
    detailedFactsEnabled: Boolean(settings?.detailedFactsEnabled),
    getPeriodicStopReasonText,
    showApproxReadback,
  });
  const displayStatus = clipboardNotice ?? (
    hasDisplayRenderQueue
      ? 'Rendering result'
      : isPending
        ? 'Computing...'
        : hydrated
          ? editorAnalysisStatusLabel
          : 'Loading...'
  );

  return (
  <section className="display-panel">
    <div className="display-header">
      <span className="display-header-label">{displayHeaderLabel}</span>
      {showEditorRuntimeControls ? (
        <div className="editor-runtime-controls" data-testid="editor-runtime-controls">
          <button
            type="button"
            data-testid="editor-runtime-run"
            onClick={onRunEditor}
            title="Run the current editor input and resume editor analysis."
          >
            Run
          </button>
          <button
            type="button"
            data-testid="editor-runtime-stop"
            onClick={onStopEditorAnalysis}
            disabled={editorAnalysisStopped}
            title="Pause editor analysis and request stop for the current runtime lane."
          >
            Stop
          </button>
          <button
            type="button"
            data-testid="editor-runtime-restart"
            onClick={onRestartEditorAnalysis}
            title="Clear and remount the active editor, then restart editor analysis."
          >
            Restart Editor
          </button>
        </div>
      ) : null}
      <span className="display-header-status" data-testid="display-status">{displayStatus}</span>
    </div>
    <DisplayEditorSurface
      activeFieldRef={activeFieldRef}
      activeLauncherCategory={activeLauncherCategory}
      calculusRouteMeta={calculusRouteMeta}
      calculusScreen={calculusScreen}
      calculateKeyboardLayouts={calculateKeyboardLayouts}
      calculateLatex={calculateLatex}
      calculateRouteMeta={calculateRouteMeta}
      calculateScreen={calculateScreen}
      currentMode={currentMode}
      deferredDisplayLatex={deferredDisplayLatex}
      displayMathLatex={displayMathLatex}
      equationKeyboardLayouts={equationKeyboardLayouts}
      equationLatex={equationLatex}
      equationRouteMeta={equationRouteMeta}
      equationScreen={equationScreen}
      equationSolveTarget={equationSolveTarget}
      geometryDraftFieldRef={geometryDraftFieldRef}
      geometryDraftLatex={geometryDraftLatex}
      geometryKeyboardLayouts={geometryKeyboardLayouts}
      geometryScreen={geometryScreen}
      guideArticle={guideArticle}
      guideModeRef={guideModeRef}
      guideRoute={guideRoute}
      guideRouteMeta={guideRouteMeta}
      isCalculusMenuOpen={isCalculusMenuOpen}
      isEquationMenuOpen={isEquationMenuOpen}
      isGeometryMenuOpen={isGeometryMenuOpen}
      isLauncherOpen={isLauncherOpen}
      isStatisticsMenuOpen={isStatisticsMenuOpen}
      isTrigMenuOpen={isTrigMenuOpen}
      labsRuntime={labsRuntime}
      launcherState={launcherState}
      mainFieldRef={mainFieldRef}
      selectedCalculusMenuEntry={selectedCalculusMenuEntry}
      selectedEquationMenuEntry={selectedEquationMenuEntry}
      selectedGuideListEntry={selectedGuideListEntry}
      selectedLauncherApp={selectedLauncherApp}
      selectedLauncherCategory={selectedLauncherCategory}
      selectedStatisticsMenuEntry={selectedStatisticsMenuEntry}
      selectedTrigMenuEntry={selectedTrigMenuEntry}
      setCalculateLatex={setCalculateLatex}
      setEquationLatex={setEquationLatex}
      statisticsDraftFieldRef={statisticsDraftFieldRef}
      statisticsDraftLatex={statisticsDraftLatex}
      statisticsKeyboardLayouts={statisticsKeyboardLayouts}
      statisticsRouteMeta={statisticsRouteMeta}
      statisticsScreen={statisticsScreen}
      trigDraftFieldRef={trigDraftFieldRef}
      trigDraftLatex={trigDraftLatex}
      trigScreen={trigScreen}
      trigonometryKeyboardLayouts={trigonometryKeyboardLayouts}
      updateGeometryDraft={updateGeometryDraft}
      updateStatisticsDraft={updateStatisticsDraft}
      updateTrigDraft={updateTrigDraft}
      variableMemory={variableMemory}
    />
    <DisplayPreviewSurface
      activeExpressionLatex={activeExpressionLatex}
      calculusRouteMeta={calculusRouteMeta}
      copyText={copyText}
      currentMode={currentMode}
      deferredDisplayLatex={deferredDisplayLatex}
      editActiveExpression={editActiveExpression}
      equationRouteMeta={equationRouteMeta}
      geometryRouteMeta={geometryRouteMeta}
      guideModeRef={guideModeRef}
      guideRoute={guideRoute}
      guideRouteMeta={guideRouteMeta}
      guideSearchInputRef={guideSearchInputRef}
      guideSearchQuery={guideSearchQuery}
      isCalculusMenuOpen={isCalculusMenuOpen}
      isEquationMenuOpen={isEquationMenuOpen}
      isGeometryMenuOpen={isGeometryMenuOpen}
      isLauncherOpen={isLauncherOpen}
      isStatisticsMenuOpen={isStatisticsMenuOpen}
      isTrigMenuOpen={isTrigMenuOpen}
      labsRuntime={labsRuntime}
      launcherState={launcherState}
      pasteIntoEditor={pasteIntoEditor}
      selectedCalculusMenuEntry={selectedCalculusMenuEntry}
      selectedEquationMenuEntry={selectedEquationMenuEntry}
      selectedGeometryMenuEntry={selectedGeometryMenuEntry}
      selectedGuideExample={selectedGuideExample}
      selectedGuideListEntry={selectedGuideListEntry}
      selectedLauncherApp={selectedLauncherApp}
      selectedLauncherCategory={selectedLauncherCategory}
      selectedStatisticsMenuEntry={selectedStatisticsMenuEntry}
      selectedTrigMenuEntry={selectedTrigMenuEntry}
      setGuideQuery={setGuideQuery}
      statisticsRouteMeta={statisticsRouteMeta}
      trigRouteMeta={trigRouteMeta}
    />
    <DisplayOutcomeShell
      activeAlgebraTransforms={activeAlgebraTransforms}
      activeExpressionLatex={activeExpressionLatex}
      activeLauncherCategory={activeLauncherCategory}
      activeResultCopyText={activeResultCopyText}
      activeResultEditorLatex={activeResultEditorLatex}
      calculusMenuFooterText={calculusMenuFooterText}
      calculusRouteMeta={calculusRouteMeta}
      calculateRouteMeta={calculateRouteMeta}
      calculateScreen={calculateScreen}
      copyText={copyText}
      copyableGuideExampleLatex={copyableGuideExampleLatex}
      currentMode={currentMode}
      displayOutcome={displayOutcome}
      displayResultBadges={displayResultBadges}
      equationMenuFooterText={equationMenuFooterText}
      equationResultTitle={equationResultTitle}
      equationRouteMeta={equationRouteMeta}
      geometryMenuFooterText={geometryMenuFooterText}
      geometryRouteMeta={geometryRouteMeta}
      getAlgebraTransformLabel={getAlgebraTransformLabel}
      guideModeRef={guideModeRef}
      guideRoute={guideRoute}
      guideRouteMeta={guideRouteMeta}
      isCalculusMenuOpen={isCalculusMenuOpen}
      isEquationMenuOpen={isEquationMenuOpen}
      isEquationWorkScreen={isEquationWorkScreen}
      isGeometryMenuOpen={isGeometryMenuOpen}
      isLauncherOpen={isLauncherOpen}
      isStatisticsMenuOpen={isStatisticsMenuOpen}
      isTrigMenuOpen={isTrigMenuOpen}
      labsRuntime={labsRuntime}
      launchGuideExample={launchGuideExample}
      launcherState={launcherState}
      loadLatexIntoEditor={loadLatexIntoEditor}
      openPromptTarget={openPromptTarget}
      runCalculateAction={runCalculateAction}
      runCalculateAlgebraTransformAction={runCalculateAlgebraTransformAction}
      runEquationAlgebraTransformAction={runEquationAlgebraTransformAction}
      scheduledDisplayBlocks={scheduledDisplayBlocks}
      selectedGuideExample={selectedGuideExample}
      shouldShowCalculateAlgebraTray={shouldShowCalculateAlgebraTray}
      shouldShowEquationAlgebraTray={shouldShowEquationAlgebraTray}
      statisticsMenuFooterText={statisticsMenuFooterText}
      statisticsRouteMeta={statisticsRouteMeta}
      symbolicDisplayPrefs={symbolicDisplayPrefs}
      trigMenuFooterText={trigMenuFooterText}
      trigRouteMeta={trigRouteMeta}
      triggerDisplayOutcomeAction={triggerDisplayOutcomeAction}
      visibleDisplayBlockIds={visibleDisplayBlockIds}
    />
  </section>
  );
}

export { DisplayPanel };
