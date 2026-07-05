import { useRef, type MutableRefObject, type RefObject } from 'react';
import type { MathfieldElement } from 'mathlive';
import { MathEditor } from '../../components/MathEditor';
import { MathStatic } from '../../components/MathStatic';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import { VariableHintStrip } from '../../components/VariableHintStrip';
import type {
  EquationRouteMeta,
  EquationAnswerMode,
  EquationScreen,
  PeriodicIntervalSuggestion,
  PolynomialEquationView,
  StoredVariableValue,
} from '../../types/calculator';

type EquationMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: EquationScreen;
};

type PolynomialMetaLike = {
  title: string;
  coefficientLabels: string[];
};

type EquationSolveTargetCandidateLike = {
  name: string;
  label: string;
};

type EquationWorkspaceProps = {
  routeMeta: EquationRouteMeta | null;
  screen: EquationScreen;
  isMenuOpen: boolean;
  currentMenuScreen: 'home' | 'polynomialMenu' | 'simultaneousMenu' | null;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: EquationMenuEntryLike[];
  currentMenuIndex: number;
  menuFooterText: string;
  onOpenScreen: (screen: EquationScreen) => void;
  onHoverMenuIndex: (screen: 'home' | 'polynomialMenu' | 'simultaneousMenu', index: number) => void;
  system2: number[][];
  system3: number[][];
  systemInputRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onSetSystemCell: (size: 2 | 3, row: number, column: number, value: number) => void;
  polynomialSystem2Latex: readonly [string, string];
  onSetPolynomialSystemEquation: (index: 0 | 1, latex: string) => void;
  onFocusPolynomialSystemField: (field: MathfieldElement) => void;
  activePolynomialView: PolynomialEquationView | null;
  activePolynomialMeta: PolynomialMetaLike | null;
  activePolynomialCoefficients: number[] | null;
  polynomialInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  onSetPolynomialCoefficient: (view: PolynomialEquationView, index: number, value: number) => void;
  polynomialTemplateLatex: (view: PolynomialEquationView) => string;
  buildPolynomialEquationLatex: (view: PolynomialEquationView, coefficients: number[]) => string;
  solveTargetCandidates: EquationSolveTargetCandidateLike[];
  selectedSolveTarget: string | null;
  answerMode: EquationAnswerMode;
  shouldShowSolveTargetSelector: boolean;
  solveTargetMessage?: string;
  onSelectSolveTarget: (target: string) => void;
  onSetAnswerMode: (mode: EquationAnswerMode) => void;
  shouldAllowNumericSolve: boolean;
  shouldShowNumericSolvePanel: boolean;
  equationNumericSolvePanel: {
    enabled: boolean;
    start: string;
    end: string;
    subdivisions: number;
  };
  numericIntervalSuggestions: readonly PeriodicIntervalSuggestion[];
  onSetNumericSolvePanelEnabled: (enabled: boolean) => void;
  onApplyNumericIntervalSuggestion: (start: string, end: string) => void;
  onUpdateNumericStart: (value: number) => void;
  onUpdateNumericEnd: (value: number) => void;
  onUpdateNumericSubdivisions: (value: number) => void;
  shouldAllowComplexRegionSolve: boolean;
  shouldShowComplexRegionPanel: boolean;
  equationComplexRegionPanel: {
    enabled: boolean;
    reMin: string;
    reMax: string;
    imMin: string;
    imMax: string;
    gridSize: number;
    randomSeedCount: number;
    samplesPerEdge: number;
    subdivisionDepth: number;
    cellBudget: number;
  };
  onSetComplexRegionPanelEnabled: (enabled: boolean) => void;
  onUpdateComplexRegionReMin: (value: number) => void;
  onUpdateComplexRegionReMax: (value: number) => void;
  onUpdateComplexRegionImMin: (value: number) => void;
  onUpdateComplexRegionImMax: (value: number) => void;
  onUpdateComplexRegionGridSize: (value: number) => void;
  onUpdateComplexRegionRandomSeedCount: (value: number) => void;
  onUpdateComplexRegionSamplesPerEdge: (value: number) => void;
  onUpdateComplexRegionSubdivisionDepth: (value: number) => void;
  onUpdateComplexRegionCellBudget: (value: number) => void;
  onOpenGuideArticle: (articleId: string) => void;
  onOpenGuideMode: () => void;
  storedVariables: readonly StoredVariableValue[];
};

