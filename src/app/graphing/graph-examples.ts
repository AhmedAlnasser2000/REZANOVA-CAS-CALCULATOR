import type { GraphDocumentV4, GraphItemSpecV1, GraphViewportV1 } from '../../lib/graphing';
import { buildVisibleGraphItem } from './graph-document';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';

// The Graph examples gallery (GRAPHING-PIECEWISE2): a tour of what Graphing
// draws. Every example is plain LaTeX that goes through the same classifier as
// typing, so the gallery can only show what the app really supports (a test
// checks that each one classifies and samples).

export type GraphExampleCategory = 'curves' | 'implicit' | 'complex' | 'analysis';

export type GraphExample = {
  id: string;
  category: GraphExampleCategory;
  title: string;
  description: string;
  /** Rows in order, as typed; `a=1` makes a slider. */
  latex: string[];
  viewport?: Pick<GraphViewportV1, 'xMin' | 'xMax' | 'yMin' | 'yMax'>;
  view?: 'real' | 'complex' | 'both';
  dimension?: '2d' | '3d';
  analyze?: boolean;
};

export type GraphPiecewiseTemplate = {
  id: string;
  title: string;
  branches: Array<{ valueLatex: string; conditionLatex: string }>;
  otherwiseLatex?: string;
};

export const GRAPH_EXAMPLE_CATEGORIES: Array<{ category: GraphExampleCategory; title: string; description: string }> = [
  { category: 'curves', title: 'Curves & piecewise', description: 'Functions, polar and parametric curves, asymptotes and piecewise definitions.' },
  { category: 'implicit', title: 'Implicit & regions', description: 'Curves of F(x, y) = 0 and shaded inequalities, drawn with interval proofs.' },
  { category: 'complex', title: 'Complex', description: 'Domain colouring, complex sets and roots counted by the argument principle.' },
  { category: 'analysis', title: '3D, sliders & analysis', description: 'Surfaces, slider families and proved points of interest.' },
];

/** Piecewise templates: the editor's Examples menu and the gallery's piecewise entries. */
export const GRAPH_PIECEWISE_TEMPLATES: GraphPiecewiseTemplate[] = [
  { id: 'absolute', title: 'Absolute value', branches: [
    { valueLatex: '-x', conditionLatex: 'x<0' }, { valueLatex: 'x', conditionLatex: String.raw`x\ge0` }] },
  { id: 'sign', title: 'Sign', branches: [
    { valueLatex: '-1', conditionLatex: 'x<0' }, { valueLatex: '0', conditionLatex: 'x=0' }, { valueLatex: '1', conditionLatex: 'x>0' }] },
  { id: 'jump', title: 'Jump', branches: [
    { valueLatex: 'x^2', conditionLatex: 'x<1' }, { valueLatex: '3-x', conditionLatex: String.raw`x\ge1` }] },
  { id: 'hole', title: 'Moved point', branches: [
    { valueLatex: 'x+1', conditionLatex: String.raw`x\ne1` }, { valueLatex: '3', conditionLatex: 'x=1' }] },
  { id: 'triangle', title: 'Triangle', branches: [
    { valueLatex: 'x+2', conditionLatex: String.raw`-2\le x<0` }, { valueLatex: '2-x', conditionLatex: String.raw`0\le x\le2` }],
  otherwiseLatex: '0' },
  { id: 'smooth', title: 'Smooth join', branches: [
    { valueLatex: String.raw`\sin x`, conditionLatex: 'x<0' }, { valueLatex: 'x-x^3', conditionLatex: String.raw`x\ge0` }] },
];

export function graphPiecewiseTemplateLatex(template: GraphPiecewiseTemplate) {
  const rows = template.branches.map((branch) => `${branch.valueLatex}&${branch.conditionLatex}`);
  if (template.otherwiseLatex !== undefined) rows.push(String.raw`${template.otherwiseLatex}&\text{otherwise}`);
  return String.raw`y=\begin{cases}${rows.join(String.raw`\\`)}\end{cases}`;
}

const piecewiseExample = (id: string, description: string): GraphExample => {
  const template = GRAPH_PIECEWISE_TEMPLATES.find((candidate) => candidate.id === id)!;
  return { id: `piecewise-${id}`, category: 'curves', title: `Piecewise: ${template.title.toLowerCase()}`, description,
    latex: [graphPiecewiseTemplateLatex(template)], viewport: { xMin: -5, xMax: 5, yMin: -3, yMax: 4 } };
};

