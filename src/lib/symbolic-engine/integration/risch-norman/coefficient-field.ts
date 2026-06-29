import {
  addSymbolicCoefficients,
  divideSymbolicCoefficients,
  isSymbolicCoefficientOne,
  isSymbolicCoefficientZero,
  mergeSymbolicCoefficientFacts,
  multiplySymbolicCoefficients,
  negateSymbolicCoefficient,
  oneSymbolicCoefficient,
  parseSymbolicCoefficient,
  subtractSymbolicCoefficients,
  symbolicCoefficientFact,
  zeroSymbolicCoefficient,
  type SymbolicCoefficient,
  type SymbolicCoefficientFact,
  type SymbolicCoefficientParseResult,
  type SymbolicCoefficientStopReason,
} from '../../primitives/coefficient-domain';

export type RischNormanCoefficientStopReason = SymbolicCoefficientStopReason;
export type RischNormanCoefficientFact = SymbolicCoefficientFact;
export type RischNormanCoefficient = SymbolicCoefficient;
export type RischNormanCoefficientParseResult = SymbolicCoefficientParseResult;

export const coefficientFact = symbolicCoefficientFact;
export const mergeRischNormanCoefficientFacts = mergeSymbolicCoefficientFacts;
export const parseRischNormanCoefficient = parseSymbolicCoefficient;
export const zeroRischNormanCoefficient = zeroSymbolicCoefficient;
export const oneRischNormanCoefficient = oneSymbolicCoefficient;
export const isRischNormanCoefficientZero = isSymbolicCoefficientZero;
export const isRischNormanCoefficientOne = isSymbolicCoefficientOne;
export const negateRischNormanCoefficient = negateSymbolicCoefficient;
export const addRischNormanCoefficients = addSymbolicCoefficients;
export const subtractRischNormanCoefficients = subtractSymbolicCoefficients;
export const multiplyRischNormanCoefficients = multiplySymbolicCoefficients;
export const divideRischNormanCoefficients = divideSymbolicCoefficients;
