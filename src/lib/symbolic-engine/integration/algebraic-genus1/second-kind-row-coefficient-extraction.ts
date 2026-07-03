import type { DisplayDetailSection } from '../../../../types/calculator';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  mathPart,
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import { expandMathJsonNode } from '../../primitives/expansion/expansion';
import {
  parseSymbolicCoefficient,
  type SymbolicCoefficient,
  type SymbolicCoefficientStopReason,
} from '../../primitives/coefficient-domain';
import {
  addMathJsonNodes,
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  negateMathJsonNode,
  simplifyMathJsonNode,
  structuralKey,
} from '../../primitives/simplification/simplification';
import {
  boxLatex,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import {
  buildAlgebraicGenus1SecondKindDenominatorClearingSurface,
  type AlgebraicGenus1SecondKindDenominatorClearingSurface,
} from './second-kind-denominator-clearing-surface';

export type AlgebraicGenus1SecondKindRowCoefficient = {
  rowIndex: number;
  basisNode: unknown;
  coefficientNode: unknown;
  coefficientLatex: string;
  equationNode: unknown;
  equationLatex: string;
  facts: SymbolicCoefficient['facts'];
};

export type AlgebraicGenus1SecondKindRowCoefficientExtraction = {
  kind: 'success';
  variable: string;
  status: 'row-coefficients-ready';
  rootChartKind: AlgebraicGenus1SecondKindDenominatorClearingSurface['rootChartKind'];
  chartVariableSymbol: 'z';
  preexpandedClearedZeroFormNode: unknown;
  expandedClearedZeroFormNode: unknown;
  normalizedClearedZeroFormNode: unknown;
  rowBasisNodes: unknown[];
  rowCoefficientNodes: unknown[];
  rowCoefficients: AlgebraicGenus1SecondKindRowCoefficient[];
  expansionStats: {
    expandedTerms: number;
    nodeCount: number;
    normalizedNodeCount: number;
  };
  canPopulateRows: true;
  canPopulateMatrixEntries: false;
  canSolveDirectly: false;
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
  proofObligations: string[];
};

export type AlgebraicGenus1SecondKindRowCoefficientExtractionResult =
  | AlgebraicGenus1SecondKindRowCoefficientExtraction
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'denominator-clearing-stop'
        | 'expansion-limit'
        | 'simplification-limit'
        | 'row-degree-cap'
        | 'row-extraction-stop'
        | 'coefficient-stop';
      detail: string;
      coefficientReason?: SymbolicCoefficientStopReason;
    };

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

type TermProfile =
  | { kind: 'success'; degree: number; coefficientNode: unknown }
  | { kind: 'stop'; detail: string };

type RowExtractionResult =
  | {
      kind: 'success';
      rowCoefficients: AlgebraicGenus1SecondKindRowCoefficient[];
    }
  | {
      kind: 'stop';
      reason: 'row-degree-cap' | 'row-extraction-stop' | 'coefficient-stop';
      detail: string;
      coefficientReason?: SymbolicCoefficientStopReason;
    };

type ProductTermExpansionResult =
  | { kind: 'success'; terms: unknown[][] }
  | { kind: 'stop'; detail: string };

type PreexpandedClearingResult =
  | { kind: 'success'; node: unknown }
  | { kind: 'stop'; detail: string };

const EXPANSION_TERM_CAP = 1024;
const EXPANSION_NODE_CAP = 40_000;
const SIMPLIFICATION_NODE_CAP = 40_000;
const ROW_COEFFICIENT_SIMPLIFY_NODE_CAP = 8_000;

function exactNonnegativeInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 && scalar.numerator >= 0
    ? scalar.numerator
    : undefined;
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : negateMathJsonNode(node);
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function variablePowerDegree(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
  ) {
    return exactNonnegativeInteger(node[2]);
  }

  return undefined;
}

function pushProductFactors(node: unknown, target: unknown[]) {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = exactNonnegativeInteger(node[2]);
    if (exponent !== undefined) {
      for (let index = 0; index < exponent; index += 1) {
        pushProductFactors(node[1], target);
      }
      return;
    }
  }

  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  target.push(...factors);
}

