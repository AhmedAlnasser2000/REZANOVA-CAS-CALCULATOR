import { describe, expect, it } from 'vitest';
import { normalizeAst } from '../../normalize';
import {
  substituteCarrierPowerBasis,
  substituteMathJsonSubtree,
  substituteMathJsonSymbols,
} from './substitution';

function expectOk(result: ReturnType<typeof substituteCarrierPowerBasis>) {
  expect(result.kind).toBe('ok');
  if (result.kind !== 'ok') {
    throw new Error(`Expected substitution to succeed, got ${result.reason}`);
  }
  return result;
}

describe('substituteMathJsonSymbols', () => {
  it('substitutes symbols while preserving protected symbols', () => {
    const result = expectOk(substituteMathJsonSymbols(
      ['Add', 'x', 'a', ['Multiply', 'b', 'x']],
      { a: 2, b: ['Add', 'c', 1], x: 99 },
      { protectedSymbols: ['x'] },
    ));

    expect(result.node).toEqual(normalizeAst([
      'Add',
      'x',
      2,
      ['Multiply', ['Add', 'c', 1], 'x'],
    ]));
    expect(result.usedSubstitutions).toEqual(['a', 'b']);
    expect(result.protectedHits).toEqual(['x']);
  });
});

describe('substituteMathJsonSubtree', () => {
  it('replaces exact structural subtrees', () => {
    const carrier = ['Add', ['Power', 'x', 2], 'a'];
    const result = expectOk(substituteMathJsonSubtree(
      ['Subtract', ['Power', carrier, 2], carrier],
      carrier,
      'u',
      { id: 'carrier' },
    ));

    expect(result.node).toEqual(normalizeAst(['Subtract', ['Power', 'u', 2], 'u']));
    expect(result.usedSubstitutions).toEqual(['carrier']);
  });
});

describe('substituteCarrierPowerBasis', () => {
  it('reduces carrier powers to a symbolic power basis', () => {
    const carrier = ['Add', ['Power', 'x', 2], 'a'];
    const result = expectOk(substituteCarrierPowerBasis(
      ['Add', ['Power', carrier, 2], ['Multiply', -5, carrier], 4],
      { carrierNode: carrier, carrierSymbol: 'u' },
    ));

    expect(result.node).toEqual(normalizeAst(['Add', ['Power', 'u', 2], ['Multiply', -5, 'u'], 4]));
    expect(result.usedSubstitutions).toEqual(['u']);
  });

  it('reduces affine carrier powers by an explicit power step', () => {
    const carrier = ['Add', 'x', 'a'];
    const result = expectOk(substituteCarrierPowerBasis(
      ['Add', ['Power', carrier, 4], ['Multiply', -5, ['Power', carrier, 2]], 4],
      { carrierNode: carrier, carrierSymbol: 'u', powerStep: 2 },
    ));

    expect(result.node).toEqual(normalizeAst(['Add', ['Power', 'u', 2], ['Multiply', -5, 'u'], 4]));
  });

  it('preserves target-free symbolic coefficients around reduced carrier powers', () => {
    const carrier = ['Add', 'x', 'a'];
    const result = expectOk(substituteCarrierPowerBasis(
      ['Add', ['Power', carrier, 2], ['Multiply', 'b', carrier], 4],
      { carrierNode: carrier, carrierSymbol: 'u' },
    ));

    expect(result.node).toEqual(normalizeAst(['Add', ['Power', 'u', 2], ['Multiply', 'b', 'u'], 4]));
  });

  it('rejects non-integer and nonpositive carrier powers', () => {
    const carrier = ['Add', 'x', 'a'];
    const fractional = substituteCarrierPowerBasis(
      ['Power', carrier, 1.5],
      { carrierNode: carrier },
    );
    const zero = substituteCarrierPowerBasis(
      ['Power', carrier, 0],
      { carrierNode: carrier },
    );

    expect(fractional.kind).toBe('unsupported');
    expect(fractional.kind === 'unsupported' ? fractional.reason : null).toBe('non-integer-power');
    expect(zero.kind).toBe('unsupported');
    expect(zero.kind === 'unsupported' ? zero.reason : null).toBe('nonpositive-power');
  });

  it('rejects powers that are not divisible by the requested power step', () => {
    const carrier = ['Add', 'x', 'a'];
    const result = substituteCarrierPowerBasis(
      ['Power', carrier, 3],
      { carrierNode: carrier, powerStep: 2 },
    );

    expect(result.kind).toBe('unsupported');
    expect(result.kind === 'unsupported' ? result.reason : null).toBe('power-step-mismatch');
  });

  it('stops when the substitution result exceeds the node limit', () => {
    const result = substituteMathJsonSymbols(
      ['Add', 'x', 'a'],
      { a: ['Add', 1, 2, 3] },
      { maxNodeCount: 3 },
    );

    expect(result.kind).toBe('unsupported');
    expect(result.kind === 'unsupported' ? result.reason : null).toBe('node-limit');
  });
});
