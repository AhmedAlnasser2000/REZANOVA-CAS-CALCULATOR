/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MatrixOperation, VectorOperation } from '../../types/calculator';
import {
  summarizeOoeProvenanceCanonicalOutcome as summarizeCanonicalRuntimeOutcome,
} from '../../lib/ooe/pilots/provenance-summary';
import { runWorkspaceWithOoeProvenance } from '../../lib/ooe/pilots/workspace-pilot';
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
    variableMemory,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions,
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
    geometryRequestToScreen,
    equationScreen,
    equationLatex,
    equationSolveTarget,
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
    calculusWorkbenchExpression,
    calculusRouteMeta,
    isCalculusMenuOpen,
    runCalculusWorkspaceMode,
    calculusScreen,
    calculusIndefiniteIntegral,
    calculusDefiniteIntegral,
    calculusImproperIntegral,
    calculusFiniteLimit,
    calculusInfiniteLimit,
    calculusLimit,
    maclaurinState,
    taylorState,
    laplaceState,
    implicitDerivativeState,
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
    variableMemory,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions,
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

    void runWorkspaceWithOoeProvenance({
      capabilityId: 'trigonometry.evaluate',
      mode: 'trigonometry',
      routeLabel: `trigonometry.${screenHint}`,
      routeSnapshot: {
        executionLatex,
        screenHint,
        identityTargetForm: trigIdentityState.targetForm,
      },
      screen: screenHint,
      action: 'evaluate',
      inputSummary: {
        screenHint,
        latexLength: executionLatex.length,
      },
      run: () => {
        const { outcome, parsed } = runTrigonometryCoreDraft(executionLatex, {
          screenHint,
          angleUnit: settings.angleUnit,
          identityTargetForm: trigIdentityState.targetForm,
        });

        return {
          outcome,
          replayScreen: parsed.ok
            ? trigRequestToScreen(parsed.request, screenHint)
            : screenHint,
        };
      },
      buildProvenance: ({ payload, metadata }) => ({
        depth: 'coarse',
        mode: 'trigonometry',
        route: `trigonometry.${screenHint}`,
        screen: screenHint,
        action: 'evaluate',
        inputSummary: {
          screenHint,
          latexLength: executionLatex.length,
        },
        outputSummary: summarizeCanonicalRuntimeOutcome(payload.outcome),
        runtimeHost: metadata.hostId,
        commitDecision: metadata.commitAssessment.commitDecision,
        notes: [`Outcome kind: ${payload.outcome.kind}`],
      }),
    }).then(({ payload }) => {
      commitOutcome(payload.outcome, executionLatex, 'trigonometry', {
        trigScreen: payload.replayScreen,
      });
    });
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

    void runWorkspaceWithOoeProvenance({
      capabilityId: 'statistics.evaluate',
      mode: 'statistics',
      routeLabel: `statistics.${screenHint}`,
      routeSnapshot: {
        inputLatex,
        screenHint,
        workingSourceHint: statisticsWorkingSource,
      },
      screen: screenHint,
      action: 'evaluate',
      inputSummary: {
        screenHint,
        latexLength: inputLatex.length,
      },
      run: () => {
        const { outcome, parsed } = runStatisticsCoreDraft(inputLatex, {
          screenHint,
          workingSourceHint: statisticsWorkingSource,
        });
        return {
          outcome,
          parsed,
          replayScreen: parsed.ok
            ? statisticsRequestToScreen(parsed.request, screenHint)
            : screenHint,
        };
      },
      buildProvenance: ({ payload, metadata }) => ({
        depth: 'coarse',
        mode: 'statistics',
        route: `statistics.${screenHint}`,
        screen: screenHint,
        action: 'evaluate',
        inputSummary: {
          screenHint,
          latexLength: inputLatex.length,
        },
        outputSummary: summarizeCanonicalRuntimeOutcome(payload.outcome),
        runtimeHost: metadata.hostId,
        commitDecision: metadata.commitAssessment.commitDecision,
      }),
    }).then(({ payload }) => {
      if (payload.parsed.ok) {
        const nextSource = statisticsRequestToWorkingSource(
          payload.parsed.request,
          statisticsWorkingSource,
        );
        if (nextSource) {
          setStatisticsWorkingSource(nextSource);
        }
      }

      commitOutcome(payload.outcome, inputLatex, 'statistics', {
        statisticsScreen: payload.replayScreen,
      });
    });
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

    void runWorkspaceWithOoeProvenance({
      capabilityId: 'geometry.evaluate',
      mode: 'geometry',
      routeLabel: `geometry.${geometryScreen}`,
      routeSnapshot: {
        inputLatex,
        geometryScreen,
      },
      screen: geometryScreen,
      action: 'evaluate',
      inputSummary: {
        screen: geometryScreen,
        latexLength: inputLatex.length,
      },
      run: () => runGeometryCoreDraft(inputLatex, geometryScreen),
      buildProvenance: ({ payload, metadata }) => ({
        depth: 'coarse',
        mode: 'geometry',
        route: `geometry.${geometryScreen}`,
        screen: geometryScreen,
        action: 'evaluate',
        inputSummary: {
          screen: geometryScreen,
          latexLength: inputLatex.length,
        },
        outputSummary: {
          kind: payload.outcome.kind,
          title: payload.outcome.title,
          warningsCount: payload.outcome.warnings.length,
        },
        runtimeHost: metadata.hostId,
        commitDecision: metadata.commitAssessment.commitDecision,
      }),
    }).then(({ payload }) => {
      const replayScreen = payload.parsed?.ok && geometryRequestToScreen
        ? geometryRequestToScreen(payload.parsed.request)
        : geometryScreen;
      commitOutcome(payload.outcome, inputLatex, 'geometry', {
        geometryScreen: replayScreen,
        ...(payload.parsed?.ok
          ? { geometrySeed: { screen: replayScreen, request: payload.parsed.request } }
          : {}),
      });
    });
  });
}

  const equationRuntimeController = createEquationRuntimeController({
    equationScreen,
    equationLatex,
    equationSolveTarget,
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
    variableMemory,
    replayVariableSubstitutions,
    clearReplayVariableSubstitutions,
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

function runCalculusAction() {
  const generated = calculusWorkbenchExpression.trim();
  if (!generated || !calculusRouteMeta || isCalculusMenuOpen) {
    setDisplayOutcome({
      kind: 'error',
      title: calculusRouteMeta?.label ?? 'Calculus',
      error: calculusRouteMeta
        ? `Fill the ${calculusRouteMeta.label.toLowerCase()} inputs before evaluating.`
        : 'Choose a Calculus tool before evaluating.',
      warnings: [],
    });
    return;
  }

  startTransition(() => {
    const request = {
      screen: calculusScreen,
      indefiniteIntegral: calculusIndefiniteIntegral,
      definiteIntegral: calculusDefiniteIntegral,
      improperIntegral: calculusImproperIntegral,
      finiteLimit: calculusFiniteLimit,
      infiniteLimit: calculusInfiniteLimit,
      limit: calculusLimit,
      maclaurin: maclaurinState,
      taylor: taylorState,
      laplace: laplaceState,
      implicitDerivative: implicitDerivativeState,
      partialDerivative: partialDerivativeState,
      firstOrderOde: firstOrderOdeState,
      secondOrderOde: secondOrderOdeState,
      numericIvp: numericIvpState,
      equationDomainIntent: settings.equationDomainIntent ?? 'real',
      storedVariables: variableMemory,
      variableSubstitutionSnapshot:
        replayVariableSubstitutions?.mode === 'calculus'
        && replayVariableSubstitutions.inputLatex === generated
          ? replayVariableSubstitutions.substitutions
          : undefined,
    };
    void runWorkspaceWithOoeProvenance({
      capabilityId: 'calculus.evaluate',
      mode: 'calculus',
      routeLabel: `calculus.${calculusScreen}`,
      routeSnapshot: { request },
      screen: calculusScreen,
      action: 'evaluate',
      inputSummary: {
        screen: calculusScreen,
        latexLength: generated.length,
      },
      run: () => runCalculusWorkspaceMode(request),
    }).then(({ payload }) => {
      commitOutcome(payload, generated, 'calculus');
      clearReplayVariableSubstitutions?.();
    });
  });
}

function runMatrixAction(operation: MatrixOperation) {
  void runWorkspaceWithOoeProvenance({
    capabilityId: 'linearAlgebra.matrix',
    mode: 'matrix',
    routeLabel: `matrix.${operation}`,
    routeSnapshot: { operation, matrixA, matrixB },
    screen: 'matrix',
    action: operation,
    inputSummary: {
      operation,
      rowsA: matrixA.length,
      rowsB: matrixB.length,
    },
    run: () => runMatrixMode({ operation, matrixA, matrixB }),
  }).then(({ payload }) => {
    commitOutcome(payload, operation, 'matrix');
  });
}

function runVectorAction(operation: VectorOperation) {
  void runWorkspaceWithOoeProvenance({
    capabilityId: 'linearAlgebra.vector',
    mode: 'vector',
    routeLabel: `vector.${operation}`,
    routeSnapshot: {
      operation,
      vectorA,
      vectorB,
      angleUnit: settings.angleUnit,
    },
    screen: 'vector',
    action: operation,
    inputSummary: {
      operation,
      lengthA: vectorA.length,
      lengthB: vectorB.length,
    },
    run: () => runVectorMode({
      operation,
      vectorA,
      vectorB,
      angleUnit: settings.angleUnit,
    }),
  }).then(({ payload }) => {
    commitOutcome(payload, operation, 'vector');
  });
}

function runTableAction() {
  const result = runTableMode({
    primaryLatex: tablePrimaryLatex,
    secondaryLatex: tableSecondaryLatex,
    secondaryEnabled: tableSecondaryEnabled,
    start: tableStart,
    end: tableEnd,
    step: tableStep,
    storedVariables: variableMemory,
    variableSubstitutionSnapshot:
      replayVariableSubstitutions?.mode === 'table'
      && replayVariableSubstitutions.inputLatex === tablePrimaryLatex
        ? replayVariableSubstitutions.substitutions
        : undefined,
  });

  setTableResponse(result.response);
  commitOutcome(result.outcome, tablePrimaryLatex, 'table', {
    tableResponse: result.response,
  });
  clearReplayVariableSubstitutions?.();
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
  runCalculusAction,
  runMatrixAction,
  runVectorAction,
  runTableAction,
  openPromptTarget,
};
}
