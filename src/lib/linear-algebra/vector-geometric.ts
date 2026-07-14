import type {
  DisplayDetailSection,
  VectorOperation,
  VectorRequest,
  VectorResponse,
} from '../../types/calculator';
import {
  divideExactScalars,
  exactScalarIsZero,
  exactScalarToNumber,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { formatApproxNumber, scalarToLatex, vectorToLatex } from '../display/format';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  exactScalarMathJson,
  exactVectorMathJson,
  labelMathJson,
  numericVectorMathJson,
  operatorMathJson,
  textMathJson,
  type LinearAlgebraCanonicalDetailEvidence,
} from './canonical-evidence';
import {
  exactScalarToLatex,
  exactVectorFromNumeric,
  exactVectorFromWire,
  exactVectorToColumnLatex,
} from './exact-matrix-format';
import { scalar, type ExactVector } from './exact-matrix-core';
import {
  exactCrossVectors,
  exactDotVectors,
  exactGramDeterminant,
  exactScalarSquareRoot,
  exactScalarTripleProduct,
  exactSubtractVectors,
  exactVectorIsZero,
} from './exact-vector-core';
import type { VectorCoreResult } from './vector-core';

const GEOMETRIC_OPERATIONS = new Set<VectorOperation>([
  'parallel',
  'distance',
  'parallelogramArea',
  'triangleArea',
  'volume',
]);

export function isVectorGeometricOperation(operation: VectorOperation) {
  return GEOMETRIC_OPERATIONS.has(operation);
}

export function vectorGeometricNumericOperands(req: VectorRequest): number[][] {
  if (req.operation === 'volume') {
    return req.vectorOperands?.slice(0, 3)
      ?? [req.vectorA, ...(req.vectorB ? [req.vectorB] : [])];
  }
  return [req.vectorA, ...(req.vectorB ? [req.vectorB] : [])];
}

function exactVectorMatchesNumeric(exactVector: ExactVector, numericVector: number[]) {
  return exactVector.length === numericVector.length
    && exactVector.every((value, index) => (
      Math.abs(exactScalarToNumber(value) - numericVector[index]) <= 1e-12
    ));
}

function exactOperand(
  numericVector: number[],
  wire: VectorRequest['exactVectorA'],
): ExactVector | null {
  const fromWire = exactVectorFromWire(wire);
  if (fromWire && exactVectorMatchesNumeric(fromWire, numericVector)) return fromWire;
  return exactVectorFromNumeric(numericVector);
}

function exactOperands(req: VectorRequest): ExactVector[] | null {
  const numeric = vectorGeometricNumericOperands(req);
  const exact = numeric.map((operand, index) => exactOperand(
    operand,
    req.exactVectorOperands?.[index]
      ?? (index === 0 ? req.exactVectorA : index === 1 ? req.exactVectorB : undefined),
  ));
  return exact.every((operand): operand is ExactVector => operand !== null) ? exact : null;
}

function operandLabels(req: VectorRequest, count: number) {
  return Array.from({ length: count }, (_, index) => (
    req.vectorOperandLatexList?.[index]
    ?? (index === 0 ? req.vectorOperandLatexA : index === 1 ? req.vectorOperandLatexB : undefined)
    ?? (index === 0 ? 'u' : index === 1 ? 'v' : 'w')
  ));
}

function exactAbsolute(value: ExactScalar): ExactScalar {
  return scalar(Math.abs(value.numerator), value.denominator);
}

function exactRootValue(radicand: ExactScalar, divisor = 1) {
  if (radicand.numerator < 0) return null;
  const exactRoot = exactScalarSquareRoot(radicand);
  if (exactRoot) {
    const divided = divisor === 1 ? exactRoot : divideExactScalars(exactRoot, scalar(divisor));
    if (!divided) return null;
    return {
      latex: exactScalarToLatex(divided),
      mathJson: exactScalarMathJson(divided),
      numeric: exactScalarToNumber(divided),
    };
  }

  const rootLatex = `\\sqrt{${exactScalarToLatex(radicand)}}`;
  const rootMathJson = ['Sqrt', exactScalarMathJson(radicand)];
  return {
    latex: divisor === 1 ? rootLatex : `\\frac{${rootLatex}}{${divisor}}`,
    mathJson: divisor === 1 ? rootMathJson : ['Divide', rootMathJson, divisor],
    numeric: Math.sqrt(exactScalarToNumber(radicand)) / divisor,
  };
}

