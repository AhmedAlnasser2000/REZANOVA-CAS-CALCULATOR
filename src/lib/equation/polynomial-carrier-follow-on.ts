import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import {
  addExactPolynomials,
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialLeadingCoefficient,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  scaleExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { solveBoundedPolynomialEquationAst } from '../algebra/polynomial-factor-solve';
import { normalizeAst } from '../symbolic-engine/normalize';
import { dependsOnVariable, isNodeArray, termKey } from '../symbolic-engine/patterns';
import { mergeExactSupplementLatex } from '../algebra/exact-supplements';
import {
  buildParameterizedPowerBranches,
  buildQuadraticBranches,
  buildShiftedCarrierBranches,
  buildSymbolicFamilyBranchFromNode,
  dedupeSymbolicFamilyBranches,
  matchParameterizedPowerCarrier,
  matchQuadraticCarrier,
  matchShiftedSupportedCarrier,
  numericAffineCarrier,
  transformAffineBranches,
  type SymbolicFamilyBranch,
} from './composition/stage';
import { sameNode } from './substitution/shared';

const ce = new ComputeEngine();
const ROOT_TOLERANCE = 1e-8;

type InternalSolvedRoot = {
  node: unknown;
  latex: string;
  numeric: number;
};

type SupportedCarrierDescriptor =
  | {
      kind: 'shifted-even-power';
      node: unknown;
      rank: number;
      innerPower: NonNullable<ReturnType<typeof matchParameterizedPowerCarrier>>;
      shiftedCarrier: NonNullable<ReturnType<typeof matchShiftedSupportedCarrier>>;
    }
  | {
      kind: 'even-power-affine';
      node: unknown;
      rank: number;
      powerCarrier: NonNullable<ReturnType<typeof matchParameterizedPowerCarrier>>;
    }
  | {
      kind: 'quadratic';
      node: unknown;
      rank: number;
      quadraticCarrier: NonNullable<ReturnType<typeof matchQuadraticCarrier>>;
    }
  | {
      kind: 'affine';
      node: unknown;
      rank: number;
      affineCarrier: NonNullable<ReturnType<typeof numericAffineCarrier>>;
    };

export type PolynomialCarrierSolvedRoot = {
  latex: string;
  numeric: number;
};

export type PolynomialCarrierSolveAttempt =
  | { kind: 'none' }
  | { kind: 'recognized' }
  | { kind: 'empty' }
  | {
      kind: 'solved';
      roots: PolynomialCarrierSolvedRoot[];
      exactSupplementLatex?: string[];
    };

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function simplifyNode(node: unknown) {
  try {
    return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
  } catch {
    return normalizeAst(node);
  }
}

function numericValueForNode(node: unknown): number | null {
  try {
    const boxed = ce.box(node as Parameters<typeof ce.box>[0]);
    const numeric = boxed.N?.() ?? boxed.evaluate();
    const json = numeric.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (typeof json === 'object' && json !== null && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }

  return null;
}

function evaluateNodeAt(node: unknown, value: number) {
  try {
    const substituted = ce.box(normalizeAst(node) as Parameters<typeof ce.box>[0]).subs({ x: value });
    const numeric = substituted.N?.() ?? substituted.evaluate();
    const json = numeric.json;
    if (typeof json === 'number' && Number.isFinite(json)) {
      return json;
    }
    if (typeof json === 'object' && json !== null && 'num' in json) {
      const parsed = Number((json as { num: string }).num);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch {
    return null;
  }

  return null;
}

function refineRootAgainstZeroForm(zeroFormNode: unknown, initialValue: number) {
  let current = initialValue;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const residual = evaluateNodeAt(zeroFormNode, current);
    if (residual === null || Math.abs(residual) <= 1e-12) {
      break;
    }

    const step = Math.max(1e-6, Math.abs(current) * 1e-6);
    const forward = evaluateNodeAt(zeroFormNode, current + step);
    const backward = evaluateNodeAt(zeroFormNode, current - step);
    if (forward === null || backward === null) {
      break;
    }

    const derivative = (forward - backward) / (2 * step);
    if (!Number.isFinite(derivative) || Math.abs(derivative) <= 1e-10) {
      break;
    }

    const next = current - residual / derivative;
    if (!Number.isFinite(next)) {
      break;
    }

    current = next;
  }

  return current;
}

function expandNode(node: unknown) {
  let current = normalizeAst(node);

  for (let iteration = 0; iteration < 4; iteration += 1) {
    try {
      const expanded = normalizeAst(
        (expand(ce.box(current as Parameters<typeof ce.box>[0]) as never) as { json: unknown }).json,
      );
      if (termKey(expanded) === termKey(current)) {
        break;
      }
      current = expanded;
    } catch {
      break;
    }
  }

  try {
    return normalizeAst(ce.box(current as Parameters<typeof ce.box>[0]).simplify().json);
  } catch {
    return current;
  }
}

function sortAndDedupeRoots<T extends { numeric: number }>(roots: T[]) {
  return roots
    .slice()
    .sort((left, right) => left.numeric - right.numeric)
    .filter((root, index, list) =>
      index === 0 || Math.abs(root.numeric - list[index - 1].numeric) > ROOT_TOLERANCE);
}

function isZeroExactScalar(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

function exactScalarEquals(left: ExactScalar, right: ExactScalar) {
  const normalizedLeft = normalizeExactScalar(left);
  const normalizedRight = normalizeExactScalar(right);
  return normalizedLeft.numerator === normalizedRight.numerator
    && normalizedLeft.denominator === normalizedRight.denominator;
}

function countNodeSize(node: unknown): number {
  if (!isNodeArray(node) || node.length === 0) {
    return 1;
  }

  return 1 + node.slice(1).reduce<number>((sum, child) => sum + countNodeSize(child), 0);
}

function buildSupportedCarrierDescriptor(node: unknown): SupportedCarrierDescriptor | null {
  const normalized = normalizeAst(node);
  if (!dependsOnVariable(normalized, 'x')) {
    return null;
  }

  const shiftedCarrier = matchShiftedSupportedCarrier(normalized);
  if (shiftedCarrier) {
    const innerPower = matchParameterizedPowerCarrier(shiftedCarrier.innerNode);
    if (innerPower && innerPower.degree === 2) {
      return {
        kind: 'shifted-even-power',
        node: normalized,
        rank: 4,
        innerPower,
        shiftedCarrier,
      };
    }
  }

  const powerCarrier = matchParameterizedPowerCarrier(normalized);
  if (powerCarrier && powerCarrier.degree === 2) {
    return {
      kind: 'even-power-affine',
      node: normalized,
      rank: 3,
      powerCarrier,
    };
  }

  const quadraticCarrier = matchQuadraticCarrier(normalized);
  if (quadraticCarrier) {
    return {
      kind: 'quadratic',
      node: normalized,
      rank: 2,
      quadraticCarrier,
    };
  }

  const affineCarrier = numericAffineCarrier(normalized);
  if (affineCarrier) {
    return {
      kind: 'affine',
      node: normalized,
      rank: 1,
      affineCarrier,
    };
  }

  return null;
}

function buildNormalizedQuadraticCarrierDescriptorFromPolynomial(node: unknown): SupportedCarrierDescriptor | null {
  const polynomial = parseExactPolynomial(expandNode(node), 'x', 4);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 4) {
    return null;
  }

  const a4 = getExactPolynomialCoefficient(polynomial, 4);
  if (isZeroExactScalar(a4)) {
    return null;
  }

  const p = divideExactScalars(
    getExactPolynomialCoefficient(polynomial, 3),
    multiplyExactScalars(a4, { numerator: 2, denominator: 1 }),
  );
  if (!p) {
    return null;
  }

  const a2 = getExactPolynomialCoefficient(polynomial, 2);
  const a1 = getExactPolynomialCoefficient(polynomial, 1);
  const carrierLinearCoefficient = multiplyExactScalars(a4, multiplyExactScalars(p, p));
  const quadraticLinearCoefficient = addExactScalars(a2, negateExactScalar(carrierLinearCoefficient));
  const expectedA1 = multiplyExactScalars(p, quadraticLinearCoefficient);
  if (!exactScalarEquals(a1, expectedA1)) {
    return null;
  }

  const linearTerm = exactScalarEquals(p, { numerator: 1, denominator: 1 })
    ? 'x'
    : ['Multiply', buildExactScalarNode(p), 'x'];
  const carrierNode = isZeroExactScalar(p)
    ? simplifyNode(['Power', 'x', 2])
    : simplifyNode(['Add', ['Power', 'x', 2], linearTerm]);
  const quadraticCarrier = matchQuadraticCarrier(carrierNode);
  if (!quadraticCarrier) {
    return null;
  }

  return {
    kind: 'quadratic',
    node: carrierNode,
    rank: 2,
    quadraticCarrier,
  };
}

function buildPreferredCarrierDescriptor(node: unknown): SupportedCarrierDescriptor | null {
  const normalized = normalizeAst(node);
  return buildSupportedCarrierDescriptor(normalized)
    ?? buildNormalizedQuadraticCarrierDescriptorFromPolynomial(normalized);
}

function collectSupportedCarrierDescriptors(node: unknown, preferredCarrierNodes: unknown[] = []) {
  const descriptors = new Map<string, SupportedCarrierDescriptor>();

  for (const preferredNode of preferredCarrierNodes) {
    const descriptor = buildPreferredCarrierDescriptor(preferredNode);
    if (!descriptor) {
      continue;
    }
    descriptors.set(termKey(descriptor.node), {
      ...descriptor,
      rank: descriptor.rank + 10,
    });
  }

  const visit = (current: unknown) => {
    const normalized = normalizeAst(current);
    const descriptor = buildSupportedCarrierDescriptor(normalized);
    if (descriptor) {
      const key = termKey(descriptor.node);
      if (!descriptors.has(key)) {
        descriptors.set(key, descriptor);
      }
    }

    if (!isNodeArray(normalized) || normalized.length === 0) {
      return;
    }

    for (const child of normalized.slice(1)) {
      visit(child);
    }
  };

  visit(node);

  const derivedQuadraticCarrier = buildNormalizedQuadraticCarrierDescriptorFromPolynomial(node);
  if (derivedQuadraticCarrier) {
    descriptors.set(termKey(derivedQuadraticCarrier.node), derivedQuadraticCarrier);
  }

  return [...descriptors.values()].sort((left, right) => {
    if (right.rank !== left.rank) {
      return right.rank - left.rank;
    }
    return countNodeSize(right.node) - countNodeSize(left.node);
  });
}

function replaceCarrierNode(
  node: unknown,
  carrierNode: unknown,
): { node: unknown; replacementCount: number } {
  const normalized = normalizeAst(node);
  if (sameNode(normalized, carrierNode)) {
    return { node: 'u', replacementCount: 1 };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return { node: normalized, replacementCount: 0 };
  }

  let replacementCount = 0;
  const nextNode = [
    normalized[0],
    ...normalized.slice(1).map((child) => {
      const replaced = replaceCarrierNode(child, carrierNode);
      replacementCount += replaced.replacementCount;
      return replaced.node;
    }),
  ];

  return {
    node: normalizeAst(nextNode),
    replacementCount,
  };
}

function buildSolvedRoot(node: unknown): InternalSolvedRoot | null {
  const normalized = simplifyNode(node);
  const numeric = numericValueForNode(normalized);
  if (numeric === null) {
    return null;
  }

  return {
    node: normalized,
    latex: boxLatex(normalized),
    numeric,
  };
}

function solveLinearOrQuadraticCarrierPolynomial(polynomial: ReturnType<typeof parseExactPolynomial>) {
  if (!polynomial) {
    return null;
  }

  const degree = exactPolynomialDegree(polynomial);
  if (degree === 1) {
    const root = divideExactScalars(
      negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
      getExactPolynomialCoefficient(polynomial, 1),
    );
    if (!root) {
      return null;
    }

    const solvedRoot = buildSolvedRoot(buildExactScalarNode(root));
    return solvedRoot ? [solvedRoot] : null;
  }

  if (degree !== 2) {
    return null;
  }

  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant) {
    return null;
  }

  const discriminantNode = buildExactScalarNode(discriminant);
  const discriminantNumeric = numericValueForNode(discriminantNode);
  if (discriminantNumeric === null) {
    return null;
  }

  if (discriminantNumeric < -ROOT_TOLERANCE) {
    return [];
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const twoANode = buildExactScalarNode(multiplyExactScalars(a, { numerator: 2, denominator: 1 }));
  const minusBNode = buildExactScalarNode(negateExactScalar(b));

  if (Math.abs(discriminantNumeric) <= ROOT_TOLERANCE) {
    const root = buildSolvedRoot(['Divide', minusBNode, twoANode]);
    return root ? [root] : null;
  }

  const sqrtNode = ['Sqrt', discriminantNode];
  const positive = buildSolvedRoot(['Divide', ['Add', minusBNode, sqrtNode], twoANode]);
  const negative = buildSolvedRoot(['Divide', ['Subtract', minusBNode, sqrtNode], twoANode]);
  if (!positive || !negative) {
    return null;
  }

  return sortAndDedupeRoots([positive, negative]);
}

function solveHigherDegreeCarrierPolynomial(polynomial: ReturnType<typeof parseExactPolynomial>) {
  if (!polynomial) {
    return null;
  }

  const solved = solveBoundedPolynomialEquationAst(
    ['Equal', exactPolynomialToNode(polynomial), 0],
    'u',
  );
  if (!solved) {
    return null;
  }

  const roots = solved.exactSolutions
    .map((latex) => {
      try {
        return buildSolvedRoot(ce.parse(latex).json);
      } catch {
        return null;
      }
    })
    .filter((root): root is InternalSolvedRoot => root !== null);

  return roots.length === solved.exactSolutions.length
    ? sortAndDedupeRoots(roots)
    : null;
}

function solveCarrierPolynomial(polynomialNode: unknown) {
  const polynomial = parseExactPolynomial(normalizeAst(polynomialNode), 'u', 4);
  if (!polynomial) {
    return { kind: 'none' } as const;
  }

  const degree = exactPolynomialDegree(polynomial);
  if (degree < 1 || degree > 4) {
    return { kind: 'none' } as const;
  }

  if (degree <= 2) {
    const roots = solveLinearOrQuadraticCarrierPolynomial(polynomial);
    if (roots === null) {
      return { kind: 'recognized' } as const;
    }
    return { kind: 'solved', roots } as const;
  }

  const roots = solveHigherDegreeCarrierPolynomial(polynomial);
  if (!roots) {
    return { kind: 'recognized' } as const;
  }

  return { kind: 'solved', roots } as const;
}

function buildPolynomialInCarrierNode(
  zeroFormNode: unknown,
  descriptor: SupportedCarrierDescriptor,
) {
  const targetPolynomial = parseExactPolynomial(expandNode(zeroFormNode), 'x', 8);
  if (!targetPolynomial) {
    return null;
  }

  const carrierPolynomial = parseExactPolynomial(expandNode(descriptor.node), 'x', 2);
  if (!carrierPolynomial) {
    return null;
  }

  const carrierDegree = exactPolynomialDegree(carrierPolynomial);
  if (carrierDegree < 1 || carrierDegree > 2) {
    return null;
  }

  const targetDegree = exactPolynomialDegree(targetPolynomial);
  const maxCarrierPower = Math.floor(targetDegree / carrierDegree);
  if (maxCarrierPower < 1 || maxCarrierPower > 4) {
    return null;
  }

  const carrierPowers: ExactPolynomial[] = [];
  const constantPolynomial = parseExactPolynomial(1, 'x', 8);
  if (!constantPolynomial) {
    return null;
  }
  carrierPowers.push(constantPolynomial);

  for (let power = 1; power <= maxCarrierPower; power += 1) {
    const nextPower = multiplyExactPolynomials(
      carrierPowers[power - 1],
      carrierPolynomial,
      8,
    );
    if (!nextPower) {
      return null;
    }
    carrierPowers.push(nextPower);
  }

  let remainder = targetPolynomial;
  const carrierTerms = new Map<number, ExactScalar>();

  for (let power = maxCarrierPower; power >= 1; power -= 1) {
    const carrierPower = carrierPowers[power];
    const degree = exactPolynomialDegree(carrierPower);
    const remainderDegree = exactPolynomialDegree(remainder);
    if (remainderDegree < degree) {
      continue;
    }
    if (remainderDegree > degree) {
      return null;
    }

    const scale = divideExactScalars(
      getExactPolynomialCoefficient(remainder, degree),
      exactPolynomialLeadingCoefficient(carrierPower),
    );
    if (!scale) {
      return null;
    }

    if (!isZeroExactScalar(scale)) {
      carrierTerms.set(power, scale);
      remainder = addExactPolynomials(
        remainder,
        scaleExactPolynomial(carrierPower, scale),
        -1,
      );
    }
  }

  for (const [degree, coefficient] of remainder.terms.entries()) {
    if (degree !== 0 && !isZeroExactScalar(coefficient)) {
      return null;
    }
  }

  const constant = getExactPolynomialCoefficient(remainder, 0);
  if (!isZeroExactScalar(constant)) {
    carrierTerms.set(0, constant);
  }

  return exactPolynomialToNode({
    variable: 'u',
    terms: carrierTerms,
  });
}

function buildRootsFromBranches(branches: SymbolicFamilyBranch[], zeroFormNode: unknown) {
  return sortAndDedupeRoots(
    dedupeSymbolicFamilyBranches(branches)
      .filter((branch) => Number.isFinite(branch.representativeValue))
      .map((branch) => ({
        latex: branch.latex,
        numeric: refineRootAgainstZeroForm(zeroFormNode, branch.representativeValue),
      })),
  );
}

function backsolveCarrierRoot(
  descriptor: SupportedCarrierDescriptor,
  root: InternalSolvedRoot,
  zeroFormNode: unknown,
): { roots: PolynomialCarrierSolvedRoot[]; exactSupplementLatex: string[] } {
  const rootBranch = buildSymbolicFamilyBranchFromNode(root.node, root.numeric);

  switch (descriptor.kind) {
    case 'affine':
      return {
        roots: buildRootsFromBranches(transformAffineBranches(descriptor.affineCarrier, [rootBranch]), zeroFormNode),
        exactSupplementLatex: [],
      };
    case 'even-power-affine': {
      const result = buildParameterizedPowerBranches(descriptor.powerCarrier, [rootBranch]);
      return {
        roots: buildRootsFromBranches(result.branches, zeroFormNode),
        exactSupplementLatex: result.parameterConstraintLatex,
      };
    }
    case 'shifted-even-power': {
      const shiftedBranches = buildShiftedCarrierBranches(descriptor.shiftedCarrier, [rootBranch]);
      const result = buildParameterizedPowerBranches(descriptor.innerPower, shiftedBranches);
      return {
        roots: buildRootsFromBranches(result.branches, zeroFormNode),
        exactSupplementLatex: result.parameterConstraintLatex,
      };
    }
    case 'quadratic': {
      const result = buildQuadraticBranches(descriptor.quadraticCarrier, [rootBranch]);
      return {
        roots: buildRootsFromBranches(result.branches, zeroFormNode),
        exactSupplementLatex: result.parameterConstraintLatex,
      };
    }
  }
}

function attemptSupportedCarrier(
  zeroFormNode: unknown,
  descriptor: SupportedCarrierDescriptor,
): PolynomialCarrierSolveAttempt {
  if (sameNode(zeroFormNode, descriptor.node)) {
    return { kind: 'none' };
  }

  const replaced = replaceCarrierNode(zeroFormNode, descriptor.node);
  const polynomialInCarrierNode =
    replaced.replacementCount > 0 && !dependsOnVariable(replaced.node, 'x')
      ? replaced.node
      : buildPolynomialInCarrierNode(zeroFormNode, descriptor);

  if (!polynomialInCarrierNode) {
    return { kind: 'none' };
  }

  const polynomialSolve = solveCarrierPolynomial(polynomialInCarrierNode);
  if (polynomialSolve.kind === 'none') {
    return { kind: 'none' };
  }

  if (polynomialSolve.kind === 'recognized') {
    return { kind: 'recognized' };
  }

  if (polynomialSolve.roots.length === 0) {
    return { kind: 'empty' };
  }

  const exactSupplementLatex: string[] = [];
  const roots = sortAndDedupeRoots(
    polynomialSolve.roots.flatMap((root) => {
      const backsolved = backsolveCarrierRoot(descriptor, root, zeroFormNode);
      exactSupplementLatex.push(...backsolved.exactSupplementLatex);
      return backsolved.roots;
    }),
  );

  if (roots.length === 0) {
    return { kind: 'empty' };
  }

  return {
    kind: 'solved',
    roots,
    exactSupplementLatex: mergeExactSupplementLatex(
      { latex: exactSupplementLatex, source: 'transform' },
    ),
  };
}

export function solveBoundedPolynomialCarrierEquationAst(
  node: unknown,
  preferredCarrierNodes: unknown[] = [],
): PolynomialCarrierSolveAttempt {
  const normalized = normalizeAst(node);
  const zeroFormNode =
    isNodeArray(normalized) && normalized[0] === 'Equal' && normalized.length === 3
      ? normalizeAst(['Subtract', normalized[1], normalized[2]])
      : normalized;

  const descriptors = collectSupportedCarrierDescriptors(zeroFormNode, preferredCarrierNodes);
  let sawRecognized = false;
  let sawEmpty = false;

  for (const descriptor of descriptors) {
    const attempt = attemptSupportedCarrier(zeroFormNode, descriptor);
    if (attempt.kind === 'solved') {
      return attempt;
    }

    if (attempt.kind === 'empty') {
      sawEmpty = true;
      continue;
    }

    if (attempt.kind === 'recognized') {
      sawRecognized = true;
    }
  }

  if (sawEmpty) {
    return { kind: 'empty' };
  }

  if (sawRecognized) {
    return { kind: 'recognized' };
  }

  return { kind: 'none' };
}