function pushQuotientFactors(
  node: unknown,
  numeratorFactors: unknown[],
  denominatorFactors: unknown[],
) {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = exactNonnegativeInteger(node[2]);
    if (exponent !== undefined) {
      for (let index = 0; index < exponent; index += 1) {
        pushQuotientFactors(node[1], numeratorFactors, denominatorFactors);
      }
      return;
    }
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    for (const factor of flattenMultiply(node)) {
      pushQuotientFactors(factor, numeratorFactors, denominatorFactors);
    }
    return;
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    pushProductFactors(node[1], numeratorFactors);
    pushProductFactors(node[2], denominatorFactors);
    return;
  }

  numeratorFactors.push(node);
}

function removeFirstStructuralMatch(target: unknown, nodes: unknown[]) {
  const targetKey = structuralKey(target);
  const index = nodes.findIndex((node) => structuralKey(node) === targetKey);
  if (index === -1) {
    return false;
  }

  nodes.splice(index, 1);
  return true;
}

function cancelMatchingFactors(numeratorFactors: unknown[], denominatorFactors: unknown[]) {
  const remainingDenominators: unknown[] = [];
  for (const denominator of denominatorFactors) {
    if (!removeFirstStructuralMatch(denominator, numeratorFactors)) {
      remainingDenominators.push(denominator);
    }
  }
  return remainingDenominators;
}

function normalizeExpandedTermQuotients(term: unknown) {
  const numeratorFactors: unknown[] = [];
  const denominatorFactors: unknown[] = [];
  for (const factor of flattenMultiply(term)) {
    if (isNodeArray(factor) && factor[0] === 'Divide' && factor.length === 3) {
      pushQuotientFactors(factor[1], numeratorFactors, denominatorFactors);
      pushProductFactors(factor[2], denominatorFactors);
      continue;
    }

    pushQuotientFactors(factor, numeratorFactors, denominatorFactors);
  }

  const remainingDenominators = cancelMatchingFactors(numeratorFactors, denominatorFactors);
  const denominatorNode = remainingDenominators.length === 0
    ? undefined
    : multiplyMathJsonNodes(...remainingDenominators);
  const factors = denominatorNode === undefined
    ? numeratorFactors
    : [...numeratorFactors, divideMathJsonNodes(1, denominatorNode)];
  return multiplyMathJsonNodes(...factors);
}

function normalizeExpandedClearedZeroForm(node: unknown) {
  const terms = signedAddTerms(node).map((term) => (
    normalizeExpandedTermQuotients(signedNode(term.node, term.sign))
  ));
  return addMathJsonNodes(...terms);
}

function prependFactorToTerms(factor: unknown, terms: unknown[][]) {
  return terms.map((term) => [factor, ...term]);
}

function combineProductTermSets(
  left: unknown[][],
  right: unknown[][],
  maxTerms: number,
): ProductTermExpansionResult {
  const total = left.length * right.length;
  if (total > maxTerms) {
    return {
      kind: 'stop',
      detail: `Product-term expansion would produce ${total} terms, exceeding the ${maxTerms} term limit.`,
    };
  }

  const terms: unknown[][] = [];
  for (const leftTerm of left) {
    for (const rightTerm of right) {
      terms.push([...leftTerm, ...rightTerm]);
    }
  }
  return { kind: 'success', terms };
}

