import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  LimitDirection,
} from '../../../types/calculator';
import { normalizeAst } from '../normalize';
import { isNodeArray } from '../patterns';
import {
  formatLimitNumberLatex,
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import {
  gruntzNodeToLatex,
  type GruntzBranchAssumption,
  type GruntzCoefficientDriver,
  type GruntzMrvSetOptions,
} from './gruntz-foundation';
import {
  buildGruntzRecursiveEvaluatorContract,
  type GruntzRecursiveEvaluatorContract,
} from './gruntz-recursive-evaluator';

type BridgeSide = 'left' | 'right';

export type GruntzFiniteBridgeRoute =
  | 'finite-to-infinity-substitution'
  | 'two-sided-agreement'
  | 'two-sided-disagreement'
  | 'unsupported';

export type GruntzFiniteBridgeSideContract = {
  side: BridgeSide;
  bridgeVariable: string;
  substitutionLatex: string;
  transformedNode: unknown;
  transformedLatex: string;
  recursive: GruntzRecursiveEvaluatorContract;
};

export type GruntzFiniteTargetBridgeContract = {
  supported: boolean;
  variable: string;
  target: number;
  direction: LimitDirection;
  route: GruntzFiniteBridgeRoute;
  bridgeVariable?: string;
  sourceLatex: string;
  exactLatex?: string;
  resultKind?: 'zero' | 'finite' | 'infinity' | 'casewise';
  sideContracts?: GruntzFiniteBridgeSideContract[];
  detailSections?: DisplayDetailSection[];
  evidenceRows?: DisplayDetailLinePart[][];
  branchAssumptions?: GruntzBranchAssumption[];
  coefficientDrivers?: GruntzCoefficientDriver[];
  stopReason?: string;
};

const BRIDGE_VARIABLE_CANDIDATES = ['t', 'u', 'v', 's', 'z', 'q'];
const EPSILON = 1e-12;

function collectSymbols(node: unknown, symbols: Set<string>) {
  if (typeof node === 'string') {
    symbols.add(node);
    return;
  }
  if (!isNodeArray(node)) {
    return;
  }
  node.slice(1).forEach((child) => collectSymbols(child, symbols));
}

function chooseBridgeVariable(node: unknown, variable: string) {
  const symbols = new Set<string>([variable]);
  collectSymbols(node, symbols);
  return BRIDGE_VARIABLE_CANDIDATES.find((candidate) => !symbols.has(candidate));
}

function cleanNumber(value: number) {
  if (Math.abs(value) < EPSILON) {
    return 0;
  }
  const rounded = Math.round(value);
  return Math.abs(value - rounded) < EPSILON ? rounded : value;
}

function numericNode(node: unknown): number | undefined {
  return typeof node === 'number' && Number.isFinite(node) ? node : undefined;
}

function addNode(terms: unknown[]): unknown {
  const flattened = terms.flatMap((term) =>
    isNodeArray(term) && term[0] === 'Add' ? term.slice(1) : [term]);
  let numericSum = 0;
  const symbolic: unknown[] = [];
  flattened.forEach((term) => {
    const numeric = numericNode(term);
    if (numeric === undefined) {
      symbolic.push(term);
    } else {
      numericSum += numeric;
    }
  });
  const cleanedNumeric = cleanNumber(numericSum);
  const next = cleanedNumeric === 0 ? symbolic : [cleanedNumeric, ...symbolic];
  if (next.length === 0) {
    return 0;
  }
  return next.length === 1 ? next[0] : normalizeAst(['Add', ...next]);
}

function multiplyNode(factors: unknown[]): unknown {
  const flattened = factors.flatMap((factor) =>
    isNodeArray(factor) && factor[0] === 'Multiply' ? factor.slice(1) : [factor]);
  let numericProduct = 1;
  const symbolic: unknown[] = [];
  flattened.forEach((factor) => {
    const numeric = numericNode(factor);
    if (numeric === undefined) {
      symbolic.push(factor);
    } else {
      numericProduct *= numeric;
    }
  });
  const cleanedNumeric = cleanNumber(numericProduct);
  if (cleanedNumeric === 0) {
    return 0;
  }
  if (cleanedNumeric === -1 && symbolic.length === 1) {
    return ['Negate', symbolic[0]];
  }
  const next = cleanedNumeric === 1 ? symbolic : [cleanedNumeric, ...symbolic];
  if (next.length === 0) {
    return 1;
  }
  return next.length === 1 ? next[0] : normalizeAst(['Multiply', ...next]);
}

function divideNode(numerator: unknown, denominator: unknown): unknown {
  const numeratorNumber = numericNode(numerator);
  const denominatorNumber = numericNode(denominator);
  if (denominatorNumber !== undefined && Math.abs(denominatorNumber) < EPSILON) {
    return ['Divide', numerator, denominator];
  }
  if (numeratorNumber !== undefined && denominatorNumber !== undefined) {
    return cleanNumber(numeratorNumber / denominatorNumber);
  }
  if (denominator === 1) {
    return numerator;
  }
  return ['Divide', numerator, denominator];
}

function reciprocalBridgeCoefficient(node: unknown, bridgeVariable: string): number | undefined {
  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && node[2] === bridgeVariable
  ) {
    return numericNode(node[1]);
  }
  return undefined;
}

