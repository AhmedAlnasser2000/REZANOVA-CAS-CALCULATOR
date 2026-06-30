/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { MathEditor } from '../../components/MathEditor';
import { SignedNumberDraftInput } from '../../components/SignedNumberDraftInput';
import { VariableHintStrip } from '../../components/VariableHintStrip';
import { GeneratedPreviewCard } from '../components/GeneratedPreviewCard';
import type {
  CalculusScreen,
  CalculusDefiniteIntegralState,
  CalculusFiniteLimitState,
  CalculusIndefiniteIntegralState,
  CalculusImproperIntegralState,
  CalculusInfiniteLimitState,
  DerivativeWorkbenchState,
  DerivativePointWorkbenchState,
  FirstOrderOdeState,
  NumericIvpState,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesState,
  StoredVariableValue,
} from '../../types/calculator';

type CalculusRouteMetaLike = {
  breadcrumb: string[];
  label: string;
  description: string;
  previewTitle?: string;
  previewSubtitle?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  guideArticleId?: string;
};

type CalculusMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: CalculusScreen;
};

type CalculusWorkspaceProps = {
  screen: CalculusScreen;
  isMenuOpen: boolean;
  routeMeta: CalculusRouteMetaLike | null;
  coreGuideArticleId: string | null;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: CalculusMenuEntryLike[];
  menuSelection: number;
  menuFooterText: string;
  onOpenScreen: (screen: CalculusScreen) => void;
  onSetMenuSelection: (
    screen: 'home' | 'derivativesHome' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome',
    index: number,
  ) => void;
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: () => void;
  onLoadWorkbenchToEditor: () => void;
  onCopyWorkbenchExpression: () => void;
  onRegisterActiveField: (field: any) => void;
  keyboardLayouts: any[];
  workbenchLatex: string;
  derivativePointValueRef: RefObject<HTMLInputElement | null>;
  calculusFiniteLimitFieldRef: RefObject<any>;
  calculusInfiniteLimitFieldRef: RefObject<any>;
  maclaurinFieldRef: RefObject<any>;
  taylorFieldRef: RefObject<any>;
  partialDerivativeFieldRef: RefObject<any>;
  firstOrderOdeLhsFieldRef: RefObject<any>;
  firstOrderOdeRhsFieldRef: RefObject<any>;
  secondOrderOdeForcingFieldRef: RefObject<any>;
  numericIvpFieldRef: RefObject<any>;
  calculusDefiniteLowerRef: RefObject<HTMLInputElement | null>;
  calculusImproperLowerRef: RefObject<HTMLInputElement | null>;
  calculusFiniteLimitTargetRef: RefObject<HTMLInputElement | null>;
  taylorCenterRef: RefObject<HTMLInputElement | null>;
  secondOrderA2Ref: RefObject<HTMLInputElement | null>;
  numericIvpX0Ref: RefObject<HTMLInputElement | null>;
  derivativeWorkbench: DerivativeWorkbenchState;
  setDerivativeWorkbench: Dispatch<SetStateAction<DerivativeWorkbenchState>>;
  derivativePointWorkbench: DerivativePointWorkbenchState;
  setDerivativePointWorkbench: Dispatch<SetStateAction<DerivativePointWorkbenchState>>;
  calculusIndefiniteIntegral: CalculusIndefiniteIntegralState;
  setCalculusIndefiniteIntegral: Dispatch<SetStateAction<CalculusIndefiniteIntegralState>>;
  calculusDefiniteIntegral: CalculusDefiniteIntegralState;
  setCalculusDefiniteIntegral: Dispatch<SetStateAction<CalculusDefiniteIntegralState>>;
  calculusImproperIntegral: CalculusImproperIntegralState;
  setCalculusImproperIntegral: Dispatch<SetStateAction<CalculusImproperIntegralState>>;
  calculusFiniteLimit: CalculusFiniteLimitState;
  setCalculusFiniteLimit: Dispatch<SetStateAction<CalculusFiniteLimitState>>;
  calculusInfiniteLimit: CalculusInfiniteLimitState;
  setCalculusInfiniteLimit: Dispatch<SetStateAction<CalculusInfiniteLimitState>>;
  maclaurinState: SeriesState;
  setMaclaurinState: Dispatch<SetStateAction<SeriesState>>;
  taylorState: SeriesState;
  setTaylorState: Dispatch<SetStateAction<SeriesState>>;
  partialDerivativeState: PartialDerivativeWorkbenchState;
  setPartialDerivativeState: Dispatch<SetStateAction<PartialDerivativeWorkbenchState>>;
  firstOrderOdeState: FirstOrderOdeState;
  setFirstOrderOdeState: Dispatch<SetStateAction<FirstOrderOdeState>>;
  secondOrderOdeState: SecondOrderOdeState;
  setSecondOrderOdeState: Dispatch<SetStateAction<SecondOrderOdeState>>;
  numericIvpState: NumericIvpState;
  setNumericIvpState: Dispatch<SetStateAction<NumericIvpState>>;
  variableMemory: StoredVariableValue[];
};

