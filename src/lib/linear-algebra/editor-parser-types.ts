import type { ExactScalarWire } from '../../types/calculator';
import type { LinearAlgebraScalarExpression } from './editor-vector-scalars';
import type { LinearAlgebraEditorParseErrorReason } from './editor-parser-errors';

export type { LinearAlgebraScalarExpression } from './editor-vector-scalars';

export type LinearAlgebraEditorMode = 'matrix' | 'vector';

export type LinearAlgebraNamedValue = string;

export type LinearAlgebraValueExpression =
  | { kind: 'named'; name: LinearAlgebraNamedValue; displayLatex: string }
  | { kind: 'matrixLiteral'; value: number[][]; exactValue: ExactScalarWire[][]; displayLatex: string }
  | { kind: 'vectorLiteral'; value: number[]; exactValue: ExactScalarWire[]; displayLatex: string };

export type LinearAlgebraSystemForm = 'Ax=b' | 'Ax+b=0';

export type LinearAlgebraUnaryOperator =
  | 'determinant'
  | 'rank'
  | 'rref'
  | 'nullSpace'
  | 'columnSpace'
  | 'basis'
  | 'lu'
  | 'plu'
  | 'qr'
  | 'invertibility'
  | 'profile'
  | 'definiteness'
  | 'eigen'
  | 'diagonalization'
  | 'transpose'
  | 'inverse'
  | 'norm'
  | 'projectionOntoU'
  | 'projectionOntoV'
  | 'orthogonalComponentToU'
  | 'orthogonalComponentToV'
  | 'unit';

export type LinearAlgebraBinaryOperator =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'dot'
  | 'cross';

export type LinearAlgebraEditorExpression =
  | LinearAlgebraValueExpression
  | LinearAlgebraScalarExpression
  | { kind: 'unary'; operator: LinearAlgebraUnaryOperator; value: LinearAlgebraEditorExpression }
  | { kind: 'binary'; operator: LinearAlgebraBinaryOperator; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression }
  | { kind: 'negate'; value: LinearAlgebraEditorExpression }
  | { kind: 'scale'; scalar: LinearAlgebraScalarExpression; vector: LinearAlgebraEditorExpression }
  | { kind: 'vectorDivide'; vector: LinearAlgebraEditorExpression; scalar: LinearAlgebraScalarExpression }
  | { kind: 'angle'; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression }
  | { kind: 'orthogonality'; left: LinearAlgebraEditorExpression; right: LinearAlgebraEditorExpression }
  | { kind: 'gramSchmidt'; operands: LinearAlgebraEditorExpression[] }
  | {
      kind: 'geometricMeasure';
      operator: 'parallel' | 'distance' | 'parallelogramArea' | 'triangleArea' | 'volume';
      operands: LinearAlgebraEditorExpression[];
    }
  | { kind: 'vectorFamily'; operator: 'span' | 'independent'; operands: LinearAlgebraEditorExpression[] }
  | { kind: 'projection'; base: LinearAlgebraEditorExpression; target: LinearAlgebraEditorExpression }
  | { kind: 'scalarTripleProduct'; first: LinearAlgebraEditorExpression; second: LinearAlgebraEditorExpression; third: LinearAlgebraEditorExpression }
  | { kind: 'coordinates'; basis: LinearAlgebraEditorExpression; vector: LinearAlgebraEditorExpression }
  | { kind: 'columnProjection'; matrix: LinearAlgebraEditorExpression; vector: LinearAlgebraEditorExpression }
  | { kind: 'leastSquares'; matrix: LinearAlgebraEditorExpression; vector: LinearAlgebraEditorExpression }
  | { kind: 'matrixPower'; matrix: LinearAlgebraEditorExpression; exponent: number; exponentLatex: string }
  | { kind: 'factorSolve'; method: 'lu' | 'plu'; matrix: LinearAlgebraEditorExpression; vector: LinearAlgebraEditorExpression }
  | { kind: 'changeOfBasis'; source: LinearAlgebraEditorExpression; target: LinearAlgebraEditorExpression }
  | {
      kind: 'multiRhsSystem';
      coefficients: LinearAlgebraValueExpression;
      constants: LinearAlgebraValueExpression;
    }
  | {
      kind: 'linearSystem';
      form: LinearAlgebraSystemForm;
      coefficients: LinearAlgebraValueExpression;
      constants: LinearAlgebraValueExpression;
    };

export type LinearAlgebraEditorParseResult =
  | { ok: true; expression: LinearAlgebraEditorExpression }
  | { ok: false; reason: LinearAlgebraEditorParseErrorReason; message: string };

export type LinearAlgebraEditorParseOptions = {
  mode?: LinearAlgebraEditorMode;
  matrixNamedValues?: readonly string[];
  vectorNamedValues?: readonly string[];
};
