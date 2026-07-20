import type {
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraScalarMatrixNamedValue,
  LinearAlgebraScalarWireV1,
  LinearAlgebraScalarVectorNamedValue,
  LinearAlgebraVectorNamedValue,
} from '../../types/calculator';
import {
  cloneLinearAlgebraScalarWire,
  linearAlgebraScalarWireFromNumber,
  linearAlgebraScalarWireToFiniteReal,
} from './scalar-wire-value';

export type {
  LinearAlgebraMatrixNamedValue,
  LinearAlgebraNumericMatrixNamedValue,
  LinearAlgebraNumericVectorNamedValue,
  LinearAlgebraScalarMatrixNamedValue,
  LinearAlgebraScalarVectorNamedValue,
  LinearAlgebraVectorNamedValue,
} from '../../types/calculator';

export const DEFAULT_MATRIX_LEFT_ID = 'matrix-a';
export const DEFAULT_MATRIX_RIGHT_ID = 'matrix-b';
export const DEFAULT_VECTOR_LEFT_ID = 'vector-u';
export const DEFAULT_VECTOR_RIGHT_ID = 'vector-v';

const MATRIX_NAME_ORDER = 'ABCDEFGHIJKLMNOPQRSTUVWYZ'.split('');
const VECTOR_NAME_ORDER = [
  'u',
  'v',
  'p',
  'q',
  'r',
  's',
  'w',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  't',
  'x',
  'y',
  'z',
];

export function cloneLinearAlgebraMatrix(matrix: readonly (readonly number[])[]) {
  return matrix.map((row) => [...row]);
}

export function cloneLinearAlgebraVector(vector: readonly number[]) {
  return [...vector];
}

export function isScalarMatrixNamedValue(
  value: LinearAlgebraMatrixNamedValue,
): value is LinearAlgebraScalarMatrixNamedValue {
  return value.encoding === 'scalar-v1';
}

export function isScalarVectorNamedValue(
  value: LinearAlgebraVectorNamedValue,
): value is LinearAlgebraScalarVectorNamedValue {
  return value.encoding === 'scalar-v1';
}

export function cloneLinearAlgebraScalarMatrix(
  matrix: readonly (readonly LinearAlgebraScalarWireV1[])[],
) {
  return matrix.map((row) => row.map(cloneLinearAlgebraScalarWire));
}

export function cloneLinearAlgebraScalarVector(
  vector: readonly LinearAlgebraScalarWireV1[],
) {
  return vector.map(cloneLinearAlgebraScalarWire);
}

export function scalarMatrixFromNumeric(matrix: readonly (readonly number[])[]) {
  return matrix.map((row) => row.map(linearAlgebraScalarWireFromNumber));
}

export function scalarVectorFromNumeric(vector: readonly number[]) {
  return vector.map(linearAlgebraScalarWireFromNumber);
}

export function numericMatrixFromNamedValue(value: LinearAlgebraMatrixNamedValue) {
  if (!isScalarMatrixNamedValue(value)) return cloneLinearAlgebraMatrix(value.value);
  const matrix = value.value.map((row) => row.map(linearAlgebraScalarWireToFiniteReal));
  return matrix.some((row) => row.some((cell) => cell === null))
    ? null
    : matrix as number[][];
}

export function numericVectorFromNamedValue(value: LinearAlgebraVectorNamedValue) {
  if (!isScalarVectorNamedValue(value)) return cloneLinearAlgebraVector(value.value);
  const vector = value.value.map(linearAlgebraScalarWireToFiniteReal);
  return vector.some((cell) => cell === null) ? null : vector as number[];
}

export function matrixNamedValueCellLatex(
  value: LinearAlgebraMatrixNamedValue,
  row: number,
  column: number,
) {
  const cell = value.value[row]?.[column];
  return typeof cell === 'number' ? `${cell}` : cell?.canonicalLatex ?? '0';
}

export function vectorNamedValueCellLatex(value: LinearAlgebraVectorNamedValue, index: number) {
  const cell = value.value[index];
  return typeof cell === 'number' ? `${cell}` : cell?.canonicalLatex ?? '0';
}

export function withMatrixNamedValueScalarCell(
  value: LinearAlgebraMatrixNamedValue,
  row: number,
  column: number,
  scalarValue: LinearAlgebraScalarWireV1,
): LinearAlgebraScalarMatrixNamedValue {
  const source = isScalarMatrixNamedValue(value)
    ? cloneLinearAlgebraScalarMatrix(value.value)
    : scalarMatrixFromNumeric(value.value);
  source[row] ??= [];
  source[row][column] = cloneLinearAlgebraScalarWire(scalarValue);
  return { id: value.id, name: value.name, encoding: 'scalar-v1', value: source };
}

export function withVectorNamedValueScalarCell(
  value: LinearAlgebraVectorNamedValue,
  index: number,
  scalarValue: LinearAlgebraScalarWireV1,
): LinearAlgebraScalarVectorNamedValue {
  const source = isScalarVectorNamedValue(value)
    ? cloneLinearAlgebraScalarVector(value.value)
    : scalarVectorFromNumeric(value.value);
  source[index] = cloneLinearAlgebraScalarWire(scalarValue);
  return { id: value.id, name: value.name, encoding: 'scalar-v1', value: source };
}

