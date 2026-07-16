import type { Editor } from '@tiptap/core';
import { Check, Sparkles } from 'lucide-react';

import {
  NOTEBOOK_STARTER_TEMPLATES,
  type NotebookStarterTemplateId,
} from '../../../../lib/notebook';
import { NotebookFloatingLayer } from '../transient-ui';
import { insertNotebookInlineMath } from './selection';

export function NotebookEmptyWritingPrompt() {
  return (
    <span className="notebook-empty-writing-prompt" aria-hidden="true">
      Start writing your explanation...
    </span>
  );
}

export function NotebookTemplateStart({
  isOpen,
  layerId,
  onApply,
  onToggle,
}: {
  isOpen: boolean;
  layerId: string;
  onApply: (templateId: NotebookStarterTemplateId) => void;
  onToggle: () => void;
}) {
  return (
    <div className="notebook-template-start" data-testid="notebook-template-start">
      <div>
        <Sparkles aria-hidden="true" size={18} />
        <span>Prefer a structured starting point?</span>
      </div>
      <button data-notebook-transient-trigger={layerId} type="button" onClick={onToggle}>
        Start from template
      </button>
      {isOpen ? (
        <NotebookFloatingLayer align="end" layerId={layerId} className="notebook-template-menu">
          {NOTEBOOK_STARTER_TEMPLATES.map((template) => (
            <button key={template.id} type="button" onClick={() => onApply(template.id)}>
              <strong>{template.label}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </NotebookFloatingLayer>
      ) : null}
    </div>
  );
}

export function NotebookCanvasWarnings({
  layoutWarning,
  runningMatterOverflow,
}: {
  layoutWarning: string | null;
  runningMatterOverflow: boolean;
}) {
  return (
    <>
      {runningMatterOverflow ? (
        <div className="notebook-running-matter-warning" role="status">
          Running matter exceeds the current margin band. Content is preserved.
        </div>
      ) : null}
      {layoutWarning ? (
        <div className="notebook-running-matter-warning" role="status">{layoutWarning}</div>
      ) : null}
    </>
  );
}

export function NotebookMathSuggestion({
  editor,
  onInserted,
  suggestion,
}: {
  editor: Editor;
  onInserted: (nodeId: string) => void;
  suggestion: { from: number; sourceText: string; to: number };
}) {
  return (
    <div className="notebook-math-suggestion" data-testid="notebook-math-suggestion">
      <div>
        <span>Possible math</span>
        <strong>{suggestion.sourceText}</strong>
      </div>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          editor.chain().setTextSelection({ from: suggestion.from, to: suggestion.to }).run();
          insertNotebookInlineMath(editor, {
            onInserted,
            sourceText: suggestion.sourceText,
          });
        }}
      >
        <Check aria-hidden="true" size={14} />
        Convert selected text
      </button>
    </div>
  );
}
