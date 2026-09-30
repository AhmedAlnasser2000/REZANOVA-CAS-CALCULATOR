import { complexAbs } from '../../numeric/complex';
import type { GraphExpressionIR } from '../contracts';
import { compileGraphExpression, createGraphExpressionEvaluator, GraphExpressionPlanCache } from '../evaluator';
import { compileGraphCondition } from '../sampling/condition';
import { compileGraphComplexPlan } from '../evaluator/complex-plan';
import { findGraphPlaneRoots } from '../sampling/complex-plane-newton';
import { solveGraphComplexRoots } from '../sampling/complex-roots';
import type { PtxRealFunction, PtxSolverPort } from './solver-port';

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

function usesSymbol(node: unknown, symbol: string): boolean {
  return node === symbol || (Array.isArray(node) && node.slice(1).some((child) => usesSymbol(child, symbol)));
}

export const currentPtxSolverPort: PtxSolverPort = {
  id: 'graphing-current',
  realFunction,
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
