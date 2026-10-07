import { describe, expect, it } from 'vitest';
import {
  defaultGraphItemPresentation, graphPiecewiseBranchPresentation, graphPresentationFrameItems, graphSceneBranchKey,
  resolveGraphPresentationColor, type GraphItemSpecV1,
} from '../../lib/graphing';
import { buildVisibleGraphItem, graphPiecewiseDraftFromItem, replaceGraphPiecewiseBranchPresentation } from './graph-document';
import { classifiedGraphItems, restoredGraphDocument } from './graph-controller-support';
import { createGraphWorkspaceSessionState } from './graph-workspace-session';
import { mutatedGraphPiecewiseDraft } from './useGraphPiecewiseDrafts';

type Piecewise = Extract<GraphItemSpecV1, { kind: 'piecewise' }>;
const piecewise = (latex: string) => buildVisibleGraphItem({ itemId: 'p', sourceLatex: latex, sourceRevision: 1, index: 0 }) as Piecewise;
const triangle = String.raw`y=\begin{cases}x+2&-2\le x<0\\2-x&0\le x\le2\\0&\text{otherwise}\end{cases}`;

describe('Piecewise branch styles (GRAPHING-PIECEWISE2)', () => {
  it('gives each branch its own palette colour by default, the first keeping the item colour', () => {
    const item = piecewise(triangle);
    const colours = ['branch.1', 'branch.2', 'otherwise'].map((key) => resolveGraphPresentationColor(graphPiecewiseBranchPresentation(item, key)));
    expect(new Set(colours).size).toBe(3);
    expect(colours[0]).toBe(resolveGraphPresentationColor(defaultGraphItemPresentation(0)));
    // Colour-vision-friendly mode changes the palette, not the rule.
    expect(resolveGraphPresentationColor(graphPiecewiseBranchPresentation(item, 'branch.2'), 'color-vision-friendly')).toBe('#009e73');
  });

  it('saves only overrides, beside the mathematics, so restyling never resamples', () => {
    const session = createGraphWorkspaceSessionState('g', 'Untitled Graph');
    const document = { ...session.document, items: [piecewise(triangle)] };
    const orange = { ...defaultGraphItemPresentation(3) };
    const styled = replaceGraphPiecewiseBranchPresentation({ document, itemId: 'p', branchKey: 'branch.2', presentation: orange })!;
    const item = styled.items[0] as Piecewise;
    expect(item.branchPresentation).toEqual({ 'branch.2': orange });
    expect(graphPiecewiseBranchPresentation(item, 'branch.2')).toBe(orange);
    expect(JSON.stringify(classifiedGraphItems(styled))).toBe(JSON.stringify(classifiedGraphItems(document)));
    expect(restoredGraphDocument(styled, document).mathematicsRevision).toBe(styled.mathematicsRevision);
    expect(graphPresentationFrameItems(styled.items)[0]).toMatchObject({ branches: { 'branch.2': orange } });
    const reset = replaceGraphPiecewiseBranchPresentation({ document: styled, itemId: 'p', branchKey: 'branch.2', presentation: null })!;
    expect((reset.items[0] as Piecewise).branchPresentation).toBeUndefined();
  });

  it('finds the branch of a scene path or endpoint batch', () => {
    expect(graphSceneBranchKey('p', 'p:branch:branch.2')).toBe('branch.2');
    expect(graphSceneBranchKey('p', 'p:endpoint:otherwise:open')).toBe('otherwise');
    expect(graphSceneBranchKey('p', 'p:explicit')).toBeUndefined();
  });
});

describe('Piecewise branch drafts (GRAPHING-PIECEWISE2)', () => {
  it('keeps the otherwise branch when an item is edited', () => {
    expect(graphPiecewiseDraftFromItem(piecewise(triangle)).otherwiseLatex).toBe('0');
  });

  it('moves, duplicates and removes branches, never below one', () => {
    const draft = graphPiecewiseDraftFromItem(piecewise(triangle));
    const moved = mutatedGraphPiecewiseDraft(draft, { action: 'move', branchId: 'branch.2', toIndex: 0 })!;
    expect(moved.branches.map((branch) => branch.branchId)).toEqual(['branch.2', 'branch.1']);
    expect(mutatedGraphPiecewiseDraft(draft, { action: 'up', branchId: 'branch.1' })).toBeNull();
    const duplicated = mutatedGraphPiecewiseDraft(draft, { action: 'duplicate', branchId: 'branch.1' })!;
    expect(duplicated.branches.map((branch) => branch.valueLatex)).toEqual(['x+2', 'x+2', '2-x']);
    const single = mutatedGraphPiecewiseDraft(draft, { action: 'remove', branchId: 'branch.1' })!;
    expect(mutatedGraphPiecewiseDraft(single, { action: 'remove', branchId: 'branch.2' })).toBeNull();
    expect(mutatedGraphPiecewiseDraft(draft, { action: 'otherwise-off' })!.otherwiseLatex).toBeUndefined();
  });
});
