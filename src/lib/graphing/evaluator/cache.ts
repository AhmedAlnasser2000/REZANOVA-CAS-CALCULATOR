import { compileGraphExpression } from './compile';
import type {
  CompiledGraphExpressionPlan,
  GraphExpressionCompileInput,
  GraphExpressionCompileResult,
} from './types';

export class GraphExpressionPlanCache {
  readonly #maximumEntries: number;
  readonly #plans = new Map<string, CompiledGraphExpressionPlan>();

  constructor(maximumEntries = 100) {
    this.#maximumEntries = Math.max(1, Math.floor(maximumEntries));
  }

  get size() {
    return this.#plans.size;
  }

  getOrCompile(input: GraphExpressionCompileInput): GraphExpressionCompileResult {
    const cacheKey = `${input.planId}@${input.sourceRevision}`;
    const existing = this.#plans.get(cacheKey);
    if (existing) {
      this.#plans.delete(cacheKey);
      this.#plans.set(cacheKey, existing);
      return { ok: true, plan: existing };
    }
    const compiled = compileGraphExpression(input);
    if (!compiled.ok) return compiled;
    for (const key of this.#plans.keys()) {
      if (key.startsWith(`${input.planId}@`)) this.#plans.delete(key);
    }
    this.#plans.set(cacheKey, compiled.plan);
    while (this.#plans.size > this.#maximumEntries) {
      const oldest = this.#plans.keys().next().value as string | undefined;
      if (!oldest) break;
      this.#plans.delete(oldest);
    }
    return compiled;
  }

  clear() {
    this.#plans.clear();
  }
}