function expandProductTerms(
  node: unknown,
  options: {
    maxPower: number;
    maxTerms: number;
  },
): ProductTermExpansionResult {
  if (!isNodeArray(node)) {
    return { kind: 'success', terms: [[node]] };
  }

  const [operator, ...children] = node;
  if (operator === 'Add') {
    const terms: unknown[][] = [];
    for (const child of children) {
      const expanded = expandProductTerms(child, options);
      if (expanded.kind === 'stop') {
        return expanded;
      }
      terms.push(...expanded.terms);
      if (terms.length > options.maxTerms) {
        return {
          kind: 'stop',
          detail: `Product-term expansion produced ${terms.length} terms, exceeding the ${options.maxTerms} term limit.`,
        };
      }
    }
    return { kind: 'success', terms };
  }

  if (operator === 'Subtract') {
    const [first, ...rest] = children;
    const terms: unknown[][] = [];
    if (first !== undefined) {
      const firstTerms = expandProductTerms(first, options);
      if (firstTerms.kind === 'stop') {
        return firstTerms;
      }
      terms.push(...firstTerms.terms);
    }
    for (const child of rest) {
      const childTerms = expandProductTerms(child, options);
      if (childTerms.kind === 'stop') {
        return childTerms;
      }
      terms.push(...prependFactorToTerms(-1, childTerms.terms));
      if (terms.length > options.maxTerms) {
        return {
          kind: 'stop',
          detail: `Product-term expansion produced ${terms.length} terms, exceeding the ${options.maxTerms} term limit.`,
        };
      }
    }
    return { kind: 'success', terms };
  }

  if (operator === 'Negate' && children.length === 1) {
    const expanded = expandProductTerms(children[0], options);
    return expanded.kind === 'success'
      ? { kind: 'success', terms: prependFactorToTerms(-1, expanded.terms) }
      : expanded;
  }

  if (operator === 'Multiply' || operator === 'InvisibleOperator') {
    let terms: unknown[][] = [[]];
    for (const child of children) {
      const childTerms = expandProductTerms(child, options);
      if (childTerms.kind === 'stop') {
        return childTerms;
      }
      const combined = combineProductTermSets(terms, childTerms.terms, options.maxTerms);
      if (combined.kind === 'stop') {
        return combined;
      }
      terms = combined.terms;
    }
    return { kind: 'success', terms };
  }

  if (operator === 'Power' && children.length === 2) {
    const exponent = exactNonnegativeInteger(children[1]);
    if (exponent === undefined) {
      return { kind: 'success', terms: [[node]] };
    }
    if (exponent > options.maxPower) {
      return {
        kind: 'stop',
        detail: `Product-term expansion power ${exponent} exceeds the ${options.maxPower} power limit.`,
      };
    }
    let terms: unknown[][] = [[]];
    const baseTerms = expandProductTerms(children[0], options);
    if (baseTerms.kind === 'stop') {
      return baseTerms;
    }
    for (let index = 0; index < exponent; index += 1) {
      const combined = combineProductTermSets(terms, baseTerms.terms, options.maxTerms);
      if (combined.kind === 'stop') {
        return combined;
      }
      terms = combined.terms;
    }
    return { kind: 'success', terms };
  }

  return { kind: 'success', terms: [[node]] };
}

function clearAdditiveTermsBeforeExpansion(input: {
  zeroFormNode: unknown;
  denominatorFactorNodes: unknown[];
  maxPower: number;
  maxTerms: number;
}): PreexpandedClearingResult {
  const zeroTerms = expandProductTerms(input.zeroFormNode, {
    maxPower: input.maxPower,
    maxTerms: input.maxTerms,
  });
  if (zeroTerms.kind === 'stop') {
    return zeroTerms;
  }

  const terms = zeroTerms.terms.map((termFactors) => {
    const multiplied = multiplyMathJsonNodes(
      ...termFactors,
      ...input.denominatorFactorNodes,
    );
    return normalizeExpandedTermQuotients(multiplied);
  });
  return {
    kind: 'success',
    node: addMathJsonNodes(...terms),
  };
}