function powerNode(base: unknown, exponent: unknown, bridgeVariable: string): unknown {
  const exponentNumber = numericNode(exponent);
  const bridgeReciprocal = reciprocalBridgeCoefficient(base, bridgeVariable);
  if (bridgeReciprocal !== undefined && exponentNumber !== undefined && Number.isInteger(exponentNumber)) {
    if (exponentNumber < 0) {
      const positivePower = -exponentNumber;
      const coefficient = cleanNumber(1 / Math.pow(bridgeReciprocal, positivePower));
      const bridgePower = positivePower === 1 ? bridgeVariable : ['Power', bridgeVariable, positivePower];
      return multiplyNode([coefficient, bridgePower]);
    }
    if (exponentNumber > 0) {
      const coefficient = cleanNumber(Math.pow(bridgeReciprocal, exponentNumber));
      const denominator = exponentNumber === 1 ? bridgeVariable : ['Power', bridgeVariable, exponentNumber];
      return divideNode(coefficient, denominator);
    }
    return 1;
  }
  return ['Power', base, exponent];
}

function transformForSide(input: {
  node: unknown;
  variable: string;
  target: number;
  sideSign: 1 | -1;
  bridgeVariable: string;
}): unknown {
  const bridgeReciprocal: unknown = ['Divide', input.sideSign, input.bridgeVariable];
  const variableReplacement = input.target === 0
    ? bridgeReciprocal
    : addNode([input.target, bridgeReciprocal]);

  function visit(node: unknown): unknown {
    if (node === input.variable) {
      return variableReplacement;
    }
    if (!isNodeArray(node) || node.length === 0) {
      return node;
    }
    const [head, ...children] = node;
    const transformed = children.map(visit);
    if (head === 'Add') {
      return addNode(transformed);
    }
    if (head === 'Multiply') {
      return multiplyNode(transformed);
    }
    if (head === 'Negate' && transformed.length === 1) {
      return multiplyNode([-1, transformed[0]]);
    }
    if (head === 'Divide' && transformed.length === 2) {
      const denominatorBridgeReciprocal = reciprocalBridgeCoefficient(transformed[1], input.bridgeVariable);
      const numeratorNumber = numericNode(transformed[0]);
      if (denominatorBridgeReciprocal !== undefined && numeratorNumber !== undefined) {
        return multiplyNode([numeratorNumber / denominatorBridgeReciprocal, input.bridgeVariable]);
      }
      return divideNode(transformed[0], transformed[1]);
    }
    if (head === 'Power' && transformed.length === 2) {
      return powerNode(transformed[0], transformed[1], input.bridgeVariable);
    }
    return [head, ...transformed];
  }

  return normalizeAst(visit(input.node));
}

function sideSubstitutionLatex(input: {
  variable: string;
  target: number;
  sideSign: 1 | -1;
  bridgeVariable: string;
}) {
  const target = formatLimitNumberLatex(input.target);
  const sign = input.sideSign > 0 ? '+' : '-';
  if (input.target === 0) {
    return `${input.variable}=${sign === '+' ? '' : '-'}\\frac{1}{${input.bridgeVariable}}`;
  }
  return `${input.variable}=${target}${sign}\\frac{1}{${input.bridgeVariable}}`;
}

function sideLabel(side: BridgeSide) {
  return side === 'right' ? 'right' : 'left';
}

function bridgeDetailSection(input: {
  route: GruntzFiniteBridgeRoute;
  sourceLatex: string;
  sideContracts: GruntzFiniteBridgeSideContract[];
  resultLatex?: string;
  stopReason?: string;
}) {
  const rows: DisplayDetailLinePart[][] = [[
    limitTextPart('Finite Gruntz bridge: '),
    limitTextPart(input.route.replaceAll('-', ' ')),
    limitTextPart('.'),
  ], [
    limitTextPart('Source: '),
    limitMathPart(input.sourceLatex),
    limitTextPart('.'),
  ]];
  input.sideContracts.forEach((side) => {
    rows.push([
      limitTextPart(`${sideLabel(side.side)} substitution: `),
      limitMathPart(side.substitutionLatex),
      limitTextPart(', '),
      limitMathPart(`${side.bridgeVariable}\\to\\infty`),
      limitTextPart('.'),
    ]);
    rows.push([
      limitTextPart(`${sideLabel(side.side)} transformed expression: `),
      limitMathPart(side.transformedLatex),
      limitTextPart('.'),
    ]);
  });
  if (input.resultLatex) {
    rows.push([
      limitTextPart('Conclusion: '),
      limitMathPart(input.resultLatex),
      limitTextPart('.'),
    ]);
  }
  if (input.stopReason) {
    rows.push([limitTextPart(input.stopReason)]);
  }
  return limitDetailSection('Gruntz Finite Bridge', rows);
}

