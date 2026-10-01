import { complexAbs } from '../../numeric/complex';
import type { GraphExpressionIR } from '../contracts';
import { compileGraphExpression, createGraphExpressionEvaluator, GraphExpressionPlanCache } from '../evaluator';
import { compileGraphCondition } from '../sampling/condition';
import { graphParametricDomain } from '../sampling/parametric';
import { graphPiecewiseForm } from '../sampling/piecewise';
import { compileGraphComplexPlan } from '../evaluator/complex-plan';
import { findGraphPlaneRoots } from '../sampling/complex-plane-newton';
import { solveGraphComplexRoots } from '../sampling/complex-roots';
import { exactGraphPolynomial, gIsZero, qDiv, qIsZero, qMul, qSub, qToNumber, type GraphExactPolynomial } from '../sampling/complex-polynomial';
import type { PtxCurve, PtxParamCurve } from './curves';
import type { PtxCurvePoint, PtxRealFunction, PtxSolverPort } from './solver-port';

// The current adapter: Graphing's own evaluators and root solvers (which reach
// Equation only through its reviewed public facade). Replace this file's
// factory, not PTX, when the rebuilt engine lands.

let planSerial = 0;

function realFunction(expression: GraphExpressionIR, variable: string, parameters: Readonly<Record<string, number>>): PtxRealFunction | null {
  const compiled = compileGraphExpression({ planId: `ptx.${planSerial += 1}`, sourceRevision: 0, expression });
  if (!compiled.ok) return null;
  const evaluator = createGraphExpressionEvaluator(compiled.plan);
  return (value) => {
    const result = evaluator.evaluate({ ...parameters, [variable]: value });
    return result.status === 'finite' ? result.value : undefined;
  };
}

function renameSymbol(node: unknown, from: string, to: string): unknown {
  if (node === from) return to;
  return Array.isArray(node) ? node.map((child, index) => (index === 0 ? child : renameSymbol(child, from, to))) : node;
}

function rationalLabelValue(label: string | null) {
  const match = label ? /^(−?)(\d+)(?:\/(\d+))?$/u.exec(label) : null;
  if (!match) return null;
  const value = Number(match[2]) / Number(match[3] ?? 1);
  return match[1] ? -value : value;
}

function substituteParameters(node: unknown, parameters: Readonly<Record<string, number>>): unknown {
  if (typeof node === 'string' && node in parameters) return parameters[node];
  return Array.isArray(node) ? node.map((child, index) => (index === 0 ? child : substituteParameters(child, parameters))) : node;
}

function usesSymbol(node: unknown, symbol: string): boolean {
  return node === symbol || (Array.isArray(node) && node.slice(1).some((child) => usesSymbol(child, symbol)));
}

function polarPoint(r: PtxRealFunction): PtxCurvePoint {
  return (theta) => {
    const radius = r(theta);
    return radius === undefined ? undefined : { x: radius * Math.cos(theta), y: radius * Math.sin(theta), radius };
  };
}

function paramCurve(point: PtxCurvePoint, rest: Omit<PtxParamCurve, 'kind' | 'point'>): PtxCurve {
  return { kind: 'param', point, ...rest };
}

