import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeNode } from './normalize';
import { isFiniteNumber, isNodeArray } from './patterns';
import type { CalculusDerivativeStrategy } from '../../types/calculator';

const ce = new ComputeEngine();
const DERIVATIVE_STRATEGY_ORDER: CalculusDerivativeStrategy[] = [
  'function-power',
  'general-power',
  'inverse-trig',
  'inverse-hyperbolic',
  'chain-rule',
  'product-rule',
  'quotient-rule',
  'direct-rule',
  'compute-engine',
];
const FUNCTION_POWER_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Arcsin',
  'Arccos',
  'Arctan',
  'Sinh',
  'Cosh',
  'Tanh',
  'Arsinh',
  'Arcosh',
  'Artanh',
  'Ln',
  'Log',
  'Sqrt',
]);

type DifferentiationContext = {
  strategies: Set<CalculusDerivativeStrategy>;
};

function isZero(node: unknown) {
  return node === 0;
}

function isOne(node: unknown) {
  return node === 1;
}

function markStrategy(context: DifferentiationContext, strategy: CalculusDerivativeStrategy) {
  context.strategies.add(strategy);
}

function markChainRuleIfNeeded(context: DifferentiationContext, childPrime: unknown) {
  if (!isZero(childPrime) && !isOne(childPrime)) {
    markStrategy(context, 'chain-rule');
  }
}

function isFunctionNode(node: unknown) {
  return isNodeArray(node) && typeof node[0] === 'string' && FUNCTION_POWER_HEADS.has(node[0]);
}

function hasVariableDependency(node: unknown, variable: string): boolean {
  if (typeof node === 'string') {
    return node === variable;
  }
  if (isNodeArray(node)) {
    return node.some((child) => hasVariableDependency(child, variable));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((child) => hasVariableDependency(child, variable));
  }
  return false;
}

function orderedStrategies(strategies: Set<CalculusDerivativeStrategy>) {
  const ordered = DERIVATIVE_STRATEGY_ORDER.filter((strategy) => strategies.has(strategy));
  return ordered.length > 1 ? ordered.filter((strategy) => strategy !== 'direct-rule') : ordered;
}

export function simplifyNode(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const simplifiedChildren = children.map(simplifyNode);

  if (head === 'Negate' && simplifiedChildren.length === 1) {
    const child = simplifiedChildren[0];
    if (typeof child === 'number') {
      return -child;
    }
    if (isNodeArray(child) && child[0] === 'Negate' && child.length === 2) {
      return child[1];
    }
    return ['Negate', child];
  }

  if (head === 'Add') {
    const flattened = simplifiedChildren.flatMap((child) =>
      isNodeArray(child) && child[0] === 'Add' ? child.slice(1) : [child],
    );
    let numeric = 0;
    const remaining: unknown[] = [];
    for (const child of flattened) {
      if (typeof child === 'number') {
        numeric += child;
      } else {
        remaining.push(child);
      }
    }
    if (numeric !== 0) {
      remaining.push(numeric);
    }
    if (remaining.length === 0) {
      return 0;
    }
    if (remaining.length === 1) {
      return remaining[0];
    }
    return ['Add', ...remaining];
  }

  if (head === 'Multiply') {
    const flattened = simplifiedChildren.flatMap((child) =>
      isNodeArray(child) && child[0] === 'Multiply' ? child.slice(1) : [child],
    );
    let numeric = 1;
    const remaining: unknown[] = [];
    for (const child of flattened) {
      if (typeof child === 'number') {
        numeric *= child;
      } else {
        remaining.push(child);
      }
    }
    if (numeric === 0) {
      return 0;
    }
    if (numeric !== 1) {
      remaining.unshift(numeric);
    }
    if (remaining.length === 0) {
      return numeric;
    }
    if (remaining.length === 1) {
      return remaining[0];
    }
    return ['Multiply', ...remaining];
  }

  if (head === 'Divide' && simplifiedChildren.length === 2) {
    const [left, right] = simplifiedChildren;
    if (typeof left === 'number' && typeof right === 'number' && right !== 0) {
      return left / right;
    }
    if (isZero(left)) {
      return 0;
    }
    if (isOne(right)) {
      return left;
    }
    return ['Divide', left, right];
  }

  if (head === 'Power' && simplifiedChildren.length === 2) {
    const [base, exponent] = simplifiedChildren;
    if (typeof exponent === 'number') {
      if (exponent === 0) {
        return 1;
      }
      if (exponent === 1) {
        return base;
      }
      if (typeof base === 'number') {
        return base ** exponent;
      }
    }
    return ['Power', base, exponent];
  }

  return [head, ...simplifiedChildren];
}

