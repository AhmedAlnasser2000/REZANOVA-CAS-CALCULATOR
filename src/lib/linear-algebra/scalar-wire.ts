import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  ExactScalarWire,
  LinearAlgebraExactComplexRational,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  LinearAlgebraSubstitutionMode,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';
import { normalizeExplicitNamedVariablesInLatex } from '../algebra/named-variable';
import { parseStoredVariableValue } from '../algebra/variable-memory';
import { validateSerializableMathJson } from '../display/printer';
import { findCustomMathJsonOperator } from '../result-contract/proven-answer-mathjson';

export type {
  LinearAlgebraExactComplexRational,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  LinearAlgebraSubstitutionMode,
} from '../../types/calculator';

export type LinearAlgebraScalarParseResult =
  | { ok: true; value: LinearAlgebraScalarWireV1 }
  | { ok: false; error: string };

export type LinearAlgebraResolvedScalar = {
  source: LinearAlgebraScalarWireV1;
  resolved: LinearAlgebraScalarWireV1;
  substitutions: VariableSubstitutionSnapshot[];
  protectedSubstitutions: VariableSubstitutionSnapshot[];
};

const ce = new ComputeEngine();
const standardOperatorCe = new ComputeEngine();
const ZERO: ExactScalarWire = { numerator: 0, denominator: 1 };
const ONE: ExactScalarWire = { numerator: 1, denominator: 1 };

const STANDARD_STRUCTURAL_OPERATORS = new Set([
  'Complex',
  'Dictionary',
  'Error',
  'List',
  'Matrix',
  'Set',
  'Tuple',
  'Which',
]);

const NON_SCALAR_OPERATORS = new Set([
  'And',
  'Dictionary',
  'Equal',
  'Greater',
  'GreaterEqual',
  'Less',
  'LessEqual',
  'List',
  'Matrix',
  'NotEqual',
  'Or',
  'Set',
  'Tuple',
  'Which',
]);

