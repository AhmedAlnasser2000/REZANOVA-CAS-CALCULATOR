import { describe, expect, it } from 'vitest';
import type { GraphSourceV1 } from '../contracts';
import { classifyGraphSource } from './source';

function source(sourceLatex: string, sourceRevision = 0): GraphSourceV1 {
  return { sourceKind: 'mathlive-latex', sourceLatex, sourceRevision };
}

function relation(sourceLatex: string) {
  const result = classifyGraphSource(source(sourceLatex));
  expect(result.ok).toBe(true);
  if (!result.ok || result.itemKind !== 'relation') {
    throw new Error(`Expected Graph relation for ${sourceLatex}.`);
  }
  return result.relation;
}

describe('Graph MathLive source classifier', () => {
  it('retains the authored source envelope unchanged as round-trip provenance', () => {
    const authored = source('\\sin(x)', 7);
    const snapshot = structuredClone(authored);
    expect(classifyGraphSource(authored)).toMatchObject({ ok: true, itemKind: 'relation' });
    expect(authored).toEqual(snapshot);
  });

  it.each([
    ['x', 'x', ['x']],
    ['\\sin(x)', ['Sin', 'x'], ['x']],
    ['3', 3, []],
    ['a\\sin(x)', ['Multiply', 'a', ['Sin', 'x']], ['a', 'x']],
  ])('normalizes bare %s to explicit-y without requiring y=', (latex, mathJson, freeSymbols) => {
    expect(relation(latex)).toEqual({
      kind: 'explicit-y',
      origin: 'bare-expression',
      rhs: { mathJson, freeSymbols },
    });
  });

  it('classifies authored explicit and implicit Cartesian relations', () => {
    expect(relation('y=x^2')).toMatchObject({
      kind: 'explicit-y',
      origin: 'authored-relation',
      rhs: { mathJson: ['Power', 'x', 2], freeSymbols: ['x'] },
    });
    expect(relation('x=y^2')).toMatchObject({
      kind: 'explicit-x',
      rhs: { mathJson: ['Power', 'y', 2], freeSymbols: ['y'] },
    });
    expect(relation('x^2+y^2=9')).toMatchObject({
      kind: 'implicit-equality',
      left: { freeSymbols: ['x', 'y'] },
      right: { mathJson: 9, freeSymbols: [] },
    });
    expect(relation('y=y^2+x')).toMatchObject({ kind: 'implicit-equality' });
  });

  it('preserves inequality semantics including mixed strict/inclusive chains', () => {
    expect(relation('y>x')).toMatchObject({
      kind: 'inequality',
      operator: '>',
      left: { mathJson: 'y' },
      right: { mathJson: 'x' },
    });
    expect(relation('-1<x<1')).toMatchObject({
      kind: 'chained-inequality',
      operators: ['<', '<'],
    });
    expect(relation('0<x\\le1')).toMatchObject({
      kind: 'chained-inequality',
      operators: ['<', '<='],
      operands: [
        { mathJson: 0 },
        { mathJson: 'x' },
        { mathJson: 1 },
      ],
    });
    expect(relation('0\\le x<1')).toMatchObject({
      kind: 'chained-inequality',
      operators: ['<=', '<'],
    });
    expect(relation('1>x\\ge0')).toMatchObject({
      kind: 'chained-inequality',
      operators: ['>', '>='],
    });
  });

  it('keeps ambiguous bare coordinate expressions as controlled drafts', () => {
    expect(classifyGraphSource(source('y'))).toEqual({
      ok: false,
      stopReason: {
        code: 'ambiguous-bare-expression',
        detailCode: 'bare-y-or-mixed-cartesian',
        path: '$',
      },
    });
    expect(classifyGraphSource(source('x+y'))).toMatchObject({
      ok: false,
      stopReason: { code: 'ambiguous-bare-expression' },
    });
    expect(classifyGraphSource(source('\\theta'))).toMatchObject({
      ok: false,
      stopReason: { code: 'ambiguous-bare-expression', detailCode: 'bare-polar-coordinate' },
    });
  });

  it('classifies polar radius relations without mixing coordinate systems', () => {
    expect(relation('r=2\\cos(2\\theta)')).toMatchObject({
      kind: 'polar-radius',
      angleSymbol: 'theta',
      radius: {
        mathJson: ['Multiply', 2, ['Cos', ['Multiply', 2, 'theta']]],
        freeSymbols: ['theta'],
      },
    });
    expect(classifyGraphSource(source('r=x'))).toMatchObject({
      ok: false,
      stopReason: { code: 'coordinate-parameter-conflict' },
    });
  });

  it('classifies shorthand and explicitly declared parametric curves', () => {
    expect(relation('(t,t^2)')).toMatchObject({
      kind: 'parametric-curve',
      parameterSymbol: 't',
      x: { mathJson: 't', freeSymbols: ['t'] },
      y: { mathJson: ['Power', 't', 2], freeSymbols: ['t'] },
    });
    expect(relation('(x(u),y(u))=(\\cos(u),\\sin(u))')).toMatchObject({
      kind: 'parametric-curve',
      parameterSymbol: 'u',
      x: { mathJson: ['Cos', 'u'] },
      y: { mathJson: ['Sin', 'u'] },
    });
  });

  it('classifies points and point sets separately from parametric tuples', () => {
    expect(classifyGraphSource(source('(1,2)'))).toEqual({
      ok: true,
      itemKind: 'point-set',
      points: [{ x: 1, y: 2 }],
    });
    expect(classifyGraphSource(source('\\{(1,2),(3,4)\\}'))).toEqual({
      ok: true,
      itemKind: 'point-set',
      points: [{ x: 1, y: 2 }, { x: 3, y: 4 }],
    });
    expect(classifyGraphSource(source('(x,2)'))).toMatchObject({
      ok: false,
      stopReason: { code: 'coordinate-parameter-conflict', detailCode: 'point-coordinate-conflict' },
    });
  });

  it('classifies direct and bare piecewise entry through one structured authority', () => {
    const explicit = classifyGraphSource(source(
      'y=\\begin{cases}x^2&x<0\\\\\\sqrt{x}&x\\ge0\\end{cases}',
    ));
    expect(explicit).toMatchObject({
      ok: true,
      itemKind: 'piecewise',
      piecewise: {
        version: 1,
        branches: [
          {
            branchId: 'branch.1',
            relation: { kind: 'explicit-y', origin: 'authored-relation' },
            condition: { kind: 'comparison', operator: '<' },
          },
          {
            branchId: 'branch.2',
            relation: { kind: 'explicit-y', origin: 'authored-relation' },
            condition: { kind: 'comparison', operator: '>=' },
          },
        ],
      },
    });

    const bare = classifyGraphSource(source(
      '\\begin{cases}x^2&x<0\\\\1&\\text{otherwise}\\end{cases}',
    ));
    expect(bare).toMatchObject({
      ok: true,
      itemKind: 'piecewise',
      piecewise: {
        branches: [{ relation: { kind: 'explicit-y', origin: 'bare-expression' } }],
        otherwise: { kind: 'explicit-y', origin: 'bare-expression' },
      },
    });
  });

  it.each([
    ['a:=2', 'unsafe-expression', 'Assign'],
    ['\\operatorname{evil}(x)', 'unsupported-operator', 'evil'],
    ['f(x)', 'unsupported-operator', 'f'],
    ['\\sum_{n=1}^{10}n', 'unsafe-expression', 'Sum'],
    ['x\\ne y', 'unsupported-relation', 'unsupported-top-level-NotEqual'],
    ['x=y=1', 'unsupported-relation', 'equality-chain'],
    ['a=2', 'unsupported-relation', 'scalar-equality'],
    ['0<x>-1', 'unsupported-relation', 'non-monotone-comparison-chain'],
  ])('rejects unsupported source %s without inventing authority', (latex, code, detailCode) => {
    expect(classifyGraphSource(source(latex))).toMatchObject({
      ok: false,
      stopReason: { code, detailCode },
    });
  });

  it('rejects empty, incomplete, and oversized source before downstream work', () => {
    expect(classifyGraphSource(source(''))).toMatchObject({
      ok: false,
      stopReason: { detailCode: 'empty-source' },
    });
    expect(classifyGraphSource(source('\\frac{1}{'))).toMatchObject({
      ok: false,
      stopReason: { detailCode: 'incomplete-or-invalid-source' },
    });
    expect(classifyGraphSource(source('x'.repeat(8_193)))).toMatchObject({
      ok: false,
      stopReason: { code: 'expression-budget-exceeded', detailCode: 'source-length' },
    });
  });
});
