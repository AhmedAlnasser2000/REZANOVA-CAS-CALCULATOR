import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  DisplayDetailSection,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  ScalarVectorRequestV1,
  VectorResponse,
} from '../../types/calculator';
import { profileLinearAlgebraResult } from '../display/printer';
import {
  attachLinearAlgebraCanonicalEvidence,
  canonicalLeafEvidence,
  type LinearAlgebraCanonicalDetailEvidence,
  type LinearAlgebraCanonicalEvidence,
} from './canonical-evidence';
import {
  symbolicScalarAbs,
  symbolicScalarAdd,
  symbolicScalarApproxText,
  symbolicScalarArccos,
  symbolicScalarConjugate,
  symbolicScalarDivide,
  symbolicScalarFromMathJson,
  symbolicScalarMultiply,
  symbolicScalarScaleByRational,
  symbolicScalarSqrt,
  symbolicScalarSubtract,
  symbolicScalarZeroStatus,
} from './symbolic-scalar-core';

type SymbolicVector = LinearAlgebraScalarWireV1[];

const ce = new ComputeEngine();
const MAX_SYMBOLIC_VECTOR_DIMENSION = 8;

function scalarFromNode(node: unknown, domain: LinearAlgebraScalarDomain) {
  const result = symbolicScalarFromMathJson(node, domain);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function zero(domain: LinearAlgebraScalarDomain) {
  return scalarFromNode(0, domain);
}

function vectorMathJson(vector: SymbolicVector) {
  return ['Matrix', ['List', ...vector.map((value) => ['List', value.mathJson])], "'[]'"];
}

function vectorSetMathJson(vectors: readonly SymbolicVector[]) {
  return vectors.length > 0 ? ['Set', ...vectors.map(vectorMathJson)] : 'EmptySet';
}

function vectorLatex(vector: SymbolicVector) {
  return `\\begin{bmatrix}${vector.map((value) => value.canonicalLatex).join('\\\\')}\\end{bmatrix}`;
}

function vectorSetLatex(label: string, vectors: readonly SymbolicVector[]) {
  return `${label}=\\left\\{${vectors.map(vectorLatex).join(',')}\\right\\}`;
}

function mathJsonLatex(value: unknown) {
  return ce.box(value as never, { form: 'structural' }).latex;
}

function conditionEvidence(
  value: LinearAlgebraScalarWireV1,
  relation: 'nonzero' | 'zero',
  source: string,
) {
  const mathJson = [relation === 'nonzero' ? 'NotEqual' : 'Equal', value.mathJson, 0];
  return canonicalLeafEvidence(mathJsonLatex(mathJson), mathJson, source);
}

function responseWithEvidence(
  response: VectorResponse,
  evidence: LinearAlgebraCanonicalEvidence,
) {
  return attachLinearAlgebraCanonicalEvidence(profileLinearAlgebraResult(response), evidence);
}

function scalarResponse(input: {
  value: LinearAlgebraScalarWireV1;
  source: string;
  request: ScalarVectorRequestV1;
  resultLatex?: string;
  resultMathJson?: unknown;
  supplements?: LinearAlgebraCanonicalEvidence['supplements'];
  semanticPrimary?: LinearAlgebraCanonicalEvidence['semanticPrimary'];
}) {
  const resultLatex = input.resultLatex ?? input.value.canonicalLatex;
  return responseWithEvidence({
    resultLatex,
    approxText: symbolicScalarApproxText(
      input.value,
      input.request.complexExactForm ?? 'rectangular',
    ),
    ...(input.supplements?.length
      ? { exactSupplementLatex: input.supplements.map((entry) => entry.canonicalLatex) }
      : {}),
    warnings: [],
  }, {
    ...(input.semanticPrimary
      ? { semanticPrimary: input.semanticPrimary }
      : {
          primary: canonicalLeafEvidence(
            resultLatex,
            input.resultMathJson ?? input.value.mathJson,
            input.source,
          ),
        }),
    ...(input.supplements?.length ? { supplements: input.supplements } : {}),
  });
}

function vectorResponse(input: {
  vector: SymbolicVector;
  source: string;
  supplements?: LinearAlgebraCanonicalEvidence['supplements'];
  detailSections?: DisplayDetailSection[];
  details?: LinearAlgebraCanonicalDetailEvidence[];
}) {
  const resultLatex = vectorLatex(input.vector);
  return responseWithEvidence({
    resultLatex,
    ...(input.supplements?.length
      ? { exactSupplementLatex: input.supplements.map((entry) => entry.canonicalLatex) }
      : {}),
    ...(input.detailSections ? { detailSections: input.detailSections } : {}),
    warnings: [],
  }, {
    primary: canonicalLeafEvidence(resultLatex, vectorMathJson(input.vector), input.source),
    ...(input.supplements?.length ? { supplements: input.supplements } : {}),
    ...(input.details ? { details: input.details } : {}),
  });
}

function errorResponse(error: string): VectorResponse {
  return { warnings: [], error };
}

function validateVector(vector: SymbolicVector | undefined, name: string) {
  if (!vector?.length) return `${name} is required for this operation.`;
  if (vector.length > MAX_SYMBOLIC_VECTOR_DIMENSION) {
    return `Symbolic Vector operations support dimensions through ${MAX_SYMBOLIC_VECTOR_DIMENSION}.`;
  }
  return null;
}

function sameDimension(left: SymbolicVector, right: SymbolicVector) {
  return left.length === right.length;
}

function addVectors(
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  return left.map((value, index) => symbolicScalarAdd(value, right[index], domain));
}

function subtractVectors(
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  return left.map((value, index) => symbolicScalarSubtract(value, right[index], domain));
}

function scaleVector(
  scalar: LinearAlgebraScalarWireV1,
  vector: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  return vector.map((value) => symbolicScalarMultiply(scalar, value, domain));
}

function innerProduct(
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  return left.reduce((total, value, index) => symbolicScalarAdd(
    total,
    symbolicScalarMultiply(
      symbolicScalarConjugate(value, domain),
      right[index],
      domain,
    ),
    domain,
  ), zero(domain));
}

function normSquared(vector: SymbolicVector, domain: LinearAlgebraScalarDomain) {
  return innerProduct(vector, vector, domain);
}

function norm(vector: SymbolicVector, domain: LinearAlgebraScalarDomain) {
  return symbolicScalarSqrt(normSquared(vector, domain), domain);
}

function nonzeroCondition(
  value: LinearAlgebraScalarWireV1,
  source: string,
): NonNullable<LinearAlgebraCanonicalEvidence['supplements']> | { error: string } {
  const status = symbolicScalarZeroStatus(value);
  if (status === 'zero') return { error: 'This operation requires a nonzero vector or denominator.' };
  return status === 'unknown' ? [conditionEvidence(value, 'nonzero', source)] : [];
}

function projection(
  base: SymbolicVector,
  value: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  const denominator = innerProduct(base, base, domain);
  const numerator = innerProduct(base, value, domain);
  const factor = symbolicScalarDivide(numerator, denominator, domain);
  return { vector: scaleVector(factor, base, domain), denominator };
}

function crossProduct(
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  if (left.length !== 3 || right.length !== 3) return null;
  return [
    symbolicScalarSubtract(
      symbolicScalarMultiply(left[1], right[2], domain),
      symbolicScalarMultiply(left[2], right[1], domain),
      domain,
    ),
    symbolicScalarSubtract(
      symbolicScalarMultiply(left[2], right[0], domain),
      symbolicScalarMultiply(left[0], right[2], domain),
      domain,
    ),
    symbolicScalarSubtract(
      symbolicScalarMultiply(left[0], right[1], domain),
      symbolicScalarMultiply(left[1], right[0], domain),
      domain,
    ),
  ];
}

function gramDeterminant2(
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  const uu = innerProduct(left, left, domain);
  const uv = innerProduct(left, right, domain);
  const vu = innerProduct(right, left, domain);
  const vv = innerProduct(right, right, domain);
  return symbolicScalarSubtract(
    symbolicScalarMultiply(uu, vv, domain),
    symbolicScalarMultiply(uv, vu, domain),
    domain,
  );
}

function determinant3(
  matrix: readonly [SymbolicVector, SymbolicVector, SymbolicVector],
  domain: LinearAlgebraScalarDomain,
) {
  const [a, b, c] = matrix;
  const first = symbolicScalarMultiply(
    a[0],
    symbolicScalarSubtract(
      symbolicScalarMultiply(b[1], c[2], domain),
      symbolicScalarMultiply(b[2], c[1], domain),
      domain,
    ),
    domain,
  );
  const second = symbolicScalarMultiply(
    a[1],
    symbolicScalarSubtract(
      symbolicScalarMultiply(b[0], c[2], domain),
      symbolicScalarMultiply(b[2], c[0], domain),
      domain,
    ),
    domain,
  );
  const third = symbolicScalarMultiply(
    a[2],
    symbolicScalarSubtract(
      symbolicScalarMultiply(b[0], c[1], domain),
      symbolicScalarMultiply(b[1], c[0], domain),
      domain,
    ),
    domain,
  );
  return symbolicScalarAdd(symbolicScalarSubtract(first, second, domain), third, domain);
}

function gramDeterminant3(
  vectors: readonly [SymbolicVector, SymbolicVector, SymbolicVector],
  domain: LinearAlgebraScalarDomain,
) {
  const rows = vectors.map((left) => vectors.map((right) => innerProduct(left, right, domain)));
  return determinant3(rows as [SymbolicVector, SymbolicVector, SymbolicVector], domain);
}

function classificationResponse(input: {
  labelTrue: string;
  labelFalse: string;
  conditionMathJson: unknown;
  conditionStatus: 'true' | 'false' | 'unknown';
  source: string;
  supplements?: LinearAlgebraCanonicalEvidence['supplements'];
}) {
  const label = input.conditionStatus === 'true'
    ? input.labelTrue
    : input.conditionStatus === 'false'
      ? input.labelFalse
      : undefined;
  const mathJson = label
    ? `'${label}'`
    : ['Which',
        input.conditionMathJson,
        `'${input.labelTrue}'`,
        ['Not', input.conditionMathJson],
        `'${input.labelFalse}'`,
      ];
  const resultLatex = label ? `\\text{${label}}` : mathJsonLatex(mathJson);
  return responseWithEvidence({
    resultLatex,
    ...(input.supplements?.length
      ? { exactSupplementLatex: input.supplements.map((entry) => entry.canonicalLatex) }
      : {}),
    warnings: [],
  }, {
    primary: canonicalLeafEvidence(resultLatex, mathJson, input.source),
    ...(input.supplements?.length ? { supplements: input.supplements } : {}),
  });
}

function orthogonalityResponse(
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  const product = innerProduct(left, right, domain);
  const status = symbolicScalarZeroStatus(product);
  return classificationResponse({
    labelTrue: 'Orthogonal',
    labelFalse: 'Not orthogonal',
    conditionMathJson: ['Equal', product.mathJson, 0],
    conditionStatus: status === 'zero' ? 'true' : status === 'nonzero' ? 'false' : 'unknown',
    source: 'vector.orthogonality.native-symbolic-hermitian-classification',
  });
}

function parallelResponse(
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  const leftNorm = normSquared(left, domain);
  const rightNorm = normSquared(right, domain);
  const leftCondition = nonzeroCondition(leftNorm, 'vector.parallel.left-nonzero-condition');
  const rightCondition = nonzeroCondition(rightNorm, 'vector.parallel.right-nonzero-condition');
  if ('error' in leftCondition || 'error' in rightCondition) {
    return errorResponse('Parallel direction requires two nonzero vectors.');
  }
  const minors: LinearAlgebraScalarWireV1[] = [];
  for (let row = 0; row < left.length; row += 1) {
    for (let column = row + 1; column < left.length; column += 1) {
      minors.push(symbolicScalarSubtract(
        symbolicScalarMultiply(left[row], right[column], domain),
        symbolicScalarMultiply(left[column], right[row], domain),
        domain,
      ));
    }
  }
  const statuses = minors.map(symbolicScalarZeroStatus);
  const status = statuses.some((entry) => entry === 'nonzero')
    ? 'false'
    : statuses.every((entry) => entry === 'zero')
      ? 'true'
      : 'unknown';
  const equalities = minors.map((minor) => ['Equal', minor.mathJson, 0]);
  const conditionMathJson = equalities.length === 0
    ? 'True'
    : equalities.length === 1
      ? equalities[0]
      : ['And', ...equalities];
  return classificationResponse({
    labelTrue: 'Parallel',
    labelFalse: 'Not parallel',
    conditionMathJson,
    conditionStatus: status,
    source: 'vector.parallel.native-symbolic-minor-classification',
    supplements: [...leftCondition, ...rightCondition],
  });
}

function angleResponse(
  request: ScalarVectorRequestV1,
  left: SymbolicVector,
  right: SymbolicVector,
  domain: LinearAlgebraScalarDomain,
) {
  const leftSquared = normSquared(left, domain);
  const rightSquared = normSquared(right, domain);
  const leftCondition = nonzeroCondition(leftSquared, 'vector.angle.left-nonzero-condition');
  const rightCondition = nonzeroCondition(rightSquared, 'vector.angle.right-nonzero-condition');
  if ('error' in leftCondition || 'error' in rightCondition) {
    return errorResponse('Angle is undefined when one vector has zero length.');
  }
  const denominator = symbolicScalarMultiply(
    symbolicScalarSqrt(leftSquared, domain),
    symbolicScalarSqrt(rightSquared, domain),
    domain,
  );
  const product = innerProduct(left, right, domain);
  const numerator = domain === 'complex' ? symbolicScalarAbs(product, domain) : product;
  const radians = symbolicScalarArccos(
    symbolicScalarDivide(numerator, denominator, domain),
    domain,
  );
  const magnitude = request.angleUnit === 'rad'
    ? radians
    : symbolicScalarDivide(
        symbolicScalarScaleByRational(
          radians,
          request.angleUnit === 'deg' ? 180 : 200,
          1,
          domain,
        ),
        scalarFromNode('Pi', domain),
        domain,
      );
  const supplements = [...leftCondition, ...rightCondition];
  if (request.angleUnit === 'grad') {
    const resultLatex = `${magnitude.canonicalLatex}^{g}`;
    const magnitudeEvidence = canonicalLeafEvidence(
      magnitude.canonicalLatex,
      magnitude.mathJson,
      'vector.angle.native-symbolic-principal-line-magnitude',
    );
    return scalarResponse({
      value: magnitude,
      request,
      resultLatex,
      source: 'vector.angle.native-symbolic-principal-line',
      supplements,
      semanticPrimary: { kind: 'angle-quantity', magnitude: magnitudeEvidence, unit: 'grad' },
    });
  }
  const resultLatex = request.angleUnit === 'deg'
    ? `${magnitude.canonicalLatex}^{\\circ}`
    : magnitude.canonicalLatex;
  return scalarResponse({
    value: magnitude,
    request,
    resultLatex,
    resultMathJson: request.angleUnit === 'deg'
      ? ['Degrees', magnitude.mathJson]
      : magnitude.mathJson,
    source: 'vector.angle.native-symbolic-principal-line',
    supplements,
  });
}

function gramSchmidtResponse(
  operands: SymbolicVector[],
  domain: LinearAlgebraScalarDomain,
) {
  if (operands.length < 2 || operands.length > 4 || operands.some((vector) => vector.length > 4)) {
    return errorResponse('Gram-Schmidt supports 2–4 symbolic vectors through dimension 4.');
  }
  const hasFormalEntry = operands.some((vector) =>
    vector.some((entry) => entry.exactComplexRational === undefined));
  if (hasFormalEntry && operands.length > 2) {
    return errorResponse(
      'Bounded symbolic Gram-Schmidt supports two formal vectors; substitute parameters or reduce the input family.',
    );
  }
  const basis: SymbolicVector[] = [];
  const supplements: NonNullable<LinearAlgebraCanonicalEvidence['supplements']> = [];
  for (const operand of operands) {
    let residual = operand;
    for (const previous of basis) {
      const projected = projection(previous, operand, domain);
      const condition = nonzeroCondition(
        projected.denominator,
        'vector.gram-schmidt.projection-denominator-condition',
      );
      if ('error' in condition) continue;
      supplements.push(...condition);
      residual = subtractVectors(residual, projected.vector, domain);
    }
    const residualNorm = normSquared(residual, domain);
    const status = symbolicScalarZeroStatus(residualNorm);
    if (status === 'zero') continue;
    if (status === 'unknown') {
      supplements.push(conditionEvidence(
        residualNorm,
        'nonzero',
        'vector.gram-schmidt.residual-nonzero-condition',
      ));
    }
    basis.push(residual);
  }
  if (basis.length === 0) return errorResponse('Gram-Schmidt needs at least one nonzero vector.');
  const orthonormal = basis.map((vector) => {
    const length = norm(vector, domain);
    return vector.map((entry) => symbolicScalarDivide(entry, length, domain));
  });
  const resultLatex = vectorSetLatex('\\operatorname{orthogonal\\ basis}', basis);
  const answerRows = {
    rows: basis.map((vector, index) => ({ latex: `w_{${index + 1}}=${vectorLatex(vector)}` })),
  };
  const orthonormalLatex = vectorSetLatex('\\operatorname{orthonormal\\ basis}', orthonormal);
  const detailSections: DisplayDetailSection[] = [{
    title: 'Orthonormal Basis',
    lineKind: 'math',
    lines: [orthonormalLatex],
  }];
  return responseWithEvidence({
    resultLatex,
    answerRows,
    exactSupplementLatex: supplements.map((entry) => entry.canonicalLatex),
    detailSections,
    warnings: [],
  }, {
    primary: canonicalLeafEvidence(
      resultLatex,
      ['Equal', 'orthogonalbasis', vectorSetMathJson(basis)],
      'vector.gram-schmidt.native-symbolic-basis',
    ),
    answerRows: basis.map((vector, index) => canonicalLeafEvidence(
      answerRows.rows[index].latex,
      ['Equal', `w_${index + 1}`, vectorMathJson(vector)],
      'vector.gram-schmidt.native-symbolic-answer-row',
    )),
    supplements,
    details: [{
      kind: 'math',
      value: canonicalLeafEvidence(
        orthonormalLatex,
        ['Equal', 'orthonormalbasis', vectorSetMathJson(orthonormal)],
        'vector.gram-schmidt.native-symbolic-orthonormal-basis',
      ),
    }],
  });
}

function symbolicVectorOperands(request: ScalarVectorRequestV1) {
  return request.vectorOperands?.map((operand) => operand.resolved)
    ?? [request.vectorA.resolved, ...(request.vectorB ? [request.vectorB.resolved] : [])];
}

export function runSymbolicVectorOperation(request: ScalarVectorRequestV1): VectorResponse {
  const domain = request.domain ?? 'real';
  const left = request.vectorA.resolved;
  const right = request.vectorB?.resolved;
  const leftError = validateVector(left, 'Vector u');
  if (leftError) return errorResponse(leftError);
  const needsRight = !['normA', 'unitA'].includes(request.operation);
  const rightError = needsRight ? validateVector(right, 'Vector v') : null;
  if (rightError) return errorResponse(rightError);
  if (right && !sameDimension(left, right) && request.operation !== 'volume') {
    return errorResponse('Vector dimensions must match.');
  }

  try {
    switch (request.operation) {
      case 'add':
        return vectorResponse({
          vector: addVectors(left, right!, domain),
          source: 'vector.add.native-symbolic-vector',
        });
      case 'subtract':
        return vectorResponse({
          vector: subtractVectors(left, right!, domain),
          source: 'vector.subtract.native-symbolic-vector',
        });
      case 'dot':
        return scalarResponse({
          value: innerProduct(left, right!, domain),
          request,
          source: domain === 'complex'
            ? 'vector.dot.native-symbolic-hermitian-inner-product'
            : 'vector.dot.native-symbolic-real-inner-product',
        });
      case 'cross': {
        const vector = crossProduct(left, right!, domain);
        return vector
          ? vectorResponse({ vector, source: 'vector.cross.native-symbolic-algebraic-vector' })
          : errorResponse('Cross product requires 3D vectors.');
      }
      case 'normA':
      case 'normB': {
        const vector = request.operation === 'normA' ? left : right!;
        return scalarResponse({
          value: norm(vector, domain),
          request,
          source: 'vector.norm.native-symbolic-hermitian-norm',
        });
      }
      case 'unitA':
      case 'unitB': {
        const vector = request.operation === 'unitA' ? left : right!;
        const squared = normSquared(vector, domain);
        const condition = nonzeroCondition(squared, 'vector.unit.nonzero-condition');
        if ('error' in condition) return errorResponse('Unit vector is undefined for the zero vector.');
        const length = symbolicScalarSqrt(squared, domain);
        return vectorResponse({
          vector: vector.map((entry) => symbolicScalarDivide(entry, length, domain)),
          source: 'vector.unit.native-symbolic-vector',
          supplements: condition,
        });
      }
      case 'projectionUofV':
      case 'projectionVofU':
      case 'orthogonalToU':
      case 'orthogonalToV': {
        const base = request.operation === 'projectionUofV' || request.operation === 'orthogonalToU'
          ? left
          : right!;
        const value = request.operation === 'projectionUofV' || request.operation === 'orthogonalToU'
          ? right!
          : left;
        const projected = projection(base, value, domain);
        const condition = nonzeroCondition(
          projected.denominator,
          'vector.projection.nonzero-denominator-condition',
        );
        if ('error' in condition) return errorResponse('Projection needs a nonzero vector to project onto.');
        const vector = request.operation === 'orthogonalToU' || request.operation === 'orthogonalToV'
          ? subtractVectors(value, projected.vector, domain)
          : projected.vector;
        return vectorResponse({
          vector,
          source: request.operation.startsWith('orthogonal')
            ? 'vector.orthogonal-component.native-symbolic-vector'
            : 'vector.projection.native-symbolic-hermitian-vector',
          supplements: condition,
        });
      }
      case 'angle':
        return angleResponse(request, left, right!, domain);
      case 'orthogonalCheck':
        return orthogonalityResponse(left, right!, domain);
      case 'parallel':
        return parallelResponse(left, right!, domain);
      case 'distance':
        return scalarResponse({
          value: norm(subtractVectors(left, right!, domain), domain),
          request,
          source: 'vector.distance.native-symbolic-hermitian-norm',
        });
      case 'parallelogramArea':
      case 'triangleArea': {
        let area = symbolicScalarSqrt(gramDeterminant2(left, right!, domain), domain);
        if (request.operation === 'triangleArea') {
          area = symbolicScalarScaleByRational(area, 1, 2, domain);
        }
        return scalarResponse({
          value: area,
          request,
          source: domain === 'complex'
            ? 'vector.area.native-symbolic-hermitian-gram-determinant'
            : 'vector.area.native-symbolic-real-gram-determinant',
        });
      }
      case 'volume': {
        const operands = symbolicVectorOperands(request);
        if (operands.length !== 3 || operands.some((vector) => vector.length !== operands[0].length)) {
          return errorResponse('Volume requires three vectors with matching dimensions.');
        }
        return scalarResponse({
          value: symbolicScalarSqrt(
            gramDeterminant3(operands as [SymbolicVector, SymbolicVector, SymbolicVector], domain),
            domain,
          ),
          request,
          source: domain === 'complex'
            ? 'vector.volume.native-symbolic-hermitian-gram-determinant'
            : 'vector.volume.native-symbolic-real-gram-determinant',
        });
      }
      case 'gramSchmidtUV':
        return gramSchmidtResponse(symbolicVectorOperands(request), domain);
      case 'linearCombination': {
        const operands = symbolicVectorOperands(request);
        if (operands.some((vector) => vector.length !== operands[0].length)) {
          return errorResponse('Vector dimensions must match.');
        }
        const combined = operands.reduce(
          (total, vector) => addVectors(total, vector, domain),
          operands[0].map(() => zero(domain)),
        );
        return vectorResponse({
          vector: combined,
          source: 'vector.linear-combination.native-symbolic-vector',
        });
      }
      case 'span':
      case 'independent':
        return errorResponse(
          'Symbolic span and independence require the bounded elimination classifier in Milestone 11.',
        );
      default:
        return errorResponse('Unsupported symbolic Vector operation.');
    }
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Symbolic Vector evaluation stopped safely.');
  }
}

export const symbolicVectorTesting = {
  innerProduct,
  vectorMathJson,
};

export {
  addVectors as addSymbolicVectors,
  crossProduct as crossSymbolicVectors,
  scaleVector as scaleSymbolicVector,
  subtractVectors as subtractSymbolicVectors,
};
