import { useCallback } from 'react';
import type { AlgebraTransformAction } from '../../lib/algebra/algebra-transform-ui';
import {
  EQUATION_USE_STORED_VALUES_ACTION,
  shouldOfferEquationStoredValueConsent,
  type EquationAlgebraAction,
} from '../../lib/modes/equation';
import { useAsyncEditorAnalysis } from '../../lib/editor/use-async-editor-analysis';
import type { EditorAnalysisControlState } from '../../lib/editor/editor-analysis-control';
import type {
  EquationScreen,
  ModeId,
} from '../../types/calculator';

export function useEquationAlgebraActions({
  currentMode,
  editorAnalysisControl,
  equationLatex,
  equationScreen,
  equationSolveTarget,
}: {
  currentMode: ModeId;
  editorAnalysisControl: EditorAnalysisControlState;
  equationLatex: string;
  equationScreen: EquationScreen;
  equationSolveTarget?: string | null;
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
  const equationAlgebraTransforms: EquationAlgebraAction[] =
    currentMode === 'equation' && equationScreen === 'symbolic'
      ? [
          ...equationAlgebraTransformAnalysis.value,
          ...(shouldOfferEquationStoredValueConsent({
            equationLatex,
            equationSolveTarget,
          })
            ? [EQUATION_USE_STORED_VALUES_ACTION]
            : []),
        ]
      : [];

  return {
    equationAlgebraTransformAnalysis,
    equationAlgebraTransforms,
  };
}
