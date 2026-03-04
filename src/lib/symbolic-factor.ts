import { factorAst } from './symbolic-engine/factoring';

export function factorMathJson(ast: unknown): unknown | undefined {
  const result = factorAst(ast);
  return result.strategy === 'none' ? undefined : result.node;
}
