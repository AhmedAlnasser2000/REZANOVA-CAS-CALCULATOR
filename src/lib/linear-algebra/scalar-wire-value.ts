import type { LinearAlgebraScalarWireV1 } from '../../types/calculator';

export function cloneLinearAlgebraScalarWire(
  wire: LinearAlgebraScalarWireV1,
): LinearAlgebraScalarWireV1 {
  return structuredClone(wire);
}

export function linearAlgebraScalarWireFromNumber(value: number): LinearAlgebraScalarWireV1 {
  if (!Number.isFinite(value)) throw new RangeError('Linear Algebra scalar values must be finite.');
  return {
    version: 1,
    canonicalLatex: `${value}`,
    mathJson: value,
    ...(Number.isSafeInteger(value)
      ? { exactRational: { numerator: value, denominator: 1 } }
      : {}),
  };
}

export function linearAlgebraScalarWireToFiniteReal(
  wire: LinearAlgebraScalarWireV1,
): number | null {
  if (wire.exactRational) {
    return wire.exactRational.numerator / wire.exactRational.denominator;
  }
  if (typeof wire.mathJson === 'number' && Number.isFinite(wire.mathJson)) {
    return wire.mathJson;
  }
  if (
    Array.isArray(wire.mathJson)
    && wire.mathJson[0] === 'Rational'
    && typeof wire.mathJson[1] === 'number'
    && typeof wire.mathJson[2] === 'number'
    && wire.mathJson[2] !== 0
  ) {
    const value = wire.mathJson[1] / wire.mathJson[2];
    return Number.isFinite(value) ? value : null;
  }
  return null;
}