function termProfile(term: SignedNode, variable: string): TermProfile {
  const signed = signedNode(term.node, term.sign);
  if (!dependsOnVariable(signed, variable)) {
    return {
      kind: 'success',
      degree: 0,
      coefficientNode: signed,
    };
  }

  const factors = isNodeArray(signed) && signed[0] === 'Multiply'
    ? flattenMultiply(signed)
    : [signed];
  const coefficientFactors: unknown[] = [];
  let degree = 0;
  let sawVariableFactor = false;

  const pendingFactors = [...factors];
  while (pendingFactors.length > 0) {
    const factor = pendingFactors.shift();
    if (factor === undefined) {
      continue;
    }

    if (isNodeArray(factor) && factor[0] === 'Negate' && factor.length === 2) {
      coefficientFactors.push(-1);
      const innerFactors = isNodeArray(factor[1]) && factor[1][0] === 'Multiply'
        ? flattenMultiply(factor[1])
        : [factor[1]];
      pendingFactors.unshift(...innerFactors);
      continue;
    }

    if (isNodeArray(factor) && factor[0] === 'Multiply') {
      pendingFactors.unshift(...flattenMultiply(factor));
      continue;
    }

    const factorDegree = variablePowerDegree(factor, variable);
    if (factorDegree !== undefined) {
      degree += factorDegree;
      sawVariableFactor = true;
      continue;
    }

    if (dependsOnVariable(factor, variable)) {
      return {
        kind: 'stop',
        detail: `A row term still contains ${variable} outside a pure power: ${boxLatex(factor)}.`,
      };
    }

    coefficientFactors.push(factor);
  }

  if (!sawVariableFactor) {
    return {
      kind: 'stop',
      detail: `A row term depended on ${variable} but no pure power was isolated.`,
    };
  }

  return {
    kind: 'success',
    degree,
    coefficientNode: coefficientFactors.length === 0
      ? 1
      : multiplyMathJsonNodes(...coefficientFactors),
  };
}

function extractRowCoefficients(input: {
  normalizedNode: unknown;
  rowBasisNodes: unknown[];
  chartVariable: string;
}): RowExtractionResult {
  const rowCoefficientNodes = Array.from({ length: input.rowBasisNodes.length }, () => 0 as unknown);

  for (const term of signedAddTerms(input.normalizedNode)) {
    const profile = termProfile(term, input.chartVariable);
    if (profile.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'row-extraction-stop',
        detail: profile.detail,
      };
    }
    if (profile.degree >= input.rowBasisNodes.length) {
      return {
        kind: 'stop',
        reason: 'row-degree-cap',
        detail: `Extracted z^${profile.degree}, above the row cap z^${input.rowBasisNodes.length - 1}.`,
      };
    }

    rowCoefficientNodes[profile.degree] = addMathJsonNodes(
      rowCoefficientNodes[profile.degree],
      profile.coefficientNode,
    );
  }

  const rowCoefficients: AlgebraicGenus1SecondKindRowCoefficient[] = [];
  for (let rowIndex = 0; rowIndex < rowCoefficientNodes.length; rowIndex += 1) {
    const coefficient = parseSymbolicCoefficient(
      rowCoefficientNodes[rowIndex],
      input.chartVariable,
      [],
      { maxSimplifyNodeCount: ROW_COEFFICIENT_SIMPLIFY_NODE_CAP },
    );
    if (coefficient.kind === 'stop') {
      return {
        kind: 'stop',
        reason: 'coefficient-stop',
        detail: `Unable to parse the coefficient for z^${rowIndex}: ${coefficient.detail ?? coefficient.reason}.`,
        coefficientReason: coefficient.reason,
      };
    }

    const equationNode = ['Equal', coefficient.coefficient.node, 0];
    rowCoefficients.push({
      rowIndex,
      basisNode: input.rowBasisNodes[rowIndex],
      coefficientNode: coefficient.coefficient.node,
      coefficientLatex: coefficient.coefficient.latex,
      equationNode,
      equationLatex: `${coefficient.coefficient.latex}=0`,
      facts: coefficient.coefficient.facts,
    });
  }

  return {
    kind: 'success',
    rowCoefficients,
  };
}

function detailSection(input: AlgebraicGenus1SecondKindRowCoefficientExtraction) {
  return mixedDetailSection(
    'Genus-1 Second-Kind Row Coefficient Extraction',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('root chart: '), textPart(input.rootChartKind)],
      [textPart('expanded terms: '), textPart(String(input.expansionStats.expandedTerms))],
      [textPart('expanded nodes: '), textPart(String(input.expansionStats.nodeCount))],
      [textPart('normalized nodes: '), textPart(String(input.expansionStats.normalizedNodeCount))],
      [textPart('row equations: '), textPart(String(input.rowCoefficients.length))],
      [textPart('first row: '), mathPart(input.rowCoefficients[0]?.equationLatex ?? '0=0')],
    ],
  );
}

