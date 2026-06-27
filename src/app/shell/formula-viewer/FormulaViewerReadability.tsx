import { MathStatic } from '../../../components/MathStatic';
import type { DisplayBlockLine } from '../../../lib/display/result/display-blocks';
import type { SymbolicDisplayPrefs } from '../../../lib/display/symbolic-display';

export type FormulaViewerMathSize = '100' | '125' | '150' | '175' | '200';

export const DEFAULT_FORMULA_VIEWER_MATH_SIZE: FormulaViewerMathSize = '125';

const MATH_SIZE_OPTIONS: readonly FormulaViewerMathSize[] = ['100', '125', '150', '175', '200'];

export function FormulaViewerReadabilityControls({
  mathSize,
  onMathSizeChange,
}: {
  mathSize: FormulaViewerMathSize;
  onMathSizeChange: (mathSize: FormulaViewerMathSize) => void;
}) {
  return (
    <section className="formula-viewer-readability-controls" aria-label="Formula viewer readability controls">
      <span className="formula-viewer-control-label">Math size</span>
      <div className="formula-viewer-size-options" role="group" aria-label="Math size">
        {MATH_SIZE_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className="workspace-action-button formula-viewer-size-button"
            aria-pressed={mathSize === option}
            onClick={() => onMathSizeChange(option)}
          >
            {option}%
          </button>
        ))}
      </div>
    </section>
  );
}

export function FormulaViewerCaseRow({
  line,
  isFirstRow,
  prefixLatex,
  rowIndex,
  symbolicDisplayPrefs,
}: {
  line: DisplayBlockLine;
  isFirstRow: boolean;
  prefixLatex: string;
  rowIndex: number;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
}) {
  const hasPrefixLatex = prefixLatex.trim().length > 0;
  return (
    <div className="formula-viewer-case-row" data-testid={`formula-viewer-case-row-${rowIndex}`}>
      {isFirstRow && hasPrefixLatex ? (
        <MathStatic
          className="result-math result-case-prefix"
          latex={prefixLatex}
          block={false}
          displayPrefs={symbolicDisplayPrefs}
          normalizeDisplay={false}
        />
      ) : (
        <span className="result-case-prefix result-case-prefix-spacer" aria-hidden="true" />
      )}
      <MathStatic latex={line.latex ?? ''} displayPrefs={symbolicDisplayPrefs} deferRender />
      {line.conditionLatex ? (
        <span className="case-math-condition">
          <span className="case-math-condition-label">when</span>
          <MathStatic latex={line.conditionLatex} displayPrefs={symbolicDisplayPrefs} deferRender />
        </span>
      ) : null}
    </div>
  );
}
