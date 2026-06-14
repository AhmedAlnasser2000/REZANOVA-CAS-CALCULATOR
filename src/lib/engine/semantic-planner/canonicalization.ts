import { ComputeEngine } from '@cortex-js/compute-engine';
import { simplifyNode } from '../../symbolic-engine/differentiation';
import {
  boxLatex,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
  termKey,
} from '../../symbolic-engine/patterns';
import { normalizeNode } from '../../symbolic-engine/normalize';
import type { PlannerStep } from '../../../types/calculator';
import { replaceDifferentialSegments } from './derivative-routing';

const ce = new ComputeEngine();

export function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]);
}

export function compactRepeatedFactors(node: unknown, steps: PlannerStep[]): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const rewrittenChildren = children.map((child) => compactRepeatedFactors(child, steps));

  if (head !== 'Multiply') {
    return [head, ...rewrittenChildren];
  }

  const flatChildren = rewrittenChildren.flatMap((child) => flattenMultiply(child));
  const groups = new Map<string, { node: unknown; count: number }>();
  const order: string[] = [];

  for (const child of flatChildren) {
    if (typeof child === 'number') {
      const numericKey = `number:${child}`;
      const current = groups.get(numericKey);
      if (current) {
        current.count += 1;
      } else {
        groups.set(numericKey, { node: child, count: 1 });
        order.push(numericKey);
      }
      continue;
    }

    const key = termKey(normalizeNode(child).ast);
    const current = groups.get(key);
    if (current) {
      current.count += 1;
    } else {
      groups.set(key, { node: child, count: 1 });
      order.push(key);
    }
  }

  const compacted = order.map((key) => {
    const entry = groups.get(key)!;
    if (entry.count > 1 && typeof entry.node !== 'number') {
      const before = flatChildren
        .filter((child) => termKey(normalizeNode(child).ast) === key)
        .map((child) => boxLatex(child))
        .join('\\cdot ');
      const after = boxLatex(['Power', entry.node, entry.count]);
      steps.push({
        kind: 'compact-identical-product',
        before,
        after,
      });
      return ['Power', entry.node, entry.count];
    }
    return entry.node;
  });

  if (compacted.length === 0) {
    return 1;
  }
  if (compacted.length === 1) {
    return compacted[0];
  }
  return ['Multiply', ...compacted];
}

export function reduceNumericOperators(node: unknown, steps: PlannerStep[]): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const rewrittenChildren = children.map((child) => reduceNumericOperators(child, steps));

  if (
    (head === 'Add' || head === 'Multiply' || head === 'Divide' || head === 'Power' || head === 'Negate')
    && rewrittenChildren.every((child) => isFiniteNumber(child))
  ) {
    const beforeNode = [head, ...rewrittenChildren];
    const evaluated = box(beforeNode).evaluate().json;
    if (isFiniteNumber(evaluated)) {
      steps.push({
        kind: 'reduce-numeric-operator',
        before: boxLatex(beforeNode),
        after: boxLatex(evaluated),
      });
      return evaluated;
    }
  }

  return [head, ...rewrittenChildren];
}

export function reduceEquationSide(latex: string, steps: PlannerStep[]) {
  const derivativeReduced = replaceDifferentialSegments(latex, steps);
  if (!derivativeReduced.ok) {
    return derivativeReduced;
  }

  const parsed = ce.parse(derivativeReduced.latex);
  if (JSON.stringify(parsed.json).includes('"Integrate"')) {
    return {
      ok: false as const,
      error: 'This equation contains an indefinite integral that is not safe to reduce automatically before solve.',
    };
  }

  const compacted = compactRepeatedFactors(parsed.json, steps);
  const numericReduced = reduceNumericOperators(compacted, steps);
  const simplified = simplifyNode(numericReduced);
  return {
    ok: true as const,
    node: simplified,
  };
}

export function parseLatex(latex: string) {
  return ce.parse(latex);
}
