import { describe, expect, it } from 'vitest';
import { runGraphSampleRequest } from '../../lib/graphing/sampling/request';
import { buildVisibleGraphItem } from './graph-document';
import { classifiedGraphItems, graphFirstFreeItemNumber, graphParameterEnvironment } from './graph-controller-support';
import {
  GRAPH_EXAMPLES, GRAPH_PIECEWISE_TEMPLATES, graphDocumentIsEmpty, graphPiecewiseTemplateLatex, graphSessionWithExample,
} from './graph-examples';
import { createGraphWorkspaceSessionState } from './graph-workspace-session';

const kindOf = (sourceLatex: string) => {
  const item = buildVisibleGraphItem({ itemId: 'example', sourceLatex, sourceRevision: 1, index: 0 });
  return item.kind === 'invalid-relation-draft' ? `invalid:${item.parseStop.detailCode ?? item.parseStop.code}` : item.kind;
};

describe('Graph examples gallery', () => {
  it('classifies every example row as a drawable item', () => {
    const failures = GRAPH_EXAMPLES.flatMap((example) => example.latex
      .map((latex) => [example.id, latex, kindOf(latex)] as const)
      .filter(([, , kind]) => kind.startsWith('invalid')));
    expect(failures).toEqual([]);
  });

  it('turns every piecewise template into a piecewise item', () => {
    expect(GRAPH_PIECEWISE_TEMPLATES.map((template) => kindOf(graphPiecewiseTemplateLatex(template))))
      .toEqual(GRAPH_PIECEWISE_TEMPLATES.map(() => 'piecewise'));
  });

  it('samples every example to completion with no stop reasons', async () => {
    for (const example of GRAPH_EXAMPLES.filter((candidate) => candidate.view !== 'complex' && candidate.dimension !== '3d')) {
      let next = 0;
      const session = graphSessionWithExample(createGraphWorkspaceSessionState('g', 'Untitled Graph'), example, 'replace', () => `g.item.${next += 1}`);
      const execution = await runGraphSampleRequest({
        version: 6, requestId: example.id, workspaceInstanceId: 'g', documentId: session.document.documentId,
        revisions: { scene: 1, mathematics: 1, viewport: 1, parameter: 1 }, items: classifiedGraphItems(session.document),
        parameterEnvironment: graphParameterEnvironment(session.document), viewport: session.surface.viewport,
        cssSize: { width: 900, height: 600 }, overlays: { unitCircle: false }, quality: 'settled',
        priority: { dependentItemIds: [] }, movement: { panVelocityX: 0, panVelocityY: 0, zoomRatio: 1 },
      });
      expect([example.id, execution.result.status, execution.result.stopReasons.map((reason) => reason.detailCode ?? reason.code)])
        .toEqual([example.id, 'complete', []]);
    }
  });

  it('replaces an empty graph with the example and its view, or adds after existing items', () => {
    let next = 0;
    const ids = () => `g.item.${next += 1}`;
    const example = GRAPH_EXAMPLES.find((candidate) => candidate.id === 'family')!;
    const empty = createGraphWorkspaceSessionState('g', 'Untitled Graph');
    expect(graphDocumentIsEmpty(empty.document)).toBe(true);
    const loaded = graphSessionWithExample(empty, example, 'replace', ids);
    expect(loaded.document.items.map((item) => item.kind)).toEqual(['parameter', 'parameter', 'relation']);
    expect(loaded.surface.viewport).toMatchObject(example.viewport!);
    const added = graphSessionWithExample(loaded, GRAPH_EXAMPLES.find((candidate) => candidate.id === 'tan')!, 'add', ids);
    expect(added.document.items).toHaveLength(4);
    expect(added.surface.viewport).toEqual(loaded.surface.viewport);
    // New rows continue after the highest item number in use.
    expect(graphFirstFreeItemNumber(added, 'g')).toBe(5);
  });
});