function productRule(factors: unknown[], variable: string, context: DifferentiationContext) {
  const terms: unknown[] = [];
  for (let index = 0; index < factors.length; index += 1) {
    const derivative = differentiateNodeInternal(factors[index], variable, context);
    if (isZero(derivative)) {
      continue;
    }
    terms.push([
      'Multiply',
      ...factors.map((factor, factorIndex) => (factorIndex === index ? derivative : factor)),
    ]);
  }
  return simplifyNode(['Add', ...terms]);
}

function differentiateNodeInternal(
  node: unknown,
  variable: string,
  context: DifferentiationContext,
): unknown {
  if (typeof node === 'number') {
    return 0;
  }

  if (typeof node === 'string') {
    if (node === variable) {
      markStrategy(context, 'direct-rule');
    }
    return node === variable ? 1 : 0;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return 0;
  }

  const [head, ...children] = node;

  if (head === 'Negate' && children.length === 1) {
    return simplifyNode(['Negate', differentiateNodeInternal(children[0], variable, context)]);
  }

  if (head === 'Add') {
    return simplifyNode(['Add', ...children.map((child) => differentiateNodeInternal(child, variable, context))]);
  }

  if (head === 'Multiply') {
    const variableFactorCount = children.filter((child) => hasVariableDependency(child, variable)).length;
    if (variableFactorCount > 1) {
      markStrategy(context, 'product-rule');
    }
    return productRule(children, variable, context);
  }

  if (head === 'Divide' && children.length === 2) {
    const [u, v] = children;
    markStrategy(context, 'quotient-rule');
    return simplifyNode([
      'Divide',
      [
        'Add',
        ['Multiply', differentiateNodeInternal(u, variable, context), v],
        ['Negate', ['Multiply', u, differentiateNodeInternal(v, variable, context)]],
      ],
      ['Power', v, 2],
    ]);
  }

  if (head === 'Power' && children.length === 2) {
    const [base, exponent] = children;
    const basePrime = differentiateNodeInternal(base, variable, context);
    const exponentPrime = differentiateNodeInternal(exponent, variable, context);

    if (isFunctionNode(base)) {
      markStrategy(context, 'function-power');
    }

    if (isFiniteNumber(exponent)) {
      markStrategy(context, 'direct-rule');
      return simplifyNode([
        'Multiply',
        exponent,
        ['Power', base, exponent - 1],
        basePrime,
      ]);
    }

    markStrategy(context, 'general-power');
    if (base === 'ExponentialE') {
      return simplifyNode([
        'Multiply',
        ['Power', 'ExponentialE', exponent],
        exponentPrime,
      ]);
    }

    if (isFiniteNumber(base) && base > 0) {
      return simplifyNode([
        'Multiply',
        ['Power', base, exponent],
        ['Ln', base],
        exponentPrime,
      ]);
    }

    return simplifyNode([
      'Multiply',
      ['Power', base, exponent],
      [
        'Add',
        ['Multiply', exponentPrime, ['Ln', base]],
        ['Multiply', exponent, ['Divide', basePrime, base]],
      ],
    ]);
  }

  if (head === 'Ln' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode(['Divide', childPrime, children[0]]);
  }

  if (head === 'Log' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Divide',
      childPrime,
      ['Multiply', children[0], ['Ln', 10]],
    ]);
  }

  if (head === 'Sin' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode(['Multiply', ['Cos', children[0]], childPrime]);
  }

  if (head === 'Cos' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode(['Negate', ['Multiply', ['Sin', children[0]], childPrime]]);
  }

  if (head === 'Tan' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Multiply',
      ['Divide', 1, ['Power', ['Cos', children[0]], 2]],
      childPrime,
    ]);
  }

  if (head === 'Sqrt' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Divide',
      childPrime,
      ['Multiply', 2, ['Sqrt', children[0]]],
    ]);
  }

  if (head === 'Abs' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Multiply',
      ['Divide', children[0], ['Abs', children[0]]],
      childPrime,
    ]);
  }

  if (head === 'Arcsin' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markStrategy(context, 'inverse-trig');
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Divide',
      childPrime,
      ['Sqrt', ['Add', 1, ['Negate', ['Power', children[0], 2]]]],
    ]);
  }

  if (head === 'Arccos' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markStrategy(context, 'inverse-trig');
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Negate',
      [
        'Divide',
        childPrime,
        ['Sqrt', ['Add', 1, ['Negate', ['Power', children[0], 2]]]],
      ],
    ]);
  }

  if (head === 'Arctan' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markStrategy(context, 'inverse-trig');
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Divide',
      childPrime,
      ['Add', 1, ['Power', children[0], 2]],
    ]);
  }

  if (head === 'Arsinh' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markStrategy(context, 'inverse-hyperbolic');
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Divide',
      childPrime,
      ['Sqrt', ['Add', ['Power', children[0], 2], 1]],
    ]);
  }

  if (head === 'Arcosh' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markStrategy(context, 'inverse-hyperbolic');
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Divide',
      childPrime,
      [
        'Multiply',
        ['Sqrt', ['Add', children[0], ['Negate', 1]]],
        ['Sqrt', ['Add', children[0], 1]],
      ],
    ]);
  }

  if (head === 'Artanh' && children.length === 1) {
    const childPrime = differentiateNodeInternal(children[0], variable, context);
    markStrategy(context, 'inverse-hyperbolic');
    markChainRuleIfNeeded(context, childPrime);
    return simplifyNode([
      'Divide',
      childPrime,
      ['Add', 1, ['Negate', ['Power', children[0], 2]]],
    ]);
  }

  markStrategy(context, 'compute-engine');
  const ceDerivative = ce.box((['D', node, variable] as unknown) as Parameters<typeof ce.box>[0]).evaluate();
  return simplifyNode(ceDerivative.json);
}