export const GRAPH_EXAMPLES: GraphExample[] = [
  { id: 'tan', category: 'curves', title: 'Asymptotes of tan', description: 'Vertical asymptotes found and labelled, never joined across.',
    latex: [String.raw`y=\tan x`], viewport: { xMin: -7, xMax: 7, yMin: -5, yMax: 5 } },
  { id: 'rose', category: 'curves', title: 'Polar rose', description: 'r = 2 cos 2θ on the polar grid.',
    latex: [String.raw`r=2\cos(2\theta)`], viewport: { xMin: -4, xMax: 4, yMin: -2.5, yMax: 2.5 } },
  { id: 'lissajous', category: 'curves', title: 'Parametric curve', description: 'A Lissajous figure (sin 3t, cos 2t).',
    latex: [String.raw`(\sin(3t),\cos(2t))`], viewport: { xMin: -2.5, xMax: 2.5, yMin: -1.5, yMax: 1.5 } },
  { id: 'wiggle', category: 'curves', title: 'Infinite wiggle', description: 'x sin(1/x): adaptive sampling near the origin.',
    latex: [String.raw`y=x\sin\left(\frac{1}{x}\right)`], viewport: { xMin: -0.6, xMax: 0.6, yMin: -0.4, yMax: 0.4 } },
  piecewiseExample('jump', 'A jump at x = 1: a filled and an open endpoint.'),
  piecewiseExample('hole', 'A point moved off its line: a hole and a lone point.'),
  piecewiseExample('triangle', 'Two pieces and an otherwise, each in its own colour.'),

  { id: 'conics', category: 'implicit', title: 'Circle and ellipse', description: 'Two implicit curves at once.',
    latex: ['x^2+y^2=9', String.raw`\frac{x^2}{16}+\frac{y^2}{4}=1`], viewport: { xMin: -6, xMax: 6, yMin: -4, yMax: 4 } },
  { id: 'folium', category: 'implicit', title: 'Folium of Descartes', description: 'A curve that crosses itself, traced through the crossing.',
    latex: ['x^3+y^3=3xy'], viewport: { xMin: -4, xMax: 4, yMin: -3, yMax: 3 } },
  { id: 'heart', category: 'implicit', title: 'Heart curve', description: 'A sextic with a cusp, drawn by interval subdivision.',
    latex: ['(x^2+y^2-1)^3=x^2y^3'], viewport: { xMin: -2, xMax: 2, yMin: -1.5, yMax: 1.7 } },
  { id: 'touching', category: 'implicit', title: 'Touching curve', description: '(x − y)² = 0 never changes sign, yet is drawn.',
    latex: ['(x-y)^2=0'], viewport: { xMin: -5, xMax: 5, yMin: -3, yMax: 3 } },
  { id: 'region', category: 'implicit', title: 'Shaded regions', description: 'An inequality region and a band between curves.',
    latex: [String.raw`x^2\le y<4`, 'x^2+y^2<4'], viewport: { xMin: -4, xMax: 4, yMin: -2.5, yMax: 5 } },

  { id: 'domain-colour', category: 'complex', title: 'Domain colouring', description: 'f(z) = z³ / (z² + 1): zeros and poles by colour.',
    latex: [String.raw`f(z)=\frac{z^3}{z^2+1}`], view: 'complex', viewport: { xMin: -3, xMax: 3, yMin: -2, yMax: 2 } },
  { id: 'log', category: 'complex', title: 'Branch cuts', description: 'ln(z² + 1) with its branch cuts.',
    latex: [String.raw`f(z)=\ln(z^2+1)`], view: 'complex', viewport: { xMin: -3, xMax: 3, yMin: -2, yMax: 2 } },
  { id: 'roots', category: 'complex', title: 'Proved roots', description: 'z² + z = 3, roots counted by the argument principle.',
    latex: ['z^2+z=3'], view: 'complex', viewport: { xMin: -4, xMax: 4, yMin: -2.5, yMax: 2.5 } },
  { id: 'sets', category: 'complex', title: 'Complex sets', description: 'An annulus and a circle in the complex plane.',
    latex: [String.raw`1<|z|\le 2`, '|z-1|=2'], view: 'complex', viewport: { xMin: -4, xMax: 4, yMin: -2.5, yMax: 2.5 } },

  { id: 'surface', category: 'analysis', title: 'Surface with a slider', description: 'z = a sin x cos y in 3D; drag a.',
    latex: ['a=1', String.raw`z=a\sin(x)\cos(y)`], dimension: '3d' },
  { id: 'family', category: 'analysis', title: 'Slider family', description: 'y = a x² + b: drag the sliders.',
    latex: ['a=1', 'b=0', 'y=ax^2+b'], viewport: { xMin: -5, xMax: 5, yMin: -3, yMax: 5 } },
  { id: 'poi', category: 'analysis', title: 'Proved points of interest', description: 'Roots, extrema and intersections, proved where possible.',
    latex: ['y=x^3-3x', String.raw`y=\cos(2x)`], viewport: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 }, analyze: true },
];

/** True when the graph has nothing of the person's own, so an example can simply load. */
export function graphDocumentIsEmpty(document: GraphDocumentV4) {
  return document.items.every((item) => item.kind === 'note' && !item.text.trim());
}

/**
 * The session with an example loaded: `replace` swaps in its items and view;
 * `add` appends its items (renumbered after the existing ones) and keeps the view.
 */
export function graphSessionWithExample(
  session: GraphWorkspaceSessionStateV7,
  example: GraphExample,
  mode: 'replace' | 'add',
  nextItemId: () => string,
): GraphWorkspaceSessionStateV7 {
  const kept = mode === 'add' ? session.document.items : [];
  const added: GraphItemSpecV1[] = example.latex.map((sourceLatex, offset) => buildVisibleGraphItem({
    itemId: nextItemId(), sourceLatex, sourceRevision: 1, index: kept.length + offset,
  }));
  const document: GraphDocumentV4 = {
    ...session.document,
    contentRevision: session.document.contentRevision + 1,
    mathematicsRevision: session.document.mathematicsRevision + 1,
    items: [...kept, ...added],
  };
  if (mode === 'add') return { ...session, document, surface: { ...session.surface, parameterRevision: session.surface.parameterRevision + 1 } };
  const { surface } = session;
  return {
    ...session,
    document,
    authoring: { piecewiseDrafts: [] },
    surface: {
      ...surface,
      viewport: example.viewport ? { ...surface.viewport, ...example.viewport } : surface.viewport,
      viewportRevision: surface.viewportRevision + 1,
      parameterRevision: surface.parameterRevision + 1,
      viewPolicy: example.view === 'complex' ? { mode: 'complex', interpretation: 'complex-mapping' }
        : example.view === 'both' ? { mode: 'both', interpretation: 'complex-mapping', layout: 'synchronized-split' }
          : { mode: 'real' },
      analyzeOpen: example.analyze ?? surface.analyzeOpen,
      panes: { ...surface.panes, real: { ...surface.panes.real, dimension: example.dimension ?? '2d' } },
    },
  };
}
