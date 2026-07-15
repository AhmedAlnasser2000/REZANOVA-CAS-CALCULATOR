import type { ExactScalarWire } from './exact-scalar-types';
import type { SerializableMathJson } from './math-payload-types';
import type { AngleUnit, ComplexExactForm } from './mode-types';
import type {
  DisplayAnswerRowsReadback,
  DisplayDetailSection,
  VariableSubstitutionSnapshot,
} from './display-types';

export type MatrixOperation =
  | 'add' | 'subtract' | 'multiply' | 'transposeA' | 'transposeB' | 'detA' | 'detB' | 'inverseA' | 'inverseB' | 'rankA' | 'rankB' | 'rrefA' | 'rrefB' | 'nullSpaceA' | 'nullSpaceB' | 'columnSpaceA' | 'columnSpaceB' | 'basisA' | 'basisB' | 'coordinatesA' | 'coordinatesB' | 'changeBasis' | 'luA' | 'luB' | 'pluA' | 'pluB' | 'luSolveA' | 'luSolveB' | 'pluSolveA' | 'pluSolveB' | 'multiRhsSolve' | 'qrA' | 'qrB' | 'columnProjectionA' | 'columnProjectionB' | 'leastSquaresA' | 'leastSquaresB' | 'invertibilityA' | 'invertibilityB' | 'profileA' | 'profileB' | 'definiteA' | 'definiteB' | 'svdA' | 'svdB' | 'pinvA' | 'pinvB' | 'condA' | 'condB' | 'nrankA' | 'nrankB' | 'eigenA' | 'eigenB' | 'diagonalizeA' | 'diagonalizeB' | 'spectralPowerA' | 'spectralPowerB' | 'linearSystem';

export type MatrixSystemForm = 'Ax=b' | 'Ax+b=0';
export type LinearAlgebraScalarDomain = 'real' | 'complex';
export type LinearAlgebraSubstitutionMode = 'symbolic' | 'use-stored-values';

export type LinearAlgebraExactComplexRational = {
  re: ExactScalarWire;
  im: ExactScalarWire;
};

export type LinearAlgebraScalarWireV1 = {
  version: 1;
  canonicalLatex: string;
  mathJson: SerializableMathJson;
  exactRational?: ExactScalarWire;
  exactComplexRational?: LinearAlgebraExactComplexRational;
};

export type LinearAlgebraScalarMatrixOperandV1 = {
  encoding: 'scalar-v1';
  source: LinearAlgebraScalarWireV1[][];
  resolved: LinearAlgebraScalarWireV1[][];
};

export type LinearAlgebraScalarVectorOperandV1 = {
  encoding: 'scalar-v1';
  source: LinearAlgebraScalarWireV1[];
  resolved: LinearAlgebraScalarWireV1[];
};

export type LinearAlgebraNumericMatrixNamedValue = {
  id: string;
  name: string;
  value: number[][];
  encoding?: never;
};

export type LinearAlgebraScalarMatrixNamedValue = {
  id: string;
  name: string;
  encoding: 'scalar-v1';
  value: LinearAlgebraScalarWireV1[][];
};

export type LinearAlgebraMatrixNamedValue =
  | LinearAlgebraNumericMatrixNamedValue
  | LinearAlgebraScalarMatrixNamedValue;

export type LinearAlgebraNumericVectorNamedValue = {
  id: string;
  name: string;
  value: number[];
  encoding?: never;
};

export type LinearAlgebraScalarVectorNamedValue = {
  id: string;
  name: string;
  encoding: 'scalar-v1';
  value: LinearAlgebraScalarWireV1[];
};

export type LinearAlgebraVectorNamedValue =
  | LinearAlgebraNumericVectorNamedValue
  | LinearAlgebraScalarVectorNamedValue;

