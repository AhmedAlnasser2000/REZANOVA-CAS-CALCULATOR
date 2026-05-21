import { useState } from 'react';
import {
  buildMatrixNotationLatex,
  buildVectorNotationLatex,
  type MatrixNotationPreset,
  type VectorNotationPreset,
} from '../../lib/linear-algebra-workbench';
import { runMatrixMode } from '../../lib/modes/matrix';
import { runVectorMode } from '../../lib/modes/vector';
import type {
  AngleUnit,
  DisplayOutcome,
  MatrixOperation,
  VectorOperation,
} from '../../types/calculator';

type CommitLinearAlgebraOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: 'matrix' | 'vector',
) => void;

type UseLinearAlgebraRuntimeOptions = {
  angleUnit: AngleUnit;
  commitOutcome: CommitLinearAlgebraOutcome;
  onMatrixNotationLoaded: () => void;
  onVectorNotationLoaded: () => void;
};

export function useLinearAlgebraRuntime({
  angleUnit,
  commitOutcome,
  onMatrixNotationLoaded,
  onVectorNotationLoaded,
}: UseLinearAlgebraRuntimeOptions) {
  const [matrixA, setMatrixA] = useState([
    [1, 2],
    [3, 4],
  ]);
  const [matrixB, setMatrixB] = useState([
    [5, 6],
    [7, 8],
  ]);
  const [matrixNotationLatex, setMatrixNotationLatex] = useState('');
  const [vectorA, setVectorA] = useState([1, 2, 3]);
  const [vectorB, setVectorB] = useState([4, 5, 6]);
  const [vectorNotationLatex, setVectorNotationLatex] = useState('');

  function runMatrixAction(operation: MatrixOperation) {
    const outcome = runMatrixMode({ operation, matrixA, matrixB });
    commitOutcome(outcome, operation, 'matrix');
  }

  function runVectorAction(operation: VectorOperation) {
    const outcome = runVectorMode({
      operation,
      vectorA,
      vectorB,
      angleUnit,
    });
    commitOutcome(outcome, operation, 'vector');
  }

  function setMatrixCell(which: 'A' | 'B', row: number, column: number, value: number) {
    const setter = which === 'A' ? setMatrixA : setMatrixB;
    setter((currentMatrix) =>
      currentMatrix.map((currentRow, rowIndex) =>
        currentRow.map((cell, columnIndex) =>
          rowIndex === row && columnIndex === column ? (Number.isFinite(value) ? value : 0) : cell,
        ),
      ),
    );
  }

  function setVectorCell(which: 'A' | 'B', index: number, value: number) {
    const setter = which === 'A' ? setVectorA : setVectorB;
    setter((currentVector) =>
      currentVector.map((cell, cellIndex) =>
        cellIndex === index ? (Number.isFinite(value) ? value : 0) : cell,
      ),
    );
  }

  function loadMatrixNotationPreset(preset: MatrixNotationPreset) {
    setMatrixNotationLatex(buildMatrixNotationLatex(preset, matrixA, matrixB));
    onMatrixNotationLoaded();
  }

  function loadVectorNotationPreset(preset: VectorNotationPreset) {
    setVectorNotationLatex(buildVectorNotationLatex(preset, vectorA, vectorB));
    onVectorNotationLoaded();
  }

  return {
    loadMatrixNotationPreset,
    loadVectorNotationPreset,
    matrixA,
    matrixB,
    matrixNotationLatex,
    runMatrixAction,
    runVectorAction,
    setMatrixCell,
    setMatrixNotationLatex,
    setVectorCell,
    setVectorNotationLatex,
    vectorA,
    vectorB,
    vectorNotationLatex,
  };
}
