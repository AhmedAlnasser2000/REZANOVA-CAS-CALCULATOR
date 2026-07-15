import { describe, expect, it } from 'vitest';

import {
  createNotebookRichDocument,
  isNotebookRichDocument,
  isNotebookRichDocumentV12,
} from './model';
import {
  notebookDocumentFromTiptap,
  notebookDocumentToTiptap,
} from './tiptap-adapter';
import type {
  NotebookObjectPlacement,
  NotebookRichDocument,
  NotebookRichDocumentV12,
} from './types';

const NOW = () => new Date('2026-07-16T01:00:00.000Z');

function floatingPlacement(
  zOrder: number,
  anchor: Extract<NotebookObjectPlacement, { mode: 'floating' }>['anchor'] = {
    kind: 'paragraph',
    nodeId: 'paragraph.anchor',
  },
): NotebookObjectPlacement {
  return {
    mode: 'floating',
    anchor,
    horizontalReference: 'margins',
    verticalReference: 'page',
    xPt: -18.5,
    yPt: 96.25,
    widthPt: 216.75,
    wrap: 'square',
    textDistancePt: { top: 6, right: 12, bottom: 6, left: 12 },
    zOrder,
  };
}

function floatingDocument(): NotebookRichDocument {
  const document = createNotebookRichDocument({ idPrefix: 'floating', now: NOW });
  document.content = [{
    type: 'paragraph',
    id: 'paragraph.anchor',
    content: [{ type: 'text', text: 'Durable anchor' }],
  }, {
    type: 'imageFigure',
    id: 'image.float',
    assetId: `sha256:${'a'.repeat(64)}`,
    alignment: 'left',
    placement: 'square-left',
    objectPlacement: floatingPlacement(0),
  }, {
    type: 'videoFigure',
    id: 'video.float',
    assetId: `sha256:${'b'.repeat(64)}`,
    title: 'Floating video',
    description: '',
    objectPlacement: floatingPlacement(1, { kind: 'page', pageNumber: 3 }),
  }, {
    type: 'displayMath',
    id: 'math.flow',
    sourceText: 'x^2',
    latex: 'x^2',
    workspaceTarget: 'equation',
    objectPlacement: { mode: 'flow' },
  }, {
    type: 'evidenceSnapshot',
    id: 'evidence.float',
    source: 'manual-placeholder',
    title: 'Evidence',
    facts: [],
    warnings: [],
    objectPlacement: floatingPlacement(2),
  }, {
    type: 'horizontalRule',
    id: 'divider.flow',
    objectPlacement: { mode: 'flow' },
  }, {
    type: 'semanticBlock',
    id: 'semantic.float',
    variant: 'theorem',
    objectPlacement: floatingPlacement(3),
    content: [{ type: 'paragraph', id: 'paragraph.semantic' }],
  }, {
    type: 'section',
    id: 'section.float',
    title: 'Floating section',
    objectPlacement: floatingPlacement(4, { kind: 'page', pageNumber: 5 }),
    content: [{ type: 'paragraph', id: 'paragraph.section' }],
  }];
  return document;
}

describe('Notebook floating-object document contract', () => {
  it('round-trips every supported object without colliding with media flow placement', () => {
    const document = floatingDocument();
    expect(isNotebookRichDocument(document)).toBe(true);

    const restored = notebookDocumentFromTiptap(
      notebookDocumentToTiptap(document),
      document,
      { now: NOW },
    );
    expect(restored.content).toEqual(document.content);
    expect(isNotebookRichDocument(restored)).toBe(true);
    expect(restored.content[1]).toMatchObject({
      type: 'imageFigure',
      placement: 'square-left',
      objectPlacement: { mode: 'floating', zOrder: 0 },
    });

    const legacy = { ...document, version: 12 } as NotebookRichDocumentV12;
    expect(isNotebookRichDocumentV12(legacy)).toBe(false);
  });

  it('strictly validates anchors, measurements, eligibility, and normalized layers', () => {
    const invalidLayer = floatingDocument();
    const image = invalidLayer.content[1];
    if (image?.type === 'imageFigure' && image.objectPlacement?.mode === 'floating') {
      image.objectPlacement.zOrder = 7;
    }
    expect(isNotebookRichDocument(invalidLayer)).toBe(false);

    const missingAnchor = floatingDocument();
    const evidence = missingAnchor.content[4];
    if (evidence?.type === 'evidenceSnapshot' && evidence.objectPlacement?.mode === 'floating') {
      evidence.objectPlacement.anchor = { kind: 'paragraph', nodeId: 'paragraph.missing' };
    }
    expect(isNotebookRichDocument(missingAnchor)).toBe(false);

    const circularAnchor = floatingDocument();
    const semantic = circularAnchor.content[6];
    if (semantic?.type === 'semanticBlock' && semantic.objectPlacement?.mode === 'floating') {
      semantic.objectPlacement.anchor = { kind: 'paragraph', nodeId: 'paragraph.semantic' };
    }
    expect(isNotebookRichDocument(circularAnchor)).toBe(false);

    const narrowObject = floatingDocument();
    const video = narrowObject.content[2];
    if (video?.type === 'videoFigure' && video.objectPlacement?.mode === 'floating') {
      video.objectPlacement.widthPt = 35.999;
    }
    expect(isNotebookRichDocument(narrowObject)).toBe(false);

    const negativeDistance = floatingDocument();
    const negativeImage = negativeDistance.content[1];
    if (negativeImage?.type === 'imageFigure'
      && negativeImage.objectPlacement?.mode === 'floating') {
      negativeImage.objectPlacement.textDistancePt.left = -1;
    }
    expect(isNotebookRichDocument(negativeDistance)).toBe(false);

    const ineligible = floatingDocument() as unknown as {
      content: Array<Record<string, unknown>>;
    };
    ineligible.content[0]!.objectPlacement = { mode: 'flow' };
    expect(isNotebookRichDocument(ineligible)).toBe(false);
  });
});
