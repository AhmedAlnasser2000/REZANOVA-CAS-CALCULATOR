import type { MathfieldElement } from 'mathlive';
import type { VirtualKeyboardLayout } from 'mathlive';
import type { RefObject } from 'react';
import { MathEditor } from '../../components/MathEditor';
import { MathStatic } from '../../components/MathStatic';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import { VariableHintStrip } from '../../components/VariableHintStrip';
import type { StoredVariableValue, TableResponse } from '../../types/calculator';

type TableWorkspaceProps = {
  tablePrimaryLatex: string;
  tableSecondaryLatex: string;
  tableSecondaryEnabled: boolean;
  tableStart: number;
  tableEnd: number;
  tableStep: number;
  tableResponse: TableResponse | null;
  tableKeyboardLayouts: readonly VirtualKeyboardLayout[];
  activeFieldRef: RefObject<MathfieldElement | null>;
  onOpenGuideMode: (mode: 'table') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onSetTablePrimaryLatex: (latex: string) => void;
  onSetTableSecondaryLatex: (latex: string) => void;
  onSetTableStart: (value: number) => void;
  onSetTableEnd: (value: number) => void;
  onSetTableStep: (value: number) => void;
  variableMemory: StoredVariableValue[];
};

function TableWorkspace({
  tablePrimaryLatex,
  tableSecondaryLatex,
  tableSecondaryEnabled,
  tableStart,
  tableEnd,
  tableStep,
  tableResponse,
  tableKeyboardLayouts,
  activeFieldRef,
  onOpenGuideMode,
  onOpenGuideArticle,
  onSetTablePrimaryLatex,
  onSetTableSecondaryLatex,
  onSetTableStart,
  onSetTableEnd,
  onSetTableStep,
  variableMemory,
}: TableWorkspaceProps) {
  return (
    <section className="mode-panel">
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('table')}>Guide: Table mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('calculus-integrals-limits')}>Guide: Calculus examples</button>
      </div>
      <div className="grid-two">
        <div className="editor-card">
          <strong>f(x)</strong>
          <MathEditor
            className="secondary-mathfield"
            dataTestId="table-primary-editor"
            value={tablePrimaryLatex}
            onChange={onSetTablePrimaryLatex}
            modeId="table"
            screenHint="table"
            keyboardLayouts={tableKeyboardLayouts}
            onFocus={(field) => {
              activeFieldRef.current = field;
            }}
            placeholder="x^2"
          />
          <VariableHintStrip
            compact
            latex={tablePrimaryLatex}
            mode="table"
            screenHint="table"
            activeVariable="x"
            storedVariables={variableMemory}
          />
        </div>
        <div className="editor-card">
          <strong>g(x)</strong>
          {tableSecondaryEnabled ? (
            <>
              <MathEditor
                className="secondary-mathfield"
                dataTestId="table-secondary-editor"
                value={tableSecondaryLatex}
                onChange={onSetTableSecondaryLatex}
                modeId="table"
                screenHint="table"
                keyboardLayouts={tableKeyboardLayouts}
                onFocus={(field) => {
                  activeFieldRef.current = field;
                }}
                placeholder="x+1"
              />
              <VariableHintStrip
                compact
                latex={tableSecondaryLatex}
                mode="table"
                screenHint="table"
                activeVariable="x"
                storedVariables={variableMemory}
              />
            </>
          ) : (
            <p>Enable the second function with `F2`.</p>
          )}
        </div>
      </div>
      <div className="range-row">
        <label><span>Start</span><SignedNumberInput value={tableStart} onValueChange={onSetTableStart} /></label>
        <label><span>End</span><SignedNumberInput value={tableEnd} onValueChange={onSetTableEnd} /></label>
        <label><span>Step</span><SignedNumberInput value={tableStep} onValueChange={onSetTableStep} /></label>
      </div>
      {tableResponse && !tableResponse.error ? (
        <div className="table-preview" data-testid="table-preview">
          <div className="table-header-row">
            {tableResponse.headers.map((header) => (
              <MathStatic key={header} className="table-header-math" latex={header} />
            ))}
          </div>
          {tableResponse.rows.map((row, index) => (
            <div
              key={`${row.x}-${index}`}
              className="table-data-row"
              data-testid={`table-row-${index}`}
            >
              <span>{row.x}</span>
              <span>{row.primary}</span>
              {tableResponse.headers.length === 3 ? <span>{row.secondary}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export { TableWorkspace };
