import { describe, expect, it } from 'vitest';
import {
  buildVisibleGraphItem,
  removeGraphDocumentItem,
  replaceGraphDocumentItem,
  setGraphComplexValues,
} from './graph-document';
import { graphViewAutoSwitch } from './graph-view-auto-switch';
import { createGraphWorkspaceSessionState } from './graph-workspace-session';

const empty = createGraphWorkspaceSessionState('graph.auto', 'Graph').document;

function withItem(document: typeof empty, itemId: string, sourceLatex: string) {
  const found = document.items.find((item) => item.itemId === itemId);
  const previous = found?.kind === 'note' ? undefined : found;
  return replaceGraphDocumentItem(document, buildVisibleGraphItem({
    itemId, sourceLatex, sourceRevision: 1, index: document.items.length, previous,
  }));
}

describe('Graph view auto-switch', () => {
  it('opens Complex for a newly authored z-mapping but not for a trajectory', () => {
    const mapping = withItem(empty, 'a', 'z^2');
    expect(graphViewAutoSwitch({ previous: empty, next: mapping, mode: 'real', autoSwitched: false }))
      .toEqual({ from: 'real', to: 'complex', reason: 'complex-mapping-added' });
    const trajectory = withItem(empty, 'b', String.raw`f(t)=\exp(it)`);
    expect(graphViewAutoSwitch({ previous: empty, next: trajectory, mode: 'real', autoSwitched: false })).toBeNull();
  });

  it('never overrides a user who returned to Real for an existing mapping', () => {
    const mapping = withItem(empty, 'a', 'z^2');
    const edited = withItem(mapping, 'a', 'z^3');
    expect(graphViewAutoSwitch({ previous: mapping, next: edited, mode: 'real', autoSwitched: false })).toBeNull();
  });

  it('returns to Real when the last mapping goes, only after an automatic switch', () => {
    const mapping = withItem(empty, 'a', 'z^2');
    const removed = removeGraphDocumentItem(mapping, 'a');
    expect(graphViewAutoSwitch({ previous: mapping, next: removed, mode: 'complex', autoSwitched: true }))
      .toEqual({ from: 'complex', to: 'real', reason: 'complex-mapping-removed' });
    expect(graphViewAutoSwitch({ previous: mapping, next: removed, mode: 'complex', autoSwitched: false })).toBeNull();
    // Editing the mapping into an invalid mix of z and x also removes the last mapping.
    const mixed = withItem(mapping, 'a', 'zx=y');
    expect(graphViewAutoSwitch({ previous: mapping, next: mixed, mode: 'complex', autoSwitched: true })?.to).toBe('real');
  });
});

describe('Graph complex values of a real curve', () => {
  it('toggles only y = f(x) curves and survives re-typing while the curve stays y = f(x)', () => {
    const curve = withItem(empty, 'a', String.raw`\sqrt{-x}`);
    const on = setGraphComplexValues({ document: curve, itemId: 'a', enabled: true });
    expect(on?.mathematicsRevision).toBe(curve.mathematicsRevision + 1);
    expect(on?.items[0]).toMatchObject({ relation: { kind: 'explicit-y', complexValues: true } });
    expect(setGraphComplexValues({ document: on!, itemId: 'a', enabled: true })).toBeNull();

    const retyped = withItem(on!, 'a', String.raw`\ln(x)`);
    expect(retyped.items[0]).toMatchObject({ relation: { kind: 'explicit-y', complexValues: true } });
    const implicit = withItem(on!, 'a', 'x^2+y^2=1');
    expect(implicit.items[0]).toMatchObject({ relation: { kind: 'implicit-equality' } });
    expect(implicit.items[0]).not.toMatchObject({ relation: { complexValues: true } });

    const off = setGraphComplexValues({ document: on!, itemId: 'a', enabled: false });
    expect(off?.items[0]).not.toMatchObject({ relation: { complexValues: true } });
    expect(setGraphComplexValues({ document: withItem(empty, 'b', 'x^2+y^2=1'), itemId: 'b', enabled: true })).toBeNull();
  });
});