export function EquationWorkspace({
  routeMeta,
  screen,
  isMenuOpen,
  currentMenuScreen,
  menuPanelRef,
  menuEntries,
  currentMenuIndex,
  menuFooterText,
  onOpenScreen,
  onHoverMenuIndex,
  system2,
  system3,
  systemInputRefs,
  onSetSystemCell,
  polynomialSystem2Latex,
  onSetPolynomialSystemEquation,
  onFocusPolynomialSystemField,
  activePolynomialView,
  activePolynomialMeta,
  activePolynomialCoefficients,
  polynomialInputRefs,
  onSetPolynomialCoefficient,
  polynomialTemplateLatex,
  buildPolynomialEquationLatex,
  solveTargetCandidates,
  selectedSolveTarget,
  answerMode,
  shouldShowSolveTargetSelector,
  solveTargetMessage,
  onSelectSolveTarget,
  onSetAnswerMode,
  shouldAllowNumericSolve,
  shouldShowNumericSolvePanel,
  equationNumericSolvePanel,
  numericIntervalSuggestions,
  onSetNumericSolvePanelEnabled,
  onApplyNumericIntervalSuggestion,
  onUpdateNumericStart,
  onUpdateNumericEnd,
  onUpdateNumericSubdivisions,
  shouldAllowComplexRegionSolve,
  shouldShowComplexRegionPanel,
  equationComplexRegionPanel,
  onSetComplexRegionPanelEnabled,
  onUpdateComplexRegionReMin,
  onUpdateComplexRegionReMax,
  onUpdateComplexRegionImMin,
  onUpdateComplexRegionImMax,
  onUpdateComplexRegionGridSize,
  onUpdateComplexRegionRandomSeedCount,
  onUpdateComplexRegionSamplesPerEdge,
  onUpdateComplexRegionSubdivisionDepth,
  onUpdateComplexRegionCellBudget,
  onOpenGuideArticle,
  onOpenGuideMode,
  storedVariables,
}: EquationWorkspaceProps) {
  const polynomialSystemFieldRefs = useRef<Array<MathfieldElement | null>>([null, null]);

  return (
    <section className={`mode-panel ${isMenuOpen ? 'equation-menu-panel' : 'equation-work-panel'}`}>
      {routeMeta ? (
        <div className="equation-panel-header">
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
              {routeMeta.badge ? (
                <span className="equation-badge">{routeMeta.badge}</span>
              ) : null}
            </div>
            <p className="equation-hint">{routeMeta.description}</p>
            <div className="guide-related-links">
              <button className="guide-chip" onClick={() => onOpenGuideArticle('algebra-equations')}>Guide: Equation Solving</button>
              <button className="guide-chip" onClick={onOpenGuideMode}>When to use Equation</button>
            </div>
          </div>
        </div>
      ) : null}
      {isMenuOpen ? (
        <>
          <div
            ref={menuPanelRef}
            className="launcher-list equation-menu-list"
            tabIndex={-1}
          >
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry ${index === currentMenuIndex ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() => {
                  if (currentMenuScreen) {
                    onHoverMenuIndex(currentMenuScreen, index);
                  }
                }}
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'polynomialSystem2' ? (
        <>
          <div className="editor-card equation-branch-card">
            <div className="card-title-row">
              <strong>{routeMeta?.label}</strong>
              {routeMeta?.badge ? (
                <span className="equation-badge">{routeMeta.badge}</span>
              ) : null}
            </div>
            <p className="equation-hint">{routeMeta?.helpText}</p>
          </div>
          <div className="polynomial-system-panel">
            {polynomialSystem2Latex.map((latex, index) => (
              <div className="editor-card" key={`polynomial-system-${index}`}>
                <div className="card-title-row">
                  <strong>{index === 0 ? 'Equation 1' : 'Equation 2'}</strong>
                  <span className="equation-subtitle">x, y</span>
                </div>
                <MathEditor
                  ref={(node: MathfieldElement | null) => {
                    polynomialSystemFieldRefs.current[index] = node;
                    if (
                      index === 0
                      && node
                      && (
                        !systemInputRefs.current.polynomialSystem2
                        || !document.contains(systemInputRefs.current.polynomialSystem2)
                      )
                    ) {
                      systemInputRefs.current.polynomialSystem2 = node;
                    }
                  }}
                  className="secondary-mathfield"
                  dataTestId={index === 0 ? 'polynomial-system-equation-1' : 'polynomial-system-equation-2'}
                  value={latex}
                  onChange={(nextLatex) => {
                    const activeField = polynomialSystemFieldRefs.current[index];
                    if (activeField) {
                      onFocusPolynomialSystemField(activeField);
                    }
                    onSetPolynomialSystemEquation(index as 0 | 1, nextLatex);
                  }}
                  onFocus={(field) => {
                    polynomialSystemFieldRefs.current[index] = field;
                    onFocusPolynomialSystemField(field);
                  }}
                  modeId="equation"
                  screenHint="polynomialSystem2"
                  placeholder={index === 0 ? 'First equation' : 'Second equation'}
                />
                <VariableHintStrip
                  compact
                  latex={latex}
                  mode="equation"
                  screenHint="polynomialSystem2"
                  boundVariables={['x', 'y']}
                  storedVariables={storedVariables}
                />
              </div>
            ))}
          </div>
        </>
      ) : screen === 'linear2' || screen === 'linear3' ? (
        <>
          <div className="editor-card equation-branch-card">
            <div className="card-title-row">
              <strong>{routeMeta?.label}</strong>
              {routeMeta?.badge ? (
                <span className="equation-badge">{routeMeta.badge}</span>
              ) : null}
            </div>
            <p className="equation-hint">{routeMeta?.helpText}</p>
          </div>
          <div className="system-grid" data-columns={screen === 'linear2' ? 3 : 4}>
            {(screen === 'linear2' ? system2 : system3).map((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <label key={`${screen}-${rowIndex}-${columnIndex}`}>
                  <span>{columnIndex < (screen === 'linear2' ? 2 : 3) ? ['x', 'y', 'z'][columnIndex] : '='}</span>
                  <SignedNumberInput
                    ref={(node) => {
                      if (rowIndex === 0 && columnIndex === 0) {
                        systemInputRefs.current[screen] = node;
                      }
                    }}
                    value={value}
                    onValueChange={(nextValue) =>
                      onSetSystemCell(
                        screen === 'linear2' ? 2 : 3,
                        rowIndex,
                        columnIndex,
                        nextValue,
                      )
                    }
                  />
                </label>
              )),
            )}
          </div>
        </>
      ) : activePolynomialView && activePolynomialMeta && activePolynomialCoefficients ? (
        <>
          <div className="editor-card equation-branch-card">
            <div className="card-title-row">
              <strong>{routeMeta?.label}</strong>
              {routeMeta?.badge ? (
                <span className="equation-badge">{routeMeta.badge}</span>
              ) : null}
            </div>
            <p className="equation-hint">{routeMeta?.helpText}</p>
          </div>
          <div className="polynomial-panel">
            <div className="editor-card">
              <div className="card-title-row">
                <strong>{activePolynomialMeta.title}</strong>
                <span className="equation-subtitle">Solve in x</span>
              </div>
              <MathStatic
                className="polynomial-template-math"
                latex={polynomialTemplateLatex(activePolynomialView)}
              />
              <p className="equation-hint">
                Enter coefficients for {activePolynomialMeta.coefficientLabels.join(', ')}. The leading coefficient must stay non-zero.
              </p>
              <div className="polynomial-grid" data-columns={activePolynomialMeta.coefficientLabels.length}>
                {activePolynomialMeta.coefficientLabels.map((label, index) => (
                  <label key={`${screen}-${label}`}>
                    <span>{label}</span>
                    <SignedNumberInput
                      ref={(node) => {
                        if (index === 0) {
                          polynomialInputRefs.current[activePolynomialView] = node;
                        }
                      }}
                      value={activePolynomialCoefficients[index]}
                      onValueChange={(nextValue) =>
                        onSetPolynomialCoefficient(activePolynomialView, index, nextValue)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="editor-card">
              <strong>Generated Equation</strong>
              <MathStatic
                className="polynomial-preview-math"
                latex={buildPolynomialEquationLatex(activePolynomialView, activePolynomialCoefficients)}
                emptyLabel="Generated equation"
                deferRender
              />
              <p className="equation-hint">
                Press EXE or F1 to solve and return exact roots first.
              </p>
            </div>
          </div>
        </>
      ) : screen === 'symbolic' ? (
        <div className="editor-card equation-branch-card">
          <div className="card-title-row">
            <strong>{routeMeta?.label}</strong>
            {routeMeta?.badge ? (
              <span className="equation-badge">{routeMeta.badge}</span>
            ) : null}
          </div>
          <p className="equation-hint">{routeMeta?.helpText}</p>
          <p className="equation-hint">
            Enter a symbolic equation in the main display, for example `x^2-5x+6=0`.
          </p>
          {shouldShowSolveTargetSelector ? (
            <div className="equation-numeric-panel" data-testid="equation-solve-target-selector">
              <div className="card-title-row">
                <strong>Solve for</strong>
                {selectedSolveTarget ? (
                  <span className="equation-origin-badge">{selectedSolveTarget}</span>
                ) : null}
              </div>
              <div className="workspace-action-row">
                {solveTargetCandidates.map((candidate) => (
                  <button
                    key={candidate.name}
                    type="button"
                    className={`workspace-action-button ${candidate.name === selectedSolveTarget ? 'workspace-action-button--primary' : ''}`}
                    aria-pressed={candidate.name === selectedSolveTarget}
                    onClick={() => onSelectSolveTarget(candidate.name)}
                  >
                    {candidate.label}
                  </button>
                ))}
              </div>
              {solveTargetMessage ? (
                <p className="equation-hint">{solveTargetMessage}</p>
              ) : null}
            </div>
          ) : null}
          <div className="equation-numeric-panel" data-testid="equation-answer-mode-control">
            <div className="card-title-row">
              <strong>Answer mode</strong>
              <span className="equation-origin-badge">
                {answerMode === 'isolate' ? 'Isolate' : 'Exact'}
              </span>
            </div>
            <div className="workspace-action-row">
              {[
                ['exact', 'Exact'],
                ['isolate', 'Isolate'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`workspace-action-button ${answerMode === mode ? 'workspace-action-button--primary' : ''}`}
                  aria-pressed={answerMode === mode}
                  onClick={() => onSetAnswerMode(mode as EquationAnswerMode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {shouldAllowNumericSolve || shouldAllowComplexRegionSolve ? (
            <div className="workspace-action-row">
              {shouldAllowNumericSolve ? (
                <button
                  type="button"
                  className={`workspace-action-button ${shouldShowNumericSolvePanel ? 'workspace-action-button--primary' : ''}`}
                  aria-pressed={shouldShowNumericSolvePanel}
                  onClick={() => onSetNumericSolvePanelEnabled(!shouldShowNumericSolvePanel)}
                >
                  {shouldShowNumericSolvePanel ? 'Disable Numeric Interval' : 'Enable Numeric Interval'}
                </button>
              ) : null}
              {shouldAllowComplexRegionSolve ? (
                <button
                  type="button"
                  className={`workspace-action-button ${shouldShowComplexRegionPanel ? 'workspace-action-button--primary' : ''}`}
                  aria-pressed={shouldShowComplexRegionPanel}
                  onClick={() => onSetComplexRegionPanelEnabled(!shouldShowComplexRegionPanel)}
                >
                  {shouldShowComplexRegionPanel ? 'Disable Complex Region' : 'Enable Complex Region'}
                </button>
              ) : null}
            </div>
          ) : null}
          {shouldShowNumericSolvePanel && shouldAllowNumericSolve ? (
            <div className="equation-numeric-panel">
              <div className="card-title-row">
                <strong>Numeric Interval Solve</strong>
                <span className="equation-origin-badge">Bracket-first</span>
              </div>
              <p className="equation-hint">
                Set a real interval, then press Run / F1 / EXE. Numeric solve searches local real roots in that interval and validates candidates against the original equation; it does not prove every root was found.
              </p>
              {numericIntervalSuggestions.length > 0 ? (
                <div className="equation-numeric-suggestions">
                  <span className="equation-subtitle">Suggested intervals</span>
                  <div className="workspace-action-row">
                    {numericIntervalSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.label}-${suggestion.start}-${suggestion.end}`}
                        type="button"
                        className="workspace-action-button"
                        onClick={() => onApplyNumericIntervalSuggestion(suggestion.start, suggestion.end)}
                      >
                        {suggestion.label}: [{suggestion.start}, {suggestion.end}]
                      </button>
                    ))}
                  </div>
                  <p className="equation-hint">
                    Prefer these intervals when exact periodic output suggests them. A suggestion fills Start and End only; Subdivisions stay under your control.
                  </p>
                </div>
              ) : null}
              <div className="grid-three">
                <label className="field-group">
                  <span>Start</span>
                  <SignedNumberInput
                    value={Number(equationNumericSolvePanel.start)}
                    onValueChange={onUpdateNumericStart}
                  />
                </label>
                <label className="field-group">
                  <span>End</span>
                  <SignedNumberInput
                    value={Number(equationNumericSolvePanel.end)}
                    onValueChange={onUpdateNumericEnd}
                  />
                </label>
                <label className="field-group">
                  <span>Subdivisions</span>
                  <input
                    type="number"
                    min={8}
                    step={1}
                    value={equationNumericSolvePanel.subdivisions}
                    onChange={(event) => onUpdateNumericSubdivisions(Number(event.target.value) || 0)}
                  />
                </label>
              </div>
            </div>
          ) : null}
          {shouldShowComplexRegionPanel && shouldAllowComplexRegionSolve ? (
            <div className="equation-numeric-panel">
              <div className="card-title-row">
                <strong>Complex Region Solve</strong>
                <span className="equation-origin-badge">Local region</span>
              </div>
              <p className="equation-hint">
                Set rectangular complex bounds, then press Run / F1 / EXE. Complex solve searches principal-branch roots in that region and reports local contour evidence when the boundary is safe.
              </p>
              <div className="grid-three">
                <label className="field-group">
                  <span>Re min</span>
                  <SignedNumberInput
                    value={Number(equationComplexRegionPanel.reMin)}
                    onValueChange={onUpdateComplexRegionReMin}
                  />
                </label>
                <label className="field-group">
                  <span>Re max</span>
                  <SignedNumberInput
                    value={Number(equationComplexRegionPanel.reMax)}
                    onValueChange={onUpdateComplexRegionReMax}
                  />
                </label>
                <label className="field-group">
                  <span>Grid</span>
                  <input
                    type="number"
                    min={3}
                    step={2}
                    value={equationComplexRegionPanel.gridSize}
                    onChange={(event) => onUpdateComplexRegionGridSize(Number(event.target.value) || 0)}
                  />
                </label>
                <label className="field-group">
                  <span>Im min</span>
                  <SignedNumberInput
                    value={Number(equationComplexRegionPanel.imMin)}
                    onValueChange={onUpdateComplexRegionImMin}
                  />
                </label>
                <label className="field-group">
                  <span>Im max</span>
                  <SignedNumberInput
                    value={Number(equationComplexRegionPanel.imMax)}
                    onValueChange={onUpdateComplexRegionImMax}
                  />
                </label>
              </div>
              <details className="equation-numeric-suggestions">
                <summary className="equation-subtitle">Advanced</summary>
                <div className="grid-three">
                  <label className="field-group">
                    <span>Random seeds</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={equationComplexRegionPanel.randomSeedCount}
                      onChange={(event) => onUpdateComplexRegionRandomSeedCount(Number(event.target.value) || 0)}
                    />
                  </label>
                  <label className="field-group">
                    <span>Contour samples</span>
                    <input
                      type="number"
                      min={16}
                      step={8}
                      value={equationComplexRegionPanel.samplesPerEdge}
                      onChange={(event) => onUpdateComplexRegionSamplesPerEdge(Number(event.target.value) || 0)}
                    />
                  </label>
                  <label className="field-group">
                    <span>Subdivision depth</span>
                    <input
                      type="number"
                      min={0}
                      max={4}
                      step={1}
                      value={equationComplexRegionPanel.subdivisionDepth}
                      onChange={(event) => onUpdateComplexRegionSubdivisionDepth(Number(event.target.value) || 0)}
                    />
                  </label>
                  <label className="field-group">
                    <span>Cell budget</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={equationComplexRegionPanel.cellBudget}
                      onChange={(event) => onUpdateComplexRegionCellBudget(Number(event.target.value) || 0)}
                    />
                  </label>
                </div>
              </details>
            </div>
          ) : null}
        </div>
      ) : (
        <p>Choose an equation tool from the Equation menu.</p>
      )}
    </section>
  );
}
