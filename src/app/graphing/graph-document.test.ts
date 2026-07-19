import { describe, expect, it } from 'vitest';
import type { GraphDocumentV1 } from '../../lib/graphing';
import {
  buildVisibleGraphItem,
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
    const item = buildVisibleGraphItem({
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

  it('opens explicit-x, point-set, and bounded implicit routes', () => {
    expect(buildVisibleGraphItem({
      itemId: 'item.1',
      sourceLatex: 'x=y^2',
      sourceRevision: 1,
      index: 0,
    })).toMatchObject({
      kind: 'relation',
      relation: { kind: 'explicit-x' },
    });
    expect(buildVisibleGraphItem({
      itemId: 'item.2',
      sourceLatex: '\\{(1,2),(3,4)\\}',
      sourceRevision: 1,
      index: 1,
    })).toMatchObject({
      kind: 'point-set',
      points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
    });
    expect(buildVisibleGraphItem({
      itemId: 'item.3',
      sourceLatex: 'x^2+y^2=9',
      sourceRevision: 1,
      index: 2,
    })).toMatchObject({
      kind: 'relation',
      relation: { kind: 'implicit-equality' },
    });
    expect(buildVisibleGraphItem({
      itemId: 'item.4',
      sourceLatex: '-1<x\\le 1',
      sourceRevision: 1,
      index: 3,
    })).toMatchObject({
      kind: 'relation',
      relation: { kind: 'chained-inequality', operators: ['<', '<='] },
    });
  });

  it('increments document and source revisions without mutating prior snapshots', () => {
    const first = buildVisibleGraphItem({
      itemId: 'item.1',
      sourceLatex: 'x',
      sourceRevision: 1,
      index: 0,
    });
    const firstDocument = replaceGraphDocumentItem(document, first);
    const second = buildVisibleGraphItem({
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