type LinearAlgebraRequestContext = {
  domain?: LinearAlgebraScalarDomain;
  substitutionMode?: LinearAlgebraSubstitutionMode;
  substitutionSnapshot?: VariableSubstitutionSnapshot[];
  protectedSubstitutionSnapshot?: VariableSubstitutionSnapshot[];
  complexExactForm?: ComplexExactForm;
};

type MatrixRequestCommon = LinearAlgebraRequestContext & {
  operation: MatrixOperation;
  approxDigits?: number;
  matrixPowerExponent?: number;
  systemForm?: MatrixSystemForm;
  editorExpressionLatex?: string;
  matrixOperandLatexA?: string;
  matrixOperandLatexB?: string;
  systemRhsLatex?: string;
  coordinateVectorLatex?: string;
  matrixPowerExponentLatex?: string;
  matrixValues?: LinearAlgebraMatrixNamedValue[];
  activeMatrixLeftId?: string;
  activeMatrixRightId?: string;
};

export type MatrixRequest = MatrixRequestCommon & {
  operandEncoding?: 'numeric';
  matrixA: number[][];
  matrixB?: number[][];
  systemRhs?: number[];
  coordinateVector?: number[];
  exactMatrixA?: ExactScalarWire[][];
  exactMatrixB?: ExactScalarWire[][];
  exactSystemRhs?: ExactScalarWire[];
  exactCoordinateVector?: ExactScalarWire[];
};

export type ScalarMatrixRequestV1 = MatrixRequestCommon & {
  operandEncoding: 'scalar-v1';
  matrixA: LinearAlgebraScalarMatrixOperandV1;
  matrixB?: LinearAlgebraScalarMatrixOperandV1;
  systemRhs?: LinearAlgebraScalarVectorOperandV1;
  coordinateVector?: LinearAlgebraScalarVectorOperandV1;
};

export type MatrixReplaySeed = MatrixRequest | ScalarMatrixRequestV1;

export type MatrixResponse = {
  resultLatex?: string;
  answerRows?: DisplayAnswerRowsReadback;
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  handoffEquationLatex?: string;
  warnings: string[];
  error?: string;
};

export type VectorOperation =
  | 'dot' | 'cross' | 'normA' | 'normB' | 'angle' | 'add' | 'subtract'
  | 'projectionUofV' | 'projectionVofU' | 'orthogonalToU' | 'orthogonalToV' | 'unitA' | 'unitB' | 'orthogonalCheck' | 'gramSchmidtUV'
  | 'parallel' | 'distance' | 'parallelogramArea' | 'triangleArea' | 'volume'
  | 'linearCombination' | 'span' | 'independent';

type VectorRequestCommon = LinearAlgebraRequestContext & {
  operation: VectorOperation;
  angleUnit: AngleUnit;
  approxDigits?: number;
  editorExpressionLatex?: string;
  vectorOperandLatexA?: string;
  vectorOperandLatexB?: string;
  vectorOperandLatexList?: string[];
  vectorValues?: LinearAlgebraVectorNamedValue[];
  activeVectorLeftId?: string;
  activeVectorRightId?: string;
};

export type VectorRequest = VectorRequestCommon & {
  operandEncoding?: 'numeric';
  vectorA: number[];
  vectorB?: number[];
  exactVectorA?: ExactScalarWire[];
  exactVectorB?: ExactScalarWire[];
  vectorOperands?: number[][];
  exactVectorOperands?: ExactScalarWire[][];
};

export type ScalarVectorRequestV1 = VectorRequestCommon & {
  operandEncoding: 'scalar-v1';
  vectorA: LinearAlgebraScalarVectorOperandV1;
  vectorB?: LinearAlgebraScalarVectorOperandV1;
  vectorOperands?: LinearAlgebraScalarVectorOperandV1[];
};

export type VectorReplaySeed = VectorRequest | ScalarVectorRequestV1;

export type VectorResponse = {
  resultLatex?: string;
  answerRows?: DisplayAnswerRowsReadback;
  approxText?: string;
  detailSections?: DisplayDetailSection[];
  warnings: string[];
  error?: string;
};