export function differentiateNode(node: unknown, variable: string): unknown {
  return differentiateNodeInternal(node, variable, { strategies: new Set() });
}

export function differentiateAstWithMetadata(node: unknown, variable: string) {
  const context: DifferentiationContext = { strategies: new Set() };
  const ast = normalizeNode(simplifyNode(differentiateNodeInternal(node, variable, context))).ast;
  return {
    ast,
    strategies: orderedStrategies(context.strategies),
  };
}

export function differentiateAst(node: unknown, variable: string) {
  return differentiateAstWithMetadata(node, variable).ast;
}

export function differentiateLatex(latex: string, variable: string) {
  const parsed = ce.parse(latex);
  const ast = differentiateAst(parsed.json, variable);
  return ce.box(ast as Parameters<typeof ce.box>[0]).latex;
}

export function differentiateLatexWithMetadata(latex: string, variable: string) {
  const parsed = ce.parse(latex);
  const derivative = differentiateAstWithMetadata(parsed.json, variable);
  return {
    latex: ce.box(derivative.ast as Parameters<typeof ce.box>[0]).latex,
    strategies: derivative.strategies,
  };
}

export function areEquivalentNodes(left: unknown, right: unknown) {
  return JSON.stringify(normalizeNode(left).ast) === JSON.stringify(normalizeNode(right).ast);
}
