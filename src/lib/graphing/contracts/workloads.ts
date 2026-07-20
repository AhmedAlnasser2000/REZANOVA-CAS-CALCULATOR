import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import type {
  GraphDocumentV1,
  GraphDocumentV2,
  GraphExpressionIR,
  GraphItemPresentationV1,
  GraphRelationIR,
} from './types';

const presentation = (colorToken: string): GraphItemPresentationV1 => ({
  version: 1,
  colorToken,
  stroke: 'solid',
  strokeWidth: 'normal',
  fillOpacity: 0.18,
  label: 'auto',
});

const expression = (mathJson: unknown, freeSymbols: string[] = []): GraphExpressionIR => ({
  mathJson: mathJson as SerializableMathJson,
  freeSymbols,
});
const source = (sourceLatex: string, sourceRevision = 1) => ({
  sourceKind: 'mathlive-latex' as const,
  sourceLatex,
  sourceRevision,
});

const relationRow = (
  index: number,
  sourceLatex: string,
  relation: GraphRelationIR,
  visible: boolean,
) => ({
  version: 1 as const,
  kind: 'relation' as const,
  itemId: `baseline-relation-${index.toString().padStart(2, '0')}`,
  source: source(sourceLatex),
  relation,
  visible,
  presentation: presentation(`graph-${index}`),
});

const visibleRelations: Array<[string, GraphRelationIR]> = [
  ['y=a\\sin(x)', { kind: 'explicit-y', rhs: expression(['Multiply', 'a', ['Sin', 'x']], ['a', 'x']), origin: 'authored-relation' }],
  ['y=1/x', { kind: 'explicit-y', rhs: expression(['Divide', 1, 'x'], ['x']), origin: 'authored-relation' }],
  ['y=\\sqrt{x}', { kind: 'explicit-y', rhs: expression(['Sqrt', 'x'], ['x']), origin: 'authored-relation' }],
  ['x=y^6', { kind: 'explicit-x', rhs: expression(['Power', 'y', 6], ['y']) }],
  ['x^2+y^2=9', { kind: 'implicit-equality', left: expression(['Add', ['Power', 'x', 2], ['Power', 'y', 2]], ['x', 'y']), right: expression(9) }],
  ['y<x', { kind: 'inequality', left: expression('y', ['y']), operator: '<', right: expression('x', ['x']) }],
  ['x^2+y^2<=16', { kind: 'inequality', left: expression(['Add', ['Power', 'x', 2], ['Power', 'y', 2]], ['x', 'y']), operator: '<=', right: expression(16) }],
  ['r=2\\cos(2\\theta)', { kind: 'polar-radius', radius: expression(['Multiply', 2, ['Cos', ['Multiply', 2, 'theta']]], ['theta']), angleSymbol: 'theta' }],
  ['(\\cos(t),\\sin(t))', { kind: 'parametric-curve', parameterSymbol: 't', x: expression(['Cos', 't'], ['t']), y: expression(['Sin', 't'], ['t']) }],
];

const hiddenRelations = Array.from({ length: 14 }, (_, offset) => relationRow(
  offset + visibleRelations.length + 1,
  `y=x+${offset + 1}`,
  { kind: 'explicit-y', rhs: expression(['Add', 'x', offset + 1], ['x']), origin: 'authored-relation' },
  false,
));

export const GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1: GraphDocumentV1 = {
  version: 1,
  documentId: 'graph-performance-baseline-v1',
  title: 'Pre-Three Performance Baseline',
  documentRevision: 1,
  items: [
    ...visibleRelations.map(([latex, relation], index) => relationRow(index + 1, latex, relation, true)),
    {
      version: 1,
      kind: 'piecewise',
      itemId: 'baseline-piecewise-01',
      source: source('y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}'),
      piecewise: {
        version: 1,
        branches: [
          { branchId: 'negative', relation: { kind: 'explicit-y', rhs: expression(['Power', 'x', 2], ['x']), origin: 'authored-relation' }, condition: { kind: 'comparison', left: expression('x', ['x']), operator: '<', right: expression(0) } },
          { branchId: 'nonnegative', relation: { kind: 'explicit-y', rhs: expression(['Sqrt', 'x'], ['x']), origin: 'authored-relation' }, condition: { kind: 'comparison', left: expression('x', ['x']), operator: '>=', right: expression(0) } },
        ],
      },
      visible: true,
      presentation: presentation('graph-piecewise'),
    },
    {
      version: 1,
      kind: 'parameter',
      itemId: 'baseline-parameter-a',
      parameter: { version: 1, parameterId: 'parameter-a', symbol: 'a', origin: 'slider-created', value: 1.2, minimum: -3, maximum: 3, step: 0.1 },
      visible: false,
    },
    ...hiddenRelations,
  ],
};

export const GRAPH_PRE_THREE_BASELINE_WORKLOAD_V2: GraphDocumentV2 = {
  version: 2,
  documentId: 'graph-performance-baseline-v2',
  title: GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1.title,
  contentRevision: GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1.documentRevision,
  mathematicsRevision: GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1.documentRevision,
  items: GRAPH_PRE_THREE_BASELINE_WORKLOAD_V1.items,
};

export const GRAPH_PRE_THREE_BASELINE_EXPECTATIONS = {
  totalRows: 25,
  visibleGeometryItems: 10,
  requiredVisibleKinds: [
    'explicit-y', 'explicit-x', 'implicit-equality', 'inequality',
    'piecewise', 'polar-radius', 'parametric-curve',
  ],
} as const;
