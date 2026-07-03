/* eslint-disable @typescript-eslint/no-explicit-any */
import { MathEditor } from '../../../components/MathEditor';
import { MathStatic } from '../../../components/MathStatic';
import { SignedNumberDraftInput } from '../../../components/SignedNumberDraftInput';
import { VariableHintStrip } from '../../../components/VariableHintStrip';
import { isCalculusMode } from '../../../lib/calculus/calculus-identity';
import {
  derivativeVariableLatex,
  parseDerivativeVariable,
} from '../../../lib/calculus/derivative-target';
import {
  firstOrderDerivativeOperator,
  formatDerivativeAppliedPath,
  formatDerivativeOperator,
  parseDerivativeOperator,
  type DerivativeOperatorKind,
} from '../../../lib/calculus/derivative-operator';
import { parseNaturalDerivativeRequest } from '../../../lib/calculus/derivative-request';
import {
  parseNaturalLimitRequest,
  type NaturalLimitTarget,
} from '../../../lib/calculus/limit-request';
import { parsePiecewiseLimitExpression } from '../../../lib/symbolic-engine/limits';
import type { LabRunnerInputKind } from '../../../lib/labs/runner-types';
import { LAB_INPUT_KIND_LABELS } from '../../runtime/useLabsRuntime';

type DisplayEditorSurfaceProps = Record<string, any>;

function limitTargetReadbackLatex(target: NaturalLimitTarget) {
  if (target.kind === 'infinite') {
    return target.normalizedTargetLatex;
  }
  if (target.direction === 'left') {
    return `${target.normalizedTargetLatex}^{-}`;
  }
  if (target.direction === 'right') {
    return `${target.normalizedTargetLatex}^{+}`;
  }
  return target.normalizedTargetLatex;
}

function limitReadbackBodyLatex(bodyLatex: string) {
  const parsedPiecewise = parsePiecewiseLimitExpression(bodyLatex);
  if (parsedPiecewise.kind !== 'piecewise') {
    return bodyLatex;
  }

  const rows = parsedPiecewise.branches
    .map((branch) => {
      const conditionLatex = branch.otherwise
        ? '\\text{otherwise}'
        : branch.condition?.latex ?? '\\text{selected}';
      return `${branch.expressionLatex}&${conditionLatex}`;
    })
    .join('\\\\');
  return `\\begin{cases}${rows}\\end{cases}`;
}