function mathDetail(
  canonicalLatex: string,
  mathJson: unknown,
  source: string,
): Extract<LinearAlgebraCanonicalDetailEvidence, { kind: 'math' }> {
  return { kind: 'math', value: canonicalLeafEvidence(canonicalLatex, mathJson, source) };
}

function gramDeterminantLatex(left: string, right: string, valueLatex: string) {
  return `\\Delta=(${left}\\cdot ${left})(${right}\\cdot ${right})-(${left}\\cdot ${right})^{2}=${valueLatex}`;
}

function gramDeterminantMathJson(left: unknown, right: unknown, value: unknown) {
  const dot = (first: unknown, second: unknown) => (
    operatorMathJson('dot', ['List', first, second])
  );
  return [
    'Equal',
    'Delta',
    [
      'Subtract',
      ['Multiply', dot(left, left), dot(right, right)],
      ['Power', dot(left, right), 2],
    ],
    value,
  ];
}

function normalDetail(
  leftLabel: string,
  rightLabel: string,
  leftNode: unknown,
  rightNode: unknown,
  normalLatex: string,
  normalNode: unknown,
  source: string,
) {
  const latex = `n=${leftLabel}\\times ${rightLabel}=${normalLatex}`;
  return mathDetail(
    latex,
    ['Equal', 'n', operatorMathJson('cross', ['List', leftNode, rightNode]), normalNode],
    source,
  );
}

function orientationText(signedVolume: number) {
  if (signedVolume > 0) return 'The ordered vectors have positive right-handed orientation.';
  if (signedVolume < 0) return 'The ordered vectors have negative left-handed orientation.';
  return 'The vectors are coplanar, so the oriented volume is zero.';
}