export const currentPtxSolverPort: PtxSolverPort = {
  id: 'graphing-current',
  realFunction,
  rationalEndBehaviour(mathJson, variable, parameters) {
    const node = substituteParameters(mathJson, parameters);
    const [numeratorNode, denominatorNode] = Array.isArray(node) && node[0] === 'Divide' && node.length === 3 ? [node[1], node[2]] : [node, 1];
    const trim = (poly: GraphExactPolynomial | null) => {
      if (!poly || poly.some((coefficient) => !qIsZero(coefficient.im))) return null;
      const trimmed = [...poly]; while (trimmed.length > 1 && gIsZero(trimmed.at(-1)!)) trimmed.pop();
      return trimmed.map((coefficient) => coefficient.re);
    };
    const p = trim(exactGraphPolynomial(numeratorNode, variable)); const q = trim(exactGraphPolynomial(denominatorNode, variable));
    if (!p || !q || q.length === 0 || (q.length === 1 && qIsZero(q[0]!))) return null;
    const n = p.length - 1; const d = q.length - 1;
    // A polynomial (d = 0) is its own end behaviour, not an asymptote.
    if (d === 0) return null;
    if (n < d || (n === 0 && qIsZero(p[0]!))) return { kind: 'horizontal', y: 0 };
    if (n === d) return { kind: 'horizontal', y: qToNumber(qDiv(p[n]!, q[d]!)) };
    if (n === d + 1) {
      const slope = qDiv(p[n]!, q[d]!);
      const intercept = qDiv(qSub(p[n - 1]!, qMul(slope, q[d - 1]!)), q[d]!);
      return { kind: 'oblique', slope: qToNumber(slope), intercept: qToNumber(intercept) };
    }
    return { kind: 'none' };
  },
  curvePoint(relation, parameters) {
    if (relation.kind === 'polar-radius') {
      const r = realFunction(relation.radius, 'theta', parameters);
      return r ? (theta) => {
        const radius = r(theta);
        return radius === undefined ? undefined : { x: radius * Math.cos(theta), y: radius * Math.sin(theta), radius };
      } : null;
    }
    if (relation.kind !== 'parametric-curve') return null;
    const x = realFunction(relation.x, relation.parameterSymbol, parameters);
    const y = realFunction(relation.y, relation.parameterSymbol, parameters);
    return x && y ? (t) => {
      const px = x(t); const py = y(t);
      return px === undefined || py === undefined ? undefined : { x: px, y: py };
    } : null;
  },
  curve(source, parameters, window) {
    if ('piecewise' in source) {
      const form = graphPiecewiseForm(source.piecewise);
      const variable = form === 'explicit-y' ? 'x' : form === 'explicit-x' ? 'y' : form === 'polar' ? 'theta' : null;
      const f = variable ? currentPtxSolverPort.piecewiseFunction(source.piecewise, variable, parameters) : null;
      if (!f) return null;
      if (form === 'explicit-y') return { kind: 'graph', f };
      if (form === 'explicit-x') return { kind: 'graph-x', f };
      return paramCurve(polarPoint(f), { symbol: 'θ', tMin: 0, tMax: 2 * Math.PI, restricted: false, includesStart: true, includesEnd: true, radius: f, complex: false });
    }
    const relation = source.relation;
    if (relation.kind === 'explicit-y' || relation.kind === 'explicit-x') {
      const f = realFunction(relation.rhs, relation.kind === 'explicit-y' ? 'x' : 'y', parameters);
      return f ? { kind: relation.kind === 'explicit-y' ? 'graph' : 'graph-x', f } : null;
    }
    if (relation.kind === 'parametric-curve' || relation.kind === 'polar-radius') {
      const point = currentPtxSolverPort.curvePoint(relation, parameters);
      if (!point) return null;
      const domain = graphParametricDomain(relation, parameters);
      const radius = relation.kind === 'polar-radius' ? realFunction(relation.radius, 'theta', parameters) : null;
      return paramCurve(point, {
        symbol: relation.kind === 'polar-radius' ? 'θ' : relation.parameterSymbol, tMin: domain.minimum, tMax: domain.maximum,
        restricted: domain.restricted, includesStart: domain.includesMinimum, includesEnd: domain.includesMaximum, radius, complex: false,
      });
    }
    if (relation.kind === 'implicit-equality' || relation.kind === 'inequality') {
      const F = currentPtxSolverPort.planeFunction(relation.left, relation.right, parameters);
      return F ? { kind: 'implicit', F } : null;
    }
    if (relation.kind === 'complex-trajectory') {
      // z(t) with t real: evaluate as a function of z at z = t + 0i, and read (Re, Im) as the point.
      const f = currentPtxSolverPort.complexFunction(renameSymbol(relation.value.mathJson, relation.parameterSymbol, 'z'), parameters);
      if (!f) return null;
      const point: PtxCurvePoint = (t) => {
        const value = f({ re: t, im: 0 });
        return value && Number.isFinite(value.re) && Number.isFinite(value.im) ? { x: value.re, y: value.im } : undefined;
      };
      return paramCurve(point, { symbol: relation.parameterSymbol, tMin: window.xMin, tMax: window.xMax, restricted: false,
        includesStart: true, includesEnd: true, radius: null, complex: true });
    }
    return null;
  },
  regionEdges(relation, parameters) {
    const pairs = relation.kind === 'inequality' ? [{ left: relation.left, right: relation.right, operator: relation.operator }]
      : relation.kind === 'chained-inequality' ? relation.operators.map((operator, index) => ({
        left: relation.operands[index]!, right: relation.operands[index + 1]!, operator,
      })) : null;
    if (!pairs) return null;
    const edges = pairs.map((pair, index) => {
      const F = currentPtxSolverPort.planeFunction(pair.left, pair.right, parameters);
      return F ? { index, F, operator: pair.operator } : null;
    });
    return edges.every((edge) => edge !== null) ? edges as Array<NonNullable<(typeof edges)[number]>> : null;
  },
  piecewiseFunction(piecewise, variable, parameters) {
    const cache = new GraphExpressionPlanCache(4 * piecewise.branches.length + 4);
    const valueOf = (relation: (typeof piecewise.branches)[number]['relation']) => (
      relation.kind === 'explicit-y' || relation.kind === 'explicit-x' ? relation.rhs : relation.kind === 'polar-radius' ? relation.radius : null);
    const branches: Array<{ f: PtxRealFunction; test: (environment: Record<string, number>) => boolean | null }> = [];
    for (const branch of piecewise.branches) {
      const expression = valueOf(branch.relation);
      const f = expression ? realFunction(expression, variable, parameters) : null;
      const condition = compileGraphCondition({ condition: branch.condition, itemId: `ptx.${planSerial += 1}`, branchId: branch.branchId, sourceRevision: 0, cache });
      if (!f || !condition.ok) return null;
      branches.push({ f, test: condition.condition.test });
    }
    const otherwiseExpression = piecewise.otherwise ? valueOf(piecewise.otherwise) : null;
    const otherwise = otherwiseExpression ? realFunction(otherwiseExpression, variable, parameters) : null;
    if (piecewise.otherwise && !otherwise) return null;
    return (value) => {
      const environment = { ...parameters, [variable]: value };
      for (const branch of branches) if (branch.test(environment) === true) return branch.f(value);
      return otherwise ? otherwise(value) : undefined;
    };
  },
  planeFunction(left, right, parameters) {
    const difference = { mathJson: ['Add', left.mathJson, ['Negate', right.mathJson]], freeSymbols: [...new Set([...left.freeSymbols, ...right.freeSymbols])] } as GraphExpressionIR;
    const compiled = compileGraphExpression({ planId: `ptx.${planSerial += 1}`, sourceRevision: 0, expression: difference });
    if (!compiled.ok) return null;
    const evaluator = createGraphExpressionEvaluator(compiled.plan);
    return (x, y) => {
      const result = evaluator.evaluate({ ...parameters, x, y });
      return result.status === 'finite' ? result.value : undefined;
    };
  },
  complexFunction(mathJson, parameters) {
    const compiled = compileGraphComplexPlan(mathJson, parameters);
    return compiled.ok ? (z) => compiled.plan.evaluate(z) : null;
  },
  realPolynomialRoots(mathJson, variable, parameters) {
    // The exact complex polynomial solver works in z; a real polynomial's real roots are its roots with Im = 0.
    if (usesSymbol(mathJson, 'z') || usesSymbol(mathJson, 'ImaginaryUnit')) return null;
    const inZ = renameSymbol(mathJson, variable, 'z');
    const solution = solveGraphComplexRoots({
      left: { mathJson: inZ, freeSymbols: ['z'] } as GraphExpressionIR,
      right: { mathJson: 0, freeSymbols: [] } as GraphExpressionIR,
      parameters,
      viewport: { coordinateSystem: 'cartesian', xMin: -1, xMax: 1, yMin: -1, yMax: 1 },
    });
    if (!solution.complete) return null;
    // Exact roots in polar form (z^n = c) carry trig rounding in Im, so realness is judged with a tolerance;
    // a plain rational label gives the exact value back.
    return solution.roots
      .filter((root) => Math.abs(root.im) <= (root.exact ? 1e-12 : 1e-9) * Math.max(1, Math.abs(root.re)))
      .map((root) => ({ value: root.exact ? rationalLabelValue(root.label) ?? root.re : root.re, exact: root.exact,
        label: root.exact ? root.label : null, multiplicity: root.multiplicity }));
  },
  complexRoots: (input) => solveGraphComplexRoots(input),
  planeSystemRoots(first, second, window) {
    const found = findGraphPlaneRoots((z) => {
      const a = first(z.re, z.im); const b = second(z.re, z.im);
      return a === undefined || b === undefined ? null : { re: a, im: b };
    }, window);
    return found.filter((root) => root.re >= window.xMin && root.re <= window.xMax && root.im >= window.yMin && root.im <= window.yMax)
      .filter((root) => complexAbs({ re: first(root.re, root.im) ?? Infinity, im: second(root.re, root.im) ?? Infinity }) < 1e-9)
      .map((root) => ({ x: root.re, y: root.im }));
  },
};

/** The adapter PTX uses unless a caller passes another. */
export function defaultPtxSolverPort(): PtxSolverPort {
  return currentPtxSolverPort;
}
