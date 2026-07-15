/* eslint-disable @typescript-eslint/no-explicit-any */
import { DisplayEditorSurface } from './display-panel/DisplayEditorSurface';
import { DisplayOutcomeShell } from './display-panel/DisplayOutcomeShell';
import { DisplayPreviewSurface } from './display-panel/DisplayPreviewSurface';
import { useDisplayRenderQueue } from './display-panel/useDisplayRenderQueue';
import { useLanguage } from '../../lib/language/language-context';
import { createPortal } from 'react-dom';

type DisplayPanelProps = Record<string, any>;

function DisplayPanel({
  activeAlgebraTransforms,
  activeExpressionLatex,
  activeFieldRef,
  activeLauncherCategory,
  activeResultCopyText,
  activeResultEditorLatex,
  calculusMainEditorActive,
  calculusMainEditorLatex = '',
  calculusMainEditorVariable,
  calculusKeyboardLayouts,
  calculusMenuFooterText,
  calculusRouteMeta,
  calculusScreen,
  calculateKeyboardLayouts,
  calculateLatex,
  calculateRouteMeta,
  calculateScreen,
  clipboardNotice,
  copyActiveResult,
  copyText,
  copyableGuideExampleLatex,
  currentMode,
  deferredDisplayLatex,
  derivativePointValueRef,
  derivativePointWorkbench,
  derivativeWorkbench,
  displayHeaderLabel,
  displayMathLatex,
  displayOutcome,
  displayResultBadges,
  editorAnalysisStatusLabel,
  editorAnalysisStopped = false,
  editorRuntimeStopDisabled,
  editActiveExpression,
  equationKeyboardLayouts,
  equationLatex,
  equationMenuFooterText,
  equationResultTitle,
  equationRouteMeta,
  equationScreen,
  equationSolveTarget,
  formulaViewerSourceContext,
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
  implicitDerivativeState,
  isLauncherOpen,
  isStatisticsMenuOpen,
  isTrigMenuOpen,
  labsRuntime,
  launchGuideExample,
  launcherState,
  loadLatexIntoEditor,
  mainFieldRef,
  matrixEditorLatex,
  matrixKeyboardLayouts,
  matrixNamedValueNames,
  canonicalizeMatrixEditorPaste,
  canonicalizeVectorEditorPaste,
  onRestartEditorAnalysis,
  onRunEditor,
  onOpenFormulaViewer,
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
  setCalculusMainEditorLatex,
  setDerivativePointWorkbench,
  setDerivativeWorkbench,
  setEquationLatex,
  setGuideQuery,
  setImplicitDerivativeState,
  setMatrixEditorLatex,
  settings,
  showEditorRuntimeControls = false,
  shouldShowCalculateAlgebraTray,
  shouldShowEquationAlgebraTray,
  statisticsDraftFieldRef,
  statisticsDraftLatex,
  statisticsKeyboardLayouts,
  statisticsMenuFooterText,
  partialDerivativeState,
  portalTarget,
  suppressWhenPortalUnavailable = false,
  statisticsInputMode = 'expression',
  statisticsRouteMeta,
  statisticsScreen,
  setPartialDerivativeState,
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
  vectorEditorLatex,
  vectorKeyboardLayouts,
  vectorNamedValueNames,
  setVectorEditorLatex,
}: DisplayPanelProps) {
  const { strings } = useLanguage();
  const runtimeText = strings.shell.runtimeControls;
  const commonStatusText = strings.common.status;
  const showApproxReadback = Boolean(
    displayOutcome
    && (displayOutcome.kind === 'success' || displayOutcome.kind === 'error')
    && settings.outputStyle !== 'exact'
    && displayOutcome.canonicalResult.approximations?.primary,
  );
  const {
    hasDisplayRenderQueue,
    scheduledDisplayBlocks,
    visibleDisplayBlockIds,
  } = useDisplayRenderQueue({
    displayOutcome,
    detailedFactsEnabled: Boolean(settings?.detailedFactsEnabled),
    getPeriodicStopReasonText,
    answerReadbackStyle: settings.outputStyle,
    showApproxReadback,
    sourceMode: currentMode,
  });
  const displayStatus = clipboardNotice ?? (
    hasDisplayRenderQueue
      ? commonStatusText.renderingResult
      : hydrated
          ? editorAnalysisStatusLabel ?? commonStatusText.ready
          : commonStatusText.loading
  );
  const stopDisabled = editorRuntimeStopDisabled ?? editorAnalysisStopped;
  const suppressCalculusExpressionPreview = calculusMainEditorActive;

  const panel = (
  <section className={`display-panel ${currentMode === 'statistics' ? 'statistics-embedded-display-panel' : ''}`}>
    <div className="display-header">
      <span className="display-header-label">{displayHeaderLabel}</span>
      {showEditorRuntimeControls ? (
        <div className="editor-runtime-controls" data-testid="editor-runtime-controls">
          <button
            type="button"
            data-testid="editor-runtime-run"
            onClick={onRunEditor}
            title={runtimeText.runTitle}
          >
            {runtimeText.run}
          </button>
          <button
            type="button"
            data-testid="editor-runtime-stop"
            onClick={onStopEditorAnalysis}
            disabled={stopDisabled}
            title={runtimeText.stopTitle}
          >
            {runtimeText.stop}
          </button>
          <button
            type="button"
            data-testid="editor-runtime-restart"
            onClick={onRestartEditorAnalysis}
            title={runtimeText.restartEditorTitle}
          >
            {runtimeText.restartEditor}
          </button>
        </div>
      ) : null}
      <span className="display-header-status" data-testid="display-status">{displayStatus}</span>
    </div>
    {currentMode !== 'statistics' || statisticsInputMode === 'expression' ? (
    <DisplayEditorSurface
      activeFieldRef={activeFieldRef}
      activeLauncherCategory={activeLauncherCategory}
      calculusMainEditorActive={calculusMainEditorActive}
      calculusMainEditorLatex={calculusMainEditorLatex}
      calculusMainEditorVariable={calculusMainEditorVariable}
      calculusKeyboardLayouts={calculusKeyboardLayouts}
      calculusRouteMeta={calculusRouteMeta}
      calculusScreen={calculusScreen}
      calculateKeyboardLayouts={calculateKeyboardLayouts}
      calculateLatex={calculateLatex}
      calculateRouteMeta={calculateRouteMeta}
      calculateScreen={calculateScreen}
      currentMode={currentMode}
      deferredDisplayLatex={deferredDisplayLatex}
      derivativePointValueRef={derivativePointValueRef}
      derivativePointWorkbench={derivativePointWorkbench}
      derivativeWorkbench={derivativeWorkbench}
      implicitDerivativeState={implicitDerivativeState}
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
      matrixEditorLatex={matrixEditorLatex}
      matrixKeyboardLayouts={matrixKeyboardLayouts}
      matrixNamedValueNames={matrixNamedValueNames}
      canonicalizeMatrixEditorPaste={canonicalizeMatrixEditorPaste}
      canonicalizeVectorEditorPaste={canonicalizeVectorEditorPaste}
      onRunEditor={onRunEditor}
      selectedCalculusMenuEntry={selectedCalculusMenuEntry}
      selectedEquationMenuEntry={selectedEquationMenuEntry}
      selectedGuideListEntry={selectedGuideListEntry}
      selectedLauncherApp={selectedLauncherApp}
      selectedLauncherCategory={selectedLauncherCategory}
      selectedStatisticsMenuEntry={selectedStatisticsMenuEntry}
      selectedTrigMenuEntry={selectedTrigMenuEntry}
      setCalculateLatex={setCalculateLatex}
      setCalculusMainEditorLatex={setCalculusMainEditorLatex}
      setDerivativePointWorkbench={setDerivativePointWorkbench}
      setDerivativeWorkbench={setDerivativeWorkbench}
      setEquationLatex={setEquationLatex}
      setImplicitDerivativeState={setImplicitDerivativeState}
      setMatrixEditorLatex={setMatrixEditorLatex}
      settings={settings}
      statisticsDraftFieldRef={statisticsDraftFieldRef}
      statisticsDraftLatex={statisticsDraftLatex}
      statisticsKeyboardLayouts={statisticsKeyboardLayouts}
      statisticsRouteMeta={statisticsRouteMeta}
      statisticsScreen={statisticsScreen}
      partialDerivativeState={partialDerivativeState}
      setPartialDerivativeState={setPartialDerivativeState}
      trigDraftFieldRef={trigDraftFieldRef}
      trigDraftLatex={trigDraftLatex}
      trigScreen={trigScreen}
      trigonometryKeyboardLayouts={trigonometryKeyboardLayouts}
      updateGeometryDraft={updateGeometryDraft}
      updateStatisticsDraft={updateStatisticsDraft}
      updateTrigDraft={updateTrigDraft}
      variableMemory={variableMemory}
      vectorEditorLatex={vectorEditorLatex}
      vectorKeyboardLayouts={vectorKeyboardLayouts}
      vectorNamedValueNames={vectorNamedValueNames}
      setVectorEditorLatex={setVectorEditorLatex}
    />
    ) : null}
    {currentMode !== 'statistics' || statisticsInputMode === 'expression' ? (
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
      suppressExpressionPreview={suppressCalculusExpressionPreview}
      trigRouteMeta={trigRouteMeta}
    />
    ) : null}
    <DisplayOutcomeShell
      activeAlgebraTransforms={activeAlgebraTransforms}
      activeExpressionLatex={activeExpressionLatex}
      activeLauncherCategory={activeLauncherCategory}
      activeResultCopyText={activeResultCopyText}
      activeResultEditorLatex={activeResultEditorLatex}
      calculusMenuFooterText={calculusMenuFooterText}
      calculusRouteMeta={calculusRouteMeta}
      calculusScreen={calculusScreen}
      calculateRouteMeta={calculateRouteMeta}
      calculateScreen={calculateScreen}
      copyActiveResult={copyActiveResult}
      copyText={copyText}
      copyableGuideExampleLatex={copyableGuideExampleLatex}
      currentMode={currentMode}
      displayOutcome={displayOutcome}
      displayResultBadges={displayResultBadges}
      equationMenuFooterText={equationMenuFooterText}
      equationResultTitle={equationResultTitle}
      equationRouteMeta={equationRouteMeta}
      formulaViewerSourceContext={formulaViewerSourceContext}
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
      onOpenFormulaViewer={onOpenFormulaViewer}
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
  if (suppressWhenPortalUnavailable && !portalTarget) {
    return null;
  }
  return portalTarget ? createPortal(panel, portalTarget) : panel;
}

export { DisplayPanel };
