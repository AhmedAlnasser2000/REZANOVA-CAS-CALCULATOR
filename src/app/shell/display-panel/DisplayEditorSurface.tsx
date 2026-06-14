/* eslint-disable @typescript-eslint/no-explicit-any */
import { MathEditor } from '../../../components/MathEditor';
import { MathStatic } from '../../../components/MathStatic';
import { VariableHintStrip } from '../../../components/VariableHintStrip';
import { isCalculusMode } from '../../../lib/calculus/calculus-identity';
import type { LabRunnerInputKind } from '../../../lib/labs/runner-types';
import { LAB_INPUT_KIND_LABELS } from '../../runtime/useLabsRuntime';

type DisplayEditorSurfaceProps = Record<string, any>;

export function DisplayEditorSurface({
  activeFieldRef,
  activeLauncherCategory,
  advancedCalcRouteMeta,
  advancedCalcScreen,
  calculateKeyboardLayouts,
  calculateLatex,
  calculateRouteMeta,
  calculateScreen,
  currentMode,
  deferredDisplayLatex,
  displayMathLatex,
  equationKeyboardLayouts,
  equationLatex,
  equationRouteMeta,
  equationScreen,
  equationSolveTarget,
  geometryDraftFieldRef,
  geometryDraftLatex,
  geometryKeyboardLayouts,
  geometryScreen,
  guideArticle,
  guideModeRef,
  guideRoute,
  guideRouteMeta,
  isAdvancedCalcMenuOpen,
  isEquationMenuOpen,
  isGeometryMenuOpen,
  isLauncherOpen,
  isStatisticsMenuOpen,
  isTrigMenuOpen,
  labsRuntime,
  launcherState,
  mainFieldRef,
  selectedAdvancedCalcMenuEntry,
  selectedEquationMenuEntry,
  selectedGuideListEntry,
  selectedLauncherApp,
  selectedLauncherCategory,
  selectedStatisticsMenuEntry,
  selectedTrigMenuEntry,
  setCalculateLatex,
  setEquationLatex,
  statisticsDraftFieldRef,
  statisticsDraftLatex,
  statisticsKeyboardLayouts,
  statisticsRouteMeta,
  statisticsScreen,
  trigDraftFieldRef,
  trigDraftLatex,
  trigScreen,
  trigonometryKeyboardLayouts,
  updateGeometryDraft,
  updateStatisticsDraft,
  updateTrigDraft,
  variableMemory,
}: DisplayEditorSurfaceProps) {
  const isLabsMode = !isLauncherOpen && currentMode === 'labs';
  const labsInputLatex = labsRuntime
    ? labsRuntime.effectiveInputKind === 'corpus-case'
      ? labsRuntime.selectedCorpusCase?.latex ?? labsRuntime.effectiveInputLatex
      : labsRuntime.effectiveInputLatex
    : '';
  const labsInputKind = labsRuntime?.effectiveInputKind as LabRunnerInputKind | undefined;
  const labsInputKindLabel = labsInputKind ? LAB_INPUT_KIND_LABELS[labsInputKind] : 'Labs';

  return (
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
      {!isLauncherOpen && isCalculusMode(currentMode) && advancedCalcRouteMeta ? (
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
            <span className="equation-badge">Calculus</span>
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
          <strong className="launcher-display-label">{selectedAdvancedCalcMenuEntry?.label ?? 'Calculus'}</strong>
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
              Guided trig workflows stay in Trigonometry.
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
            placeholder="Use identities, triangles, angleConvert(...), or open the guided trig tools"
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
      {!isLauncherOpen && !isEquationMenuOpen && !isAdvancedCalcMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && !isGeometryMenuOpen && (currentMode === 'matrix' || currentMode === 'vector' || currentMode === 'table' || isCalculusMode(currentMode) || currentMode === 'statistics' || (currentMode === 'equation' && equationScreen !== 'symbolic')) ? (
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
  );
}