function gcd(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function normalizeExact(value: ExactScalarWire): ExactScalarWire | null {
  if (!Number.isSafeInteger(value.numerator) || !Number.isSafeInteger(value.denominator) || value.denominator === 0) {
    return null;
  }
  if (value.numerator === 0) return { ...ZERO };
  const sign = value.denominator < 0 ? -1 : 1;
  const numerator = value.numerator * sign;
  const denominator = Math.abs(value.denominator);
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

function addExact(left: ExactScalarWire, right: ExactScalarWire) {
  return normalizeExact({
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
}

function multiplyExact(left: ExactScalarWire, right: ExactScalarWire) {
  return normalizeExact({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  });
}

function negateExact(value: ExactScalarWire): ExactScalarWire {
  return { numerator: -value.numerator, denominator: value.denominator };
}

function divideExact(left: ExactScalarWire, right: ExactScalarWire) {
  return right.numerator === 0
    ? null
    : normalizeExact({
        numerator: left.numerator * right.denominator,
        denominator: left.denominator * right.numerator,
      });
}

function exactRationalFromMathJson(node: unknown): ExactScalarWire | null {
  if (typeof node === 'number' && Number.isSafeInteger(node)) {
    return { numerator: node, denominator: 1 };
  }
  if (!Array.isArray(node) || typeof node[0] !== 'string') return null;
  if (node[0] === 'Rational' && node.length === 3) {
    return typeof node[1] === 'number' && typeof node[2] === 'number'
      ? normalizeExact({ numerator: node[1], denominator: node[2] })
      : null;
  }
  if (node[0] === 'Negate' && node.length === 2) {
    const value = exactRationalFromMathJson(node[1]);
    return value ? negateExact(value) : null;
  }
  if ((node[0] === 'Divide' || node[0] === 'Multiply') && node.length === 3) {
    const left = exactRationalFromMathJson(node[1]);
    const right = exactRationalFromMathJson(node[2]);
    if (!left || !right) return null;
    return node[0] === 'Divide' ? divideExact(left, right) : multiplyExact(left, right);
  }
  if (node[0] === 'Add' && node.length >= 2) {
    let total = { ...ZERO };
    for (const part of node.slice(1)) {
      const value = exactRationalFromMathJson(part);
      if (!value) return null;
      const next = addExact(total, value);
      if (!next) return null;
      total = next;
    }
    return total;
  }
  return null;
}

function addComplex(
  left: LinearAlgebraExactComplexRational,
  right: LinearAlgebraExactComplexRational,
): LinearAlgebraExactComplexRational | null {
  const re = addExact(left.re, right.re);
  const im = addExact(left.im, right.im);
  return re && im ? { re, im } : null;
}

function multiplyComplex(
  left: LinearAlgebraExactComplexRational,
  right: LinearAlgebraExactComplexRational,
): LinearAlgebraExactComplexRational | null {
  const ac = multiplyExact(left.re, right.re);
  const bd = multiplyExact(left.im, right.im);
  const ad = multiplyExact(left.re, right.im);
  const bc = multiplyExact(left.im, right.re);
  if (!ac || !bd || !ad || !bc) return null;
  const re = addExact(ac, negateExact(bd));
  const im = addExact(ad, bc);
  return re && im ? { re, im } : null;
}

function divideComplex(
  left: LinearAlgebraExactComplexRational,
  right: LinearAlgebraExactComplexRational,
): LinearAlgebraExactComplexRational | null {
  const c2 = multiplyExact(right.re, right.re);
  const d2 = multiplyExact(right.im, right.im);
  const denominator = c2 && d2 ? addExact(c2, d2) : null;
  if (!denominator || denominator.numerator === 0) return null;
  const ac = multiplyExact(left.re, right.re);
  const bd = multiplyExact(left.im, right.im);
  const bc = multiplyExact(left.im, right.re);
  const ad = multiplyExact(left.re, right.im);
  if (!ac || !bd || !bc || !ad) return null;
  const numeratorRe = addExact(ac, bd);
  const numeratorIm = addExact(bc, negateExact(ad));
  const re = numeratorRe ? divideExact(numeratorRe, denominator) : null;
  const im = numeratorIm ? divideExact(numeratorIm, denominator) : null;
  return re && im ? { re, im } : null;
}

function exactComplexFromMathJson(node: unknown): LinearAlgebraExactComplexRational | null {
  const rational = exactRationalFromMathJson(node);
  if (rational) return { re: rational, im: { ...ZERO } };
  if (node === 'ImaginaryUnit') return { re: { ...ZERO }, im: { ...ONE } };
  if (!Array.isArray(node) || typeof node[0] !== 'string') return null;
  if (node[0] === 'Complex' && node.length === 3) {
    const re = exactRationalFromMathJson(node[1]);
    const im = exactRationalFromMathJson(node[2]);
    return re && im ? { re, im } : null;
  }
  if (node[0] === 'Negate' && node.length === 2) {
    const value = exactComplexFromMathJson(node[1]);
    return value
      ? { re: negateExact(value.re), im: negateExact(value.im) }
      : null;
  }
  if (node[0] === 'Add' && node.length >= 2) {
    let total: LinearAlgebraExactComplexRational = { re: { ...ZERO }, im: { ...ZERO } };
    for (const part of node.slice(1)) {
      const value = exactComplexFromMathJson(part);
      if (!value) return null;
      const next = addComplex(total, value);
      if (!next) return null;
      total = next;
    }
    return total;
  }
  if (node[0] === 'Multiply' && node.length >= 2) {
    let total: LinearAlgebraExactComplexRational = { re: { ...ONE }, im: { ...ZERO } };
    for (const part of node.slice(1)) {
      const value = exactComplexFromMathJson(part);
      if (!value) return null;
      const next = multiplyComplex(total, value);
      if (!next) return null;
      total = next;
    }
    return total;
  }
  if (node[0] === 'Divide' && node.length === 3) {
    const left = exactComplexFromMathJson(node[1]);
    const right = exactComplexFromMathJson(node[2]);
    return left && right ? divideComplex(left, right) : null;
  }
  if (node[0] === 'Conjugate' && node.length === 2) {
    const value = exactComplexFromMathJson(node[1]);
    return value ? { re: value.re, im: negateExact(value.im) } : null;
  }
  return null;
}

function containsOperator(node: unknown, operators: ReadonlySet<string>): boolean {
  if (!Array.isArray(node)) return false;
  if (typeof node[0] === 'string' && operators.has(node[0])) return true;
  return node.slice(1).some((part) => containsOperator(part, operators));
}

function containsImaginaryValue(node: unknown): boolean {
  if (node === 'ImaginaryUnit') return true;
  if (!Array.isArray(node)) return false;
  if (node[0] === 'Complex' && node.length === 3) {
    const imaginary = exactRationalFromMathJson(node[2]);
    if (!imaginary || imaginary.numerator !== 0) return true;
  }
  return node.slice(1).some(containsImaginaryValue);
}

function normalizeScalarMathJson(node: unknown): unknown {
  if (!Array.isArray(node) || typeof node[0] !== 'string') return node;
  const [operator, ...rawOperands] = node;
  const operands = rawOperands.map(normalizeScalarMathJson);
  if (operator === 'Complex' && operands.length === 2) {
    return ['Add', operands[0], ['Multiply', operands[1], 'ImaginaryUnit']];
  }
  if (operator === 'OverBar' || operator === 'Superstar' || operator === 'conj') {
    return ['Conjugate', operands[0]];
  }
  if (
    !STANDARD_STRUCTURAL_OPERATORS.has(operator)
    && standardOperatorCe.lookupDefinition(operator) === undefined
  ) {
    return ['Apply', operator, ...operands];
  }
  return [operator, ...operands];
}

function errorOperator(node: unknown): string | undefined {
  if (!Array.isArray(node) || typeof node[0] !== 'string') return undefined;
  if (node[0] === 'Error') return 'Error';
  for (const child of node.slice(1)) {
    const found = errorOperator(child);
    if (found) return found;
  }
  return undefined;
}

export function linearAlgebraScalarWireFromMathJson(
  mathJson: unknown,
  domain: LinearAlgebraScalarDomain,
): LinearAlgebraScalarParseResult {
  const normalizedJson = normalizeScalarMathJson(mathJson);
  if (errorOperator(normalizedJson)) {
    return { ok: false, error: 'This scalar expression could not be parsed.' };
  }
  if (containsOperator(normalizedJson, NON_SCALAR_OPERATORS)) {
    return { ok: false, error: 'Matrix and Vector cells accept one scalar expression.' };
  }
  if (domain === 'real' && containsImaginaryValue(normalizedJson)) {
    return { ok: false, error: 'The imaginary unit i requires Complex mode.' };
  }

  const validation = validateSerializableMathJson(normalizedJson);
  if (!validation.ok) return { ok: false, error: validation.failure.message };
  const customOperator = findCustomMathJsonOperator(validation.validated.value);
  if (customOperator) {
    return { ok: false, error: `Unsupported scalar operator ${customOperator}.` };
  }

  const canonicalLatex = ce.box(validation.validated.value, { form: 'structural' }).latex;
  const exactComplexRational = exactComplexFromMathJson(validation.validated.value) ?? undefined;
  const exactRational = exactComplexRational?.im.numerator === 0
    ? exactComplexRational.re
    : undefined;
  return {
    ok: true,
    value: {
      version: 1,
      canonicalLatex,
      mathJson: validation.validated.value,
      ...(exactRational ? { exactRational } : {}),
      ...(exactComplexRational ? { exactComplexRational } : {}),
    },
  };
}

export function cloneLinearAlgebraScalarWire(
  wire: LinearAlgebraScalarWireV1,
): LinearAlgebraScalarWireV1 {
  return structuredClone(wire);
}

export function parseLinearAlgebraScalarWire(
  latex: string,
  domain: LinearAlgebraScalarDomain,
): LinearAlgebraScalarParseResult {
  const trimmed = latex.trim();
  if (!trimmed) return { ok: false, error: 'Enter a scalar expression.' };

  try {
    const normalizedNamed = normalizeExplicitNamedVariablesInLatex(trimmed);
    const parsed = ce.parse(normalizedNamed.latex, { canonical: false } as never);
    return linearAlgebraScalarWireFromMathJson(parsed.json, domain);
  } catch {
    return { ok: false, error: 'This scalar expression could not be parsed.' };
  }
}

function sameExactValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function linearAlgebraScalarWireIntegrityError(
  wire: LinearAlgebraScalarWireV1,
): string | null {
  const rebuilt = linearAlgebraScalarWireFromMathJson(wire.mathJson, 'complex');
  if (!rebuilt.ok) return rebuilt.error;
  if (rebuilt.value.canonicalLatex !== wire.canonicalLatex) {
    return 'Scalar canonical LaTeX must match its MathJSON value.';
  }
  if (wire.exactRational && !sameExactValue(wire.exactRational, rebuilt.value.exactRational)) {
    return 'Scalar exact rational metadata must match its MathJSON value.';
  }
  if (
    wire.exactComplexRational
    && !sameExactValue(wire.exactComplexRational, rebuilt.value.exactComplexRational)
  ) {
    return 'Scalar exact complex metadata must match its MathJSON value.';
  }
  return null;
}

export function linearAlgebraScalarWireFromNumber(value: number): LinearAlgebraScalarWireV1 {
  if (!Number.isFinite(value)) throw new RangeError('Linear Algebra scalar values must be finite.');
  const parsed = parseLinearAlgebraScalarWire(`${value}`, 'real');
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

export function linearAlgebraScalarWireToFiniteReal(
  wire: LinearAlgebraScalarWireV1,
): number | null {
  if (wire.exactRational) {
    return wire.exactRational.numerator / wire.exactRational.denominator;
  }
  try {
    const value = ce.box(wire.mathJson).N().json;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function uniqueSnapshots(entries: readonly VariableSubstitutionSnapshot[]) {
  const byName = new Map<string, VariableSubstitutionSnapshot>();
  for (const entry of entries) byName.set(entry.name, { ...entry });
  return [...byName.values()];
}

function substituteStoredValuesInMathJson(
  node: unknown,
  replacements: ReadonlyMap<string, unknown>,
  protectedNames: ReadonlySet<string>,
  availableNames: ReadonlySet<string>,
  usedNames: Set<string>,
  protectedHits: Set<string>,
): unknown {
  if (typeof node === 'string') {
    if (availableNames.has(node) && protectedNames.has(node)) {
      protectedHits.add(node);
      return node;
    }
    if (replacements.has(node)) {
      usedNames.add(node);
      return structuredClone(replacements.get(node));
    }
    return node;
  }
  if (!Array.isArray(node)) return structuredClone(node);
  const [operator, ...operands] = node;
  if (operator === 'Apply') {
    return [
      operator,
      operands[0],
      ...operands.slice(1).map((operand) => substituteStoredValuesInMathJson(
        operand,
        replacements,
        protectedNames,
        availableNames,
        usedNames,
        protectedHits,
      )),
    ];
  }
  return [
    operator,
    ...operands.map((operand) => substituteStoredValuesInMathJson(
      operand,
      replacements,
      protectedNames,
      availableNames,
      usedNames,
      protectedHits,
    )),
  ];
}

export function resolveLinearAlgebraScalarWire(input: {
  wire: LinearAlgebraScalarWireV1;
  domain: LinearAlgebraScalarDomain;
  mode: LinearAlgebraSubstitutionMode;
  storedVariables?: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[];
  protectedNames?: readonly string[];
}): LinearAlgebraResolvedScalar | { error: string } {
  if (input.mode === 'symbolic') {
    return {
      source: cloneLinearAlgebraScalarWire(input.wire),
      resolved: cloneLinearAlgebraScalarWire(input.wire),
      substitutions: [],
      protectedSubstitutions: [],
    };
  }
  const usableEntries = (input.storedVariables ?? []).filter((entry) =>
    Number.isFinite(entry.numericValue));
  const protectedNames = new Set(input.protectedNames ?? []);
  const availableNames = new Set(usableEntries.map((entry) => entry.name));
  const replacements = new Map<string, unknown>();
  for (const entry of usableEntries) {
    if (protectedNames.has(entry.name)) continue;
    const parsedValue = parseStoredVariableValue(entry.valueLatex);
    replacements.set(entry.name, parsedValue.ok ? parsedValue.value.json : entry.numericValue);
  }
  const usedNames = new Set<string>();
  const protectedHits = new Set<string>();
  const substitutedMathJson = substituteStoredValuesInMathJson(
    input.wire.mathJson,
    replacements,
    protectedNames,
    availableNames,
    usedNames,
    protectedHits,
  );
  const parsed = linearAlgebraScalarWireFromMathJson(substitutedMathJson, input.domain);
  if (!parsed.ok) return { error: parsed.error };
  const snapshot = (names: ReadonlySet<string>) => usableEntries
    .filter((entry) => names.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      valueLatex: entry.valueLatex,
      numericValue: entry.numericValue,
    }));
  return {
    source: cloneLinearAlgebraScalarWire(input.wire),
    resolved: parsed.value,
    substitutions: uniqueSnapshots(snapshot(usedNames)),
    protectedSubstitutions: uniqueSnapshots(snapshot(protectedHits)),
  };
}
