import { describe, expect, it } from 'vitest';
import type { GraphDocumentV2 } from '../../lib/graphing';
import {
  buildVisibleGraphItem,
  createGraphNoteItem,
  createGraphParameterItem,
  mutateGraphPiecewiseBranches,
  replaceGraphDocumentItem,
  replaceGraphDocumentNote,
  updateGraphPiecewiseBranch,
  updateGraphParameterItem,
} from './graph-document';

const document: GraphDocumentV2 = {
  version: 2,
  documentId: 'graph-document.test',
  title: 'Test graph',
  contentRevision: 0,
  mathematicsRevision: 0,
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

    expect(firstDocument.contentRevision).toBe(1);
    expect(firstDocument.mathematicsRevision).toBe(1);
    expect(secondDocument.contentRevision).toBe(2);
    expect(secondDocument.mathematicsRevision).toBe(2);
    expect(firstDocument.items[0]).toMatchObject({ source: { sourceLatex: 'x' } });
    expect(secondDocument.items[0]).toMatchObject({ source: { sourceLatex: 'x^2' } });
  });

  it('changes note content without changing mathematics authority', () => {
    const created = replaceGraphDocumentNote(document, createGraphNoteItem('note.1'));
    const updated = replaceGraphDocumentNote(created, {
      version: 1, kind: 'note', itemId: 'note.1', text: 'Domain observations',
    });
    expect(updated).toMatchObject({ contentRevision: 2, mathematicsRevision: 0 });
    expect(updated.items[0]).toMatchObject({ kind: 'note', text: 'Domain observations' });
  });

  it('keeps authored and slider-created parameter provenance distinct', () => {
    const authored = buildVisibleGraphItem({
      itemId: 'item.a',
      sourceLatex: 'a=\\pi/2',
      sourceRevision: 1,
      index: 0,
    });
    expect(authored).toMatchObject({
      kind: 'parameter',
      parameter: {
        symbol: 'a',
        origin: 'authored-definition',
        source: { sourceLatex: 'a=\\pi/2' },
        value: Math.PI / 2,
      },
    });
    const slider = createGraphParameterItem({ itemId: 'item.b', symbol: 'b' });
    expect(slider.parameter).toMatchObject({
      symbol: 'b', origin: 'slider-created', value: 1, minimum: -3, maximum: 3, step: 0.1,
    });
    const withSlider = replaceGraphDocumentItem(document, slider);
    const updated = updateGraphParameterItem({
      document: withSlider,
      itemId: slider.itemId,
      values: { value: 2, minimum: -4, maximum: 4, step: 0.25 },
    });
    expect(updated?.items[0]).toMatchObject({
      kind: 'parameter',
      parameter: { value: 2, minimum: -4, maximum: 4, step: 0.25 },
    });
  });

  it('updates guided piecewise branches as structured IR without reparsing generated source', () => {
    const item = buildVisibleGraphItem({
      itemId: 'item.piecewise',
      sourceLatex: 'y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}',
      sourceRevision: 1,
      index: 0,
    });
    expect(item.kind).toBe('piecewise');
    const initial = replaceGraphDocumentItem(document, item);
    const updated = updateGraphPiecewiseBranch({
      document: initial,
      itemId: item.itemId,
      branchId: 'branch.1',
      valueLatex: 'x^3',
      conditionLatex: 'x\\le-1',
    });
    expect(updated?.items[0]).toMatchObject({ kind: 'piecewise' });
    expect(updated?.items[0]?.kind === 'piecewise' && updated.items[0].piecewise.branches[0])
      .toMatchObject({
        branchId: 'branch.1',
        relation: { kind: 'explicit-y', rhs: { mathJson: ['Power', 'x', 3] } },
        condition: { kind: 'comparison', operator: '<=' },
    });
    const added = updated && mutateGraphPiecewiseBranches({
      document: updated,
      itemId: item.itemId,
      action: 'add',
    });
    expect(added?.items[0]).toMatchObject({
      kind: 'piecewise',
      piecewise: { branches: [{ branchId: 'branch.1' }, { branchId: 'branch.2' }, {}] },
    });
  });
});
