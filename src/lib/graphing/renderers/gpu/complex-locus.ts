import type { GraphInequalityComparator } from '../../contracts';
import type { GraphGpuComplexProgramV1 } from '../../contracts/gpu-types';
import { translateGraphComplexMapping } from './complex-program';
import type { GraphGpuTranslationRefusal } from './real-program';

// Complex loci (|z-1| = 2, arg z = pi/4, |z| < 2) on the GPU. Each clause is a
// real function of the pixel's point z = x + iy: Re(left - right), undefined
// where a side is not real there (as the CPU locus sampler treats it). The
// program plugs into the real-field passes unchanged: pass 1 stores the clause
// values, pass 2 draws the region fill and the sign-change boundary. Display only.

export const GRAPH_GPU_COMPLEX_LOCUS_MAX_CLAUSES = 4;
const IMAGINARY_TOLERANCE = '1e-5';

export type GraphGpuComplexLocusClauseInput = {
  left: unknown;
  right: unknown;
  operator: GraphInequalityComparator | '=';
};

export type GraphGpuComplexLocusProgram = GraphGpuComplexProgramV1 & {
  clauseCount: number;
  strict: boolean[];
  fillsRegion: boolean;
};

export function buildGraphGpuComplexLocusProgram(
  clauses: readonly GraphGpuComplexLocusClauseInput[],
  options: { key: string; fillsRegion: boolean },
): GraphGpuComplexLocusProgram | GraphGpuTranslationRefusal {
  if (clauses.length === 0) return { ok: false, reason: 'no-clauses' };
  if (clauses.length > GRAPH_GPU_COMPLEX_LOCUS_MAX_CLAUSES) return { ok: false, reason: 'too-many-clauses' };
  const parameterNames: string[] = [];
  const sources: string[] = [];
  const ops: GraphGpuComplexProgramV1['ops'] = [];
  for (const [index, clause] of clauses.entries()) {
    const left = translateGraphComplexMapping(clause.left, { key: options.key, functionName: `graphLeft${index}`, parameterNames });
    if (!('kind' in left)) return left;
    const right = translateGraphComplexMapping(clause.right, { key: options.key, functionName: `graphRight${index}`, parameterNames });
    if (!('kind' in right)) return right;
    ops.push(...left.ops, ...right.ops);
    const reversed = clause.operator === '>' || clause.operator === '>=';
    sources.push(left.glsl, right.glsl, `float graphClause${index}(vec2 p, out bool ok) {
  bool leftOk; bool rightOk;
  vec2 l = graphLeft${index}(p, leftOk);
  vec2 r = graphRight${index}(p, rightOk);
  ok = leftOk && rightOk
    && abs(l.y) <= ${IMAGINARY_TOLERANCE} * max(1.0, abs(l.x)) && abs(r.y) <= ${IMAGINARY_TOLERANCE} * max(1.0, abs(r.x));
  return ${reversed ? 'r.x - l.x' : 'l.x - r.x'};
}
`);
  }
  // The field helper of a complex-kind program calls graphComplex; loci never use it.
  sources.push('vec2 graphComplex(vec2 z, out bool ok) { ok = false; return vec2(0.0); }\n');
  return {
    kind: 'complex',
    key: options.key,
    ops,
    parameterNames,
    glsl: sources.join('\n'),
    clauseCount: clauses.length,
    strict: clauses.map((clause) => clause.operator === '<' || clause.operator === '>'),
    fillsRegion: options.fillsRegion,
  };
}
