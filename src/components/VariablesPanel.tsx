import { useState } from 'react';
import { MathStatic } from './MathStatic';
import type { StoredVariableValue } from '../types/calculator';
import { namedVariableEditorLatex } from '../lib/algebra/named-variable';
import { useLanguage } from '../lib/language/language-context';

type VariablesPanelPresentation = 'outboard' | 'overlay';

type VariablesPanelProps = {
  presentation: VariablesPanelPresentation;
  variables: StoredVariableValue[];
  onClose: () => void;
  onSet: (name: string, valueLatex: string) => string | null;
  onInsert?: (entry: StoredVariableValue) => void;
  onClear: (name: string) => void;
  onClearAll: () => void;
};

export function VariablesPanel({
  presentation,
  variables,
  onClose,
  onSet,
  onInsert,
  onClear,
  onClearAll,
}: VariablesPanelProps) {
  const { strings } = useLanguage();
  const variablesText = strings.variables;
  const [nameDraft, setNameDraft] = useState('');
  const [valueDraft, setValueDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  function submitVariable() {
    const error = onSet(nameDraft, valueDraft);
    if (error) {
      setMessage(error);
      return;
    }

    setMessage(variablesText.messages.stored(nameDraft.trim()));
    setNameDraft('');
    setValueDraft('');
  }

  function editVariable(entry: StoredVariableValue) {
    setNameDraft(/^[A-Za-z]$/.test(entry.name) ? entry.name : `@${entry.name}`);
    setValueDraft(entry.valueLatex);
    setMessage(null);
  }

  function insertVariable(entry: StoredVariableValue) {
    onInsert?.(entry);
    setMessage(variablesText.messages.inserted(namedVariableEditorLatex(entry.name)));
  }

  return (
    <aside
      className={`variables-panel variables-panel--${presentation}`}
      data-testid="variables-panel"
      data-variables-presentation={presentation}
    >
      <div className="variables-panel-header">
        <div>
          <strong>{variablesText.title}</strong>
          <p>{variablesText.description}</p>
        </div>
        <button type="button" className="variables-panel-close" onClick={onClose}>
          {variablesText.actions.close}
        </button>
      </div>

      <div className="variables-form">
        <label className="variables-field">
          <span>{variablesText.fields.name}</span>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            maxLength={48}
            data-testid="variables-name-input"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.currentTarget.value)}
          />
        </label>
        <label className="variables-field">
          <span>{variablesText.fields.value}</span>
          <input
            type="text"
            inputMode="decimal"
            data-testid="variables-value-input"
            value={valueDraft}
            onChange={(event) => setValueDraft(event.currentTarget.value)}
          />
        </label>
        <button
          type="button"
          className="variables-primary-action"
          data-testid="variables-set-button"
          onClick={submitVariable}
        >
          {variablesText.actions.set}
        </button>
        {message ? <p className="variables-message" data-testid="variables-message">{message}</p> : null}
      </div>

      <div className="variables-list" data-testid="variables-list">
        {variables.length === 0 ? (
          <div className="variables-empty">{variablesText.empty}</div>
        ) : (
          variables.map((entry) => (
            <div key={entry.name} className="variables-entry" data-testid="variables-entry">
              <div>
                <span className="variables-entry-name">{entry.name}</span>
                <MathStatic className="variables-entry-value" latex={entry.valueLatex} />
              </div>
              <div className="variables-entry-actions">
                {onInsert ? (
                  <button type="button" onClick={() => insertVariable(entry)}>
                    {variablesText.actions.insert}
                  </button>
                ) : null}
                <button type="button" onClick={() => editVariable(entry)}>
                  {variablesText.actions.edit}
                </button>
                <button type="button" onClick={() => onClear(entry.name)}>
                  {variablesText.actions.clear}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        className="variables-clear-all"
        disabled={variables.length === 0}
        onClick={onClearAll}
      >
        {variablesText.actions.clearAll}
      </button>
    </aside>
  );
}
