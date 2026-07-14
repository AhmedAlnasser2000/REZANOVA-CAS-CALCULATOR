import { describe, expect, it } from 'vitest';

import { createNotebookRichDocument, isNotebookRichDocument } from './model';
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

  it('round-trips underline, paragraph formatting, list styles, and exact font size', () => {
    const base = createNotebookRichDocument({ idPrefix: 'typography', now: NOW });
    const document: NotebookRichDocument = {
      ...base,
      content: [{
        type: 'paragraph',
        id: 'paragraph.typography',
        format: {
          alignment: 'center',
          lineSpacing: 1.15,
          spaceBeforePt: 18,
          spaceAfterPt: 24,
        },
        content: [
          {
            type: 'text',
            text: 'Superseded wording',
            marks: [
              { type: 'strike' },
              { type: 'underline' },
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
      }, {
        type: 'bulletList',
        id: 'list.bullets',
        style: 'square',
        content: [{
          type: 'listItem',
          id: 'item.bullet',
          content: [{
            type: 'paragraph',
            id: 'paragraph.bullet',
            format: { alignment: 'right', lineSpacing: 2 },
            content: [{ type: 'text', text: 'Nested formatting' }],
          }],
        }],
      }, {
        type: 'orderedList',
        id: 'list.ordered',
        style: 'lower-alpha',
        content: [{
          type: 'listItem',
          id: 'item.ordered',
          content: [{ type: 'paragraph', id: 'paragraph.ordered' }],
        }],
      }],
    };

    const restored = notebookDocumentFromTiptap(
      notebookDocumentToTiptap(document),
      document,
      { now: NOW },
    );

    expect(restored.content).toEqual(document.content);
  });

  it('round-trips structured accents, collapsibility overrides, and collapsed state', () => {
    const base = createNotebookRichDocument({ idPrefix: 'structured', now: NOW });
    const document: NotebookRichDocument = {
      ...base,
      content: [{
        type: 'section',
        id: 'section.structured',
        title: 'Colored section',
        accentColor: '#75c7bc',
        collapsible: false,
        content: [{
          type: 'semanticBlock',
          id: 'semantic.structured',
          variant: 'theorem',
          accentColor: '#b8a0e6',
          collapsible: true,
          collapsed: true,
          content: [{ type: 'paragraph', id: 'paragraph.structured' }],
        }],
      }],
    };

    const restored = notebookDocumentFromTiptap(
      notebookDocumentToTiptap(document),
      document,
      { now: NOW },
    );

    expect(restored.content).toEqual(document.content);
    expect(isNotebookRichDocument(restored)).toBe(true);
  });

  it('round-trips image accessibility, caption, layout, rotation, and crop metadata', () => {
    const base = createNotebookRichDocument({ idPrefix: 'image', now: NOW });
    const document: NotebookRichDocument = {
      ...base,
      content: [{
        type: 'imageFigure',
        id: 'figure.image',
        assetId: `sha256:${'c'.repeat(64)}`,
        altText: 'A graph approaching a horizontal limit.',
        decorative: false,
        caption: 'Limit behavior near infinity',
        numbered: true,
        widthPercent: 50,
        alignment: 'left',
        placement: 'square-left',
        rotation: 270,
        crop: { x: 0.1, y: 0.2, width: 0.7, height: 0.6 },
      }],
    };

    const restored = notebookDocumentFromTiptap(
      notebookDocumentToTiptap(document),
      document,
      { now: NOW },
    );

    expect(restored.content).toEqual(document.content);
    expect(isNotebookRichDocument(restored)).toBe(true);
  });

  it('round-trips video details, poster, tracks, size, alignment, and loop state', () => {
    const base = createNotebookRichDocument({ idPrefix: 'video', now: NOW });
    const document: NotebookRichDocument = {
      ...base,
      content: [{
        type: 'videoFigure',
        id: 'figure.video',
        assetId: `sha256:${'a'.repeat(64)}`,
        title: 'Worked limit',
        description: 'A narrated worked example.',
        caption: 'Evaluating the limit',
        numbered: true,
        posterAssetId: `sha256:${'b'.repeat(64)}`,
        tracks: [{
          id: 'track.en',
          assetId: `sha256:${'c'.repeat(64)}`,
          kind: 'captions',
          label: 'English',
          language: 'en',
          default: true,
        }],
        widthPercent: 75,
        alignment: 'left',
        loop: true,
      }],
    };

    const restored = notebookDocumentFromTiptap(
      notebookDocumentToTiptap(document),
      document,
      { now: NOW },
    );

    expect(restored.content).toEqual(document.content);
    expect(isNotebookRichDocument(restored)).toBe(true);
  });

  it('round-trips explicit page breaks without serializing derived pages', () => {
    const base = createNotebookRichDocument({ idPrefix: 'pages', now: NOW });
    const document: NotebookRichDocument = {
      ...base,
      pageSetup: {
        paperSize: 'letter',
        orientation: 'landscape',
        marginsPt: { top: 36, right: 54, bottom: 36, left: 54 },
      },
      headerFooter: {
        headerText: 'Limits',
        footerText: 'Chapter 2',
        differentFirstPage: true,
        pageNumbering: { enabled: true, position: 'right', startAt: 5 },
      },
      content: [
        { type: 'paragraph', id: 'paragraph.before' },
        { type: 'pageBreak', id: 'break.1' },
        { type: 'paragraph', id: 'paragraph.after' },
      ],
    };

    const editorJson = notebookDocumentToTiptap(document);
    expect(editorJson.attrs).toEqual({
      notebookPageSetup: document.pageSetup,
      notebookHeaderFooter: document.headerFooter,
    });
    expect(editorJson.content?.[1]).toEqual({
      type: 'pageBreak',
      attrs: { id: 'break.1' },
    });
    const restored = notebookDocumentFromTiptap(editorJson, document, { now: NOW });
    expect(restored.content).toEqual(document.content);
    expect(restored.pageSetup).toEqual(document.pageSetup);
    expect(restored.headerFooter).toEqual(document.headerFooter);
    expect(restored).not.toHaveProperty('pages');
    expect(isNotebookRichDocument(restored)).toBe(true);
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
