import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatNumber, numberToLatex } from '../format';
import { evaluateAdvancedIndefiniteIntegral } from './integrals';
import { solveOdeNumeric } from '../tauri';
import type {
  FirstOrderOdeState,
  NumericIvpState,
  NumericOdePoint,
  NumericOdeRequest,
  NumericOdeResponse,
  SecondOrderOdeState,
} from '../../types/calculator';

const ce = new ComputeEngine();

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
};

export type AdvancedOdeEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: 'symbolic' | 'numeric-fallback';
};

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isFiniteNumber(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node);
}

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) {
    return true;
  }

  if (!isNodeArray(node)) {
    return false;
  }

  return node.some((child, index) => index > 0 && dependsOnVariable(child, variable));
}

function buildRustExpression(node: unknown): string | undefined {
  if (typeof node === 'number') {
    return `${node}`;
  }

  if (node === 'x' || node === 'y') {
    return node;
  }

  if (!isNodeArray(node)) {
    return undefined;
  }

  const [head, ...args] = node;

  if (head === 'Add') {
    const parts = args.map(buildRustExpression);
    return parts.every(Boolean) ? `(${parts.join('+')})` : undefined;
  }

  if (head === 'Multiply') {
    const parts = args.map(buildRustExpression);
    return parts.every(Boolean) ? `(${parts.join('*')})` : undefined;
  }

  if (head === 'Divide' && args.length === 2) {
    const left = buildRustExpression(args[0]);
    const right = buildRustExpression(args[1]);
    return left && right ? `((${left})/(${right}))` : undefined;
  }

  if (head === 'Power' && args.length === 2) {
    if (args[0] === 'ExponentialE') {
      const exponent = buildRustExpression(args[1]);
      return exponent ? `exp(${exponent})` : undefined;
    }

    const base = buildRustExpression(args[0]);
    const exponent = buildRustExpression(args[1]);
    return base && exponent ? `pow(${base},${exponent})` : undefined;
  }

  if (head === 'Sin' && args.length === 1) {
    const value = buildRustExpression(args[0]);
    return value ? `sin(${value})` : undefined;
  }

  if (head === 'Cos' && args.length === 1) {
    const value = buildRustExpression(args[0]);
    return value ? `cos(${value})` : undefined;
  }

  if (head === 'Tan' && args.length === 1) {
    const value = buildRustExpression(args[0]);
    return value ? `tan(${value})` : undefined;
  }

  if ((head === 'Ln' || head === 'Log') && args.length === 1) {
    const value = buildRustExpression(args[0]);
    return value ? `${head === 'Ln' ? 'ln' : 'log'}(${value})` : undefined;
  }

  if (head === 'Sqrt' && args.length === 1) {
    const value = buildRustExpression(args[0]);
    return value ? `sqrt(${value})` : undefined;
  }

  if (head === 'Abs' && args.length === 1) {
    const value = buildRustExpression(args[0]);
    return value ? `abs(${value})` : undefined;
  }

  return undefined;
}

function toNumericRequest(state: NumericIvpState): NumericOdeRequest | undefined {
  const x0 = Number(state.x0);
  const y0 = Number(state.y0);
  const xEnd = Number(state.xEnd);
  const step = Number(state.step);
  if (![x0, y0, xEnd, step].every(Number.isFinite) || step <= 0) {
    return undefined;
  }

  const parsed = ce.parse(state.bodyLatex.trim()) as BoxedLike;
  const expression = buildRustExpression(parsed.json);
  if (!expression) {
    return undefined;
  }

  return {
    expression,
    x0,
    y0,
    xEnd,
    step,
    method: state.method,
  };
}

