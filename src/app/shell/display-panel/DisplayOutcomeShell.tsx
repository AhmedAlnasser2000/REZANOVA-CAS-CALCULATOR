/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from 'react';
import { MathStatic } from '../../../components/MathStatic';
import { NotationText } from '../../../components/NotationText';
import {
  buildFormulaViewerArtifact,
  type FormulaViewerArtifact,
  type FormulaViewerSourceContext,
} from '../../runtime/formula-viewer-artifacts';
import { isCalculusMode } from '../../../lib/calculus/calculus-identity';
import type { DisplayBlock } from '../../../lib/display/result/display-blocks';
import { DetailLineContent, ResultSummaryBlock, ScheduledOutcomeBlocks } from './DisplayResultBlocks';

type DisplayOutcomeShellProps = Record<string, any>;

const SOLVE_SUMMARY_SPLIT_PATTERN =
  /;\s*(?=(?:Composition branch|Periodic family|Exact reduced-carrier|Sawtooth closure|Range guard|Reciprocal rewrite|Principal range|Inverted|Lifted|Substituted|Combined|Normalized|Reduced)\b)/gu;

function solveSummaryLines(summary: string): string[] {
  return summary
    .split(SOLVE_SUMMARY_SPLIT_PATTERN)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const MATH_TITLE_OPERATION_PATTERN =
  /(?:^|[\s([{,])(?:basis|change|col|coords|det|diag|eigen|gram|invertible|ls|lu|mpow|null|orthogonal|plu|proj|qr|rank|rref|unit)\s*(?:_[A-Za-z])?\s*\(/iu;

function shouldRenderTitleAsMath(title: string) {
  return /\\[A-Za-z]+|[{}^_]/u.test(title)
    || MATH_TITLE_OPERATION_PATTERN.test(title)
    || /^[A-Za-z]\s*[-+*/=]/u.test(title);
}

export function DisplayOutcomeShell({
  activeAlgebraTransforms,
  activeExpressionLatex,
  activeLauncherCategory,
  activeResultCopyText,
  activeResultEditorLatex,
  calculusMenuFooterText,
  calculusRouteMeta,
  calculusScreen,
  calculateRouteMeta,
  calculateScreen,
  copyText,
  copyableGuideExampleLatex,
  currentMode,
  displayOutcome,
  displayResultBadges,
  equationMenuFooterText,
  equationResultTitle,
  equationRouteMeta,
  geometryMenuFooterText,
  geometryRouteMeta,
  formulaViewerSourceContext,
  getAlgebraTransformLabel,
  guideModeRef,
  guideRoute,
  guideRouteMeta,
  isCalculusMenuOpen,
  isEquationMenuOpen,
  isEquationWorkScreen,
  isGeometryMenuOpen,
  isLauncherOpen,
  isStatisticsMenuOpen,
  isTrigMenuOpen,
  labsRuntime,
  launchGuideExample,
  launcherState,
  loadLatexIntoEditor,
  openPromptTarget,
  onOpenFormulaViewer,
  runCalculateAction,
  runCalculateAlgebraTransformAction,
  runEquationAlgebraTransformAction,
  scheduledDisplayBlocks,
  selectedGuideExample,
  shouldShowCalculateAlgebraTray,
  shouldShowEquationAlgebraTray,
  statisticsMenuFooterText,
  statisticsRouteMeta,
  symbolicDisplayPrefs,
  trigMenuFooterText,
  trigRouteMeta,
  triggerDisplayOutcomeAction,
  visibleDisplayBlockIds,
}: DisplayOutcomeShellProps) {
  const isLabsMode = !isLauncherOpen && currentMode === 'labs';
  const canOpenFormulaViewer = typeof onOpenFormulaViewer === 'function';
  const suppressResolvedInputReadback =
    isCalculusMode(currentMode)
    && (
      calculusScreen === 'derivative'
      || calculusScreen === 'derivativePoint'
      || calculusScreen === 'partialDerivative'
      || calculusScreen === 'implicitDerivative'
    );
  const resultTitle = isLauncherOpen
    ? launcherState.level === 'root'
      ? 'Menu'
      : `Menu > ${activeLauncherCategory?.label ?? ''}`
    : currentMode === 'guide' && guideRouteMeta
      ? guideRouteMeta.title
    : currentMode === 'labs'
      ? 'Labs preview'
    : currentMode === 'statistics' && statisticsRouteMeta
      ? statisticsRouteMeta.label
    : isCalculusMode(currentMode) && calculusRouteMeta
      ? calculusRouteMeta.label
    : currentMode === 'trigonometry' && trigRouteMeta
      ? displayOutcome?.title ?? trigRouteMeta.label
    : currentMode === 'geometry' && geometryRouteMeta
      ? displayOutcome?.title ?? geometryRouteMeta.label
    : currentMode === 'calculate' && calculateScreen !== 'standard' && calculateRouteMeta
      ? calculateRouteMeta.label
    : currentMode === 'equation' && equationResultTitle
      ? equationResultTitle
    : displayOutcome?.title ?? 'Result';
  const titleText = typeof resultTitle === 'string' ? resultTitle : String(resultTitle);
  const renderTitleAsMath = shouldRenderTitleAsMath(titleText);
  const activeExpressionLatexText =
    typeof activeExpressionLatex === 'function' ? activeExpressionLatex() : '';
  const isLinearAlgebraMode = currentMode === 'matrix' || currentMode === 'vector';
  const suppressDuplicateEditorExpressionTitle =
    !isLauncherOpen
    && isLinearAlgebraMode
    && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
    && titleText.trim().length > 0
    && titleText.trim() === activeExpressionLatexText.trim();
  const showResultTitle = !suppressDuplicateEditorExpressionTitle;
  const showResultTitleRow = showResultTitle || displayResultBadges.length > 0;
  const openFormulaViewerFromBlock = useCallback((block: DisplayBlock) => {
    if (typeof onOpenFormulaViewer !== 'function') {
      return;
    }
    const sourceContext: FormulaViewerSourceContext = {
      ...(formulaViewerSourceContext ?? {}),
      copyLatex: activeResultCopyText(),
      resolvedInputLatex: displayOutcome?.resolvedInputLatex ?? '',
      resultTitle: displayOutcome?.title ?? equationResultTitle ?? 'Result',
      sourceExpressionLatex: activeExpressionLatexText,
    };
    const artifact: FormulaViewerArtifact = buildFormulaViewerArtifact({
      block,
      displayBlocks: scheduledDisplayBlocks,
      source: sourceContext,
    });
    onOpenFormulaViewer(artifact);
  }, [
    activeExpressionLatexText,
    activeResultCopyText,
    displayOutcome?.resolvedInputLatex,
    displayOutcome?.title,
    equationResultTitle,
    formulaViewerSourceContext,
    onOpenFormulaViewer,
    scheduledDisplayBlocks,
  ]);

  return (
    <div className="display-result" data-testid="display-outcome-root">
      {showResultTitleRow ? (
        <div className="result-title-row">
          {showResultTitle ? (
            <div
              className={`result-title${renderTitleAsMath ? ' result-title--math' : ''}`}
              data-testid="display-outcome-title"
            >
              {renderTitleAsMath ? (
                <MathStatic
                  block={false}
                  className="result-title-math"
                  latex={titleText}
                  normalizeDisplay={false}
                />
              ) : titleText}
            </div>
          ) : null}
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
      ) : null}
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
      ) : isCalculusMenuOpen ? (
        <div className="result-approx">{calculusMenuFooterText}</div>
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
      {isCalculusMode(currentMode) && !isCalculusMenuOpen && !displayOutcome ? (
        <div className="result-approx">{calculusRouteMeta?.helpText}</div>
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
      && !isCalculusMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && !suppressResolvedInputReadback
      && displayOutcome.resolvedInputLatex
      && displayOutcome.resolvedInputLatex.trim() !== activeExpressionLatexText.trim() ? (
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
      && !isCalculusMenuOpen
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
      && !isCalculusMenuOpen
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
      && !isCalculusMenuOpen
      && !isTrigMenuOpen
      && !isStatisticsMenuOpen
      && (!isGeometryMenuOpen || currentMode === 'geometry')
      && currentMode !== 'guide' && currentMode !== 'labs'
      && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error')
      && displayOutcome.solveSummaryText ? (
        <ResultSummaryBlock
          collapsible
          defaultCollapsed
          label="Solve Note"
          testId="display-outcome-solve-summary"
        >
          {solveSummaryLines(displayOutcome.solveSummaryText).map((line: string, index: number) => (
            <div
              key={`${line}-${index}`}
              className="result-approx result-summary-text result-detail-line"
            >
              <DetailLineContent
                line={line}
                symbolicDisplayPrefs={symbolicDisplayPrefs}
              />
            </div>
          ))}
        </ResultSummaryBlock>
      ) : null}
      {!isLauncherOpen
      && !isEquationMenuOpen
      && !isCalculusMenuOpen
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
      {!isLauncherOpen && !isEquationMenuOpen && !isCalculusMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error') ? (
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
                    ? 'Open in Equation'
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
      {!isLauncherOpen && !isEquationMenuOpen && !isCalculusMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && displayOutcome?.kind === 'success' ? (
        <div data-testid="display-outcome-success">
          <ScheduledOutcomeBlocks
            onOpenFormulaViewer={canOpenFormulaViewer ? openFormulaViewerFromBlock : undefined}
            scheduledDisplayBlocks={scheduledDisplayBlocks}
            symbolicDisplayPrefs={symbolicDisplayPrefs}
            visibleDisplayBlockIds={visibleDisplayBlockIds}
          />
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isCalculusMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && displayOutcome?.kind === 'prompt' ? (
        <div className="result-prompt">
          <div className="result-prompt-message">{displayOutcome.message}</div>
          <button className="prompt-action" onClick={openPromptTarget}>Open Equation</button>
        </div>
      ) : null}
      {!isLauncherOpen && !isEquationMenuOpen && !isCalculusMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && (!isGeometryMenuOpen || currentMode === 'geometry') && currentMode !== 'guide' && currentMode !== 'labs' && displayOutcome?.kind === 'error' ? (
        <div data-testid="display-outcome-error">
          <ScheduledOutcomeBlocks
            onOpenFormulaViewer={canOpenFormulaViewer ? openFormulaViewerFromBlock : undefined}
            scheduledDisplayBlocks={scheduledDisplayBlocks}
            symbolicDisplayPrefs={symbolicDisplayPrefs}
            visibleDisplayBlockIds={visibleDisplayBlockIds}
          />
        </div>
      ) : null}
    </div>
  );
}