export function CalculusWorkspace({
  screen,
  isMenuOpen,
  routeMeta,
  coreGuideArticleId,
  menuPanelRef,
  menuEntries,
  menuSelection,
  menuFooterText,
  onOpenScreen,
  onSetMenuSelection,
  onOpenGuideArticle,
  onOpenGuideMode,
  onLoadWorkbenchToEditor,
  onCopyWorkbenchExpression,
  onRegisterActiveField,
  keyboardLayouts,
  workbenchLatex,
  calculusFiniteLimitFieldRef,
  calculusInfiniteLimitFieldRef,
  maclaurinFieldRef,
  taylorFieldRef,
  firstOrderOdeLhsFieldRef,
  firstOrderOdeRhsFieldRef,
  secondOrderOdeForcingFieldRef,
  numericIvpFieldRef,
  calculusDefiniteLowerRef,
  calculusImproperLowerRef,
  calculusFiniteLimitTargetRef,
  taylorCenterRef,
  secondOrderA2Ref,
  numericIvpX0Ref,
  calculusIndefiniteIntegral,
  setCalculusIndefiniteIntegral,
  calculusDefiniteIntegral,
  setCalculusDefiniteIntegral,
  calculusImproperIntegral,
  setCalculusImproperIntegral,
  calculusFiniteLimit,
  setCalculusFiniteLimit,
  calculusInfiniteLimit,
  setCalculusInfiniteLimit,
  maclaurinState,
  setMaclaurinState,
  taylorState,
  setTaylorState,
  firstOrderOdeState,
  setFirstOrderOdeState,
  secondOrderOdeState,
  setSecondOrderOdeState,
  numericIvpState,
  setNumericIvpState,
  variableMemory,
}: CalculusWorkspaceProps) {
  return (
    <section className={`mode-panel ${isMenuOpen ? 'calculus-menu-panel' : 'calculus-panel'}`}>
      {routeMeta ? (
        <div className="equation-panel-header calculus-header">
          <div className="equation-panel-copy">
            <div className="equation-breadcrumbs">
              {routeMeta.breadcrumb.map((segment) => (
                <span key={`${screen}-${segment}`} className="equation-breadcrumb">
                  {segment}
                </span>
              ))}
            </div>
            <div className="card-title-row">
              <strong>{routeMeta.label}</strong>
              <span className="equation-badge">Calculus</span>
            </div>
            <p className="equation-hint calculus-subtitle">{routeMeta.description}</p>
            <div className="guide-related-links">
              {routeMeta.guideArticleId ? (
                <button className="guide-chip" onClick={() => onOpenGuideArticle(routeMeta.guideArticleId!)}>
                  Guide: This tool
                </button>
              ) : null}
              <button className="guide-chip" onClick={onOpenGuideMode}>Guide: Calculus</button>
              {coreGuideArticleId ? (
                <button className="guide-chip" onClick={() => onOpenGuideArticle(coreGuideArticleId)}>
                  Guide: Calculus
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isMenuOpen ? (
        <>
          <div ref={menuPanelRef} className="launcher-list equation-menu-list calculus-menu-list" tabIndex={-1}>
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry calculus-menu-entry ${index === menuSelection ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() =>
                  onSetMenuSelection(
                    screen as 'home' | 'derivativesHome' | 'integralsHome' | 'limitsHome' | 'seriesHome' | 'partialsHome' | 'odeHome',
                    index,
                  )
                }
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help calculus-menu-footer">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'derivative' ? (
        <GeneratedPreviewCard
          title={routeMeta?.previewTitle ?? 'Generated Derivative'}
          subtitle={routeMeta?.previewSubtitle ?? 'Calculus derivative with respect to the selected variable'}
          latex={workbenchLatex}
          emptyTitle={routeMeta?.emptyStateTitle ?? 'Derivative body needed'}
          emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an expression to generate the derivative form.'}
          onCopyExpr={onCopyWorkbenchExpression}
        />
      ) : screen === 'derivativePoint' ? (
        <GeneratedPreviewCard
          title={routeMeta?.previewTitle ?? 'Generated Derivative at Point'}
          subtitle={routeMeta?.previewSubtitle ?? 'Derivative evaluated at a numeric variable value'}
          latex={workbenchLatex}
          emptyTitle={routeMeta?.emptyStateTitle ?? 'Body and point needed'}
          emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an expression and point value to build the derivative-at-point form.'}
          onCopyExpr={onCopyWorkbenchExpression}
        />
      ) : screen === 'indefiniteIntegral' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Integral Context</strong>
              <span className="equation-badge">Symbolic-only</span>
            </div>
            <label className="range-field">
              <span>Variable</span>
              <input
                value={calculusIndefiniteIntegral.integrationVariable ?? 'x'}
                onChange={(event) =>
                  setCalculusIndefiniteIntegral((currentState) => ({
                    ...currentState,
                    integrationVariable: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Integral'}
            subtitle={routeMeta?.previewSubtitle ?? `Stronger symbolic antiderivative rules in ${calculusIndefiniteIntegral.integrationVariable ?? 'x'}`}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Integrand needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an integrand to generate the antiderivative form.'}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'definiteIntegral' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Finite Bounds</strong>
              <span className="equation-badge">Symbolic first</span>
            </div>
            <div className="range-row">
              <label className="range-field">
                <span>Variable</span>
                <input
                  value={calculusDefiniteIntegral.integrationVariable ?? 'x'}
                  onChange={(event) =>
                    setCalculusDefiniteIntegral((currentState) => ({
                      ...currentState,
                      integrationVariable: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="range-field">
                <span>Lower</span>
                <SignedNumberDraftInput
                  ref={calculusDefiniteLowerRef}
                  value={calculusDefiniteIntegral.lower}
                  onValueChange={(lower) => setCalculusDefiniteIntegral((currentState) => ({ ...currentState, lower }))}
                />
              </label>
              <label className="range-field">
                <span>Upper</span>
                <SignedNumberDraftInput
                  value={calculusDefiniteIntegral.upper}
                  onValueChange={(upper) => setCalculusDefiniteIntegral((currentState) => ({ ...currentState, upper }))}
                />
              </label>
            </div>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Integral'}
            subtitle={routeMeta?.previewSubtitle ?? 'Finite bounds with numeric fallback when allowed'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Integrand and bounds needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an integrand and finite bounds to build the definite integral.'}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'improperIntegral' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Improper Bounds</strong>
              <span className="equation-badge">Convergent cases</span>
            </div>
            <label className="range-field">
              <span>Variable</span>
              <input
                value={calculusImproperIntegral.integrationVariable ?? 'x'}
                onChange={(event) =>
                  setCalculusImproperIntegral((currentState) => ({
                    ...currentState,
                    integrationVariable: event.target.value,
                  }))
                }
              />
            </label>
            <div className="guide-chip-row">
              {(['finite', 'negInfinity'] as const).map((kind) => (
                <button
                  key={kind}
                  className={`guide-chip ${calculusImproperIntegral.lowerKind === kind ? 'is-active' : ''}`}
                  onClick={() => setCalculusImproperIntegral((currentState) => ({ ...currentState, lowerKind: kind }))}
                >
                  {kind === 'finite' ? 'Finite lower' : '-\u221e lower'}
                </button>
              ))}
            </div>
            {calculusImproperIntegral.lowerKind === 'finite' ? (
              <label className="range-field">
                <span>Lower</span>
                <SignedNumberDraftInput
                  ref={calculusImproperLowerRef}
                  value={calculusImproperIntegral.lower}
                  onValueChange={(lower) => setCalculusImproperIntegral((currentState) => ({ ...currentState, lower }))}
                />
              </label>
            ) : null}
            <div className="guide-chip-row">
              {(['finite', 'posInfinity'] as const).map((kind) => (
                <button
                  key={kind}
                  className={`guide-chip ${calculusImproperIntegral.upperKind === kind ? 'is-active' : ''}`}
                  onClick={() => setCalculusImproperIntegral((currentState) => ({ ...currentState, upperKind: kind }))}
                >
                  {kind === 'finite' ? 'Finite upper' : '+\u221e upper'}
                </button>
              ))}
            </div>
            {calculusImproperIntegral.upperKind === 'finite' ? (
              <label className="range-field">
                <span>Upper</span>
                <SignedNumberDraftInput
                  value={calculusImproperIntegral.upper}
                  onValueChange={(upper) => setCalculusImproperIntegral((currentState) => ({ ...currentState, upper }))}
                />
              </label>
            ) : null}
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Integral'}
            subtitle={routeMeta?.previewSubtitle ?? 'Infinite-bound workflows with controlled divergence errors'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Integrand or bounds missing'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter an integrand and choose the finite or infinite bounds to build the improper integral.'}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'finiteLimit' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Finite Limit</strong>
              <span className="equation-badge">
                {calculusFiniteLimit.direction === 'two-sided' ? 'Two-sided' : `${calculusFiniteLimit.direction}-hand`}
              </span>
            </div>
            <div className="guide-chip-row">
              {(['two-sided', 'left', 'right'] as const).map((direction) => (
                <button
                  key={direction}
                  className={`guide-chip ${calculusFiniteLimit.direction === direction ? 'is-active' : ''}`}
                  onClick={() => setCalculusFiniteLimit((currentState) => ({ ...currentState, direction }))}
                >
                  {direction === 'two-sided' ? 'Two-Sided' : direction === 'left' ? 'Left' : 'Right'}
                </button>
              ))}
            </div>
            <MathEditor
              ref={calculusFiniteLimitFieldRef}
              className="secondary-mathfield"
              value={calculusFiniteLimit.bodyLatex}
              modeId="calculus"
              screenHint={screen}
              onChange={(bodyLatex) => setCalculusFiniteLimit((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{\\sin(x)}{x}"
            />
            <VariableHintStrip
              compact
              latex={calculusFiniteLimit.bodyLatex}
              mode="calculus"
              screenHint={screen}
              activeVariable="x"
              storedVariables={variableMemory}
            />
            <label className="range-field">
              <span>Target</span>
              <SignedNumberDraftInput
                ref={calculusFiniteLimitTargetRef}
                value={calculusFiniteLimit.target}
                onValueChange={(target) =>
                  setCalculusFiniteLimit((currentState) => ({ ...currentState, target }))
                }
              />
            </label>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Limit'}
            subtitle={routeMeta?.previewSubtitle ?? 'Finite target with left, right, or two-sided analysis'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Body and target needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the body and target value to build the finite-limit expression.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'infiniteLimit' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Infinite Target</strong>
              <span className="equation-badge">
                {calculusInfiniteLimit.targetKind === 'posInfinity' ? 'x -> +\u221e' : 'x -> -\u221e'}
              </span>
            </div>
            <div className="guide-chip-row">
              {(['posInfinity', 'negInfinity'] as const).map((targetKind) => (
                <button
                  key={targetKind}
                  className={`guide-chip ${calculusInfiniteLimit.targetKind === targetKind ? 'is-active' : ''}`}
                  onClick={() => setCalculusInfiniteLimit((currentState) => ({ ...currentState, targetKind }))}
                >
                  {targetKind === 'posInfinity' ? '+\u221e' : '-\u221e'}
                </button>
              ))}
            </div>
            <MathEditor
              ref={calculusInfiniteLimitFieldRef}
              className="secondary-mathfield"
              value={calculusInfiniteLimit.bodyLatex}
              modeId="calculus"
              screenHint={screen}
              onChange={(bodyLatex) => setCalculusInfiniteLimit((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{3x^2+1}{2x^2-5}"
            />
            <VariableHintStrip
              compact
              latex={calculusInfiniteLimit.bodyLatex}
              mode="calculus"
              screenHint={screen}
              activeVariable="x"
              storedVariables={variableMemory}
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Infinite Limit'}
            subtitle={routeMeta?.previewSubtitle ?? 'End behavior as x approaches infinity'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Body needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the body to build the infinite-target limit expression.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'maclaurin' || screen === 'taylor' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>{screen === 'maclaurin' ? 'Maclaurin' : 'Taylor'} Input</strong>
              <span className="equation-badge">Order 1-8</span>
            </div>
            <MathEditor
              ref={screen === 'maclaurin' ? maclaurinFieldRef : taylorFieldRef}
              className="secondary-mathfield"
              value={screen === 'maclaurin' ? maclaurinState.bodyLatex : taylorState.bodyLatex}
              modeId="calculus"
              screenHint={screen}
              onChange={(bodyLatex) => {
                if (screen === 'maclaurin') {
                  setMaclaurinState((currentState) => ({ ...currentState, bodyLatex }));
                } else {
                  setTaylorState((currentState) => ({ ...currentState, bodyLatex }));
                }
              }}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder={screen === 'maclaurin' ? '\\sin(x)' : 'x^3+2x'}
            />
            <VariableHintStrip
              compact
              latex={screen === 'maclaurin' ? maclaurinState.bodyLatex : taylorState.bodyLatex}
              mode="calculus"
              screenHint={screen}
              activeVariable="x"
              storedVariables={variableMemory}
            />
            {screen === 'taylor' ? (
              <label className="range-field">
                <span>Center</span>
                <SignedNumberDraftInput
                  ref={taylorCenterRef}
                  value={taylorState.center}
                  onValueChange={(center) => setTaylorState((currentState) => ({ ...currentState, center }))}
                />
              </label>
            ) : null}
            <div className="guide-chip-row">
              {Array.from({ length: 8 }, (_, index) => index + 1).map((order) => (
                <button
                  key={order}
                  className={`guide-chip ${(screen === 'maclaurin' ? maclaurinState.order : taylorState.order) === order ? 'is-active' : ''}`}
                  onClick={() => {
                    if (screen === 'maclaurin') {
                      setMaclaurinState((currentState) => ({ ...currentState, order }));
                    } else {
                      setTaylorState((currentState) => ({ ...currentState, order }));
                    }
                  }}
                >
                  {order}
                </button>
              ))}
            </div>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Series'}
            subtitle={routeMeta?.previewSubtitle ?? (screen === 'maclaurin' ? 'Centered at 0' : 'Centered at a numeric value')}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? (screen === 'maclaurin' ? 'Body and order needed' : 'Body, center, and order needed')}
            emptyDescription={routeMeta?.emptyStateDescription ?? (screen === 'maclaurin'
              ? 'Enter a body and choose an order to build the Maclaurin series form.'
              : 'Enter a body, center, and order to build the Taylor series form.')}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'laplace' ? (
        <GeneratedPreviewCard
          title={routeMeta?.previewTitle ?? 'Generated Laplace Request'}
          subtitle={routeMeta?.previewSubtitle ?? 'Fixed source variable t and transform variable s'}
          latex={workbenchLatex}
          emptyTitle={routeMeta?.emptyStateTitle ?? 'Function needed'}
          emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter f(t) to build the Laplace transform request.'}
          onCopyExpr={onCopyWorkbenchExpression}
        />
      ) : screen === 'partialDerivative' ? (
        <GeneratedPreviewCard
          title={routeMeta?.previewTitle ?? 'Generated Partial Derivative'}
          subtitle={routeMeta?.previewSubtitle ?? 'Treat other variables as constants'}
          latex={workbenchLatex}
          emptyTitle={routeMeta?.emptyStateTitle ?? 'Expression needed'}
          emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter a multivariable expression to build the first-order partial derivative.'}
          onCopyExpr={onCopyWorkbenchExpression}
        />
      ) : screen === 'implicitDerivative' ? (
        <GeneratedPreviewCard
          title={routeMeta?.previewTitle ?? 'Generated Implicit Derivative'}
          subtitle={routeMeta?.previewSubtitle ?? 'Differentiate the relation, then isolate the derivative through Equation'}
          latex={workbenchLatex}
          emptyTitle={routeMeta?.emptyStateTitle ?? 'Relation needed'}
          emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter one equation such as x^2+y^2=25 to build the implicit derivative request.'}
          onCopyExpr={onCopyWorkbenchExpression}
        />
      ) : screen === 'odeFirstOrder' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>First-Order ODE</strong>
              <span className="equation-badge">{firstOrderOdeState.classification}</span>
            </div>
            <div className="guide-chip-row">
              {(['separable', 'linear', 'exact'] as const).map((classification) => (
                <button
                  key={classification}
                  className={`guide-chip ${firstOrderOdeState.classification === classification ? 'is-active' : ''}`}
                  onClick={() => setFirstOrderOdeState((currentState) => ({ ...currentState, classification }))}
                >
                  {classification}
                </button>
              ))}
            </div>
            <MathEditor
              ref={firstOrderOdeLhsFieldRef}
              className="secondary-mathfield"
              value={firstOrderOdeState.lhsLatex}
              modeId="calculus"
              screenHint={screen}
              onChange={(lhsLatex) => setFirstOrderOdeState((currentState) => ({ ...currentState, lhsLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="\\frac{dy}{dx}"
            />
            <VariableHintStrip
              compact
              latex={firstOrderOdeState.lhsLatex}
              mode="calculus"
              screenHint={screen}
              activeVariable="x"
              boundVariables={['y']}
              storedVariables={variableMemory}
            />
            <MathEditor
              ref={firstOrderOdeRhsFieldRef}
              className="secondary-mathfield"
              value={firstOrderOdeState.rhsLatex}
              modeId="calculus"
              screenHint={screen}
              onChange={(rhsLatex) => setFirstOrderOdeState((currentState) => ({ ...currentState, rhsLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="xy"
            />
            <VariableHintStrip
              compact
              latex={firstOrderOdeState.rhsLatex}
              mode="calculus"
              screenHint={screen}
              activeVariable="x"
              boundVariables={['y']}
              storedVariables={variableMemory}
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated First-Order ODE'}
            subtitle={routeMeta?.previewSubtitle ?? 'Guided symbolic class selection'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Equation pieces needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the left-hand side and right-hand side to build the first-order ODE.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'odeSecondOrder' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Second-Order ODE</strong>
              <span className="equation-badge">Constant coefficients</span>
            </div>
            <div className="polynomial-grid" data-columns="3">
              <label className="range-field">
                <span>a\u2082</span>
                <SignedNumberDraftInput
                  ref={secondOrderA2Ref}
                  value={secondOrderOdeState.a2}
                  onValueChange={(a2) => setSecondOrderOdeState((currentState) => ({ ...currentState, a2 }))}
                />
              </label>
              <label className="range-field">
                <span>a\u2081</span>
                <SignedNumberDraftInput
                  value={secondOrderOdeState.a1}
                  onValueChange={(a1) => setSecondOrderOdeState((currentState) => ({ ...currentState, a1 }))}
                />
              </label>
              <label className="range-field">
                <span>a\u2080</span>
                <SignedNumberDraftInput
                  value={secondOrderOdeState.a0}
                  onValueChange={(a0) => setSecondOrderOdeState((currentState) => ({ ...currentState, a0 }))}
                />
              </label>
            </div>
            <MathEditor
              ref={secondOrderOdeForcingFieldRef}
              className="secondary-mathfield"
              value={secondOrderOdeState.forcingLatex}
              modeId="calculus"
              screenHint={screen}
              onChange={(forcingLatex) => setSecondOrderOdeState((currentState) => ({ ...currentState, forcingLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="0"
            />
            <VariableHintStrip
              compact
              latex={secondOrderOdeState.forcingLatex}
              mode="calculus"
              screenHint={screen}
              activeVariable="x"
              boundVariables={['y']}
              storedVariables={variableMemory}
            />
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Second-Order ODE'}
            subtitle={routeMeta?.previewSubtitle ?? 'Constant-coefficient forms'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'Coefficients and forcing needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? 'Enter the coefficients and forcing term to build the second-order ODE.'}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : screen === 'odeNumericIvp' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Numeric IVP</strong>
              <span className="equation-badge">{numericIvpState.method.toUpperCase()}</span>
            </div>
            <div className="guide-chip-row">
              {(['rk4', 'rk45'] as const).map((method) => (
                <button
                  key={method}
                  className={`guide-chip ${numericIvpState.method === method ? 'is-active' : ''}`}
                  onClick={() => setNumericIvpState((currentState) => ({ ...currentState, method }))}
                >
                  {method.toUpperCase()}
                </button>
              ))}
            </div>
            <MathEditor
              ref={numericIvpFieldRef}
              className="secondary-mathfield"
              value={numericIvpState.bodyLatex}
              modeId="calculus"
              screenHint={screen}
              onChange={(bodyLatex) => setNumericIvpState((currentState) => ({ ...currentState, bodyLatex }))}
              keyboardLayouts={keyboardLayouts}
              onFocus={onRegisterActiveField}
              placeholder="x+y"
            />
            <VariableHintStrip
              compact
              latex={numericIvpState.bodyLatex}
              mode="calculus"
              screenHint={screen}
              activeVariable="x"
              boundVariables={['y']}
              storedVariables={variableMemory}
            />
            <div className="polynomial-grid" data-columns="4">
              <label className="range-field">
                <span>x\u2080</span>
                <SignedNumberDraftInput
                  ref={numericIvpX0Ref}
                  value={numericIvpState.x0}
                  onValueChange={(x0) => setNumericIvpState((currentState) => ({ ...currentState, x0 }))}
                />
              </label>
              <label className="range-field">
                <span>y\u2080</span>
                <SignedNumberDraftInput
                  value={numericIvpState.y0}
                  onValueChange={(y0) => setNumericIvpState((currentState) => ({ ...currentState, y0 }))}
                />
              </label>
              <label className="range-field">
                <span>x end</span>
                <SignedNumberDraftInput
                  value={numericIvpState.xEnd}
                  onValueChange={(xEnd) => setNumericIvpState((currentState) => ({ ...currentState, xEnd }))}
                />
              </label>
              <label className="range-field">
                <span>Step</span>
                <SignedNumberDraftInput
                  value={numericIvpState.step}
                  onValueChange={(step) => setNumericIvpState((currentState) => ({ ...currentState, step }))}
                />
              </label>
            </div>
          </div>
          <GeneratedPreviewCard
            title={routeMeta?.previewTitle ?? 'Generated Numeric IVP'}
            subtitle={routeMeta?.previewSubtitle ?? 'Numeric initial-value solving'}
            latex={workbenchLatex}
            emptyTitle={routeMeta?.emptyStateTitle ?? 'IVP data needed'}
            emptyDescription={routeMeta?.emptyStateDescription ?? "Enter y' = f(x,y), initial values, and a step size to build the IVP."}
            onToEditor={onLoadWorkbenchToEditor}
            onCopyExpr={onCopyWorkbenchExpression}
          />
        </div>
      ) : null}
    </section>
  );
}
