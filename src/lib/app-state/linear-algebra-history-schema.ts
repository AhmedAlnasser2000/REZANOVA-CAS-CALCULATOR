import { z } from 'zod';
import { validateSerializableMathJson } from '../display/printer';
import { findCustomMathJsonOperator } from '../result-contract/standard-mathjson-operators';
import { linearAlgebraScalarWireIntegrityError } from '../linear-algebra/scalar-wire';

const matrixOperationSchema = z.enum([
  'add', 'subtract', 'multiply', 'transposeA', 'transposeB', 'adjointA', 'adjointB', 'detA', 'detB',
  'inverseA', 'inverseB', 'rankA', 'rankB', 'rrefA', 'rrefB', 'nullSpaceA',
  'nullSpaceB', 'columnSpaceA', 'columnSpaceB', 'basisA', 'basisB',
  'coordinatesA', 'coordinatesB', 'changeBasis', 'luA', 'luB', 'pluA', 'pluB',
  'luSolveA', 'luSolveB', 'pluSolveA', 'pluSolveB', 'multiRhsSolve', 'qrA', 'qrB',
  'columnProjectionA', 'columnProjectionB', 'leastSquaresA', 'leastSquaresB',
  'invertibilityA', 'invertibilityB', 'profileA', 'profileB', 'definiteA',
  'definiteB', 'svdA', 'svdB', 'pinvA', 'pinvB', 'condA', 'condB', 'nrankA',
  'nrankB', 'charpolyA', 'charpolyB', 'eigenA', 'eigenB', 'diagonalizeA', 'diagonalizeB', 'spectralPowerA',
  'spectralPowerB', 'linearSystem',
]);
const matrixSystemFormSchema = z.enum(['Ax=b', 'Ax+b=0']);
const vectorOperationSchema = z.enum([
  'dot', 'cross', 'normA', 'normB', 'angle', 'add', 'subtract', 'projectionUofV',
  'projectionVofU', 'orthogonalToU', 'orthogonalToV', 'unitA', 'unitB',
  'orthogonalCheck', 'gramSchmidtUV', 'parallel', 'distance', 'parallelogramArea',
  'triangleArea', 'volume', 'linearCombination', 'span', 'independent',
]);
const angleUnitSchema = z.enum(['deg', 'rad', 'grad']);
const complexExactFormSchema = z.enum(['rectangular', 'polar', 'cis']);
const numericMatrixSchema = z.array(z.array(z.number().finite()));
const numericVectorSchema = z.array(z.number().finite());
const exactScalarWireSchema = z.object({
  numerator: z.number().int().safe(),
  denominator: z.number().int().safe().positive(),
}).strict();
const scalarWireV1Schema = z.object({
  version: z.literal(1),
  canonicalLatex: z.string().trim().min(1),
  mathJson: z.unknown(),
  exactRational: exactScalarWireSchema.optional(),
  exactComplexRational: z.object({
    re: exactScalarWireSchema,
    im: exactScalarWireSchema,
  }).strict().optional(),
}).strict().superRefine((wire, context) => {
  const validation = validateSerializableMathJson(wire.mathJson);
  if (!validation.ok) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['mathJson'], message: validation.failure.message });
    return;
  }
  const customOperator = findCustomMathJsonOperator(validation.validated.value);
  if (customOperator) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mathJson'],
      message: `Unsupported MathJSON operator ${customOperator}.`,
    });
    return;
  }
  const integrityError = linearAlgebraScalarWireIntegrityError({
    ...wire,
    mathJson: validation.validated.value,
  });
  if (integrityError) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: integrityError });
  }
});
const scalarMatrixSchema = z.array(z.array(scalarWireV1Schema).min(1).max(8)).min(1).max(8);
const scalarVectorSchema = z.array(scalarWireV1Schema).min(1).max(8);
const scalarMatrixOperandSchema = z.object({
  encoding: z.literal('scalar-v1'),
  source: scalarMatrixSchema,
  resolved: scalarMatrixSchema,
}).strict().superRefine((operand, context) => {
  const sourceShape = operand.source.map((row) => row.length);
  const resolvedShape = operand.resolved.map((row) => row.length);
  if (sourceShape.join(',') !== resolvedShape.join(',')) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Scalar Matrix source and resolved shapes must match.' });
  }
});
const scalarVectorOperandSchema = z.object({
  encoding: z.literal('scalar-v1'),
  source: scalarVectorSchema,
  resolved: scalarVectorSchema,
}).strict().superRefine((operand, context) => {
  if (operand.source.length !== operand.resolved.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Scalar Vector source and resolved lengths must match.' });
  }
});
const matrixNamedValueSnapshotSchema = z.union([
  z.object({ id: z.string(), name: z.string(), value: numericMatrixSchema }).strict(),
  z.object({
    id: z.string(),
    name: z.string(),
    encoding: z.literal('scalar-v1'),
    value: scalarMatrixSchema,
  }).strict(),
]);
const vectorNamedValueSnapshotSchema = z.union([
  z.object({ id: z.string(), name: z.string(), value: numericVectorSchema }).strict(),
  z.object({
    id: z.string(),
    name: z.string(),
    encoding: z.literal('scalar-v1'),
    value: scalarVectorSchema,
  }).strict(),
]);
const exactMatrixWireSchema = z.array(z.array(exactScalarWireSchema));
const exactVectorWireSchema = z.array(exactScalarWireSchema);

