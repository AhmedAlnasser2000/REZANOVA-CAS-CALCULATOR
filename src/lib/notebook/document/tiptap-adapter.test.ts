import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument } from './model';
import {
  notebookDocumentFromTiptap,
  notebookDocumentToTiptap,
} from './tiptap-adapter';
import type { NotebookRichDocument } from './types';

const NOW = () => new Date('2026-07-12T02:00:00.000Z');

describe('Notebook Tiptap adapter', () => {
  it('round-trips app-owned prose, math, semantic nodes, and nested sections', () => {
    const base = createNotebookRichDocument({ idPrefix: 'roundtrip', now: NOW });
    const document: NotebookRichDocument = {
      ...base,
      content: [
        {
          type: 'paragraph',
          id: 'paragraph.1',
          content: [
            { type: 'text', text: 'Let ', marks: [{ type: 'bold' }] },
            {
              type: 'inlineMath',
              id: 'math.inline.1',
              sourceText: 'f(x)',
              latex: 'f(x)',
              workspaceTarget: 'calculate',
            },
            { type: 'text', text: ' be continuous.' },
          ],
        },
        {
          type: 'displayMath',
          id: 'math.display.1',
          sourceText: 'lim x->a f(x)=L',
          latex: '\\lim_{x\\to a}f(x)=L',
          workspaceTarget: 'calculus',
        },
        {
          type: 'section',
          id: 'section.1',
          title: 'Theorems',
          collapsed: true,
          content: [{
            type: 'semanticBlock',
            id: 'semantic.1',
            variant: 'theorem',
            label: 'Limit Laws',
            content: [{
              type: 'paragraph',
              id: 'paragraph.2',
              content: [{ type: 'text', text: 'The sum law holds.' }],
            }],
          }],
        },
      ],
    };

    const restored = notebookDocumentFromTiptap(
      notebookDocumentToTiptap(document),
      document,
      { now: NOW },
    );
    expect(restored.content).toEqual(document.content);
    expect(JSON.stringify(restored)).not.toContain('Editor');
  });

  it('round-trips prose strikethrough and exact font-size marks without changing math source', () => {
    const base = createNotebookRichDocument({ idPrefix: 'typography', now: NOW });
    const document: NotebookRichDocument = {
      ...base,
      content: [{
        type: 'paragraph',
        id: 'paragraph.typography',
        content: [
          {
            type: 'text',
            text: 'Superseded wording',
            marks: [
              { type: 'strike' },
              { type: 'textStyle', color: '#f3d37b', fontSize: 173 },
            ],
          },
          {
            type: 'inlineMath',
            id: 'math.source',
            sourceText: 'x^2',
            latex: 'x^2',
            workspaceTarget: 'calculate',
          },
        ],
      }],
    };

    const restored = notebookDocumentFromTiptap(
      notebookDocumentToTiptap(document),
      document,
      { now: NOW },
    );

    expect(restored.content).toEqual(document.content);
  });

  it('falls back to preserved prose for unknown editor nodes', () => {
    const document = createNotebookRichDocument({ idPrefix: 'fallback', now: NOW });
    const restored = notebookDocumentFromTiptap({
      type: 'doc',
      content: [{ type: 'unknownWidget', content: [{ type: 'text', text: 'Keep me' }] }],
    }, document, { now: NOW });

    expect(restored.content).toEqual([
      expect.objectContaining({
        type: 'paragraph',
        content: [{ type: 'text', text: 'Keep me' }],
      }),
    ]);
  });

  it('retains selection only when a real nested node owns the selected id', () => {
    const document = createNotebookRichDocument({ idPrefix: 'selection', now: NOW });
    const restored = notebookDocumentFromTiptap({
      type: 'doc',
      content: [{
        type: 'paragraph',
        attrs: { id: 'paragraph.1' },
        content: [{ type: 'text', text: 'The prose mentions "id":"math.inline.1".' }],
      }],
    }, document, {
      now: NOW,
      selectedNodeId: 'math.inline.1',
    });

    expect(restored.selectedNodeId).toBe('paragraph.1');
  });
});
