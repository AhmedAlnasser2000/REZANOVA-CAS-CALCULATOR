import { describe, expect, it } from 'vitest';
import { context } from '../test-support';
import { ExpressionStore } from './expression';
import { readExpression, readRelations, writeExpression, writeRelation, type ReadResult } from './mathjson';
import { relationProblem } from './relation';
import { decodeExpression, decodeProblem, encodeExpression, encodeProblem } from './wire';

const ok = <T>(r: ReadResult<T>): T => { if (r.kind !== 'ok') throw new Error(JSON.stringify(r)); return r.value; };

describe('MathJSON reader', () => {
  it('reads equations from the old baseline', () => {
    const s = new ExpressionStore(context()), x = s.symbol('x');
    const nestedAbs = ok(readRelations(s, ['Equal', ['Abs', ['Subtract', ['Abs', ['Subtract', 'x', 1]], 2]], 3]));
    expect(nestedAbs).toEqual([{ op: 'eq', lhs: s.abs(s.sub(s.abs(s.sub(x, s.integer(1))), s.integer(2))), rhs: s.integer(3) }]);
    const exponential = ok(readRelations(s, ['Equal', ['Add', ['Exp', ['Multiply', 2, 'x']], ['Negate', ['Multiply', 5, ['Power', 'ExponentialE', 'x']]], 6], 0]));
    expect(exponential[0].lhs).toBe(s.add(s.exp(s.mul(s.integer(2), x)), s.mul(s.integer(-5), s.exp(x)), s.integer(6)));
    const trig = ok(readRelations(s, ['Equal', ['Sin', ['Cos', 'x']], ['Rational', 1, 2]]));
    expect(trig[0]).toEqual({ op: 'eq', lhs: s.sin(s.cos(x)), rhs: s.fraction(1, 2) });
    const chain = ok(readRelations(s, ['Less', 0, 'x', { num: '3.5' }]));
    expect(chain).toEqual([{ op: 'lt', lhs: s.integer(0), rhs: x }, { op: 'lt', lhs: x, rhs: s.fraction(7, 2) }]);
    expect(ok(readRelations(s, ['And', ['GreaterEqual', 'x', 1], ['NotEqual', 'x', 2]]))).toHaveLength(2);
  });

  it('reads the elementary vocabulary', () => {
    const s = new ExpressionStore(context()), x = s.symbol('x');
    const cases: [unknown, number][] = [
      [['Divide', 'x', 'x'], s.div(x, x)],
      [['Sqrt', ['Square', 'x']], s.sqrt(s.pow(x, s.integer(2)))],
      [['Root', 'x', 3], s.root(x, 3)],
      [['Log', 'x'], s.logBase(x, s.integer(10))],
      [['Log', 'x', 2], s.logBase(x, s.integer(2))],
      [['Lb', 'x'], s.logBase(x, s.integer(2))],
      [['Ln', ['Exp', 'x']], s.log(s.exp(x))],
      [['Arctan', ['Tan', 'x']], s.atan(s.tan(x))],
      [['Arcsin', 'x'], s.asin(x)], [['Arccos', 'x'], s.acos(x)],
      [['Sec', 'x'], s.pow(s.cos(x), s.integer(-1))],
      [['Cot', 'x'], s.div(s.cos(x), s.sin(x))],
      [['Cosh', 'x'], s.div(s.add(s.exp(x), s.exp(s.neg(x))), s.integer(2))],
      [['Multiply', 'Pi', 'ImaginaryUnit'], s.mul(s.constant('pi'), s.constant('i'))],
      [['Delimiter', ['Add', 'x', 1]], s.add(x, s.integer(1))],
      [{ fn: ['Subtract', { sym: 'x' }, 1, 2] }, s.sub(x, s.integer(3))],
      [{ num: '0.(3)' }, s.fraction(1, 3)],
      [{ num: '-1.25e-2' }, s.fraction(-1, 80)],
      [0.1, s.fraction(1, 10)],
      [{ num: '123456789012345678901234567890' }, s.integer('123456789012345678901234567890')],
      [['Add', ['Rational', 1, 2], ['Rational', 1, 3]], s.fraction(5, 6)],
    ];
    for (const [json, expected] of cases) expect(ok(readExpression(s, json)), JSON.stringify(json)).toBe(expected);
  });

  it('reports unknown heads and constants as unsupported, malformed input as invalid', () => {
    const s = new ExpressionStore(context());
    expect(readExpression(s, ['Zeta', 'x'])).toEqual({ kind: 'unsupported', head: 'Zeta', reason: 'MathJSON head Zeta is not supported' });
    expect(readExpression(s, ['Add', 'x', ['Gamma', 'x']])).toMatchObject({ kind: 'unsupported', head: 'Gamma' });
    expect(readExpression(s, ['Add', 'x', 'Infinity'])).toMatchObject({ kind: 'unsupported', head: 'Infinity' });
    expect(readExpression(s, { num: 'NaN' })).toMatchObject({ kind: 'unsupported' });
    expect(readExpression(s, ['Equal', 'x', 1])).toMatchObject({ kind: 'unsupported', head: 'Equal' });
    expect(readRelations(s, ['Element', 'x', 'Reals'])).toMatchObject({ kind: 'unsupported', head: 'Element' });
    expect(readExpression(s, ['Divide', 'x'])).toMatchObject({ kind: 'invalid' });
    expect(readExpression(s, ['Rational', 1, 0])).toMatchObject({ kind: 'invalid' });
    expect(readExpression(s, { num: '1.2.3' })).toMatchObject({ kind: 'invalid' });
    expect(readExpression(s, ['Sqrt'])).toMatchObject({ kind: 'invalid', reason: 'Sqrt expects 1 arguments, got 0' });
    expect(readExpression(s, ['Root', 'x', 1])).toEqual({ kind: 'ok', value: s.symbol('x') });
    expect(readRelations(s, ['Add', 'x', 1])).toMatchObject({ kind: 'invalid' });
    expect(readExpression(s, ['RootOf', ['List', -4, 0, 1], 0])).toMatchObject({ kind: 'invalid' });
  });

  it('reads deep nesting without recursion', () => {
    const s = new ExpressionStore(context());
    let json: unknown = 'x';
    for (let i = 0; i < 20_000; i++) json = ['Sin', json];
    const id = ok(readExpression(s, json));
    expect(s.height(id)).toBe(20_001);
  });

  it('round-trips through the writer and the wire', () => {
    const s = new ExpressionStore(context());
    const inputs: unknown[] = [
      ['Add', ['Exp', ['Multiply', 2, 'x']], ['Multiply', -5, ['Exp', 'x']], 6],
      ['Divide', ['Sin', 'x'], ['Power', 'x', ['Rational', 1, 3]]],
      ['Abs', ['Subtract', ['Abs', ['Subtract', 'x', 1]], 2]],
      ['Add', ['Sqrt', 2], ['Multiply', 'ImaginaryUnit', 'Pi'], { num: '98765432109876543210' }],
      ['Multiply', ['RootOf', ['List', -2, 0, 0, 1], 0], 'x'],
    ];
    for (const json of inputs) {
      const id = ok(readExpression(s, json));
      const written = writeExpression(s, id);
      expect(ok(readExpression(s, written))).toBe(id);
      expect(writeExpression(s, ok(readExpression(s, written)))).toEqual(written);
      const other = new ExpressionStore(context());
      other.symbol('unrelated');
      const decoded = decodeExpression(context(), JSON.parse(JSON.stringify(encodeExpression(s, id))), other);
      expect(writeExpression(other, decoded.id)).toEqual(written);
      expect(other.digest(decoded.id)).toBe(s.digest(id));
    }
    const relations = ok(readRelations(s, ['Greater', ['Ln', 'x'], 1]));
    const problem = relationProblem(s, { domain: 'real', targets: ['x'], relations });
    expect(writeRelation(s, problem.relations[0])).toEqual(['Less', 1, ['Ln', 'x']]);
    const back = decodeProblem(context(), JSON.parse(JSON.stringify(encodeProblem(problem))));
    expect(back.hash).toBe(problem.hash);
  });

  it('rejects malformed or noncanonical wire input', () => {
    const s = new ExpressionStore(context());
    const wire = JSON.parse(JSON.stringify(encodeExpression(s, s.add(s.symbol('x'), s.symbol('y'), s.integer(1)))));
    const extra = structuredClone(wire); extra.extra = 1;
    expect(() => decodeExpression(context(), extra)).toThrow(/record keys/);
    const unsorted = structuredClone(wire);
    const add = unsorted.nodes[unsorted.root];
    add[1] = [...add[1]].reverse();
    expect(() => decodeExpression(context(), unsorted)).toThrow(/noncanonical node/);
    const duplicate = structuredClone(wire); duplicate.nodes.push(duplicate.nodes[0]);
    expect(() => decodeExpression(context(), duplicate)).toThrow(/duplicate node/);
    const forward = structuredClone(wire); forward.nodes[0] = ['f', 'sin', 3];
    expect(() => decodeExpression(context(), forward)).toThrow(/node reference/);
    const unreduced = structuredClone(wire); unreduced.nodes = [['n', ['2', '4']]]; unreduced.root = 0;
    expect(() => decodeExpression(context(), unreduced)).toThrow(/noncanonical rational/);
    const reducible = { version: 1, kind: 'expression', nodes: [['r', ['-4', '0', '1'], 0]], root: 0 };
    expect(() => decodeExpression(context(), reducible)).toThrow(/minimal polynomial/);
  });
});