export const variableSubstitutionSnapshotSchema = z.object({
  name: z.string(),
  valueLatex: z.string(),
  numericValue: z.number().finite(),
});

const linearAlgebraRequestContextSchema = {
  domain: z.enum(['real', 'complex']).optional(),
  substitutionMode: z.enum(['symbolic', 'use-stored-values']).optional(),
  substitutionSnapshot: z.array(variableSubstitutionSnapshotSchema).optional(),
  protectedSubstitutionSnapshot: z.array(variableSubstitutionSnapshotSchema).optional(),
  complexExactForm: complexExactFormSchema.optional(),
};

function containsImaginaryScalarWire(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsImaginaryScalarWire);
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.version === 1 && 'mathJson' in record) {
    const pending = [record.mathJson];
    while (pending.length > 0) {
      const node = pending.pop();
      if (node === 'ImaginaryUnit') return true;
      if (Array.isArray(node)) pending.push(...node);
    }
    const exactComplex = record.exactComplexRational as { im?: { numerator?: unknown } } | undefined;
    if (typeof exactComplex?.im?.numerator === 'number' && exactComplex.im.numerator !== 0) return true;
  }
  return Object.values(record).some(containsImaginaryScalarWire);
}

function rejectImaginaryRealSeed(
  seed: { domain?: 'real' | 'complex' },
  context: z.RefinementCtx,
) {
  if (seed.domain === 'real' && containsImaginaryScalarWire(seed)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Real Linear Algebra seeds cannot contain the imaginary unit.',
    });
  }
}

