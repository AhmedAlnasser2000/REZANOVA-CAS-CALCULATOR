import { demand, type ExecutionContext } from './execution';
import type { LinearSolution, LinearSystem, RowOperation } from './linear-system';
import * as w from './decision-wire-algebra';

export function linearSystemCodec<E>(ctx: ExecutionContext, element: w.EvidenceCodec<E>): w.EvidenceCodec<LinearSystem<E>> {
  return w.structure(ctx, {rows: w.integer(ctx), columns: w.integer(ctx), matrix: w.list(ctx, w.list(ctx, element)), rhs: w.list(ctx, element)});
}

function kind(value: unknown): unknown {
  demand(value !== null && typeof value === 'object', 'invalid-input', 'linear evidence record');
  const d = Object.getOwnPropertyDescriptor(value, 'kind');
  demand(d !== undefined && 'value' in d, 'invalid-input', 'linear evidence discriminator'); return d.value;
}
/** Replayable exact Gauss-Jordan schema shared without changing existing artifacts. */
export function linearEvidenceCodec<E>(ctx: ExecutionContext, scalar: w.EvidenceCodec<E>): w.EvidenceCodec<LinearSolution<E>> {
  const swap = w.structure(ctx, { kind: w.literal(ctx, 'swap'), target: w.integer(ctx), source: w.integer(ctx) });
  const scale = w.structure(ctx, { kind: w.literal(ctx, 'scale'), target: w.integer(ctx), factor: scalar });
  const add = w.structure(ctx, { kind: w.literal(ctx, 'add'), target: w.integer(ctx), source: w.integer(ctx), factor: scalar });
  const operation: w.EvidenceCodec<RowOperation<E>> = {
    encode(op) { return op.kind === 'swap' ? swap.encode(op) : op.kind === 'scale' ? scale.encode(op) : add.encode(op); },
    decode(v) { const k = kind(v); if (k === 'swap') return swap.decode(v); if (k === 'scale') return scale.decode(v);
      demand(k === 'add', 'invalid-input', 'linear row operation'); return add.decode(v); },
  };
  const common = { operations: w.list(ctx, operation), reduced: w.list(ctx, w.list(ctx, scalar)), rank: w.integer(ctx), pivots: w.list(ctx, w.integer(ctx)) };
  const consistent = w.structure(ctx, { ...common, kind: w.literal(ctx, 'consistent'), particular: w.list(ctx, scalar), nullspace: w.list(ctx, w.list(ctx, scalar)) });
  const inconsistent = w.structure(ctx, { ...common, kind: w.literal(ctx, 'inconsistent'), witness: w.list(ctx, scalar) });
  return {
    encode(v) { return v.kind === 'consistent' ? consistent.encode(v) : inconsistent.encode(v); },
    decode(v) { const k = kind(v); if (k === 'consistent') return consistent.decode(v);
      demand(k === 'inconsistent', 'invalid-input', 'linear outcome'); return inconsistent.decode(v); },
  };
}
