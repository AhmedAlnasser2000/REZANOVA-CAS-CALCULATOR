import { describe, expect, it } from 'vitest';
import type { GraphDocumentV1 } from '../../lib/graphing';
import {
  buildMoveEightGraphItem,
  replaceGraphDocumentItem,
} from './graph-document';

const document: GraphDocumentV1 = {
  version: 1,
  documentId: 'graph-document.test',
  title: 'Test graph',
  documentRevision: 0,
  items: [],
};

describe('Move 8 Graph document editing', () => {
  it('keeps MathLive source as provenance while explicit-y IR owns plotting', () => {
    const item = buildMoveEightGraphItem({
      itemId: 'item.1',
      sourceLatex: '\\sin(x)',
      sourceRevision: 1,
      index: 0,
    });

    expect(item).toMatchObject({
      kind: 'relation',
      source: { sourceLatex: '\\sin(x)' },
      relation: {
        kind: 'explicit-y',
        origin: 'bare-expression',
        rhs: { mathJson: ['Sin', 'x'] },
      },
    });
  });

  it('keeps recognized future routes as controlled drafts in the minimum visible gate', () => {
    expect(buildMoveEightGraphItem({
      itemId: 'item.1',
      sourceLatex: 'x=y^2',
      sourceRevision: 1,
      index: 0,
    })).toMatchObject({
      kind: 'invalid-relation-draft',
      parseStop: { detailCode: 'move-8-explicit-x' },
    });
  });

  it('increments document and source revisions without mutating prior snapshots', () => {
    const first = buildMoveEightGraphItem({
      itemId: 'item.1',
      sourceLatex: 'x',
      sourceRevision: 1,
      index: 0,
    });
    const firstDocument = replaceGraphDocumentItem(document, first);
    const second = buildMoveEightGraphItem({
      itemId: 'item.1',
      sourceLatex: 'x^2',
      sourceRevision: 2,
      index: 0,
      previous: first,
    });
    const secondDocument = replaceGraphDocumentItem(firstDocument, second);

    expect(firstDocument.documentRevision).toBe(1);
    expect(secondDocument.documentRevision).toBe(2);
    expect(firstDocument.items[0]).toMatchObject({ source: { sourceLatex: 'x' } });
    expect(secondDocument.items[0]).toMatchObject({ source: { sourceLatex: 'x^2' } });
  });
});
