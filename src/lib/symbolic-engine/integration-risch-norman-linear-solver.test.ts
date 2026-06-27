import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import { solveRischNormanLinearSystemFromNodes } from './integration/risch-norman/linear-solver';

const ce = new ComputeEngine();

function node(latex: string) {
  return ce.parse(latex).json;
}

function nodes(rows: string[][]) {
  return rows.map((row) => row.map(node));
}

function rhs(entries: string[]) {
  return entries.map(node);
}

function solve(matrix: string[][], constants: string[], variable = 'x', maxSize?: number) {
  return solveRischNormanLinearSystemFromNodes(nodes(matrix), rhs(constants), variable, maxSize);
}

function compact(value: string) {
  return value.replace(/\s+/g, '');
}

function factExpressions(result: ReturnType<typeof solve>) {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('expected solve success');
  }
  return result.facts.map((fact) => compact(fact.expressionLatex));
}

describe('Risch-Norman symbolic linear solver', () => {
  it('solves a symbolic 1x1 system and records the pivot fact', () => {
    const result = solve([['a']], ['b']);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected solve success');
    }
    expect(compact(result.solution[0].latex)).toBe('\\frac{b}{a}');
    expect(factExpressions(result)).toContain('a');
  });

  it('solves bounded triangular symbolic 2x2 systems', () => {
    const result = solve([
      ['a', 'b'],
      ['0', 'd'],
    ], ['e', 'f']);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected solve success');
    }
    expect(compact(result.solution[1].latex)).toBe('\\frac{f}{d}');
    expect(factExpressions(result)).toEqual(expect.arrayContaining(['a', 'd']));
  });

  it('solves bounded symbolic 3x3 systems', () => {
    const result = solve([
      ['a', '0', '0'],
      ['0', 'b', '0'],
      ['0', '0', 'c'],
    ], ['d', 'g', 'f']);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected solve success');
    }
    expect(result.solution.map((entry) => compact(entry.latex))).toEqual([
      '\\frac{d}{a}',
      '\\frac{g}{b}',
      '\\frac{f}{c}',
    ]);
    expect(factExpressions(result)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('keeps exact numeric pivots exact without tautological facts', () => {
    const result = solve([
      ['2', '0'],
      ['0', '3'],
    ], ['4', '9']);

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('expected solve success');
    }
    expect(result.solution.map((entry) => compact(entry.latex))).toEqual(['2', '3']);
    expect(result.facts).toEqual([]);
  });

  it('stops cleanly for singular and non-square systems', () => {
    expect(solve([
      ['1', '2'],
      ['2', '4'],
    ], ['3', '6'])).toMatchObject({
      kind: 'stop',
      reason: 'singular-system',
    });

    expect(solve([
      ['1', '2', '3'],
      ['4', '5', '6'],
    ], ['7', '8'])).toMatchObject({
      kind: 'stop',
      reason: 'non-square-system',
    });
  });

  it('surfaces coefficient-scope and cap stops before solving', () => {
    expect(solve([['x+a']], ['b'])).toMatchObject({
      kind: 'stop',
      reason: 'coefficient-stop',
      coefficientReason: 'selected-variable-dependent-coefficient',
    });

    expect(solve([
      ['1', '0', '0'],
      ['0', '1', '0'],
      ['0', '0', '1'],
    ], ['a', 'b', 'c'], 'x', 2)).toMatchObject({
      kind: 'stop',
      reason: 'over-cap-size',
    });
  });
});
