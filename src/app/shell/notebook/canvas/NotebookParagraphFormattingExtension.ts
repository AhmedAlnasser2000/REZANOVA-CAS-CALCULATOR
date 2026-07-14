import { Extension } from '@tiptap/core';

import {
  NOTEBOOK_BULLET_STYLES,
  NOTEBOOK_LINE_SPACINGS,
  NOTEBOOK_ORDERED_STYLES,
  NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT,
  NOTEBOOK_PARAGRAPH_SPACES_PT,
  NOTEBOOK_TEXT_ALIGNMENTS,
} from '../../../../lib/notebook';

function oneOf<T>(value: unknown, options: readonly T[]): T | null {
  return options.find((option) => option === value) ?? null;
}

function numberAttribute(element: HTMLElement, name: string) {
  const raw = element.getAttribute(name);
  return raw === null ? null : Number(raw);
}

export const NotebookParagraphFormatting = Extension.create({
  name: 'notebookParagraphFormatting',

  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        notebookAlignment: {
          default: null,
          parseHTML: (element) => oneOf(
            element.getAttribute('data-notebook-alignment'),
            NOTEBOOK_TEXT_ALIGNMENTS,
          ),
          renderHTML: (attributes) => oneOf(
            attributes.notebookAlignment,
            NOTEBOOK_TEXT_ALIGNMENTS,
          )
            ? { 'data-notebook-alignment': String(attributes.notebookAlignment) }
            : {},
        },
        notebookLineSpacing: {
          default: null,
          parseHTML: (element) => oneOf(
            numberAttribute(element, 'data-notebook-line-spacing'),
            NOTEBOOK_LINE_SPACINGS,
          ),
          renderHTML: (attributes) => oneOf(
            attributes.notebookLineSpacing,
            NOTEBOOK_LINE_SPACINGS,
          ) !== null
            ? { 'data-notebook-line-spacing': String(attributes.notebookLineSpacing) }
            : {},
        },
        notebookSpaceBeforePt: {
          default: null,
          parseHTML: (element) => oneOf(
            numberAttribute(element, 'data-notebook-space-before-pt'),
            NOTEBOOK_PARAGRAPH_SPACES_PT,
          ),
          renderHTML: (attributes) => oneOf(
            attributes.notebookSpaceBeforePt,
            NOTEBOOK_PARAGRAPH_SPACES_PT,
          ) !== null
            ? { 'data-notebook-space-before-pt': String(attributes.notebookSpaceBeforePt) }
            : {},
        },
        notebookSpaceAfterPt: {
          default: null,
          parseHTML: (element) => oneOf(
            numberAttribute(element, 'data-notebook-space-after-pt'),
            NOTEBOOK_PARAGRAPH_SPACES_PT,
          ),
          renderHTML: (attributes) => oneOf(
            attributes.notebookSpaceAfterPt,
            NOTEBOOK_PARAGRAPH_SPACES_PT,
          ) !== null
            ? { 'data-notebook-space-after-pt': String(attributes.notebookSpaceAfterPt) }
            : {},
        },
        notebookLeftIndentPt: {
          default: null,
          parseHTML: (element) => oneOf(
            numberAttribute(element, 'data-notebook-left-indent-pt'),
            NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT,
          ),
          renderHTML: (attributes) => oneOf(
            attributes.notebookLeftIndentPt,
            NOTEBOOK_PARAGRAPH_LEFT_INDENTS_PT,
          ) !== null
            ? { 'data-notebook-left-indent-pt': String(attributes.notebookLeftIndentPt) }
            : {},
        },
      },
    }, {
      types: ['bulletList'],
      attributes: {
        notebookListStyle: {
          default: null,
          parseHTML: (element) => oneOf(
            element.getAttribute('data-notebook-list-style'),
            NOTEBOOK_BULLET_STYLES,
          ),
          renderHTML: (attributes) => oneOf(
            attributes.notebookListStyle,
            NOTEBOOK_BULLET_STYLES,
          )
            ? { 'data-notebook-list-style': String(attributes.notebookListStyle) }
            : {},
        },
      },
    }, {
      types: ['orderedList'],
      attributes: {
        notebookListStyle: {
          default: null,
          parseHTML: (element) => oneOf(
            element.getAttribute('data-notebook-list-style'),
            NOTEBOOK_ORDERED_STYLES,
          ),
          renderHTML: (attributes) => oneOf(
            attributes.notebookListStyle,
            NOTEBOOK_ORDERED_STYLES,
          )
            ? { 'data-notebook-list-style': String(attributes.notebookListStyle) }
            : {},
        },
      },
    }];
  },
});