function rk4Fallback(request: NumericOdeRequest): NumericOdeResponse {
  const expression = request.expression;
  const evaluate = (x: number, y: number) => {
    const scope = { x, y };
    const fn = Function('scope', `with (Math) { const { x, y } = scope; return ${expression}; }`);
    const value = fn(scope) as number;
    return Number.isFinite(value) ? value : undefined;
  };

  const samples: NumericOdePoint[] = [{ x: request.x0, y: request.y0 }];
  const direction = request.xEnd >= request.x0 ? 1 : -1;
  const step = Math.abs(request.step) * direction;
  let x = request.x0;
  let y = request.y0;

  while ((direction > 0 && x < request.xEnd - 1e-12) || (direction < 0 && x > request.xEnd + 1e-12)) {
    const h = Math.abs(request.xEnd - x) < Math.abs(step) ? request.xEnd - x : step;
    const k1 = evaluate(x, y);
    const k2 = k1 === undefined ? undefined : evaluate(x + h / 2, y + (h * k1) / 2);
    const k3 = k2 === undefined ? undefined : evaluate(x + h / 2, y + (h * k2) / 2);
    const k4 = k3 === undefined ? undefined : evaluate(x + h, y + h * k3);
    if ([k1, k2, k3, k4].some((value) => value === undefined)) {
      return {
        finalX: x,
        finalY: y,
        samples,
        warnings: [],
        error: 'The numeric ODE solver encountered a non-finite step.',
      };
    }

    y += (h / 6) * ((k1 as number) + 2 * (k2 as number) + 2 * (k3 as number) + (k4 as number));
    x += h;
    samples.push({ x, y });
  }

  return {
    finalX: x,
    finalY: y,
    samples,
    warnings: ['Web preview uses a local RK4 fallback instead of the Rust ODE solver.'],
  };
}

function parseLinearConstantRhs(node: unknown): { a: number; b: number } | undefined {
  if (node === 'y') {
    return { a: 1, b: 0 };
  }

  if (typeof node === 'number') {
    return { a: 0, b: node };
  }

  if (!isNodeArray(node)) {
    return undefined;
  }

  if (node[0] === 'Add' && node.length === 3) {
    const left = parseLinearConstantRhs(node[1]);
    const right = parseLinearConstantRhs(node[2]);
    if (!left || !right) {
      return undefined;
    }
    return { a: left.a + right.a, b: left.b + right.b };
  }

  if (node[0] === 'Multiply' && node.length === 3) {
    if (isFiniteNumber(node[1]) && node[2] === 'y') {
      return { a: node[1], b: 0 };
    }
    if (isFiniteNumber(node[2]) && node[1] === 'y') {
      return { a: node[2], b: 0 };
    }
  }

  return undefined;
}

function parseSeparableRhs(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = node.slice(1);
  const yCount = factors.filter((factor) => factor === 'y').length;
  if (yCount !== 1) {
    return undefined;
  }

  const xFactors = factors.filter((factor) => factor !== 'y');
  if (xFactors.some((factor) => dependsOnVariable(factor, 'y'))) {
    return undefined;
  }

  const body = xFactors.length === 1 ? xFactors[0] : ['Multiply', ...xFactors];
  return box(body).latex;
}

