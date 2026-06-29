import { useEffect, useState } from 'react';
import {
  COMMON_DERIVATIVE_VARIABLES,
  derivativeVariableInputValue,
  derivativeVariableLatex,
  parseDerivativeVariable,
} from '../../../lib/calculus/derivative-target';

type DerivativeTargetControlProps = {
  value: string | undefined;
  onChange: (variable: string) => void;
  operator: 'derivative' | 'partial';
  testId: string;
};

function operatorLabel(operator: DerivativeTargetControlProps['operator'], variable: string) {
  const variableLatex = derivativeVariableLatex(variable);
  return operator === 'partial'
    ? `partial/partial ${variableLatex}`
    : `d/d${variableLatex}`;
}

export function DerivativeTargetControl({
  value,
  onChange,
  operator,
  testId,
}: DerivativeTargetControlProps) {
  const [draft, setDraft] = useState(() => derivativeVariableInputValue(value));
  const parsed = parseDerivativeVariable(draft);

  useEffect(() => {
    setDraft(derivativeVariableInputValue(value));
  }, [value]);

  function updateDraft(nextDraft: string) {
    setDraft(nextDraft);
    const nextParsed = parseDerivativeVariable(nextDraft);
    onChange(nextParsed.ok ? nextParsed.variable : nextDraft.trim());
  }

  return (
    <div className="calculus-target-control" data-testid={testId}>
      <div className="guide-chip-row" aria-label="Derivative target shortcuts">
        {COMMON_DERIVATIVE_VARIABLES.map((variable) => (
          <button
            key={variable}
            type="button"
            className={`guide-chip ${parsed.ok && parsed.variable === variable ? 'is-active' : ''}`}
            onClick={() => updateDraft(variable)}
          >
            {operatorLabel(operator, variable)}
          </button>
        ))}
      </div>
      <label className="range-field calculus-target-field">
        <span>Target</span>
        <input
          data-testid={`${testId}-input`}
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
          spellCheck={false}
        />
      </label>
      {!parsed.ok ? (
        <p className="equation-hint calculus-target-error" data-testid={`${testId}-error`}>
          {parsed.error}
        </p>
      ) : null}
    </div>
  );
}