export function resizeMatrixNamedValue(
  value: LinearAlgebraMatrixNamedValue,
  rows: number,
  columns: number,
): LinearAlgebraMatrixNamedValue {
  if (!isScalarMatrixNamedValue(value)) {
    return {
      ...value,
      value: Array.from({ length: rows }, (_, rowIndex) =>
        Array.from({ length: columns }, (_, columnIndex) => value.value[rowIndex]?.[columnIndex] ?? 0)),
    };
  }
  return {
    ...value,
    value: Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: columns }, (_, columnIndex) =>
        cloneLinearAlgebraScalarWire(
          value.value[rowIndex]?.[columnIndex] ?? linearAlgebraScalarWireFromNumber(0),
        ))),
  };
}

export function resizeVectorNamedValue(
  value: LinearAlgebraVectorNamedValue,
  length: number,
): LinearAlgebraVectorNamedValue {
  if (!isScalarVectorNamedValue(value)) {
    return { ...value, value: Array.from({ length }, (_, index) => value.value[index] ?? 0) };
  }
  return {
    ...value,
    value: Array.from({ length }, (_, index) =>
      cloneLinearAlgebraScalarWire(value.value[index] ?? linearAlgebraScalarWireFromNumber(0))),
  };
}

export function cloneMatrixNamedValues(
  values: readonly LinearAlgebraMatrixNamedValue[],
): LinearAlgebraMatrixNamedValue[] {
  return values.map((value) => isScalarMatrixNamedValue(value)
    ? {
        id: value.id,
        name: value.name,
        encoding: 'scalar-v1',
        value: cloneLinearAlgebraScalarMatrix(value.value),
      }
    : {
        id: value.id,
        name: value.name,
        value: cloneLinearAlgebraMatrix(value.value),
      });
}

export function cloneVectorNamedValues(
  values: readonly LinearAlgebraVectorNamedValue[],
): LinearAlgebraVectorNamedValue[] {
  return values.map((value) => isScalarVectorNamedValue(value)
    ? {
        id: value.id,
        name: value.name,
        encoding: 'scalar-v1',
        value: cloneLinearAlgebraScalarVector(value.value),
      }
    : {
        id: value.id,
        name: value.name,
        value: cloneLinearAlgebraVector(value.value),
      });
}

export function isValidMatrixValueName(name: string) {
  return /^[A-WYZ]$/.test(name);
}

export function isValidVectorValueName(name: string) {
  return /^[a-z]$/.test(name);
}

function normalizeName(name: string) {
  return name.trim();
}

export function normalizeMatrixValueName(name: string) {
  return normalizeName(name).toUpperCase();
}

export function normalizeVectorValueName(name: string) {
  return normalizeName(name).toLowerCase();
}

export function matrixNamedValueNames(values?: readonly LinearAlgebraMatrixNamedValue[]) {
  return values?.map((value) => value.name) ?? ['A', 'B'];
}

export function vectorNamedValueNames(values?: readonly LinearAlgebraVectorNamedValue[]) {
  return values?.map((value) => value.name) ?? ['u', 'v'];
}

export function isMatrixNamedValueName(
  name: string,
  values?: readonly LinearAlgebraMatrixNamedValue[] | readonly string[],
) {
  const names = values && values.length > 0
    ? values.map((value) => (typeof value === 'string' ? value : value.name))
    : ['A', 'B'];
  return names.includes(name);
}

export function isVectorNamedValueName(
  name: string,
  values?: readonly LinearAlgebraVectorNamedValue[] | readonly string[],
) {
  const names = values && values.length > 0
    ? values.map((value) => (typeof value === 'string' ? value : value.name))
    : ['u', 'v'];
  return names.includes(name);
}

export function nextMatrixValueName(values: readonly LinearAlgebraMatrixNamedValue[], preferred = 'C') {
  const used = new Set(values.map((value) => value.name));
  const normalizedPreferred = normalizeMatrixValueName(preferred);
  if (isValidMatrixValueName(normalizedPreferred) && !used.has(normalizedPreferred)) {
    return normalizedPreferred;
  }
  return MATRIX_NAME_ORDER.find((name) => !used.has(name)) ?? null;
}

export function nextVectorValueName(values: readonly LinearAlgebraVectorNamedValue[], preferred = 'p') {
  const used = new Set(values.map((value) => value.name));
  const normalizedPreferred = normalizeVectorValueName(preferred);
  if (isValidVectorValueName(normalizedPreferred) && !used.has(normalizedPreferred)) {
    return normalizedPreferred;
  }
  return VECTOR_NAME_ORDER.find((name) => !used.has(name)) ?? null;
}

export function matrixValueById(
  values: readonly LinearAlgebraMatrixNamedValue[],
  id: string,
) {
  return values.find((value) => value.id === id) ?? null;
}

export function vectorValueById(
  values: readonly LinearAlgebraVectorNamedValue[],
  id: string,
) {
  return values.find((value) => value.id === id) ?? null;
}

export function matrixValueByName(
  values: readonly LinearAlgebraMatrixNamedValue[] | undefined,
  name: string,
) {
  return values?.find((value) => value.name === name) ?? null;
}

export function vectorValueByName(
  values: readonly LinearAlgebraVectorNamedValue[] | undefined,
  name: string,
) {
  return values?.find((value) => value.name === name) ?? null;
}
