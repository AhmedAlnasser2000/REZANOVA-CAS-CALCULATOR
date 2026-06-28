import { useCallback } from 'react';
import type { AlgebraTransformAction } from '../../lib/algebra/algebra-transform-ui';
import {
  EQUATION_PREPARE_NUMERIC_SOLVE_ACTION,
  shouldOfferEquationNumericPreparation,
  type EquationAlgebraAction,
} from '../../lib/modes/equation';
import { useAsyncEditorAnalysis } from '../../lib/editor/use-async-editor-analysis';
import type { EditorAnalysisControlState } from '../../lib/editor/editor-analysis-control';
import type {
  EquationScreen,
  ModeId,
  StoredVariableValue,
} from '../../types/calculator';

export function useEquationAlgebraActions({
  currentMode,
  editorAnalysisControl,
  equationLatex,
  equationScreen,
  equationSolveTarget,
  storedVariables,
}: {
  currentMode: ModeId;
  editorAnalysisControl: EditorAnalysisControlState;
  equationLatex: string;
  equationScreen: EquationScreen;
  equationSolveTarget?: string | null;
  storedVariables: readonly StoredVariableValue[];
}) {
  const analyzeEquationTransforms = useCallback(async (source: string) => {
    const { getEligibleEquationTransforms } = await import('../../lib/algebra/algebra-transform');
    return getEligibleEquationTransforms(source);
  }, []);
  const equationAlgebraTransformAnalysis = useAsyncEditorAnalysis<AlgebraTransformAction[]>({
    source: currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationLatex
      : '',
    initialValue: [],
    analyze: analyzeEquationTransforms,
    controlState: editorAnalysisControl,
    ooe: {
      lane: 'equationTransformEligibility',
      contextKey: equationScreen,
    },
  });
  const shouldOfferNumericPreparation =
    currentMode === 'equation'
    && equationScreen === 'symbolic'
    && shouldOfferEquationNumericPreparation({
      equationLatex,
      equationSolveTarget,
      storedVariables,
    });
  const equationAlgebraTransforms: EquationAlgebraAction[] =
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? [
          ...equationAlgebraTransformAnalysis.value,
          ...(shouldOfferNumericPreparation ? [EQUATION_PREPARE_NUMERIC_SOLVE_ACTION] : []),
        ]
      : [];

  return {
    equationAlgebraTransformAnalysis,
    equationAlgebraTransforms,
  };
}
