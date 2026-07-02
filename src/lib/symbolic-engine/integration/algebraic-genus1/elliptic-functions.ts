import { boxLatex, isNodeArray } from '../../patterns';

export type EllipticFunctionHead = 'EllipticF' | 'EllipticE' | 'EllipticPi';

export const ELLIPTIC_FUNCTION_ARITY: Record<EllipticFunctionHead, number> = {
  EllipticF: 2,
  EllipticE: 2,
  EllipticPi: 3,
};

export const ELLIPTIC_FUNCTION_HEADS = new Set<EllipticFunctionHead>([
  'EllipticF',
  'EllipticE',
  'EllipticPi',
]);

export function isEllipticFunctionHead(head: string): head is EllipticFunctionHead {
  return ELLIPTIC_FUNCTION_HEADS.has(head as EllipticFunctionHead);
}

export function isEllipticFunctionNode(node: unknown): node is [EllipticFunctionHead, ...unknown[]] {
  return isNodeArray(node)
    && typeof node[0] === 'string'
    && isEllipticFunctionHead(node[0])
    && node.length === ELLIPTIC_FUNCTION_ARITY[node[0]] + 1;
}

export function ellipticFunctionCallLatex(head: EllipticFunctionHead, args: unknown[]) {
  return `\\operatorname{${head}}\\left(${args.map((arg) => boxLatex(arg)).join(',')}\\right)`;
}

export function ellipticFunctionLatex(node: unknown) {
  return isEllipticFunctionNode(node)
    ? ellipticFunctionCallLatex(node[0], node.slice(1))
    : undefined;
}
