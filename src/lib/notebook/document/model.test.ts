import { describe, expect, it } from 'vitest';

import {
  countNotebookBlocks,
  createNotebookRichDocument,
  isNotebookRichDocument,
  isNotebookRichDocumentV4,
  isNotebookRichDocumentV5,
  isNotebookRichDocumentV6,
  isNotebookRichDocumentV7,
  summarizeNotebookDocument,
} from './model';
import {
  NOTEBOOK_FONT_SIZE_MAX,
  NOTEBOOK_FONT_SIZE_MIN,
  NOTEBOOK_RICH_DOCUMENT_VERSION,
} from './types';

const fixedNow = () => new Date('2026-07-11T12:00:00.000Z');

describe('Notebook rich document model', () => {
  it('creates an app-owned version 8 document with default print geometry', () => {
    const document = createNotebookRichDocument({
      idPrefix: 'rich-test',
      now: fixedNow,
      title: 'Limits Lab',
    });

    expect(document.version).toBe(NOTEBOOK_RICH_DOCUMENT_VERSION);
    expect(document.title).toBe('Limits Lab');
    expect(document.content).toEqual([
      expect.objectContaining({ type: 'paragraph', id: document.selectedNodeId }),
    ]);
    expect(document.pageSetup).toEqual({
      paperSize: 'a4',
      orientation: 'portrait',
      marginsPt: { top: 72, right: 72, bottom: 72, left: 72 },
    });
    expect(isNotebookRichDocument(JSON.parse(JSON.stringify(document)))).toBe(true);
  });

  it('strictly validates V8 page settings and keeps page breaks out of V7', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.pageSetup = {
      paperSize: 'legal',
      orientation: 'landscape',
      marginsPt: { top: 36, right: 54, bottom: 36, left: 54 },
    };
    document.headerFooter = {
      headerText: 'Calculus notes',
      footerText: 'Rezanova',
      differentFirstPage: true,
      pageNumbering: { enabled: true, position: 'right', startAt: 3 },
    };
    document.content = [{ type: 'pageBreak', id: 'break.1' }];
    expect(isNotebookRichDocument(document)).toBe(true);

    const base = structuredClone(document) as unknown as Record<string, unknown>;
    delete base.pageSetup;
    delete base.headerFooter;
    expect(isNotebookRichDocumentV7({ ...base, version: 7 })).toBe(false);

    const invalidMargins = structuredClone(document);
    invalidMargins.pageSetup.marginsPt.top = 288;
    invalidMargins.pageSetup.marginsPt.bottom = 288;
    expect(isNotebookRichDocument(invalidMargins)).toBe(false);

    const invalidNumbering = structuredClone(document);
    invalidNumbering.headerFooter.pageNumbering.startAt = 0;
    expect(isNotebookRichDocument(invalidNumbering)).toBe(false);

    const nestedBreak = structuredClone(document);
    nestedBreak.content = [{
      type: 'section',
      id: 'section.with-break',
      title: 'Invalid nested break',
      content: [{ type: 'pageBreak', id: 'break.nested' }],
    }];
    expect(isNotebookRichDocument(nestedBreak)).toBe(false);
  });

  it('strictly validates V7 image figures and keeps them out of V6', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'imageFigure',
      id: 'figure.1',
      assetId: `sha256:${'a'.repeat(64)}`,
      altText: 'A unit circle annotated with sine and cosine.',
      caption: 'Unit-circle coordinates',
      numbered: true,
      widthPercent: 75,
      alignment: 'center',
      placement: 'top-and-bottom',
      rotation: 90,
      crop: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 },
    }];

    expect(isNotebookRichDocument(document)).toBe(true);
    expect(isNotebookRichDocumentV6({ ...document, version: 6 })).toBe(false);
    expect(summarizeNotebookDocument(document).wordCount).toBe(2);

    const invalidCrop = structuredClone(document) as {
      content: Array<{ crop: { x: number; width: number } }>;
    };
    invalidCrop.content[0]!.crop.x = 0.5;
    invalidCrop.content[0]!.crop.width = 0.8;
    expect(isNotebookRichDocument(invalidCrop)).toBe(false);

    const decorativeWithAlt = structuredClone(document) as {
      content: Array<{ decorative?: boolean }>;
    };
    decorativeWithAlt.content[0]!.decorative = true;
    expect(isNotebookRichDocument(decorativeWithAlt)).toBe(false);

    const incompatibleWrap = structuredClone(document) as {
      content: Array<{ alignment?: string; placement?: string }>;
    };
    incompatibleWrap.content[0]!.alignment = 'right';
    incompatibleWrap.content[0]!.placement = 'square-left';
    expect(isNotebookRichDocument(incompatibleWrap)).toBe(false);
  });

  it('validates underline, paragraph formatting, and exact Word-like font-size marks', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'paragraph',
      id: 'paragraph.typography',
      format: {
        alignment: 'justify',
        lineSpacing: 1.5,
        spaceBeforePt: 6,
        spaceAfterPt: 12,
      },
      content: [{
        type: 'text',
        text: 'Retain this authored correction.',
        marks: [
          { type: 'strike' },
          { type: 'underline' },
          { type: 'textStyle', color: '#9dcdf0', fontSize: 149 },
        ],
      }],
    }];

    expect(isNotebookRichDocument(document)).toBe(true);

    const tooSmall = structuredClone(document);
    (tooSmall.content[0] as { content: Array<{ marks: Array<{ fontSize?: number }> }> })
      .content[0].marks[2].fontSize = NOTEBOOK_FONT_SIZE_MIN - 1;
    expect(isNotebookRichDocument(tooSmall)).toBe(false);

    const tooLarge = structuredClone(document);
    (tooLarge.content[0] as { content: Array<{ marks: Array<{ fontSize?: number }> }> })
      .content[0].marks[2].fontSize = NOTEBOOK_FONT_SIZE_MAX + 1;
    expect(isNotebookRichDocument(tooLarge)).toBe(false);

    const invalidAlignment = structuredClone(document) as {
      content: Array<{ format: { alignment: string } }>;
    };
    invalidAlignment.content[0]!.format.alignment = 'distributed';
    expect(isNotebookRichDocument(invalidAlignment)).toBe(false);

    const invalidLineSpacing = structuredClone(document) as {
      content: Array<{ format: { lineSpacing: number } }>;
    };
    invalidLineSpacing.content[0]!.format.lineSpacing = 1.2;
    expect(isNotebookRichDocument(invalidLineSpacing)).toBe(false);

    const invalidParagraphSpace = structuredClone(document) as {
      content: Array<{ format: { spaceAfterPt: number } }>;
    };
    invalidParagraphSpace.content[0]!.format.spaceAfterPt = 10;
    expect(isNotebookRichDocument(invalidParagraphSpace)).toBe(false);

    const version4 = { ...structuredClone(document), version: 4 as const };
    expect(isNotebookRichDocumentV4(version4)).toBe(false);
  });

  it('accepts only list styles belonging to the selected list kind', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'bulletList',
      id: 'list.bullets',
      style: 'dash',
      content: [{
        type: 'listItem',
        id: 'item.1',
        content: [{ type: 'paragraph', id: 'paragraph.1' }],
      }],
    }, {
      type: 'orderedList',
      id: 'list.ordered',
      style: 'lower-roman',
      content: [{
        type: 'listItem',
        id: 'item.2',
        content: [{ type: 'paragraph', id: 'paragraph.2' }],
      }],
    }];

    expect(isNotebookRichDocument(document)).toBe(true);
    const invalid = structuredClone(document) as {
      content: Array<{ style?: string }>;
    };
    invalid.content[0]!.style = 'decimal';
    expect(isNotebookRichDocument(invalid)).toBe(false);
  });

  it('strictly validates structured accents, collapse defaults, and overrides', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'semanticBlock',
      id: 'theorem.1',
      variant: 'theorem',
      accentColor: '#b8d49c',
      collapsible: true,
      collapsed: true,
      content: [{ type: 'paragraph', id: 'paragraph.1' }],
    }, {
      type: 'semanticBlock',
      id: 'hint.1',
      variant: 'hint',
      collapsed: true,
      content: [{ type: 'paragraph', id: 'paragraph.2' }],
    }, {
      type: 'section',
      id: 'section.1',
      title: 'Visible section',
      accentColor: '#84BFE8',
      collapsed: true,
      content: [{ type: 'paragraph', id: 'paragraph.3' }],
    }];
    expect(isNotebookRichDocument(document)).toBe(true);

    const invalidColor = structuredClone(document) as {
      content: Array<{ accentColor?: string }>;
    };
    invalidColor.content[0]!.accentColor = '#abcd';
    expect(isNotebookRichDocument(invalidColor)).toBe(false);

    const incompatibleCollapse = structuredClone(document) as {
      content: Array<{ collapsible?: boolean; collapsed?: boolean }>;
    };
    delete incompatibleCollapse.content[0]!.collapsible;
    expect(isNotebookRichDocument(incompatibleCollapse)).toBe(false);

    const disabledCollapse = structuredClone(document) as {
      content: Array<{ collapsible?: boolean; collapsed?: boolean }>;
    };
    disabledCollapse.content[0]!.collapsible = false;
    expect(isNotebookRichDocument(disabledCollapse)).toBe(false);

    const invalidOverride = structuredClone(document) as {
      content: Array<{ collapsible?: unknown }>;
    };
    invalidOverride.content[0]!.collapsible = 'sometimes';
    expect(isNotebookRichDocument(invalidOverride)).toBe(false);

    const version5 = { ...structuredClone(document), version: 5 as const };
    expect(isNotebookRichDocumentV5(version5)).toBe(false);
  });

  it('counts nested sections, semantic blocks, and list content for summaries', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'section',
      id: 'section.1',
      title: 'Limit Laws',
      collapsed: true,
      content: [{
        type: 'semanticBlock',
        id: 'theorem.1',
        variant: 'theorem',
        content: [{ type: 'paragraph', id: 'paragraph.1' }],
      }],
    }, {
      type: 'bulletList',
      id: 'list.1',
      content: [{
        type: 'listItem',
        id: 'item.1',
        content: [{ type: 'paragraph', id: 'paragraph.2' }],
      }],
    }];

    expect(countNotebookBlocks(document.content)).toBe(5);
    expect(summarizeNotebookDocument(document)).toMatchObject({
      id: document.id,
      blockCount: 5,
      title: 'Untitled Notebook',
      wordCount: 2,
    });
  });

  it('counts authored prose while excluding mathematical source text', () => {
    const document = createNotebookRichDocument({ now: fixedNow });
    document.content = [{
      type: 'section',
      id: 'section.words',
      title: 'Limit laws',
      content: [{
        type: 'paragraph',
        id: 'paragraph.words',
        content: [{ type: 'text', text: "Euler's useful identity" }, {
          type: 'inlineMath',
          id: 'math.words',
          sourceText: 'e^(i*pi)+1=0',
          latex: 'e^{i\\pi}+1=0',
          workspaceTarget: 'calculate',
        }],
      }],
    }];

    expect(summarizeNotebookDocument(document).wordCount).toBe(5);
  });
});
