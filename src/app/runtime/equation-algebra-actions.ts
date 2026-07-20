import { useCallback } from 'react';
import type { AlgebraTransformAction } from '../../lib/algebra/algebra-transform-ui';
import {
  EQUATION_USE_STORED_VALUES_ACTION,
  type EquationAlgebraAction,
} from '../../lib/modes/equation/transform-contract';
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
    const [algebraRuntime, storedValueRuntime] = await Promise.all([
      import('../../lib/algebra/algebra-transform'),
      import('../../lib/modes/equation/stored-values'),
    ]);
    return {
      transforms: algebraRuntime.getEligibleEquationTransforms(source),
      offerStoredValues: storedValueRuntime.shouldOfferEquationStoredValueConsent({
        equationLatex: source,
        equationSolveTarget,
      }),
    };
  }, [equationSolveTarget]);
  const equationAlgebraTransformAnalysis = useAsyncEditorAnalysis<{
    transforms: AlgebraTransformAction[];
    offerStoredValues: boolean;
  }>({
    source: currentMode === 'equation' && equationScreen === 'symbolic'
      ? equationLatex
      : '',
    initialValue: { transforms: [], offerStoredValues: false },
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
          ...equationAlgebraTransformAnalysis.value.transforms,
          ...(equationAlgebraTransformAnalysis.value.offerStoredValues
            ? [EQUATION_USE_STORED_VALUES_ACTION]
            : []),
        ]
      : [];

  return {
    equationAlgebraTransformAnalysis,
    equationAlgebraTransforms,
  };
}
