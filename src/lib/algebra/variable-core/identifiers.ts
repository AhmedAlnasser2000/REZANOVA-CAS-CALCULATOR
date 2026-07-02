import { isValidNamedVariableName } from '../named-variable';
import type { VariableIdentifierKind } from './types';

const RESERVED_CONSTANTS = new Set([
  'Pi',
  'ExponentialE',
  'Infinity',
  'NaN',
  'Nothing',
  'True',
  'False',
]);

export const RESERVED_UNITS = new Set([
  'ImaginaryUnit',
  'i',
]);

export const RESERVED_FUNCTION_OPERATORS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Sec',
  'Csc',
  'Cot',
  'Arcsin',
  'Arccos',
  'Arctan',
  'Sinh',
  'Cosh',
  'Tanh',
  'Ln',
  'Log',
  'Sqrt',
  'Root',
  'Abs',
]);

const GREEK_SYMBOL_NAMES = new Set([
  'alpha',
  'beta',
  'gamma',
  'delta',
  'epsilon',
  'zeta',
  'eta',
  'theta',
  'iota',
  'kappa',
  'lambda',
  'mu',
  'nu',
  'xi',
  'omicron',
  'rho',
  'sigma',
  'tau',
  'upsilon',
  'phi',
  'chi',
  'psi',
  'omega',
]);

const LATEX_COMMANDS_WITH_LITERAL_TEXT_ARGUMENT = new Set([
  '\\begin',
  '\\end',
  '\\mathbb',
  '\\mathcal',
  '\\mathbf',
  '\\mathfrak',
  '\\mathit',
  '\\mathrm',
  '\\mathsf',
  '\\mathtt',
  '\\operatorname',
  '\\text',
]);

export function compareIdentifierNames(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function shouldCopyLiteralCommandArgument(command: string) {
  return LATEX_COMMANDS_WITH_LITERAL_TEXT_ARGUMENT.has(command);
}

export function classifySymbolName(
  name: string,
  explicitNamedVariables: ReadonlySet<string> = new Set(),
): VariableIdentifierKind {
  if (explicitNamedVariables.has(name)) {
    return isValidNamedVariableName(name) ? 'named-variable' : 'unsupported-symbol';
  }

  if (RESERVED_CONSTANTS.has(name)) {
    return 'reserved-constant';
  }

  if (RESERVED_UNITS.has(name)) {
    return 'reserved-unit';
  }

  if (/^[A-Za-z]$/.test(name) || GREEK_SYMBOL_NAMES.has(name)) {
    return 'single-symbol-variable';
  }

  if (/^[A-Za-z]_[A-Za-z0-9]+$/.test(name)) {
    return 'indexed-symbol-variable';
  }

  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    return 'named-string-variable';
  }

  return 'unsupported-symbol';
}
