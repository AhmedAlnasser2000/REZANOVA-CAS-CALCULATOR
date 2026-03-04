import { matrixToLatex, vectorToLatex } from './format';

export type MatrixNotationPreset =
  | 'matrixA'
  | 'matrixB'
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'detA'
  | 'detB'
  | 'transposeA'
  | 'transposeB'
  | 'inverseA'
  | 'inverseB';

export type VectorNotationPreset =
  | 'vectorA'
  | 'vectorB'
  | 'add'
  | 'subtract'
  | 'dot'
  | 'cross'
  | 'normA'
  | 'normB';

function wrapDeterminant(latex: string) {
  return `\\det\\left(${latex}\\right)`;
}

function wrapTranspose(latex: string) {
  return `${latex}^{\\mathsf{T}}`;
}

function wrapInverse(latex: string) {
  return `${latex}^{-1}`;
}

function wrapNorm(latex: string) {
  return `\\left\\|${latex}\\right\\|`;
}

export function buildMatrixNotationLatex(
  preset: MatrixNotationPreset,
  matrixA: number[][],
  matrixB: number[][],
) {
  const latexA = matrixToLatex(matrixA);
  const latexB = matrixToLatex(matrixB);

  switch (preset) {
    case 'matrixA':
      return latexA;
    case 'matrixB':
      return latexB;
    case 'add':
      return `${latexA}+${latexB}`;
    case 'subtract':
      return `${latexA}-${latexB}`;
    case 'multiply':
      return `${latexA}${latexB}`;
    case 'detA':
      return wrapDeterminant(latexA);
    case 'detB':
      return wrapDeterminant(latexB);
    case 'transposeA':
      return wrapTranspose(latexA);
    case 'transposeB':
      return wrapTranspose(latexB);
    case 'inverseA':
      return wrapInverse(latexA);
    case 'inverseB':
      return wrapInverse(latexB);
    default:
      return latexA;
  }
}

export function buildVectorNotationLatex(
  preset: VectorNotationPreset,
  vectorA: number[],
  vectorB: number[],
) {
  const latexA = vectorToLatex(vectorA);
  const latexB = vectorToLatex(vectorB);

  switch (preset) {
    case 'vectorA':
      return latexA;
    case 'vectorB':
      return latexB;
    case 'add':
      return `${latexA}+${latexB}`;
    case 'subtract':
      return `${latexA}-${latexB}`;
    case 'dot':
      return `${latexA}\\cdot${latexB}`;
    case 'cross':
      return `${latexA}\\times${latexB}`;
    case 'normA':
      return wrapNorm(latexA);
    case 'normB':
      return wrapNorm(latexB);
    default:
      return latexA;
  }
}
