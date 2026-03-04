import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeNode } from './normalize';
import { isFiniteNumber, isNodeArray } from './patterns';

const ce = new ComputeEngine();

function isZero(node: unknown) {
  return node === 0;
}

function isOne(node: unknown) {
  return node === 1;
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

function productRule(factors: unknown[], variable: string) {
  const terms: unknown[] = [];
  for (let index = 0; index < factors.length; index += 1) {
    const derivative = differentiateNode(factors[index], variable);
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

export function differentiateNode(node: unknown, variable: string): unknown {
  if (typeof node === 'number') {
    return 0;
  }

  if (typeof node === 'string') {
    return node === variable ? 1 : 0;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return 0;
  }

  const [head, ...children] = node;

  if (head === 'Negate' && children.length === 1) {
    return simplifyNode(['Negate', differentiateNode(children[0], variable)]);
  }

  if (head === 'Add') {
    return simplifyNode(['Add', ...children.map((child) => differentiateNode(child, variable))]);
  }

  if (head === 'Multiply') {
    return productRule(children, variable);
  }

  if (head === 'Divide' && children.length === 2) {
    const [u, v] = children;
    return simplifyNode([
      'Divide',
      [
        'Add',
        ['Multiply', differentiateNode(u, variable), v],
        ['Negate', ['Multiply', u, differentiateNode(v, variable)]],
      ],
      ['Power', v, 2],
    ]);
  }

  if (head === 'Power' && children.length === 2) {
    const [base, exponent] = children;
    const basePrime = differentiateNode(base, variable);
    const exponentPrime = differentiateNode(exponent, variable);

    if (isFiniteNumber(exponent)) {
      return simplifyNode([
        'Multiply',
        exponent,
        ['Power', base, exponent - 1],
        basePrime,
      ]);
    }

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
    return simplifyNode(['Divide', differentiateNode(children[0], variable), children[0]]);
  }

  if (head === 'Log' && children.length === 1) {
    return simplifyNode([
      'Divide',
      differentiateNode(children[0], variable),
      ['Multiply', children[0], ['Ln', 10]],
    ]);
  }

  if (head === 'Sin' && children.length === 1) {
    return simplifyNode(['Multiply', ['Cos', children[0]], differentiateNode(children[0], variable)]);
  }

  if (head === 'Cos' && children.length === 1) {
    return simplifyNode(['Negate', ['Multiply', ['Sin', children[0]], differentiateNode(children[0], variable)]]);
  }

  if (head === 'Tan' && children.length === 1) {
    return simplifyNode([
      'Multiply',
      ['Divide', 1, ['Power', ['Cos', children[0]], 2]],
      differentiateNode(children[0], variable),
    ]);
  }

  if (head === 'Sqrt' && children.length === 1) {
    return simplifyNode([
      'Divide',
      differentiateNode(children[0], variable),
      ['Multiply', 2, ['Sqrt', children[0]]],
    ]);
  }

  if (head === 'Abs' && children.length === 1) {
    return simplifyNode([
      'Multiply',
      ['Divide', children[0], ['Abs', children[0]]],
      differentiateNode(children[0], variable),
    ]);
  }

  const ceDerivative = ce.box((['D', node, variable] as unknown) as Parameters<typeof ce.box>[0]).evaluate();
  return simplifyNode(ceDerivative.json);
}

export function differentiateAst(node: unknown, variable: string) {
  return normalizeNode(simplifyNode(differentiateNode(node, variable))).ast;
}

export function differentiateLatex(latex: string, variable: string) {
  const parsed = ce.parse(latex);
  const ast = differentiateAst(parsed.json, variable);
  return ce.box(ast as Parameters<typeof ce.box>[0]).latex;
}

export function areEquivalentNodes(left: unknown, right: unknown) {
  return JSON.stringify(normalizeNode(left).ast) === JSON.stringify(normalizeNode(right).ast);
}
