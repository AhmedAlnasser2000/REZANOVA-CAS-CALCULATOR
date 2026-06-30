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
  compact?: boolean;
};

export function DerivativeTargetControl({
  value,
  onChange,
  testId,
  compact = false,
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
    <div
      className={`calculus-target-control ${compact ? 'calculus-target-control--compact' : ''}`}
      data-testid={testId}
    >
      <div className="guide-chip-row" aria-label="Common variables">
        {COMMON_DERIVATIVE_VARIABLES.map((variable) => (
          <button
            key={variable}
            type="button"
            className={`guide-chip ${parsed.ok && parsed.variable === variable ? 'is-active' : ''}`}
            onClick={() => updateDraft(variable)}
          >
            {derivativeVariableLatex(variable)}
          </button>
        ))}
      </div>
      <label className="range-field calculus-target-field">
        <span>With respect to</span>
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