export function buildAlgebraicGenus1SecondKindRowCoefficientExtraction(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1SecondKindRowCoefficientExtractionResult {
  const clearing = buildAlgebraicGenus1SecondKindDenominatorClearingSurface(node, variable);
  if (clearing.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'denominator-clearing-stop',
      detail: clearing.detail,
    };
  }

  const maxPower = Math.max(2, clearing.rowBasisNodes.length + 4);
  const preexpanded = clearAdditiveTermsBeforeExpansion({
    zeroFormNode: clearing.zeroFormNode,
    denominatorFactorNodes: clearing.denominatorFactorNodes,
    maxPower,
    maxTerms: EXPANSION_TERM_CAP,
  });
  if (preexpanded.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'expansion-limit',
      detail: preexpanded.detail,
    };
  }
  const preexpandedClearedZeroFormNode = preexpanded.node;
  const expanded = expandMathJsonNode(preexpandedClearedZeroFormNode, {
    maxPower,
    maxExpandedTerms: EXPANSION_TERM_CAP,
    maxNodeCount: EXPANSION_NODE_CAP,
  });
  if (expanded.kind === 'unsupported') {
    return {
      kind: 'stop',
      variable,
      reason: 'expansion-limit',
      detail: expanded.message,
    };
  }

  const normalized = normalizeExpandedClearedZeroForm(expanded.node);
  const simplified = simplifyMathJsonNode(normalized, {
    maxNodeCount: SIMPLIFICATION_NODE_CAP,
  });
  if (simplified.kind === 'unsupported') {
    return {
      kind: 'stop',
      variable,
      reason: 'simplification-limit',
      detail: simplified.message,
    };
  }

  const reexpanded = expandMathJsonNode(simplified.node, {
    maxPower,
    maxExpandedTerms: EXPANSION_TERM_CAP,
    maxNodeCount: EXPANSION_NODE_CAP,
  });
  if (reexpanded.kind === 'unsupported') {
    return {
      kind: 'stop',
      variable,
      reason: 'expansion-limit',
      detail: reexpanded.message,
    };
  }

  const rows = extractRowCoefficients({
    normalizedNode: reexpanded.node,
    rowBasisNodes: clearing.rowBasisNodes,
    chartVariable: clearing.chartVariableSymbol,
  });
  if (rows.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: rows.reason,
      detail: rows.detail,
      coefficientReason: rows.coefficientReason,
    };
  }

  const result: AlgebraicGenus1SecondKindRowCoefficientExtraction = {
    kind: 'success',
    variable,
    status: 'row-coefficients-ready',
    rootChartKind: clearing.rootChartKind,
    chartVariableSymbol: clearing.chartVariableSymbol,
    preexpandedClearedZeroFormNode,
    expandedClearedZeroFormNode: expanded.node,
    normalizedClearedZeroFormNode: reexpanded.node,
    rowBasisNodes: clearing.rowBasisNodes,
    rowCoefficientNodes: rows.rowCoefficients.map((row) => row.coefficientNode),
    rowCoefficients: rows.rowCoefficients,
    expansionStats: {
      expandedTerms: expanded.expandedTerms,
      nodeCount: expanded.nodeCount,
      normalizedNodeCount: reexpanded.nodeCount,
    },
    canPopulateRows: true,
    canPopulateMatrixEntries: false,
    canSolveDirectly: false,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...clearing.readinessNotes,
      'The cleared second-kind zero form now expands under bounded caps and exposes row coefficient equations in z.',
      'Top-level product quotients are normalized after expansion so canceled denominator factors do not leak into row coefficients.',
      'Matrix-entry population, linear solve, proof backcheck, and live EllipticE/Pi adoption remain blocked.',
    ],
    proofObligations: [
      'Populate the bounded matrix rows from the extracted coefficient equations and unknown vector ordering.',
      'Solve the populated linear system over the displayed named-root coefficient field with pivot facts.',
      'Build and differentiate the node-first F/E/Pi antiderivative before changing live dispatch.',
    ],
  };

  return {
    ...result,
    detailSections: [
      detailSection(result),
    ],
  };
}
