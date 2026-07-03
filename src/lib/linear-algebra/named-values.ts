export type LinearAlgebraMatrixNamedValue = {
  id: string;
  name: string;
  value: number[][];
};

export type LinearAlgebraVectorNamedValue = {
  id: string;
  name: string;
  value: number[];
};

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

export function cloneMatrixNamedValues(
  values: readonly LinearAlgebraMatrixNamedValue[],
): LinearAlgebraMatrixNamedValue[] {
  return values.map((value) => ({
    id: value.id,
    name: value.name,
    value: cloneLinearAlgebraMatrix(value.value),
  }));
}

export function cloneVectorNamedValues(
  values: readonly LinearAlgebraVectorNamedValue[],
): LinearAlgebraVectorNamedValue[] {
  return values.map((value) => ({
    id: value.id,
    name: value.name,
    value: cloneLinearAlgebraVector(value.value),
  }));
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
