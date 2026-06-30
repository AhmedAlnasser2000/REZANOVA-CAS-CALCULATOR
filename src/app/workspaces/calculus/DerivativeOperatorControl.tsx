import type { MathNotationDisplay } from '../../../types/calculator';
import {
  defaultDerivativeOperatorInput,
  formatDerivativeAppliedPath,
  formatDerivativeOperator,
  formatDerivativeWrittenFactors,
  parseDerivativeOperator,
  type DerivativeOperatorKind,
} from '../../../lib/calculus/derivative-operator';

type DerivativeOperatorControlProps = {
  kind: DerivativeOperatorKind;
  operatorLatex: string | undefined;
  variable: string | undefined;
  notationMode: MathNotationDisplay;
  onChange: (operatorLatex: string, variable?: string) => void;
  testId: string;
};

export function DerivativeOperatorControl({
  kind,
  operatorLatex,
  variable,
  notationMode,
  onChange,
  testId,
}: DerivativeOperatorControlProps) {
  const inputValue = operatorLatex ?? defaultDerivativeOperatorInput(kind, variable);
  const parsed = parseDerivativeOperator(inputValue, kind);

  function handleChange(nextValue: string) {
    const nextParsed = parseDerivativeOperator(nextValue, kind);
    onChange(
      nextValue,
      nextParsed.ok ? nextParsed.operator.writtenFactors[0]?.variable : undefined,
    );
  }

  return (
    <div className="calculus-operator-control" data-testid={testId}>
      <label className="range-field calculus-operator-field">
        <span>Differentiate with respect to</span>
        <input
          data-testid={`${testId}-input`}
          value={inputValue}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={kind === 'partial' ? 'partial/partial x' : 'd/dx'}
          spellCheck={false}
        />
      </label>
      {parsed.ok ? (
        <div className="calculus-operator-readback" data-testid={`${testId}-readback`}>
          <span>Written</span>
          <strong>{formatDerivativeOperator(parsed.operator, notationMode)}</strong>
          {parsed.operator.kind === 'partial' && parsed.operator.order > 1 ? (
            <>
              <span>Factors</span>
              <strong>{formatDerivativeWrittenFactors(parsed.operator)}</strong>
            </>
          ) : null}
          <span>Applied</span>
          <strong>{formatDerivativeAppliedPath(parsed.operator)}</strong>
        </div>
      ) : (
        <p className="equation-hint calculus-target-error" data-testid={`${testId}-error`}>
          {parsed.error}
        </p>
      )}
    </div>
  );
}