export function solveFirstOrderOde(state: FirstOrderOdeState): AdvancedOdeEvaluation {
  const rhsLatex = state.rhsLatex.trim();
  if (!rhsLatex) {
    return {
      warnings: [],
      error: 'Enter the right-hand side before solving the ODE.',
    };
  }

  const rhs = ce.parse(rhsLatex) as BoxedLike;

  if (state.classification === 'separable') {
    const xFactorLatex = parseSeparableRhs(rhs.json);
    if (!xFactorLatex) {
      return {
        warnings: [],
        error: 'This separable ODE is outside the supported Advanced Calc rules.',
      };
    }

    const integral = evaluateAdvancedIndefiniteIntegral({ bodyLatex: xFactorLatex });
    if (integral.error || !integral.exactLatex) {
      return {
        warnings: integral.warnings,
        error: 'This separable ODE is outside the supported Advanced Calc rules.',
      };
    }

    return {
      exactLatex: `y=C\\,e^{${wrapExpExponent(integral.exactLatex)}}`,
      warnings: [],
      resultOrigin: 'symbolic',
    };
  }

  if (state.classification === 'linear') {
    const linear = parseLinearConstantRhs(rhs.json);
    if (!linear) {
      return {
        warnings: [],
        error: 'This first-order linear ODE is outside the supported Advanced Calc rules.',
      };
    }

    if (linear.a === 0) {
      return {
        exactLatex: `y=${numberToLatex(linear.b)}x+C`,
        warnings: [],
        resultOrigin: 'symbolic',
      };
    }

    const offset = linear.b === 0 ? '' : `${numberToLatex(-linear.b / linear.a)}`;
    const homogeneous = `Ce^{${numberToLatex(linear.a)}x}`;
    return {
      exactLatex: offset ? `y=${homogeneous}+${offset}` : `y=${homogeneous}`,
      warnings: [],
      resultOrigin: 'symbolic',
    };
  }

  if (!dependsOnVariable(rhs.json, 'y')) {
    const integral = evaluateAdvancedIndefiniteIntegral({ bodyLatex: rhsLatex });
    if (!integral.error && integral.exactLatex) {
      return {
        exactLatex: `y=${integral.exactLatex}+C`,
        warnings: [],
        resultOrigin: 'symbolic',
      };
    }
  }

  return {
    warnings: [],
    error: 'This exact ODE workflow is outside the supported Advanced Calc rules.',
  };
}

function wrapExpExponent(latex: string) {
  return /^[-+]?\w+$/.test(latex) ? latex : `\\left(${latex}\\right)`;
}

function homogeneousSecondOrderLatex(a2: number, a1: number, a0: number) {
  const discriminant = a1 ** 2 - 4 * a2 * a0;
  if (Math.abs(discriminant) < 1e-10) {
    const root = -a1 / (2 * a2);
    return `\\left(C_1+C_2x\\right)e^{${numberToLatex(root)}x}`;
  }

  if (discriminant > 0) {
    const sqrt = Math.sqrt(discriminant);
    const r1 = (-a1 + sqrt) / (2 * a2);
    const r2 = (-a1 - sqrt) / (2 * a2);
    return `C_1e^{${numberToLatex(r1)}x}+C_2e^{${numberToLatex(r2)}x}`;
  }

  const alpha = -a1 / (2 * a2);
  const beta = Math.sqrt(-discriminant) / (2 * a2);
  return `e^{${numberToLatex(alpha)}x}\\left(C_1\\cos\\left(${numberToLatex(beta)}x\\right)+C_2\\sin\\left(${numberToLatex(beta)}x\\right)\\right)`;
}

function parseExpForcing(latex: string) {
  const match = latex.replace(/\s+/g, '').match(/^([+-]?\d+(?:\.\d+)?)?e\^\(?([+-]?\d+(?:\.\d+)?)x\)?$/);
  if (!match) {
    return undefined;
  }

  return {
    amplitude: match[1] ? Number(match[1]) : 1,
    rate: Number(match[2]),
  };
}

function parseTrigForcing(latex: string) {
  const normalized = latex.replace(/\s+/g, '');
  const sinMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)?\\sin\(?([+-]?\d+(?:\.\d+)?)x\)?$/);
  if (sinMatch) {
    return {
      kind: 'sin' as const,
      amplitude: sinMatch[1] ? Number(sinMatch[1]) : 1,
      rate: Number(sinMatch[2]),
    };
  }

  const cosMatch = normalized.match(/^([+-]?\d+(?:\.\d+)?)?\\cos\(?([+-]?\d+(?:\.\d+)?)x\)?$/);
  if (cosMatch) {
    return {
      kind: 'cos' as const,
      amplitude: cosMatch[1] ? Number(cosMatch[1]) : 1,
      rate: Number(cosMatch[2]),
    };
  }

  return undefined;
}

