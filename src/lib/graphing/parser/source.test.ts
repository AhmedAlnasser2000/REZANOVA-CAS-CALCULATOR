import { describe, expect, it } from 'vitest';
import type { GraphSourceV1 } from '../contracts';
import { classifyGraphSource } from './source';

function source(sourceLatex: string, sourceRevision = 0): GraphSourceV1 {
  return { sourceKind: 'mathlive-latex', sourceLatex, sourceRevision };
}

function classifySource(sourceLatex: string) {
  return classifyGraphSource(source(sourceLatex));
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

  it('requires explicit z=f(x,y) authoring for real surfaces', () => {
    expect(relation('z=x^2+y^2')).toMatchObject({
      kind: 'real-surface',
      z: { mathJson: ['Add', ['Power', 'x', 2], ['Power', 'y', 2]], freeSymbols: ['x', 'y'] },
    });
    expect(classifyGraphSource(source('x^2+y^2'))).toMatchObject({
      ok: false,
      stopReason: { code: 'ambiguous-bare-expression' },
    });
  });

  it('keeps complex mappings, Argand trajectories, and real x-functions distinct', () => {
    expect(relation('f(z)=z^2')).toMatchObject({
      kind: 'complex-mapping', inputSymbol: 'z', outputSymbol: 'f', authoredForm: 'function',
      expression: { mathJson: ['Power', 'z', 2], freeSymbols: ['z'] },
    });
    expect(relation(String.raw`w=\frac{1}{z}`)).toMatchObject({
      kind: 'complex-mapping', outputSymbol: 'w', authoredForm: 'output-relation',
    });
    expect(relation(String.raw`\exp(z)`)).toMatchObject({ kind: 'complex-mapping', authoredForm: 'bare-expression' });
    expect(relation(String.raw`f(t)=\exp(it)`)).toMatchObject({ kind: 'complex-trajectory', parameterSymbol: 't' });
    expect(relation(String.raw`\ln(-x)`)).toMatchObject({ kind: 'explicit-y', rhs: { freeSymbols: ['x'] } });
    expect(relation(String.raw`\sqrt{-x}`)).toMatchObject({ kind: 'explicit-y', rhs: { freeSymbols: ['x'] } });
  });

  it.each([
    [String.raw`|z-1|=2`, ['='], 'Abs'],
    [String.raw`|z-1|=|z+i|`, ['='], 'Abs'],
    [String.raw`\operatorname{Re}(z^2)=1`, ['='], 'Real'],
    [String.raw`\Re(z)=1`, ['='], 'Real'],
    [String.raw`\Im(z)>0`, ['>'], 'ImaginaryPart'],
    [String.raw`\arg(z)=\frac{\pi}{4}`, ['='], 'Arg'],
    [String.raw`|z|<2`, ['<'], 'Abs'],
    [String.raw`1<|z|\le 2`, ['<', '<='], 'Abs'],
  ])('classifies %s as a complex locus', (latex, operators, carrier) => {
    const locus = relation(latex);
    expect(locus.kind).toBe('complex-locus');
    if (locus.kind !== 'complex-locus') throw new Error('Expected a complex locus.');
    expect(locus.clauses.map((clause) => clause.operator)).toEqual(operators);
    expect(JSON.stringify(locus.clauses)).toContain(`"${carrier}"`);
  });

  it.each([String.raw`z^2+z=3`, 'z^3=1', String.raw`e^z=2`, 'z=1+i', 'z=2i', String.raw`\overline{z}=z^2`])(
    'classifies %s as complex roots',
    (latex) => {
      expect(relation(latex)).toMatchObject({ kind: 'complex-roots' });
    },
  );

  it('keeps z = real number and z = f(x, y) as surfaces', () => {
    expect(relation('z=2')).toMatchObject({ kind: 'real-surface' });
    expect(relation('z=x^2-y^2')).toMatchObject({ kind: 'real-surface' });
  });

  it.each([
    ['|z|=z', 'complex-mixed-sides'],
    ['z<1', 'complex-inequality-not-real'],
    [String.raw`z^2>|z|`, 'complex-inequality-not-real'],
  ])('rejects %s with guidance', (latex, detailCode) => {
    expect(classifySource(latex)).toMatchObject({ ok: false, stopReason: { detailCode } });
  });

  it.each(['zx=y', 'y=zx', 'x=z+1', 'x^2+z=y', 'y<zx', 'x<z<y', 'z=z+x'])(
    'rejects z mixed with real coordinates in %s instead of treating z as a parameter',
    (latex) => {
      expect(classifyGraphSource(source(latex))).toMatchObject({
        ok: false,
        stopReason: { code: 'coordinate-parameter-conflict', detailCode: 'complex-mapping-coordinate-conflict' },
      });
    },
  );

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
    expect(relation('r=2\\cos(2\\theta)\\{0\\le\\theta\\le\\pi\\}')).toMatchObject({
      kind: 'polar-radius',
      domain: {
        kind: 'chain',
        operators: ['<=', '<='],
        operands: [{ mathJson: 0 }, { mathJson: 'theta' }, { mathJson: 'Pi' }],
      },
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
    expect(relation('(\\cos(t),\\sin(t))\\{-1\\le t\\le1\\}')).toMatchObject({
      kind: 'parametric-curve',
      parameterSymbol: 't',
      domain: {
        kind: 'chain',
        operators: ['<=', '<='],
      },
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

  it('classifies finite scalar definitions as graph-local parameters', () => {
    expect(classifyGraphSource(source('a=2'))).toMatchObject({
      ok: true,
      itemKind: 'parameter-definition',
      symbol: 'a',
      value: { mathJson: 2, freeSymbols: [] },
    });
    expect(classifyGraphSource(source('a=\\pi/2'))).toMatchObject({
      ok: true,
      itemKind: 'parameter-definition',
      symbol: 'a',
      value: { freeSymbols: [] },
    });
    expect(classifyGraphSource(source('a=b+1'))).toMatchObject({
      ok: false,
      stopReason: { code: 'unsupported-relation', detailCode: 'dependent-parameter-definition' },
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

  it('classifies restriction braces, polar piecewise, or and ≠ conditions (PIECEWISE-CORE1)', () => {
    const kinds = (latex: string) => {
      const result = classifySource(latex);
      if (!result.ok) return `fail:${result.stopReason.detailCode}`;
      if (result.itemKind === 'piecewise') return `piecewise:${result.piecewise.branches.map((branch) => `${branch.relation.kind}/${branch.condition.kind}`).join(',')}`;
      return result.itemKind === 'relation' ? `relation:${result.relation.kind}` : result.itemKind;
    };
    expect(kinds(String.raw`x^2\{x>0\}`)).toBe('piecewise:explicit-y/comparison');
    expect(kinds(String.raw`y=x^2\{x>0\}`)).toBe('piecewise:explicit-y/comparison');
    expect(kinds(String.raw`x=y^2\{y>0\}`)).toBe('piecewise:explicit-x/comparison');
    expect(kinds(String.raw`x^2\{x\ne1\}`)).toBe('piecewise:explicit-y/not-equal');
    expect(kinds(String.raw`(\cos t,\sin t)\{0<t<\pi\}`)).toBe('relation:parametric-curve');
    expect(kinds(String.raw`r=\begin{cases}1&\theta<1\\2&\theta\ge1\end{cases}`)).toBe('piecewise:polar-radius/comparison,polar-radius/comparison');
    expect(kinds(String.raw`\begin{cases}1&x<-1\lor x>1\\0&\text{otherwise}\end{cases}`)).toBe('piecewise:explicit-y/or');
    expect(kinds(String.raw`x^2+y^2=1\{x>0\}`)).toBe('fail:domain-restriction-route');
    expect(kinds(String.raw`y=\begin{cases}(t,t)&x<0\\1&x\ge0\end{cases}`)).toBe('fail:piecewise-parametric-branch');
    expect(kinds(String.raw`y=x^2\{y>0\}`)).toBe('fail:piecewise-condition-coordinate-conflict');
  });
});