const numericMatrixReplaySeedSchema = z.object({
  operation: matrixOperationSchema,
  matrixA: numericMatrixSchema,
  matrixB: numericMatrixSchema.optional(),
  approxDigits: z.number().int().min(0).max(20).optional(),
  systemRhs: numericVectorSchema.optional(),
  coordinateVector: numericVectorSchema.optional(),
  matrixPowerExponent: z.number().int().safe().optional(),
  systemForm: matrixSystemFormSchema.optional(),
  exactMatrixA: exactMatrixWireSchema.optional(),
  exactMatrixB: exactMatrixWireSchema.optional(),
  exactSystemRhs: exactVectorWireSchema.optional(),
  exactCoordinateVector: exactVectorWireSchema.optional(),
  editorExpressionLatex: z.string().optional(),
  matrixOperandLatexA: z.string().optional(),
  matrixOperandLatexB: z.string().optional(),
  systemRhsLatex: z.string().optional(),
  systemUnknowns: z.array(z.string().min(1)).optional(),
  systemUnknownVectorName: z.string().min(1).optional(),
  coordinateVectorLatex: z.string().optional(),
  matrixPowerExponentLatex: z.string().optional(),
  matrixValues: z.array(matrixNamedValueSnapshotSchema).optional(),
  activeMatrixLeftId: z.string().optional(),
  activeMatrixRightId: z.string().optional(),
  ...linearAlgebraRequestContextSchema,
});
const scalarMatrixReplaySeedSchema = z.object({
  operation: matrixOperationSchema,
  operandEncoding: z.literal('scalar-v1'),
  matrixA: scalarMatrixOperandSchema,
  matrixB: scalarMatrixOperandSchema.optional(),
  systemRhs: scalarVectorOperandSchema.optional(),
  coordinateVector: scalarVectorOperandSchema.optional(),
  approxDigits: z.number().int().min(0).max(20).optional(),
  matrixPowerExponent: z.number().int().safe().optional(),
  systemForm: matrixSystemFormSchema.optional(),
  editorExpressionLatex: z.string().optional(),
  matrixOperandLatexA: z.string().optional(),
  matrixOperandLatexB: z.string().optional(),
  systemRhsLatex: z.string().optional(),
  systemUnknowns: z.array(z.string().min(1)).optional(),
  systemUnknownVectorName: z.string().min(1).optional(),
  coordinateVectorLatex: z.string().optional(),
  matrixPowerExponentLatex: z.string().optional(),
  matrixValues: z.array(matrixNamedValueSnapshotSchema).optional(),
  activeMatrixLeftId: z.string().optional(),
  activeMatrixRightId: z.string().optional(),
  ...linearAlgebraRequestContextSchema,
}).strict().superRefine(rejectImaginaryRealSeed);

export const matrixReplaySeedSchema = z.union([
  numericMatrixReplaySeedSchema,
  scalarMatrixReplaySeedSchema,
]);

const numericVectorReplaySeedSchema = z.object({
  operation: vectorOperationSchema,
  vectorA: numericVectorSchema,
  vectorB: numericVectorSchema.optional(),
  angleUnit: angleUnitSchema,
  approxDigits: z.number().int().min(0).max(20).optional(),
  exactVectorA: exactVectorWireSchema.optional(),
  exactVectorB: exactVectorWireSchema.optional(),
  editorExpressionLatex: z.string().optional(),
  vectorOperandLatexA: z.string().optional(),
  vectorOperandLatexB: z.string().optional(),
  vectorOperands: z.array(numericVectorSchema).optional(),
  exactVectorOperands: z.array(exactVectorWireSchema).optional(),
  vectorOperandLatexList: z.array(z.string()).optional(),
  vectorValues: z.array(vectorNamedValueSnapshotSchema).optional(),
  activeVectorLeftId: z.string().optional(),
  activeVectorRightId: z.string().optional(),
  ...linearAlgebraRequestContextSchema,
});
const scalarVectorReplaySeedSchema = z.object({
  operation: vectorOperationSchema,
  operandEncoding: z.literal('scalar-v1'),
  vectorA: scalarVectorOperandSchema,
  vectorB: scalarVectorOperandSchema.optional(),
  angleUnit: angleUnitSchema,
  approxDigits: z.number().int().min(0).max(20).optional(),
  editorExpressionLatex: z.string().optional(),
  vectorOperandLatexA: z.string().optional(),
  vectorOperandLatexB: z.string().optional(),
  vectorOperands: z.array(scalarVectorOperandSchema).optional(),
  vectorOperandLatexList: z.array(z.string()).optional(),
  vectorValues: z.array(vectorNamedValueSnapshotSchema).optional(),
  activeVectorLeftId: z.string().optional(),
  activeVectorRightId: z.string().optional(),
  ...linearAlgebraRequestContextSchema,
}).strict().superRefine(rejectImaginaryRealSeed);

export const vectorReplaySeedSchema = z.union([
  numericVectorReplaySeedSchema,
  scalarVectorReplaySeedSchema,
]);