function exactGeometricResponse(
  req: VectorRequest,
  result: VectorCoreResult,
): VectorResponse | null {
  if (!isVectorGeometricOperation(req.operation) || result.kind === 'error') return null;
  const operands = exactOperands(req);
  if (!operands || operands.length < 2) return null;
  const [first, second, third] = operands;
  const labels = operandLabels(req, operands.length);
  const nodes = operands.map((operand, index) => labelMathJson(labels[index], exactVectorMathJson(operand)));
  const detailSections: DisplayDetailSection[] = [];
  const details: LinearAlgebraCanonicalDetailEvidence[] = [];

  if (req.operation === 'parallel') {
    if (exactVectorIsZero(first) || exactVectorIsZero(second)) return null;
    const determinant = exactGramDeterminant(first, second);
    const parallel = exactScalarIsZero(determinant);
    const resultLatex = parallel ? '\\text{Parallel}' : '\\text{Not parallel}';
    const determinantLatex = gramDeterminantLatex(
      labels[0],
      labels[1],
      exactScalarToLatex(determinant),
    );
    detailSections.push({ title: 'Parallelism Evidence', lineKind: 'math', lines: [determinantLatex] });
    details.push(mathDetail(
      determinantLatex,
      gramDeterminantMathJson(nodes[0], nodes[1], exactScalarMathJson(determinant)),
      'vector.parallel.native-exact-gram-determinant',
    ));
    return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
      resultLatex,
      approxText: `Gram determinant = ${exactScalarToLatex(determinant)}`,
      detailSections,
      warnings: [],
    }), {
      primary: canonicalLeafEvidence(
        resultLatex,
        textMathJson(parallel ? 'Parallel' : 'Not parallel'),
        'vector.parallel.native-exact-classification',
      ),
      details,
    });
  }

  let exactValue: { latex: string; mathJson: unknown; numeric: number } | null = null;
  if (req.operation === 'distance') {
    const difference = exactSubtractVectors(first, second);
    const radicand = exactDotVectors(difference, difference);
    exactValue = exactRootValue(radicand);
    if (!exactValue) return null;
    const line = `\\lVert ${labels[0]}-${labels[1]}\\rVert^{2}=${exactScalarToLatex(radicand)}`;
    detailSections.push({ title: 'Measure Evidence', lineKind: 'math', lines: [line] });
    details.push(mathDetail(
      line,
      ['Equal', ['Power', operatorMathJson('norm', ['Subtract', nodes[0], nodes[1]]), 2], exactScalarMathJson(radicand)],
      'vector.distance.native-exact-squared-distance',
    ));
  } else if (req.operation === 'parallelogramArea' || req.operation === 'triangleArea') {
    const determinant = exactGramDeterminant(first, second);
    exactValue = exactRootValue(determinant, req.operation === 'triangleArea' ? 2 : 1);
    if (!exactValue) return null;
    const determinantLatex = gramDeterminantLatex(
      labels[0],
      labels[1],
      exactScalarToLatex(determinant),
    );
    detailSections.push({ title: 'Measure Evidence', lineKind: 'math', lines: [determinantLatex] });
    details.push(mathDetail(
      determinantLatex,
      gramDeterminantMathJson(nodes[0], nodes[1], exactScalarMathJson(determinant)),
      'vector.area.native-exact-gram-determinant',
    ));
    if (first.length === 3) {
      const normal = exactCrossVectors(first, second)!;
      const normalEvidence = normalDetail(
        labels[0],
        labels[1],
        nodes[0],
        nodes[1],
        exactVectorToColumnLatex(normal),
        exactVectorMathJson(normal),
        'vector.area.native-exact-oriented-normal',
      );
      detailSections.push({
        title: '3D Geometry',
        lines: [normalEvidence.value.canonicalLatex, 'The cross product gives the right-hand-rule oriented normal.'],
        lineKinds: ['math', 'text'],
      });
      details.push(normalEvidence);
    }
  } else if (req.operation === 'volume') {
    if (!third || first.length !== 3 || second.length !== 3 || third.length !== 3) return null;
    const normal = exactCrossVectors(first, second)!;
    const signed = exactScalarTripleProduct(first, second, third)!;
    const absolute = exactAbsolute(signed);
    exactValue = {
      latex: exactScalarToLatex(absolute),
      mathJson: exactScalarMathJson(absolute),
      numeric: exactScalarToNumber(absolute),
    };
    const normalEvidence = normalDetail(
      labels[0],
      labels[1],
      nodes[0],
      nodes[1],
      exactVectorToColumnLatex(normal),
      exactVectorMathJson(normal),
      'vector.volume.native-exact-oriented-normal',
    );
    const signedLatex = `s=(${labels[0]}\\times ${labels[1]})\\cdot ${labels[2]}=${exactScalarToLatex(signed)}`;
    const signedEvidence = mathDetail(
      signedLatex,
      ['Equal', 's', operatorMathJson('dot', ['List', operatorMathJson('cross', ['List', nodes[0], nodes[1]]), nodes[2]]), exactScalarMathJson(signed)],
      'vector.volume.native-exact-signed-triple-product',
    );
    detailSections.push({
      title: '3D Geometry',
      lines: [normalEvidence.value.canonicalLatex, signedLatex, orientationText(exactScalarToNumber(signed))],
      lineKinds: ['math', 'math', 'text'],
    });
    details.push(normalEvidence, signedEvidence);
  }

  if (!exactValue) return null;
  const response = profileLinearAlgebraResult({
    resultLatex: exactValue.latex,
    approxText: formatApproxNumber(exactValue.numeric, { approxDigits: req.approxDigits }),
    detailSections,
    warnings: [],
  });
  return attachLinearAlgebraCanonicalEvidence(response, {
    primary: canonicalLeafEvidence(
      exactValue.latex,
      exactValue.mathJson,
      `vector.${req.operation}.native-exact-measure`,
    ),
    details,
  });
}