export function solveSecondOrderOde(state: SecondOrderOdeState): AdvancedOdeEvaluation {
  const a2 = Number(state.a2);
  const a1 = Number(state.a1);
  const a0 = Number(state.a0);
  if (![a2, a1, a0].every(Number.isFinite) || Math.abs(a2) < 1e-10) {
    return {
      warnings: [],
      error: 'Second-order ODE coefficients must be numeric and a₂ must be non-zero.',
    };
  }

  const homogeneous = homogeneousSecondOrderLatex(a2, a1, a0);
  const forcingLatex = state.forcingLatex.trim();
  if (!forcingLatex || forcingLatex === '0') {
    return {
      exactLatex: `y=${homogeneous}`,
      warnings: [],
      resultOrigin: 'symbolic',
    };
  }

  const constantForcing = Number(forcingLatex);
  if (Number.isFinite(constantForcing) && Math.abs(a0) > 1e-10) {
    return {
      exactLatex: `y=${homogeneous}+${numberToLatex(constantForcing / a0)}`,
      warnings: [],
      resultOrigin: 'symbolic',
    };
  }

  const expForcing = parseExpForcing(forcingLatex);
  if (expForcing) {
    const characteristic = a2 * expForcing.rate ** 2 + a1 * expForcing.rate + a0;
    if (Math.abs(characteristic) < 1e-10) {
      return {
        warnings: [],
        error: 'This resonant exponential forcing is outside the supported Advanced Calc rules.',
      };
    }

    const coefficient = expForcing.amplitude / characteristic;
    return {
      exactLatex: `y=${homogeneous}+${numberToLatex(coefficient)}e^{${numberToLatex(expForcing.rate)}x}`,
      warnings: [],
      resultOrigin: 'symbolic',
    };
  }

  const trigForcing = parseTrigForcing(forcingLatex);
  if (trigForcing) {
    const lambda = a0 - a2 * trigForcing.rate ** 2;
    const mu = a1 * trigForcing.rate;
    const determinant = lambda ** 2 + mu ** 2;
    if (Math.abs(determinant) < 1e-10) {
      return {
        warnings: [],
        error: 'This resonant sinusoidal forcing is outside the supported Advanced Calc rules.',
      };
    }

    const sinCoeff = trigForcing.kind === 'sin'
      ? (trigForcing.amplitude * lambda) / determinant
      : (trigForcing.amplitude * mu) / determinant;
    const cosCoeff = trigForcing.kind === 'sin'
      ? (-trigForcing.amplitude * mu) / determinant
      : (trigForcing.amplitude * lambda) / determinant;

    return {
      exactLatex: `y=${homogeneous}+${numberToLatex(sinCoeff)}\\sin\\left(${numberToLatex(trigForcing.rate)}x\\right)+${numberToLatex(cosCoeff)}\\cos\\left(${numberToLatex(trigForcing.rate)}x\\right)`,
      warnings: [],
      resultOrigin: 'symbolic',
    };
  }

  return {
    warnings: [],
    error: 'This forcing term is outside the supported Advanced Calc rules.',
  };
}

export async function solveNumericIvp(state: NumericIvpState): Promise<AdvancedOdeEvaluation> {
  const request = toNumericRequest(state);
  if (!request) {
    return {
      warnings: [],
      error: 'Numeric IVP requires a supported RHS expression and numeric initial values.',
    };
  }

  const response = await solveOdeNumeric(request, rk4Fallback);
  if (response.error) {
    return {
      warnings: response.warnings,
      error: response.error,
    };
  }

  return {
    exactLatex: `y\\left(${numberToLatex(response.finalX)}\\right)\\approx${numberToLatex(response.finalY)}`,
    approxText: `Final value ~= ${formatNumber(response.finalY)}`,
    warnings: response.warnings,
    resultOrigin: 'numeric-fallback',
  };
}
