import type { GraphRelationIR } from '../contracts';
import { GraphExpressionPlanCache } from '../evaluator';
import type { GraphExpressionCompileResult } from '../evaluator';
import type { CompiledExplicitGraphRelationPlan } from './types';

export type CompileExplicitGraphRelationInput = {
  itemId: string;
  sourceRevision: number;
  relation: GraphRelationIR;
  cache?: GraphExpressionPlanCache;
};

export type CompileExplicitGraphRelationResult =
  | { ok: true; plan: CompiledExplicitGraphRelationPlan }
  | Extract<GraphExpressionCompileResult, { ok: false }>;

export function compileExplicitGraphRelation(
  input: CompileExplicitGraphRelationInput,
): CompileExplicitGraphRelationResult {
  if (input.relation.kind !== 'explicit-y' && input.relation.kind !== 'explicit-x') {
    return {
      ok: false,
      stopReason: {
        code: 'unsupported-relation',
        detailCode: `sampler-${input.relation.kind}`,
      },
    };
  }
  const cache = input.cache ?? new GraphExpressionPlanCache(1);
  const compiled = cache.getOrCompile({
    planId: `${input.itemId}.${input.relation.kind}`,
    sourceRevision: input.sourceRevision,
    expression: input.relation.rhs,
  });
  if (!compiled.ok) return compiled;
  return {
    ok: true,
    plan: {
      itemId: input.itemId,
      sourceRevision: input.sourceRevision,
      relationKind: input.relation.kind,
      independentSymbol: input.relation.kind === 'explicit-y' ? 'x' : 'y',
      expression: compiled.plan,
    },
  };
}
