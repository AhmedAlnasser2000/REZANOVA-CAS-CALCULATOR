/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MatrixOperation, VectorOperation } from '../../types/calculator';
import {
  createCalculateRuntimeController,
  createEquationRuntimeController,
} from './runtimeControllers';

export function createModeActionHandlers(deps: any) {
  const {
    isCalculateToolOpen,
    calculateRouteMeta,
    calculateWorkbenchExpression,
    calculateScreen,
    integralWorkbench,
    limitWorkbench,
    setDisplayOutcome,
    startTransition,
    settings,
    ansLatex,
    commitOutcome,
    retitleOutcome,
    trigLeafScreenForContext,
    trigScreen,
    isTrigDraftFocused,
    isTrigMenuOpen,
    trigRouteMeta,
    buildTrigDraftForScreen,
    trigDraftState,
    setTrigDraftState,
    trigDraftStateForScreen,
    trigDraftStyle,
    serializeTrigRequest,
    trigIdentityState,
    runTrigonometryCoreDraft,
    trigRequestToScreen,
    isStatisticsDraftFocused,
    isStatisticsMenuOpen,
    statisticsLeafScreenForContext,
    statisticsScreen,
    statisticsRouteMeta,
    buildStatisticsDraftForScreen,
    statisticsDraftState,
    setStatisticsDraftState,
    statisticsDraftStateForScreen,
    runStatisticsCoreDraft,
    statisticsWorkingSource,
    statisticsRequestToWorkingSource,
    setStatisticsWorkingSource,
    statisticsRequestToScreen,
    isGeometryMenuOpen,
    isGeometryDraftFocused,
    geometryDraftState,
    buildGeometryDraftForScreen,
    geometryScreen,
    geometryRouteMeta,
    setGeometryDraftState,
    geometryDraftStateForScreen,
    runGeometryCoreDraft,
    equationScreen,
    equationLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    system2,
    system3,
    isSimultaneousEquationScreen,
    equationInputLatex,
    equationNumericSolvePanel,
    currentMode,
    displayOutcome,
    advancedCalcWorkbenchExpression,
    advancedCalcRouteMeta,
    isAdvancedCalcMenuOpen,
    runAdvancedCalcMode,
    advancedCalcScreen,
    advancedIndefiniteIntegral,
    advancedDefiniteIntegral,
    advancedImproperIntegral,
    advancedFiniteLimit,
    advancedInfiniteLimit,
    maclaurinState,
    taylorState,
    partialDerivativeState,
    firstOrderOdeState,
    secondOrderOdeState,
    numericIvpState,
    runMatrixMode,
    matrixA,
    matrixB,
    runVectorMode,
    vectorA,
    vectorB,
    runTableMode,
    tablePrimaryLatex,
    tableSecondaryLatex,
    tableSecondaryEnabled,
    tableStart,
    tableEnd,
    tableStep,
    setTableResponse,
    switchToEquationWithLatex,
  } = deps;

  const calculateRuntimeController = createCalculateRuntimeController({
    calculateLatex: '',
    calculateScreen,
    calculateRouteMeta,
    calculateWorkbenchExpression,
    integralWorkbench,
    limitWorkbench,
    isCalculateToolOpen,
    settings,
    ansLatex,
    startTransition,
    setDisplayOutcome,
    commitOutcome,
    retitleOutcome,
  });

  const { runCalculateWorkbenchAction } = calculateRuntimeController;

function runTrigAction() {
  const screenHint = trigLeafScreenForContext(trigScreen);
  const editorFocused = isTrigDraftFocused();

  if (isTrigMenuOpen && !editorFocused) {
    return;
  }

  startTransition(() => {
    const inputLatex =
      !isTrigMenuOpen && trigRouteMeta?.focusTarget === 'guidedForm' && !editorFocused
        ? buildTrigDraftForScreen(trigScreen).trim()
        : trigDraftState.rawLatex.trim();

    if (!inputLatex) {
      setDisplayOutcome({
        kind: 'error',
        title: trigRouteMeta?.label ?? 'Trigonometry',
        error: 'Enter a Trigonometry request or use a guided trig tool before evaluating.',
        warnings: [],
      });
      return;
    }

    if (!editorFocused || trigDraftState.rawLatex.trim() !== inputLatex) {
      setTrigDraftState(trigDraftStateForScreen(screenHint, inputLatex, 'guided'));
    }

    const executionLatex =
      screenHint === 'identityConvert' && trigDraftStyle(inputLatex) !== 'structured'
        ? serializeTrigRequest({
            kind: 'identityConvert',
            expressionLatex: inputLatex,
            targetForm: trigIdentityState.targetForm,
          })
        : inputLatex;

    const { outcome, parsed } = runTrigonometryCoreDraft(executionLatex, {
      screenHint,
      angleUnit: settings.angleUnit,
      identityTargetForm: trigIdentityState.targetForm,
    });

    const replayScreen = parsed.ok
      ? trigRequestToScreen(parsed.request, screenHint)
      : screenHint;

    commitOutcome(outcome, executionLatex, 'trigonometry', { trigScreen: replayScreen });
  });
}

function runStatisticsAction() {
  const editorFocused = isStatisticsDraftFocused();
  if (isStatisticsMenuOpen && !editorFocused) {
    return;
  }

  startTransition(() => {
    const screenHint = statisticsLeafScreenForContext(statisticsScreen);
    const inputLatex =
      !editorFocused && statisticsRouteMeta?.focusTarget === 'guidedForm'
        ? buildStatisticsDraftForScreen(screenHint)
        : statisticsDraftState.rawLatex.trim();

    if (!inputLatex) {
      setDisplayOutcome({
        kind: 'error',
        title: statisticsRouteMeta?.label ?? 'Statistics',
        error: 'Enter a Statistics request or use a guided statistics tool before evaluating.',
        warnings: [],
      });
      return;
    }

    if (!editorFocused || statisticsDraftState.rawLatex.trim() !== inputLatex) {
      setStatisticsDraftState(statisticsDraftStateForScreen(screenHint, inputLatex, 'guided'));
    }

    const { outcome, parsed } = runStatisticsCoreDraft(inputLatex, {
      screenHint,
      workingSourceHint: statisticsWorkingSource,
    });
    if (parsed.ok) {
      const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
      if (nextSource) {
        setStatisticsWorkingSource(nextSource);
      }
    }
    const replayScreen = parsed.ok
      ? statisticsRequestToScreen(parsed.request, screenHint)
      : screenHint;

    commitOutcome(outcome, inputLatex, 'statistics', { statisticsScreen: replayScreen });
  });
}

function runGeometryAction() {
  if (isGeometryMenuOpen && !isGeometryDraftFocused()) {
    return;
  }

  startTransition(() => {
    const inputLatex = isGeometryDraftFocused()
      ? geometryDraftState.rawLatex.trim()
      : buildGeometryDraftForScreen(geometryScreen);

    if (!inputLatex) {
      setDisplayOutcome({
        kind: 'error',
        title: geometryRouteMeta?.label ?? 'Geometry',
        error: 'Enter a Geometry request or use a guided tool before evaluating.',
        warnings: [],
      });
      return;
    }

    if (!isGeometryDraftFocused()) {
      setGeometryDraftState(
        geometryDraftStateForScreen(geometryScreen, inputLatex, 'guided'),
      );
    }

    const { outcome } = runGeometryCoreDraft(inputLatex, geometryScreen);
    commitOutcome(outcome, inputLatex, 'geometry');
  });
}

  const equationRuntimeController = createEquationRuntimeController({
    equationScreen,
    equationLatex,
    equationInputLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    system2,
    system3,
    equationNumericSolvePanel,
    currentMode,
    displayOutcome,
    ansLatex,
    settings,
    startTransition,
    commitOutcome,
    switchToEquationWithLatex,
    isSimultaneousEquationScreen,
  });

  const {
    openPromptTarget,
    runEquationAction,
    runEquationNumericSolveAction,
    shouldAllowEquationNumericSolve,
    shouldShowEquationNumericSolvePanel,
  } = equationRuntimeController;

function runAdvancedCalcAction() {
  const generated = advancedCalcWorkbenchExpression.trim();
  if (!generated || !advancedCalcRouteMeta || isAdvancedCalcMenuOpen) {
    setDisplayOutcome({
      kind: 'error',
      title: advancedCalcRouteMeta?.label ?? 'Advanced Calc',
      error: advancedCalcRouteMeta
        ? `Fill the ${advancedCalcRouteMeta.label.toLowerCase()} inputs before evaluating.`
        : 'Choose an Advanced Calc tool before evaluating.',
      warnings: [],
    });
    return;
  }

  startTransition(() => {
    void runAdvancedCalcMode({
      screen: advancedCalcScreen,
      indefiniteIntegral: advancedIndefiniteIntegral,
      definiteIntegral: advancedDefiniteIntegral,
      improperIntegral: advancedImproperIntegral,
      finiteLimit: advancedFiniteLimit,
      infiniteLimit: advancedInfiniteLimit,
      maclaurin: maclaurinState,
      taylor: taylorState,
      partialDerivative: partialDerivativeState,
      firstOrderOde: firstOrderOdeState,
      secondOrderOde: secondOrderOdeState,
      numericIvp: numericIvpState,
    }).then((outcome) => {
      commitOutcome(outcome, generated, 'advancedCalculus');
    });
  });
}

function runMatrixAction(operation: MatrixOperation) {
  const outcome = runMatrixMode({ operation, matrixA, matrixB });
  commitOutcome(outcome, operation, 'matrix');
}

function runVectorAction(operation: VectorOperation) {
  const outcome = runVectorMode({
    operation,
    vectorA,
    vectorB,
    angleUnit: settings.angleUnit,
  });
  commitOutcome(outcome, operation, 'vector');
}

function runTableAction() {
  const result = runTableMode({
    primaryLatex: tablePrimaryLatex,
    secondaryLatex: tableSecondaryLatex,
    secondaryEnabled: tableSecondaryEnabled,
    start: tableStart,
    end: tableEnd,
    step: tableStep,
  });

  setTableResponse(result.response);
  commitOutcome(result.outcome, tablePrimaryLatex, 'table');
}

return {
  runCalculateWorkbenchAction,
  runTrigAction,
  runStatisticsAction,
  runGeometryAction,
  runEquationAction,
  runEquationNumericSolveAction,
  shouldShowEquationNumericSolvePanel,
  shouldAllowEquationNumericSolve,
  runAdvancedCalcAction,
  runMatrixAction,
  runVectorAction,
  runTableAction,
  openPromptTarget,
};
}