export function DisplayEditorSurface({
  activeFieldRef,
  activeLauncherCategory,
  calculusMainEditorActive,
  calculusMainEditorLatex,
  calculusMainEditorVariable,
  calculusKeyboardLayouts,
  calculusRouteMeta,
  calculusScreen,
  calculateKeyboardLayouts,
  calculateLatex,
  calculateRouteMeta,
  calculateScreen,
  currentMode,
  deferredDisplayLatex,
  derivativePointValueRef,
  derivativePointWorkbench,
  derivativeWorkbench,
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
  implicitDerivativeState,
  isCalculusMenuOpen,
  isEquationMenuOpen,
  isGeometryMenuOpen,
  isLauncherOpen,
  isStatisticsMenuOpen,
  isTrigMenuOpen,
  labsRuntime,
  launcherState,
  mainFieldRef,
  matrixEditorLatex,
  matrixKeyboardLayouts,
  onRunEditor,
  selectedCalculusMenuEntry,
  selectedEquationMenuEntry,
  selectedGuideListEntry,
  selectedLauncherApp,
  selectedLauncherCategory,
  selectedStatisticsMenuEntry,
  selectedTrigMenuEntry,
  setCalculateLatex,
  setCalculusMainEditorLatex,
  setDerivativePointWorkbench,
  setEquationLatex,
  setImplicitDerivativeState,
  setMatrixEditorLatex,
  settings,
  statisticsDraftFieldRef,
  statisticsDraftLatex,
  statisticsKeyboardLayouts,
  statisticsRouteMeta,
  statisticsScreen,
  partialDerivativeState,
  trigDraftFieldRef,
  trigDraftLatex,
  trigScreen,
  trigonometryKeyboardLayouts,
  updateGeometryDraft,
  updateStatisticsDraft,
  updateTrigDraft,
  variableMemory,
  vectorEditorLatex,
  vectorKeyboardLayouts,
  setVectorEditorLatex,
}: DisplayEditorSurfaceProps) {
  const isLabsMode = !isLauncherOpen && currentMode === 'labs';
  const labsInputLatex = labsRuntime
    ? labsRuntime.effectiveInputKind === 'corpus-case'
      ? labsRuntime.selectedCorpusCase?.latex ?? labsRuntime.effectiveInputLatex
      : labsRuntime.effectiveInputLatex
    : '';
  const labsInputKind = labsRuntime?.effectiveInputKind as LabRunnerInputKind | undefined;
  const labsInputKindLabel = labsInputKind ? LAB_INPUT_KIND_LABELS[labsInputKind] : 'Labs';
  const calculusMainEditorTarget = calculusMainEditorVariable ?? (calculusScreen === 'laplace' ? 't' : 'x');
  const calculusMainEditorTargetLatex = derivativeVariableLatex(calculusMainEditorTarget);
  const implicitIndependentVariable = implicitDerivativeState?.independentVariable ?? 'x';
  const implicitDependentVariable = implicitDerivativeState?.dependentVariable ?? 'y';
  const implicitIndependentParsed = parseDerivativeVariable(implicitIndependentVariable);
  const implicitDependentParsed = parseDerivativeVariable(implicitDependentVariable);
  const implicitIndependentLatex = derivativeVariableLatex(implicitIndependentVariable);
  const implicitDependentLatex = derivativeVariableLatex(implicitDependentVariable);
  const implicitVariablesMatch =
    implicitIndependentParsed.ok
    && implicitDependentParsed.ok
    && implicitIndependentParsed.variable === implicitDependentParsed.variable;
  const implicitDerivativeDisplay = `d${implicitDependentLatex}/d${implicitIndependentLatex}`;
  const calculusMainEditorContextLabel = calculusScreen === 'partialDerivative'
    ? `partial/partial ${calculusMainEditorTargetLatex}`
    : calculusScreen === 'implicitDerivative'
      ? implicitDerivativeDisplay
    : calculusScreen === 'derivative' || calculusScreen === 'derivativePoint'
      ? `d/d${calculusMainEditorTargetLatex}`
      : null;
  const calculusMainEditorFunctionHint =
    calculusScreen === 'implicitDerivative'
      ? `F(${implicitIndependentLatex}, ${implicitDependentLatex})=0`
      : calculusScreen === 'partialDerivative'
      ? `f(${calculusMainEditorTargetLatex}, ...)`
      : `f(${calculusMainEditorTargetLatex})`;
  const calculusMainEditorPlaceholder =
    calculusScreen === 'laplace'
      ? 'Enter f(t)'
      : calculusScreen === 'limit'
        ? '\\text{Enter a limit expression}'
      : calculusScreen === 'implicitDerivative'
        ? `Enter relation in ${implicitIndependentLatex} and ${implicitDependentLatex}`
      : calculusScreen === 'partialDerivative'
        ? `Enter ∂/∂${calculusMainEditorTargetLatex}(f(${calculusMainEditorTargetLatex}, ...))`
      : calculusScreen === 'derivative' || calculusScreen === 'derivativePoint'
        ? `Enter d/d${calculusMainEditorTargetLatex}(f(${calculusMainEditorTargetLatex}))`
      : calculusMainEditorContextLabel
        ? `Enter ${calculusMainEditorFunctionHint}`
        : 'Enter an integrand in x';
  const calculusDerivativeRailActive = calculusScreen === 'derivative'
    || calculusScreen === 'derivativePoint'
    || calculusScreen === 'partialDerivative';
  const calculusLimitRailActive = calculusScreen === 'limit';
  const calculusImplicitRailActive = calculusScreen === 'implicitDerivative';
  const calculusRailKind: DerivativeOperatorKind =
    calculusScreen === 'partialDerivative' ? 'partial' : 'derivative';
  const calculusRailVariable = calculusScreen === 'derivative'
    ? derivativeWorkbench?.variable
    : calculusScreen === 'derivativePoint'
      ? derivativePointWorkbench?.variable
      : partialDerivativeState?.variable;
  const calculusRailOperatorLatex = calculusScreen === 'derivative'
    ? derivativeWorkbench?.operatorLatex
    : calculusScreen === 'derivativePoint'
      ? derivativePointWorkbench?.operatorLatex
      : partialDerivativeState?.operatorLatex;
  const calculusRailNaturalRequest = calculusDerivativeRailActive
    ? parseNaturalDerivativeRequest(calculusMainEditorLatex, calculusRailKind)
    : null;
  const calculusRailOperator = calculusDerivativeRailActive
    ? calculusRailNaturalRequest?.ok
      ? { ok: true as const, operator: calculusRailNaturalRequest.request.operator }
      : calculusRailOperatorLatex !== undefined
      ? parseDerivativeOperator(calculusRailOperatorLatex, calculusRailKind)
      : firstOrderDerivativeOperator(calculusRailKind, calculusRailVariable ?? calculusMainEditorTarget)
    : null;
  const calculusRailResolvedVariable =
    calculusRailOperator?.ok
      ? calculusRailOperator.operator.writtenFactors[0]?.variable ?? calculusRailVariable ?? calculusMainEditorTarget
      : calculusRailVariable ?? calculusMainEditorTarget;
  const calculusRailVariableLatex = derivativeVariableLatex(calculusRailResolvedVariable);
  const calculusRailOperatorLabel = calculusRailOperator?.ok
    ? formatDerivativeOperator(calculusRailOperator.operator, settings?.mathNotationDisplay ?? 'rendered')
    : 'Invalid operator';
  const calculusRailAppliedPath = calculusRailOperator?.ok
    ? formatDerivativeAppliedPath(calculusRailOperator.operator)
    : '';
  const calculusRailBodyLatex = calculusRailNaturalRequest?.ok
    ? calculusRailNaturalRequest.request.bodyLatex
    : calculusMainEditorLatex.trim();
  const calculusRailFunctionHint = calculusScreen === 'partialDerivative'
    ? `f(${calculusRailVariableLatex}, ...)`
    : `f(${calculusRailVariableLatex})`;
  const calculusRailReadbackTestId = calculusScreen === 'partialDerivative'
    ? 'calculus-partial-derivative-readback'
    : calculusScreen === 'derivativePoint'
      ? 'calculus-derivative-point-readback'
      : 'calculus-derivative-readback';
  const calculusLimitRailRequest = calculusLimitRailActive
    ? parseNaturalLimitRequest(calculusMainEditorLatex)
    : null;
  const calculusLimitRailParsed = calculusLimitRailRequest?.ok ? calculusLimitRailRequest.request : null;
  const calculusLimitRailTarget = calculusLimitRailParsed
    ? limitTargetReadbackLatex(calculusLimitRailParsed.target)
    : '';
  const calculusLimitRailWritten = calculusLimitRailParsed
    ? `\\lim_{${calculusLimitRailParsed.variableLatex}\\to ${calculusLimitRailTarget}}`
    : '';
  const calculusLimitRailApproaches = calculusLimitRailParsed
    ? `${calculusLimitRailParsed.variableLatex}\\to ${calculusLimitRailTarget}`
    : '';
  const calculusLimitRailBody = calculusLimitRailParsed
    ? limitReadbackBodyLatex(calculusLimitRailParsed.bodyLatex)
    : '';
  const setImplicitVariable = (
    field: 'independentVariable' | 'dependentVariable',
    value: string,
  ) => {
    const parsed = parseDerivativeVariable(value);
    setImplicitDerivativeState?.((currentState: any) => ({
      ...currentState,
      [field]: parsed.ok ? parsed.variable : value.trim(),
    }));
  };

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
      {!isLauncherOpen && isCalculusMode(currentMode) && calculusRouteMeta ? (
        <div className="equation-route">
          <div className="equation-breadcrumbs">
            {calculusRouteMeta.breadcrumb.map((segment: any) => (
              <span key={`calculus-${calculusScreen}-${segment}`} className="equation-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="equation-route-copy">
            <strong>{calculusRouteMeta.label}</strong>
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
      {isCalculusMenuOpen ? (
        <div className="launcher-display equation-display-choice">
          <span className="launcher-display-index">{selectedCalculusMenuEntry?.hotkey ?? ''}</span>
          <strong className="launcher-display-label">{selectedCalculusMenuEntry?.label ?? 'Calculus'}</strong>
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
            onSubmit={onRunEditor}
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
            onSubmit={onRunEditor}
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
            onSubmit={onRunEditor}
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
      {!isLauncherOpen && currentMode === 'matrix' ? (
        <div className="main-editor-stack">
          <MathEditor
            ref={mainFieldRef}
            dataTestId="main-editor"
            className="main-mathfield"
            value={matrixEditorLatex}
            modeId="matrix"
            screenHint="matrix"
            onSubmit={onRunEditor}
            onChange={setMatrixEditorLatex}
            keyboardLayouts={matrixKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            placeholder="Enter a Matrix expression"
          />
          <VariableHintStrip
            latex={matrixEditorLatex}
            mode="matrix"
            screenHint="matrix"
            storedVariables={variableMemory}
          />
        </div>
      ) : null}
      {!isLauncherOpen && currentMode === 'vector' ? (
        <div className="main-editor-stack">
          <MathEditor
            ref={mainFieldRef}
            dataTestId="main-editor"
            className="main-mathfield"
            value={vectorEditorLatex}
            modeId="vector"
            screenHint="vector"
            onSubmit={onRunEditor}
            onChange={setVectorEditorLatex}
            keyboardLayouts={vectorKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            placeholder="Enter a Vector expression"
          />
          <VariableHintStrip
            latex={vectorEditorLatex}
            mode="vector"
            screenHint="vector"
            storedVariables={variableMemory}
          />
        </div>
      ) : null}
      {!isLauncherOpen && calculusMainEditorActive ? (
        <div className="main-editor-stack">
          <MathEditor
            ref={mainFieldRef}
            dataTestId="main-editor"
            className="main-mathfield"
            value={calculusMainEditorLatex}
            modeId="calculus"
            screenHint={calculusScreen}
            onSubmit={onRunEditor}
            onChange={setCalculusMainEditorLatex}
            keyboardLayouts={calculusKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            placeholder={calculusMainEditorPlaceholder}
          />
          {calculusDerivativeRailActive ? (
            <div className="calculus-operator-rail" data-testid="calculus-operator-rail">
              <span
                className="equation-badge calculus-operator-badge"
                data-testid="calculus-main-editor-context"
              >
                {calculusRailOperatorLabel}
              </span>
              <span className="variable-hint">{calculusRailFunctionHint}</span>
              <div className="calculus-operator-readback" data-testid={calculusRailReadbackTestId}>
                <span>
                  Written <strong>{calculusRailOperatorLabel}</strong>
                </span>
                {calculusRailAppliedPath ? (
                  <span>
                    Applied <strong>{calculusRailAppliedPath}</strong>
                  </span>
                ) : null}
                {calculusRailBodyLatex ? (
                  <span>
                    Body <strong>{calculusRailBodyLatex}</strong>
                  </span>
                ) : (
                  <span>Body needed</span>
                )}
              </div>
              {calculusScreen === 'derivativePoint' ? (
                <label className="range-field calculus-operator-rail__point">
                  <span>{`Point ${calculusRailVariableLatex} =`}</span>
                  <SignedNumberDraftInput
                    ref={derivativePointValueRef}
                    value={derivativePointWorkbench?.point ?? ''}
                    onValueChange={(point) =>
                      setDerivativePointWorkbench?.((currentState: any) => ({
                        ...currentState,
                        point,
                      }))
                    }
                  />
                </label>
              ) : null}
            </div>
          ) : calculusLimitRailActive ? (
            <div className="calculus-operator-rail" data-testid="calculus-limit-readback-rail">
              <span
                className="equation-badge calculus-operator-badge"
                data-testid="calculus-main-editor-context"
              >
                lim
              </span>
              <span className="variable-hint">full limit expression</span>
              <div className="calculus-limit-readback" data-testid="calculus-limit-readback">
                {calculusLimitRailParsed ? (
                  <>
                    <span className="calculus-limit-readback__cell">
                      <span className="calculus-limit-readback__label">Written</span>
                      <MathStatic
                        className="calculus-readback-math calculus-limit-readback__math"
                        latex={calculusLimitRailWritten}
                        deferRender
                      />
                    </span>
                    <span className="calculus-limit-readback__cell">
                      <span className="calculus-limit-readback__label">Approaches</span>
                      <MathStatic
                        className="calculus-readback-math calculus-limit-readback__math"
                        latex={calculusLimitRailApproaches}
                        deferRender
                      />
                    </span>
                    <span className="calculus-limit-readback__cell">
                      <span className="calculus-limit-readback__label">Body</span>
                      <MathStatic
                        className="calculus-readback-math calculus-limit-readback__math"
                        latex={calculusLimitRailBody}
                        deferRender
                      />
                    </span>
                  </>
                ) : (
                  <span className="calculus-limit-readback__empty">Limit expression needed</span>
                )}
              </div>
            </div>
          ) : calculusImplicitRailActive ? (
            <div className="calculus-operator-rail calculus-implicit-rail" data-testid="calculus-operator-rail">
              <span
                className="equation-badge calculus-operator-badge"
                data-testid="calculus-main-editor-context"
              >
                {implicitDerivativeDisplay}
              </span>
              <span className="variable-hint">{calculusMainEditorFunctionHint}</span>
              <div className="calculus-implicit-variable-control" data-testid="calculus-implicit-derivative-variables">
                <label className="range-field calculus-implicit-variable-field">
                  <span>Differentiate with respect to</span>
                  <input
                    data-testid="calculus-implicit-independent-input"
                    value={implicitIndependentVariable}
                    onChange={(event) => setImplicitVariable('independentVariable', event.target.value)}
                    spellCheck={false}
                  />
                </label>
                <label className="range-field calculus-implicit-variable-field">
                  <span>Dependent variable</span>
                  <input
                    data-testid="calculus-implicit-dependent-input"
                    value={implicitDependentVariable}
                    onChange={(event) => setImplicitVariable('dependentVariable', event.target.value)}
                    spellCheck={false}
                  />
                </label>
                {!implicitIndependentParsed.ok ? (
                  <p className="equation-hint calculus-target-error" data-testid="calculus-implicit-independent-error">
                    {implicitIndependentParsed.error}
                  </p>
                ) : null}
                {!implicitDependentParsed.ok ? (
                  <p className="equation-hint calculus-target-error" data-testid="calculus-implicit-dependent-error">
                    {implicitDependentParsed.error}
                  </p>
                ) : null}
                {implicitVariablesMatch ? (
                  <p className="equation-hint calculus-target-error" data-testid="calculus-implicit-variable-match-error">
                    Choose different variables.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <VariableHintStrip
              latex={calculusMainEditorLatex}
              mode="calculus"
              screenHint={calculusScreen}
              activeVariable={calculusMainEditorTarget}
              boundVariables={[calculusMainEditorTarget]}
              storedVariables={variableMemory}
            />
          )}
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
            onSubmit={onRunEditor}
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
            onSubmit={onRunEditor}
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
      {!isLauncherOpen && !isEquationMenuOpen && !isCalculusMenuOpen && !isTrigMenuOpen && !isStatisticsMenuOpen && !isGeometryMenuOpen && !calculusMainEditorActive && (currentMode === 'table' || isCalculusMode(currentMode) || currentMode === 'statistics' || (currentMode === 'equation' && equationScreen !== 'symbolic')) ? (
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
