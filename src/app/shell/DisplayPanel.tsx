/* eslint-disable @typescript-eslint/no-explicit-any */
import { MathEditor } from '../../components/MathEditor';
import { MathStatic } from '../../components/MathStatic';
import { NotationText } from '../../components/NotationText';
import { VariableHintStrip } from '../../components/VariableHintStrip';
import type { LabRunnerInputKind } from '../../lib/labs/runner-types';
import { displayDetailSectionsForPolicy } from '../../lib/display/result-detail-policy';
import { buildResultReadbackSections } from '../../lib/display/result-readback';
import { LAB_INPUT_KIND_LABELS } from '../runtime/useLabsRuntime';

type DisplayPanelProps = Record<string, any>;

function DisplayPanel({
  activeAlgebraTransforms,
  activeExpressionLatex,
  activeFieldRef,
  activeLauncherCategory,
  activeResultCopyText,
  activeResultEditorLatex,
  advancedCalcMenuFooterText,
  advancedCalcRouteMeta,
  advancedCalcScreen,
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
  isAdvancedCalcMenuOpen,
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
  selectedAdvancedCalcMenuEntry,
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
  const isLabsMode = !isLauncherOpen && currentMode === 'labs';
  const labsInputLatex = labsRuntime
    ? labsRuntime.effectiveInputKind === 'corpus-case'
      ? labsRuntime.selectedCorpusCase?.latex ?? labsRuntime.effectiveInputLatex
      : labsRuntime.effectiveInputLatex
    : '';
  const labsInputKind = labsRuntime?.effectiveInputKind as LabRunnerInputKind | undefined;
  const labsInputKindLabel = labsInputKind ? LAB_INPUT_KIND_LABELS[labsInputKind] : 'Labs';
  const visibleDetailSections = displayDetailSectionsForPolicy(displayOutcome?.detailSections, {
    detailedFactsEnabled: Boolean(settings?.detailedFactsEnabled),
  });
  const resultReadbackSections = buildResultReadbackSections(displayOutcome);
  const answerReadback = resultReadbackSections.find((section) => section.kind === 'answer');
  const validWhenReadback = resultReadbackSections.find((section) => section.kind === 'valid-when');
  const displayStatus =
    clipboardNotice ?? (isPending ? 'Computing...' : hydrated ? editorAnalysisStatusLabel : 'Loading...');
  const hasExpressionPreview =
    typeof deferredDisplayLatex === 'string' && deferredDisplayLatex.trim().length > 0;
  const showApproxReadback = Boolean(
    displayOutcome
    && (displayOutcome.kind === 'success' || displayOutcome.kind === 'error')
    && settings.outputStyle !== 'exact'
    && displayOutcome.approxText,
  );

  function renderOutcomeReadback() {
    if (!answerReadback && !validWhenReadback && !showApproxReadback) {
      return null;
    }

    return (
      <div className="result-readback" data-testid="display-outcome-readback">
        {(answerReadback?.kind === 'answer' || showApproxReadback) ? (
          <div className="result-summary-block result-answer-block" data-testid="display-outcome-answer-block">
            <div className="result-summary-label">Answer</div>
            {answerReadback?.kind === 'answer' ? (
              <div data-testid="display-outcome-exact">
                <MathStatic
                  className="result-math"
                  latex={answerReadback.latex}
                  displayPrefs={symbolicDisplayPrefs}
                />
              </div>
            ) : null}
            {showApproxReadback ? (
              <NotationText
                className="result-approx"
                data-testid="display-outcome-approx"
                text={displayOutcome.approxText}
              />
            ) : null}
          </div>
        ) : null}
        {validWhenReadback?.kind === 'valid-when' ? (
          <div className="result-summary-block result-validity-block" data-testid="display-outcome-valid-when">
            <div className="result-summary-label">{validWhenReadback.label}</div>
            <div className="result-detail-lines">
              {validWhenReadback.latex.map((line: string, index: number) => (
                <div key={`${line}-${index}`} data-testid={`display-outcome-supplement-${index}`}>
                  <MathStatic
                    className="result-math result-math-supplement"
                    latex={line}
                    normalizeDisplay={false}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

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
    <div className="display-editor">
      {isLabsMode ? (
        <div className="labs-display-shell" data-testid="labs-display-preview">
          <div className="labs-display-status">
            <span className="labs-chip labs-chip--neutral">Developer only</span>
            <span className="labs-chip labs-chip--danger">Experimental</span>
            <span className="labs-chip labs-chip--neutral">No history mixing</span>
          </div>
          {labsRuntime?.runnerUiEnabled && labsRuntime.selectedRunner ? (
            <>
              <div className="labs-display-copy">
                <strong>{labsRuntime.selectedRunner.title}</strong>
                <span>{labsInputKindLabel} input</span>
              </div>
              <MathStatic
                className="labs-display-math"
                latex={labsInputLatex}
                emptyLabel="Choose or type a Labs runner input below."
                deferRender
              />
            </>
          ) : (
            <div className="labs-display-copy">
              <strong>Labs catalog</strong>
              <span>Read-only incubation catalog. Enable local runners to preview experiment input here.</span>
            </div>
          )}
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'calculate' && calculateScreen !== 'standard' && calculateRouteMeta ? (
        <div className="equation-route">
          <div className="equation-breadcrumbs">
            {calculateRouteMeta.breadcrumb.map((segment: any) => (
              <span key={`calculate-${calculateScreen}-${segment}`} className="equation-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="equation-route-copy">
            <strong>{calculateRouteMeta.label}</strong>
            <span className="equation-badge">Calculus</span>
          </div>
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'equation' && equationRouteMeta ? (
        <div className="equation-route">
          <div className="equation-breadcrumbs">
            {equationRouteMeta.breadcrumb.map((segment: any) => (
              <span key={segment} className="equation-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="equation-route-copy">
            <strong>{equationRouteMeta.label}</strong>
            {equationRouteMeta.badge ? (
              <span className="equation-badge">{equationRouteMeta.badge}</span>
            ) : null}
          </div>
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'advancedCalculus' && advancedCalcRouteMeta ? (
        <div className="equation-route">
          <div className="equation-breadcrumbs">
            {advancedCalcRouteMeta.breadcrumb.map((segment: any) => (
              <span key={`advanced-${advancedCalcScreen}-${segment}`} className="equation-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="equation-route-copy">
            <strong>{advancedCalcRouteMeta.label}</strong>
            <span className="equation-badge">Advanced Calc</span>
          </div>
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'statistics' && statisticsRouteMeta ? (
        <div className="equation-route">
          <div className="equation-breadcrumbs">
            {statisticsRouteMeta.breadcrumb.map((segment: any) => (
              <span key={`statistics-${statisticsScreen}-${segment}`} className="equation-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="equation-route-copy">
            <strong>{statisticsRouteMeta.label}</strong>
            <span className="equation-badge">Statistics</span>
          </div>
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'guide' && guideRouteMeta ? (
        <div className="guide-display">
          <div className="guide-breadcrumbs">
            {guideRouteMeta.breadcrumb.map((segment: any) => (
              <span key={`${guideRoute.screen}-${segment}`} className="guide-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="guide-display-copy">
            <strong>
              {guideRoute.screen === 'article'
                ? (guideArticle?.title ?? guideRouteMeta.title)
                : guideRoute.screen === 'modeGuide' && guideModeRef
                  ? guideModeRef.title
                  : (selectedGuideListEntry?.title ?? guideRouteMeta.title)}
            </strong>
          </div>
          <p className="guide-display-summary">
            {guideRoute.screen === 'article'
              ? (guideArticle?.summary ?? guideRouteMeta.description)
              : guideRoute.screen === 'modeGuide' && guideModeRef
                ? guideModeRef.summary
                : (selectedGuideListEntry?.description ?? guideRouteMeta.description)}
          </p>
        </div>
      ) : null}
      {isLauncherOpen ? (
        <div className="launcher-display">
          <span className="launcher-display-index">
            {launcherState.level === 'root'
              ? selectedLauncherCategory?.hotkey ?? ''
              : selectedLauncherApp?.hotkey ?? ''}
          </span>
          <div className="launcher-display-copy">
            <strong className="launcher-display-label">
              {launcherState.level === 'root'
                ? (selectedLauncherCategory?.label ?? 'Menu')
                : (selectedLauncherApp?.label ?? 'Menu')}
            </strong>
            <small className="launcher-display-breadcrumb">
              {launcherState.level === 'root'
                ? 'Menu'
                : `Menu > ${activeLauncherCategory?.label ?? ''}`}
            </small>
          </div>
        </div>
      ) : null}
      {isEquationMenuOpen ? (
        <div className="launcher-display equation-display-choice">
          <span className="launcher-display-index">{selectedEquationMenuEntry?.hotkey ?? ''}</span>
          <strong className="launcher-display-label">{selectedEquationMenuEntry?.label ?? 'Equation'}</strong>
        </div>
      ) : null}
      {isAdvancedCalcMenuOpen ? (
        <div className="launcher-display equation-display-choice">
          <span className="launcher-display-index">{selectedAdvancedCalcMenuEntry?.hotkey ?? ''}</span>
          <strong className="launcher-display-label">{selectedAdvancedCalcMenuEntry?.label ?? 'Advanced Calc'}</strong>
        </div>
      ) : null}
      {isTrigMenuOpen ? (
        <div className="launcher-display equation-display-choice">
          <span className="launcher-display-index">{selectedTrigMenuEntry?.hotkey ?? ''}</span>
          <strong className="launcher-display-label">{selectedTrigMenuEntry?.label ?? 'Trigonometry'}</strong>
        </div>
      ) : null}
      {isStatisticsMenuOpen ? (
        <div className="launcher-display equation-display-choice">
          <span className="launcher-display-index">{selectedStatisticsMenuEntry?.hotkey ?? ''}</span>
          <strong className="launcher-display-label">{selectedStatisticsMenuEntry?.label ?? 'Statistics'}</strong>
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'statistics' ? (
        <div className="statistics-display-shell">
          <div className="statistics-display-status">
            <span className="equation-badge statistics-core-badge">Statistics core</span>
            <small>
              Statistics requests stay in Statistics.
            </small>
          </div>
          <MathEditor
            ref={statisticsDraftFieldRef}
            dataTestId="main-editor"
            className="main-mathfield statistics-main-mathfield"
            value={statisticsDraftLatex}
            modeId="statistics"
            screenHint={statisticsScreen}
            onChange={(latex) => updateStatisticsDraft(latex, 'manual', true)}
            keyboardLayouts={statisticsKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            readOnly={false}
            placeholder="Type dataset(...), descriptive(...), binomial(...), regression(...), or use a guided Statistics tool"
          />
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'trigonometry' ? (
        <div className="trig-display-shell">
          <div className="trig-display-status">
            <span className="equation-badge trig-core-badge">Trigonometry core</span>
            <small>
              Trig requests stay in Trigonometry.
            </small>
          </div>
          <MathEditor
            ref={trigDraftFieldRef}
            dataTestId="main-editor"
            className="main-mathfield trig-main-mathfield"
            value={trigDraftLatex}
            modeId="trigonometry"
            screenHint={trigScreen}
            onChange={(latex) => updateTrigDraft(latex, 'manual', true)}
            keyboardLayouts={trigonometryKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            readOnly={false}
            placeholder="Type sin(30), identityConvert(...), rightTriangle(...), or use a guided trig tool"
          />
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'geometry' ? (
        <div className="geometry-display-shell">
          <div className="geometry-display-status">
            <span className="equation-badge geometry-core-badge">Geometry core</span>
            <small>
              Structured requests stay in Geometry.
            </small>
          </div>
          <MathEditor
            ref={geometryDraftFieldRef}
            dataTestId="main-editor"
            className="main-mathfield geometry-main-mathfield"
            value={geometryDraftLatex}
            modeId="geometry"
            screenHint={geometryScreen}
            onChange={(latex) => updateGeometryDraft(latex, 'manual', true)}
            keyboardLayouts={geometryKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            readOnly={false}
            placeholder="Type square(side=4) or use a guided Geometry tool"
          />
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'calculate' ? (
        <div className="main-editor-stack">
          <MathEditor
            ref={mainFieldRef}
            dataTestId="main-editor"
            className="main-mathfield"
            value={calculateLatex}
            modeId="calculate"
            screenHint={calculateScreen}
            onChange={setCalculateLatex}
            keyboardLayouts={calculateKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            placeholder="Enter an expression"
          />
          <VariableHintStrip
            latex={calculateLatex}
            mode="calculate"
            screenHint={calculateScreen}
            storedVariables={variableMemory}
          />
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && currentMode === 'equation' && equationScreen === 'symbolic' ? (
        <div className="main-editor-stack">
          <MathEditor
            ref={mainFieldRef}
            dataTestId="main-editor"
            className="main-mathfield"
            value={equationLatex}
            modeId="equation"
            screenHint={equationScreen}
            onChange={setEquationLatex}
            keyboardLayouts={equationKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            placeholder="Enter an equation in x"
          />
          <VariableHintStrip
            latex={equationLatex}
            mode="equation"
            screenHint={equationScreen}
            solveTarget={equationSolveTarget}
            storedVariables={variableMemory}
          />
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && !isGeometryMenuOpen && (currentMode === 'matrix' || currentMode === 'vector' || currentMode === 'table' || currentMode === 'advancedCalculus' || currentMode === 'statistics' || (currentMode === 'equation' && equationScreen !== 'symbolic')) ? (
        <div className="display-standby">
          <MathStatic
            className="standby-math"
            latex={displayMathLatex ?? deferredDisplayLatex}
            emptyLabel="Structured results stay here."
            deferRender={!displayMathLatex}
          />
        </div>
      ) : null}
    </div>
    <div className="display-preview">
      {isLauncherOpen ? (
        <div className="launcher-preview-copy">
          {launcherState.level === 'root'
            ? selectedLauncherCategory?.description ?? ''
            : selectedLauncherApp?.description ?? ''}
        </div>
      ) : isEquationMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{equationRouteMeta?.shortLabel ?? selectedEquationMenuEntry?.label ?? ''}</strong>
          <span>{selectedEquationMenuEntry?.description ?? ''}</span>
          <small>{equationRouteMeta?.helpText}</small>
        </div>
      ) : isAdvancedCalcMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{advancedCalcRouteMeta?.label ?? selectedAdvancedCalcMenuEntry?.label ?? ''}</strong>
          <span>{selectedAdvancedCalcMenuEntry?.description ?? advancedCalcRouteMeta?.description ?? ''}</span>
          <small>{advancedCalcRouteMeta?.helpText}</small>
        </div>
      ) : isTrigMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{trigRouteMeta?.label ?? selectedTrigMenuEntry?.label ?? ''}</strong>
          <span>{selectedTrigMenuEntry?.description ?? trigRouteMeta?.description ?? ''}</span>
          <small>{trigRouteMeta?.helpText}</small>
        </div>
      ) : isStatisticsMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{statisticsRouteMeta?.label ?? selectedStatisticsMenuEntry?.label ?? ''}</strong>
          <span>{selectedStatisticsMenuEntry?.description ?? statisticsRouteMeta?.description ?? ''}</span>
          <small>{statisticsRouteMeta?.helpText}</small>
        </div>
      ) : isGeometryMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{geometryRouteMeta?.label ?? selectedGeometryMenuEntry?.label ?? ''}</strong>
          <span>{selectedGeometryMenuEntry?.description ?? geometryRouteMeta?.description ?? ''}</span>
          <small>{geometryRouteMeta?.helpText}</small>
        </div>
      ) : currentMode === 'guide' && guideRouteMeta ? (
        <div className="guide-preview-copy">
          {(guideRoute.screen === 'search' || guideRoute.screen === 'symbolLookup') ? (
            <label className="guide-search-row">
              <span>Search</span>
              <input
                ref={guideSearchInputRef}
                className="guide-search-input"
                value={guideSearchQuery}
                onChange={(event) => setGuideQuery(event.target.value)}
                placeholder={guideRoute.screen === 'symbolLookup' ? 'sum, sigma, integral...' : 'Search topics, symbols, modes...'}
              />
            </label>
          ) : null}
          {guideRoute.screen === 'article' ? (
            <>
              <strong>{selectedGuideExample?.title ?? 'Worked examples'}</strong>
              <span>{selectedGuideExample?.explanation ?? 'Read the article and use Open in Tool to load an example.'}</span>
            </>
          ) : guideRoute.screen === 'modeGuide' && guideModeRef ? (
            <>
              <strong>{guideModeRef.title}</strong>
              <span>{guideModeRef.summary}</span>
            </>
          ) : (
            <>
              <strong>{selectedGuideListEntry?.title ?? guideRouteMeta.title}</strong>
              <span>{selectedGuideListEntry?.description ?? guideRouteMeta.description}</span>
            </>
          )}
        </div>
      ) : isLabsMode ? (
        <div className="guide-preview-copy labs-display-preview-copy">
          <strong>{labsRuntime?.selectedExperiment?.title ?? 'Labs'}</strong>
          <span>
            {labsRuntime?.runnerUiEnabled && labsRuntime.selectedRunner
              ? labsRuntime.selectedRunner.description
              : 'Inspect the committed Labs catalog. Runner execution is dev-only and separately gated.'}
          </span>
          <small>
            {labsRuntime?.runnerUiEnabled
              ? `Runner bridge: ${labsRuntime.runnerLoadStatus}`
              : 'Runner bridge disabled'}
          </small>
        </div>
      ) : hasExpressionPreview ? (
        <div className="display-card-content" data-testid="display-expression-preview-card">
          <div className="display-card-actions">
            <button onClick={() => void copyText(activeExpressionLatex(), 'Expression copied')}>
              Copy Expr
            </button>
            {currentMode === 'geometry' || currentMode === 'trigonometry' ? (
              <>
                <button onClick={editActiveExpression}>
                  Focus Editor
                </button>
                <button onClick={() => void pasteIntoEditor()}>
                  Paste
                </button>
              </>
            ) : (
              <>
                <button onClick={editActiveExpression}>
                  Edit Expr
                </button>
                <button onClick={() => void pasteIntoEditor()}>
                  Paste
                </button>
              </>
            )}
          </div>
          <MathStatic
            className="preview-math"
            latex={deferredDisplayLatex}
            emptyLabel="Textbook preview"
            deferRender
          />
        </div>
      ) : null}
    </div>
    <div className="display-result" data-testid="display-outcome-root">
      <div className="result-title-row">
        <div className="result-title">
          {isLauncherOpen
            ? launcherState.level === 'root'
              ? 'Menu'
              : `Menu > ${activeLauncherCategory?.label ?? ''}`
            : currentMode === 'guide' && guideRouteMeta
              ? guideRouteMeta.title
            : currentMode === 'labs'
              ? 'Labs preview'
            : currentMode === 'statistics' && statisticsRouteMeta
              ? statisticsRouteMeta.label
            : currentMode === 'advancedCalculus' && advancedCalcRouteMeta
              ? advancedCalcRouteMeta.label
            : currentMode === 'trigonometry' && trigRouteMeta
              ? displayOutcome?.title ?? trigRouteMeta.label
            : currentMode === 'geometry' && geometryRouteMeta
              ? displayOutcome?.title ?? geometryRouteMeta.label
            : currentMode === 'calculate' && calculateScreen !== 'standard' && calculateRouteMeta
              ? calculateRouteMeta.label
            : currentMode === 'equation' && equationResultTitle
              ? equationResultTitle
              : displayOutcome?.title ?? 'Result'}
        </div>
        {displayResultBadges.length > 0 ? (
          <div className="result-badges">
            {displayResultBadges.map((badge: any) => (
              <span key={badge.label} className={badge.className}>
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {isLauncherOpen ? (
        <div className="result-approx">
          {launcherState.level === 'root'
            ? 'Use EXE/F1 or keys 1-5 to open a category.'
            : 'Use EXE/F1 or the shown digit hotkeys to open an app.'}
        </div>
      ) : currentMode === 'guide' && guideRouteMeta ? (
        <>
          {guideRoute.screen === 'article' && selectedGuideExample ? (
            <>
              <div className="result-approx">{selectedGuideExample.expected}</div>
              <div className="display-card-actions">
                <button onClick={() => launchGuideExample(selectedGuideExample)}>
                  Open in Tool
                </button>
                <button onClick={() => void copyText(copyableGuideExampleLatex(selectedGuideExample), 'Example copied')}>
                  Copy Expr
                </button>
              </div>
            </>
          ) : guideRoute.screen === 'modeGuide' && guideModeRef ? (
            <div className="warning-stack">
              {guideModeRef.bestFor.map((item: any) => (
                <div key={item} className="result-approx">{item}</div>
              ))}
            </div>
          ) : (
            <div className="result-approx">{guideRouteMeta.description}</div>
          )}
        </>
      ) : isLabsMode ? (
        <div className="labs-display-result" data-testid="labs-display-result">
          {labsRuntime?.runResult ? (
            <>
              <div className="card-title-row">
                <strong>{labsRuntime.runResult.title}</strong>
                <span className={`labs-status-chip labs-status-chip--${labsRuntime.runResult.status === 'success' ? 'active' : 'paused'}`}>
                  {labsRuntime.runResult.status === 'success' ? 'Success' : 'Error'}
                </span>
              </div>
              <dl className="labs-fact-grid labs-display-summary-grid">
                {labsRuntime.runResult.summary.slice(0, 3).map((item: any) => (
                  <div key={`${item.label}:${item.value}`}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {labsRuntime.runResult.outputLatex ? (
                <MathStatic className="result-math labs-output-math" latex={labsRuntime.runResult.outputLatex} />
              ) : null}
              {labsRuntime.runResult.outputText ? (
                <NotationText className="result-approx" text={labsRuntime.runResult.outputText} />
              ) : null}
            </>
          ) : labsRuntime?.runError ? (
            <NotationText className="result-error" text={labsRuntime.runError} />
          ) : labsRuntime?.runnerUiEnabled ? (
            <div className="result-approx">
              {labsRuntime.runStatus === 'running'
                ? 'Running the selected Labs experiment...'
                : 'Select a runner input below, then run it here as an experimental visual preview.'}
            </div>
          ) : (
            <div className="result-approx">
              Read-only Labs catalog. Enable `VITE_ENABLE_LAB_RUNNERS=1` for local dev runner previews.
            </div>
          )}
        </div>
      ) : isEquationMenuOpen ? (
        <div className="result-approx">{equationMenuFooterText}</div>
      ) : isAdvancedCalcMenuOpen ? (
        <div className="result-approx">{advancedCalcMenuFooterText}</div>
      ) : isTrigMenuOpen ? (
        <div className="result-approx">{trigMenuFooterText}</div>
      ) : isStatisticsMenuOpen ? (
        <div className="result-approx">{statisticsMenuFooterText}</div>
      ) : isGeometryMenuOpen && !displayOutcome ? (
        <div className="result-approx">{geometryMenuFooterText}</div>
      ) : null}
      {isEquationWorkScreen && !displayOutcome ? (
        <div className="result-approx">{equationRouteMeta?.helpText}</div>
      ) : null}
      {currentMode === 'calculate' && calculateScreen !== 'standard' && !displayOutcome ? (
        <div className="result-approx">{calculateRouteMeta?.helpText}</div>
      ) : null}
      {currentMode === 'advancedCalculus' && !isAdvancedCalcMenuOpen && !displayOutcome ? (
        <div className="result-approx">{advancedCalcRouteMeta?.helpText}</div>
      ) : null}
      {currentMode === 'trigonometry' && !isTrigMenuOpen && !displayOutcome ? (
        <div className="result-approx">{trigRouteMeta?.helpText}</div>
      ) : null}
      {currentMode === 'statistics' && !isStatisticsMenuOpen && !displayOutcome ? (
        <div className="result-approx">{statisticsRouteMeta?.helpText}</div>
      ) : null}
      {currentMode === 'geometry' && !isGeometryMenuOpen && !displayOutcome ? (
        <div className="result-approx">{geometryRouteMeta?.helpText}</div>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isAdvancedCalcMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && displayOutcome.resolvedInputLatex
      && displayOutcome.resolvedInputLatex.trim() !== activeExpressionLatex().trim() ? (
        <>
          <div className="result-approx">Resolved form</div>
          <MathStatic
            className="preview-math resolved-preview-math"
            latex={displayOutcome.resolvedInputLatex}
          />
        </>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isAdvancedCalcMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && displayOutcome.transformSummaryText ? (
          <div className="result-summary-block">
            <div className="result-summary-label">Transform</div>
            <NotationText
              className="result-approx result-summary-text"
              text={displayOutcome.transformSummaryText}
            />
            {displayOutcome.transformSummaryLatex ? (
              <MathStatic
                className="preview-math result-summary-math"
                displayPrefs={symbolicDisplayPrefs}
                latex={displayOutcome.transformSummaryLatex}
                block={false}
              />
            ) : null}
          </div>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isAdvancedCalcMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (shouldShowCalculateAlgebraTray || shouldShowEquationAlgebraTray) ? (
        <div className="result-summary-block algebra-transform-tray" data-testid="algebra-transform-tray">
          <div className="result-summary-label">Algebra</div>
          {activeAlgebraTransforms.length > 0 ? (
            <div className="algebra-transform-grid" data-testid="algebra-transform-actions">
              {activeAlgebraTransforms.map((action: any) => (
                <button
                  key={action}
                  type="button"
                  className="workspace-action-button"
                  data-testid={`algebra-transform-${action}`}
                  onClick={() =>
                    currentMode === 'calculate'
                      ? runCalculateAlgebraTransformAction(action)
                      : runEquationAlgebraTransformAction(action)}
                >
                  {getAlgebraTransformLabel(action)}
                </button>
              ))}
            </div>
          ) : (
            <NotationText
              className="result-detail-line result-summary-text"
              data-testid="algebra-transform-empty"
              text="No explicit algebra transform is available for this input yet."
            />
          )}
        </div>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isAdvancedCalcMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && displayOutcome.solveSummaryText ? (
        <div className="result-summary-block" data-testid="display-outcome-solve-summary">
          <div className="result-summary-label">Solve note</div>
          <NotationText
            className="result-approx result-summary-text"
            text={displayOutcome.solveSummaryText}
          />
        </div>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isAdvancedCalcMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && displayOutcome.numericMethod ? (
        <NotationText
          className="result-approx"
          text={`Numeric method: ${displayOutcome.numericMethod}`}
        />
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error') ? (
        <div className="display-card-actions" data-testid="display-outcome-actions">
          <button
            data-testid="display-outcome-action-copy-result"
            onClick={() => void copyText(activeResultCopyText(), 'Result copied')}
          >
            Copy Result
          </button>
          {currentMode === 'calculate' && calculateScreen === 'standard' ? (
            <button
              data-testid="display-outcome-action-run-numeric"
              onClick={() => runCalculateAction('evaluate')}
            >
              Run Numeric
            </button>
          ) : null}
          {displayOutcome.actions && displayOutcome.actions.length > 0
            ? displayOutcome.actions.map((action: any) => (
              <button
                key={`${action.kind}-${'target' in action ? action.target : action.mode}-${action.latex}`}
                data-testid={
                  action.kind === 'send'
                    ? `display-outcome-action-send-${action.target}`
                    : `display-outcome-action-load-${action.mode}`
                }
                onClick={() => triggerDisplayOutcomeAction(action)}
              >
                {action.kind === 'send'
                  ? action.target === 'equation'
                    ? 'Send to Equation'
                    : 'Send to Calc'
                  : action.mode === 'geometry'
                    ? 'Use in Geometry'
                    : action.mode === 'statistics'
                      ? 'Use in Statistics'
                      : 'Use in Trigonometry'}
              </button>
            ))
            : currentMode === 'trigonometry'
              ? null
              : activeResultEditorLatex()
                ? (
                  <button
                    data-testid="display-outcome-action-to-editor"
                    onClick={() => loadLatexIntoEditor(activeResultEditorLatex())}
                  >
                    To Editor
                  </button>
                )
                : null}
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && displayOutcome?.kind === 'success' ? (
        <div data-testid="display-outcome-success">
          {renderOutcomeReadback()}
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && displayOutcome?.kind === 'prompt' ? (
        <div className="result-prompt">
          <div className="result-prompt-message">{displayOutcome.message}</div>
          <button className="prompt-action" onClick={openPromptTarget}>Open Equation</button>
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && displayOutcome?.kind === 'error' ? (
        <div data-testid="display-outcome-error">
          <NotationText
            className="result-error"
            data-testid="display-outcome-error-text"
            text={displayOutcome.error}
          />
          {renderOutcomeReadback()}
        </div>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isAdvancedCalcMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && displayOutcome.periodicFamily ? (
        <div className="result-detail-sections" data-testid="display-outcome-periodic-family">
          {displayOutcome.periodicFamily.representatives?.length ? (
            <div className="result-summary-block" data-testid="display-outcome-periodic-representatives">
              <div className="result-summary-label">Representative Branches</div>
              <div className="result-detail-lines">
                {displayOutcome.periodicFamily.representatives.map((representative: any, index: any) => (
                  <div key={`${representative.label}-${index}`} className="result-detail-line">
                    <NotationText className="result-approx" text={representative.label} />
                    {representative.exactLatex ? (
                      <MathStatic
                        className="result-math result-math-supplement"
                        latex={representative.exactLatex}
                        displayPrefs={symbolicDisplayPrefs}
                      />
                    ) : null}
                    {representative.approxText ? (
                      <NotationText
                        className="result-detail-line result-summary-text"
                        text={representative.approxText}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {displayOutcome.periodicFamily.principalRangeLatex ? (
            <div className="result-summary-block" data-testid="display-outcome-periodic-principal-range">
              <div className="result-summary-label">Principal Range</div>
              <MathStatic
                className="result-math result-math-supplement"
                latex={displayOutcome.periodicFamily.principalRangeLatex}
                displayPrefs={symbolicDisplayPrefs}
              />
            </div>
          ) : null}
          {displayOutcome.periodicFamily.piecewiseBranches?.length ? (
            <div className="result-summary-block" data-testid="display-outcome-periodic-piecewise">
              <div className="result-summary-label">Piecewise Exact Branches</div>
              <div className="result-detail-lines">
                {displayOutcome.periodicFamily.piecewiseBranches.map((branch: any, index: any) => (
                  <div key={`${branch.conditionLatex}-${branch.resultLatex}-${index}`} className="result-detail-line">
                    <MathStatic
                      className="result-math result-math-supplement"
                      latex={`\\text{if } ${branch.conditionLatex}`}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                    <MathStatic
                      className="result-math result-math-supplement"
                      latex={branch.resultLatex}
                      displayPrefs={symbolicDisplayPrefs}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {displayOutcome.periodicFamily.discoveredFamilies?.length ? (
            <div className="result-summary-block" data-testid="display-outcome-periodic-discovered-families">
              <div className="result-summary-label">Discovered Families</div>
              <div className="result-detail-lines">
                {displayOutcome.periodicFamily.discoveredFamilies.map((familyLatex: any, index: any) => (
                  <MathStatic
                    key={`${familyLatex}-${index}`}
                    className="result-math result-math-supplement"
                    latex={familyLatex}
                    displayPrefs={symbolicDisplayPrefs}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {displayOutcome.periodicFamily.reducedCarrierLatex ? (
            <div className="result-summary-block" data-testid="display-outcome-periodic-reduced-carrier">
              <div className="result-summary-label">Reduced Carrier</div>
              <MathStatic
                className="result-math result-math-supplement"
                latex={`\\text{Reduced carrier: } ${displayOutcome.periodicFamily.reducedCarrierLatex}`}
                displayPrefs={symbolicDisplayPrefs}
              />
            </div>
          ) : null}
          {displayOutcome.periodicFamily.structuredStopReason ? (
            <div className="result-summary-block" data-testid="display-outcome-periodic-stop-reason">
              <div className="result-summary-label">Exact Closure Boundary</div>
              <NotationText
                className="result-detail-line result-summary-text"
                text={getPeriodicStopReasonText(displayOutcome.periodicFamily.structuredStopReason)}
              />
            </div>
          ) : null}
          {displayOutcome.periodicFamily.suggestedIntervals?.length ? (
            <div className="result-summary-block" data-testid="display-outcome-periodic-intervals">
              <div className="result-summary-label">Suggested Intervals</div>
              <div className="result-detail-lines">
                {displayOutcome.periodicFamily.suggestedIntervals.map((suggestion: any) => (
                  <NotationText
                    key={`${suggestion.label}-${suggestion.start}-${suggestion.end}`}
                    className="result-detail-line result-summary-text"
                    text={`${suggestion.label}: [${suggestion.start}, ${suggestion.end}]`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isAdvancedCalcMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && visibleDetailSections?.length ? (
        <div className="result-detail-sections" data-testid="display-outcome-detail-sections">
          {visibleDetailSections.map((section: any, sectionIndex: any) => (
            <div key={section.title} className="result-summary-block" data-testid={`display-outcome-detail-section-${sectionIndex}`}>
              <div className="result-summary-label">{section.title}</div>
              <div className="result-detail-lines">
                {section.lines.map((line: any, lineIndex: any) => (
                  <NotationText
                    key={`${section.title}-${line}`}
                    className="result-detail-line result-summary-text"
                    data-testid={`display-outcome-detail-line-${sectionIndex}-${lineIndex}`}
                    text={line}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && !isGeometryMenuOpen && currentMode !== 'guide' && currentMode !== 'labs' && displayOutcome?.warnings.length ? (
        <div className="warning-stack">
          {displayOutcome.warnings.map((warning: any) => (
            <NotationText key={warning} className="result-warning" text={warning} />
          ))}
        </div>
      ) : null}
    </div>
  </section>


  );
}

export { DisplayPanel };