function buildSideContract(input: {
  node: unknown;
  variable: string;
  target: number;
  bridgeVariable: string;
  side: BridgeSide;
  options: GruntzMrvSetOptions;
}): GruntzFiniteBridgeSideContract {
  const sideSign = input.side === 'right' ? 1 : -1;
  const transformedNode = transformForSide({
    node: input.node,
    variable: input.variable,
    target: input.target,
    sideSign,
    bridgeVariable: input.bridgeVariable,
  });
  return {
    side: input.side,
    bridgeVariable: input.bridgeVariable,
    substitutionLatex: sideSubstitutionLatex({
      variable: input.variable,
      target: input.target,
      sideSign,
      bridgeVariable: input.bridgeVariable,
    }),
    transformedNode,
    transformedLatex: gruntzNodeToLatex(transformedNode),
    recursive: buildGruntzRecursiveEvaluatorContract(
      transformedNode,
      input.bridgeVariable,
      'posInfinity',
      input.options,
    ),
  };
}

function mergeSideDetails(
  bridge: DisplayDetailSection,
  sideContracts: GruntzFiniteBridgeSideContract[],
) {
  return [
    bridge,
    ...sideContracts.flatMap((side) => side.recursive.detailSections ?? []),
  ];
}

function sideContractsForDirection(direction: LimitDirection): BridgeSide[] {
  if (direction === 'left') {
    return ['left'];
  }
  if (direction === 'right') {
    return ['right'];
  }
  return ['right', 'left'];
}

export function buildGruntzFiniteTargetBridgeContract(
  node: unknown,
  variable = 'x',
  target = 0,
  direction: LimitDirection = 'two-sided',
  options: GruntzMrvSetOptions = {},
): GruntzFiniteTargetBridgeContract {
  if (!Number.isFinite(target)) {
    return {
      supported: false,
      variable,
      target,
      direction,
      route: 'unsupported',
      sourceLatex: gruntzNodeToLatex(node),
      stopReason: 'Finite Gruntz bridge requires a numeric finite target.',
    };
  }

  const bridgeVariable = chooseBridgeVariable(node, variable);
  const sourceLatex = gruntzNodeToLatex(node);
  if (!bridgeVariable) {
    return {
      supported: false,
      variable,
      target,
      direction,
      route: 'unsupported',
      sourceLatex,
      stopReason: 'Finite Gruntz bridge could not choose a fresh bridge variable.',
    };
  }

  const sideContracts = sideContractsForDirection(direction).map((side) =>
    buildSideContract({ node, variable, target, bridgeVariable, side, options }));
  const unsupported = sideContracts.find((side) => !side.recursive.supported);
  if (unsupported) {
    const stopReason = `${sideLabel(unsupported.side)} side did not reduce to a supported recursive Gruntz contract.`;
    return {
      supported: false,
      variable,
      target,
      direction,
      route: 'unsupported',
      bridgeVariable,
      sourceLatex,
      sideContracts,
      detailSections: [bridgeDetailSection({
        route: 'unsupported',
        sourceLatex,
        sideContracts,
        stopReason,
      })],
      stopReason,
    };
  }

  if (direction !== 'two-sided') {
    const side = sideContracts[0];
    const detail = bridgeDetailSection({
      route: 'finite-to-infinity-substitution',
      sourceLatex,
      sideContracts,
      resultLatex: side.recursive.exactLatex,
    });
    return {
      supported: true,
      variable,
      target,
      direction,
      route: 'finite-to-infinity-substitution',
      bridgeVariable,
      sourceLatex,
      exactLatex: side.recursive.exactLatex,
      resultKind: side.recursive.resultKind,
      sideContracts,
      detailSections: mergeSideDetails(detail, sideContracts),
      branchAssumptions: side.recursive.branchAssumptions,
      coefficientDrivers: side.recursive.coefficientDrivers,
    };
  }

  const [right, left] = sideContracts;
  if (!right.recursive.exactLatex || right.recursive.exactLatex !== left.recursive.exactLatex) {
    const stopReason = 'Right-hand and left-hand Gruntz bridge results do not agree.';
    return {
      supported: false,
      variable,
      target,
      direction,
      route: 'two-sided-disagreement',
      bridgeVariable,
      sourceLatex,
      sideContracts,
      detailSections: [bridgeDetailSection({
        route: 'two-sided-disagreement',
        sourceLatex,
        sideContracts,
        stopReason,
      })],
      stopReason,
    };
  }

  const detail = bridgeDetailSection({
    route: 'two-sided-agreement',
    sourceLatex,
    sideContracts,
    resultLatex: right.recursive.exactLatex,
  });
  return {
    supported: true,
    variable,
    target,
    direction,
    route: 'two-sided-agreement',
    bridgeVariable,
    sourceLatex,
    exactLatex: right.recursive.exactLatex,
    resultKind: right.recursive.resultKind,
    sideContracts,
    detailSections: mergeSideDetails(detail, sideContracts),
    branchAssumptions: [
      ...(right.recursive.branchAssumptions ?? []),
      ...(left.recursive.branchAssumptions ?? []),
    ],
    coefficientDrivers: [
      ...(right.recursive.coefficientDrivers ?? []),
      ...(left.recursive.coefficientDrivers ?? []),
    ],
  };
}
