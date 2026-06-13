import {
  classifySymbolName,
  isNodeArray,
  RESERVED_FUNCTION_OPERATORS,
} from './identifiers';
import type { ReservedIdentifierFact, VariableIdentifierKind } from './types';

export function collectMathJsonIdentifiers(
  node: unknown,
  symbols: Map<string, { kind: VariableIdentifierKind; occurrences: number }>,
  reserved: Map<string, { kind: ReservedIdentifierFact['identifierKind']; occurrences: number }>,
  explicitNamedVariables: ReadonlySet<string> = new Set(),
) {
  if (typeof node === 'string') {
    const kind = classifySymbolName(node, explicitNamedVariables);
    if (kind === 'reserved-constant' || kind === 'reserved-unit') {
      const current = reserved.get(node);
      reserved.set(node, {
        kind,
        occurrences: (current?.occurrences ?? 0) + 1,
      });
      return;
    }

    const current = symbols.get(node);
    symbols.set(node, {
      kind,
      occurrences: (current?.occurrences ?? 0) + 1,
    });
    return;
  }

  if (isNodeArray(node)) {
    const [operator, ...operands] = node;
    if (typeof operator === 'string' && RESERVED_FUNCTION_OPERATORS.has(operator)) {
      const current = reserved.get(operator);
      reserved.set(operator, {
        kind: 'reserved-function',
        occurrences: (current?.occurrences ?? 0) + 1,
      });
    } else if (
      operator === 'Complex'
      && operands.length >= 2
      && typeof operands[1] === 'number'
      && operands[1] !== 0
    ) {
      const current = reserved.get('ImaginaryUnit');
      reserved.set('ImaginaryUnit', {
        kind: 'reserved-unit',
        occurrences: (current?.occurrences ?? 0) + 1,
      });
    }
    for (const operand of operands) {
      collectMathJsonIdentifiers(operand, symbols, reserved, explicitNamedVariables);
    }
    return;
  }

  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) {
      collectMathJsonIdentifiers(value, symbols, reserved, explicitNamedVariables);
    }
  }
}

