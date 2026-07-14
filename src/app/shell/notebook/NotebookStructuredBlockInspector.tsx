import type { Editor } from '@tiptap/core';
import { Palette, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';

import {
  normalizeNotebookAccentColor,
  NOTEBOOK_ACCENT_PRESETS,
  NOTEBOOK_SEMANTIC_DEFINITIONS,
  notebookAccentContrastRatio,
  notebookSectionIsCollapsible,
  notebookSemanticIsCollapsible,
  type NotebookSemanticKind,
} from '../../../lib/notebook';
import {
  updateNotebookSection,
  updateSelectedNotebookSemantic,
  type NotebookEditorSelection,
} from './canvas';

type NotebookStructuredBlockInspectorProps = {
  editor: Editor;
  selection: NotebookEditorSelection;
};

export function NotebookStructuredBlockInspector({
  editor,
  selection,
}: NotebookStructuredBlockInspectorProps) {
  const isSemantic = selection.type === 'semanticBlock';
  const isSection = selection.type === 'notebookSection';
  if (!isSemantic && !isSection) {
    return null;
  }

  const semanticKind = String(selection.attrs.variant ?? 'note') as NotebookSemanticKind;
  const accentColor = typeof selection.attrs.accentColor === 'string'
    ? normalizeNotebookAccentColor(selection.attrs.accentColor)
    : null;
  const explicitCollapsible = typeof selection.attrs.collapsible === 'boolean'
    ? selection.attrs.collapsible
    : null;
  const collapsible = isSemantic
    ? notebookSemanticIsCollapsible(semanticKind, explicitCollapsible)
    : notebookSectionIsCollapsible(explicitCollapsible);
  const presetColor = NOTEBOOK_ACCENT_PRESETS.some((preset) => preset.color === accentColor);
  const customColorNeedsWarning = Boolean(
    accentColor
    && !presetColor
    && notebookAccentContrastRatio(accentColor) < 3,
  );

  function updateStructured(attributes: {
    accentColor?: string | null;
    collapsible?: boolean | null;
  }) {
    if (isSemantic) {
      updateSelectedNotebookSemantic(editor, attributes, selection);
    } else if (selection.id) {
      updateNotebookSection(editor, selection.id, attributes);
    }
  }

  return (
    <>
      <div className="notebook-inspector-section notebook-structured-identity">
        <span>Identity</span>
        {isSemantic ? (
          <>
            <label htmlFor="notebook-semantic-kind">Container type</label>
            <select
              id="notebook-semantic-kind"
              aria-label="Academic container type"
              value={semanticKind}
              onChange={(event) => updateSelectedNotebookSemantic(editor, {
                variant: event.target.value as NotebookSemanticKind,
              }, selection)}
            >
              {NOTEBOOK_SEMANTIC_DEFINITIONS.map((definition) => (
                <option key={definition.kind} value={definition.kind}>{definition.label}</option>
              ))}
            </select>
            <div className="notebook-semantic-fields">
              <label>
                <span>Number</span>
                <input
                  aria-label="Container number"
                  value={String(selection.attrs.number ?? '')}
                  placeholder="Optional"
                  onChange={(event) => updateSelectedNotebookSemantic(editor, {
                    number: event.target.value,
                  }, selection)}
                />
              </label>
              <label>
                <span>Label</span>
                <input
                  aria-label="Container label"
                  value={String(selection.attrs.label ?? '')}
                  placeholder="Optional"
                  onChange={(event) => updateSelectedNotebookSemantic(editor, {
                    label: event.target.value,
                  }, selection)}
                />
              </label>
            </div>
          </>
        ) : (
          <label className="notebook-structured-title-field">
            <span>Title</span>
            <input
              aria-label="Inspector section title"
              value={String(selection.attrs.title ?? 'Untitled section')}
              onChange={(event) => {
                if (selection.id) {
                  updateNotebookSection(editor, selection.id, { title: event.target.value });
                }
              }}
            />
          </label>
        )}
      </div>

      <div className="notebook-inspector-section notebook-structured-appearance">
        <span><Palette aria-hidden="true" size={15} /> Appearance</span>
        <div className="notebook-accent-options" role="radiogroup" aria-label="Accent color">
          <button
            type="button"
            role="radio"
            aria-checked={!accentColor}
            className={!accentColor ? 'is-selected is-automatic' : 'is-automatic'}
            onClick={() => updateStructured({ accentColor: null })}
          >Automatic</button>
          {NOTEBOOK_ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-label={`${preset.label} accent ${preset.color}`}
              aria-checked={accentColor === preset.color}
              className={accentColor === preset.color ? 'is-selected' : undefined}
              style={{ '--notebook-accent-option': preset.color } as CSSProperties}
              onClick={() => updateStructured({ accentColor: preset.color })}
            ><span aria-hidden="true" />{preset.label}</button>
          ))}
        </div>
        <div className="notebook-custom-accent">
          <label>
            <span>Custom</span>
            <input
              type="color"
              aria-label="Custom accent color"
              value={accentColor ?? NOTEBOOK_ACCENT_PRESETS[0].color}
              onChange={(event) => updateStructured({ accentColor: event.target.value })}
            />
          </label>
          <code>{accentColor ?? 'Automatic'}</code>
          <button
            type="button"
            aria-label="Reset accent color"
            disabled={!accentColor}
            onClick={() => updateStructured({ accentColor: null })}
          ><RotateCcw aria-hidden="true" size={14} /> Reset</button>
        </div>
        {customColorNeedsWarning ? (
          <p className="notebook-accent-warning" role="status" data-testid="notebook-accent-warning">
            This accent is below 3:1 contrast on the Notebook surface.
          </p>
        ) : null}
      </div>

      <div className="notebook-inspector-section notebook-structured-behavior">
        <span>Behavior</span>
        <div className="notebook-semantic-collapse-setting">
          <span>Collapsible</span>
          <button
            type="button"
            role="switch"
            aria-checked={collapsible}
            aria-label="Collapsible"
            className={collapsible ? 'is-on' : undefined}
            onClick={() => updateStructured({ collapsible: !collapsible })}
          ><span /></button>
        </div>
      </div>
    </>
  );
}