function numericGeometricResponse(
  req: VectorRequest,
  result: VectorCoreResult,
): VectorResponse | null {
  if (!isVectorGeometricOperation(req.operation) || result.kind === 'error') return null;
  const operands = vectorGeometricNumericOperands(req);
  const labels = operandLabels(req, operands.length);
  const nodes = operands.map((operand, index) => labelMathJson(labels[index], numericVectorMathJson(operand)));

  if (result.kind === 'parallelism') {
    const resultLatex = result.parallel ? '\\text{Parallel}' : '\\text{Not parallel}';
    const determinantLatex = gramDeterminantLatex(labels[0], labels[1], scalarToLatex(result.gramDeterminant));
    const parallelismSections: DisplayDetailSection[] = [
      { title: 'Parallelism Evidence', lineKind: 'math', lines: [determinantLatex] },
    ];
    return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
      resultLatex,
      approxText: `Gram determinant = ${formatApproxNumber(result.gramDeterminant, { approxDigits: req.approxDigits })}`,
      detailSections: parallelismSections,
      warnings: [],
    }), {
      primary: canonicalLeafEvidence(
        resultLatex,
        textMathJson(result.parallel ? 'Parallel' : 'Not parallel'),
        'vector.parallel.native-numeric-classification',
      ),
      details: [mathDetail(
        determinantLatex,
        gramDeterminantMathJson(nodes[0], nodes[1], result.gramDeterminant),
        'vector.parallel.native-numeric-gram-determinant',
      )],
    });
  }

  if (result.kind !== 'geometricScalar') return null;
  const resultLatex = scalarToLatex(result.value);
  const detailSections: DisplayDetailSection[] = [];
  const details: LinearAlgebraCanonicalDetailEvidence[] = [];
  if (result.measure === 'distance' && result.radicand !== undefined) {
    const line = `\\lVert ${labels[0]}-${labels[1]}\\rVert^{2}=${scalarToLatex(result.radicand)}`;
    detailSections.push({ title: 'Measure Evidence', lineKind: 'math', lines: [line] });
    details.push(mathDetail(
      line,
      ['Equal', ['Power', operatorMathJson('norm', ['Subtract', nodes[0], nodes[1]]), 2], result.radicand],
      'vector.distance.native-numeric-squared-distance',
    ));
  }
  if ((result.measure === 'parallelogramArea' || result.measure === 'triangleArea') && result.radicand !== undefined) {
    const determinantLatex = gramDeterminantLatex(labels[0], labels[1], scalarToLatex(result.radicand));
    detailSections.push({ title: 'Measure Evidence', lineKind: 'math', lines: [determinantLatex] });
    details.push(mathDetail(
      determinantLatex,
      gramDeterminantMathJson(nodes[0], nodes[1], result.radicand),
      'vector.area.native-numeric-gram-determinant',
    ));
  }
  if (result.normal && result.measure !== 'distance') {
    const normalEvidence = normalDetail(
      labels[0],
      labels[1],
      nodes[0],
      nodes[1],
      vectorToLatex(result.normal),
      numericVectorMathJson(result.normal),
      `vector.${result.measure}.native-numeric-oriented-normal`,
    );
    const lines = [normalEvidence.value.canonicalLatex];
    const lineKinds: Array<'math' | 'text'> = ['math'];
    details.push(normalEvidence);
    if (result.measure === 'volume' && result.signedVolume !== undefined && nodes[2]) {
      const signedLatex = `s=(${labels[0]}\\times ${labels[1]})\\cdot ${labels[2]}=${scalarToLatex(result.signedVolume)}`;
      const signedEvidence = mathDetail(
        signedLatex,
        ['Equal', 's', operatorMathJson('dot', ['List', operatorMathJson('cross', ['List', nodes[0], nodes[1]]), nodes[2]]), result.signedVolume],
        'vector.volume.native-numeric-signed-triple-product',
      );
      lines.push(signedLatex, orientationText(result.signedVolume));
      lineKinds.push('math', 'text');
      details.push(signedEvidence);
    } else {
      lines.push('The cross product gives the right-hand-rule oriented normal.');
      lineKinds.push('text');
    }
    detailSections.push({ title: '3D Geometry', lines, lineKinds });
  }

  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult({
    resultLatex,
    approxText: formatApproxNumber(result.value, { approxDigits: req.approxDigits }),
    detailSections,
    warnings: [],
  }), {
    primary: canonicalLeafEvidence(
      resultLatex,
      result.value,
      `vector.${result.measure}.native-numeric-measure`,
    ),
    details,
  });
}

export function vectorGeometricResponse(
  req: VectorRequest,
  result: VectorCoreResult,
): VectorResponse | null {
  return exactGeometricResponse(req, result) ?? numericGeometricResponse(req, result);
}
