import { runExpressionAction } from '../../engine/math-engine';
import { getEquationExecutionBudget } from '../../kernel/runtime-profile';
import { detectRealRangeImpossibility } from '../range-impossibility';
import type {
  GuardedSolveRequest,
  RangeImpossibilityResult,
} from '../../../types/calculator';
import {
  UNSUPPORTED_FAMILY_ERROR,
  errorOutcome,
} from './outcome';
import { equationStateKey } from './state-key';
import {
  attachAlgebraMetadata,
  prepareAlgebraSolveRequest,
} from './request-prep';
import {
  checkpointAndMaybeCancel,
  checkpointYieldAndMaybeCancel,
} from './cancellation';
import { runDirectSymbolicStageAsync } from './direct-symbolic';
import type {
  AsyncGuardedSolveRunner,
  GuardedEquationSolveOptions,
  GuardedEquationStageAsyncContext,
  GuardedEquationStageContext,
  GuardedEquationStageDescriptor,
  GuardedEquationStageReplayTrace,
  GuardedSolveRunner,
} from './types';
import { createEquationResultOutcome } from '../solve-result/producer';
import { equationMathValuesWithOwnedReadback } from '../solve-result/owned-readback-math';
import { transferCandidateValidatedReadbackPermission } from '../candidate-validated-readback';
import {
  buildEquationStageResultCarrier,
  readEquationStageResultCarrier,
  type EquationStageResultCarrierV1,
} from '../solve-result/stage-carrier';

function attachCarrierAlgebraMetadata(
  carrier: EquationStageResultCarrierV1,
  originalResolvedLatex: string,
  request: GuardedSolveRequest,
) {
  const outcome = readEquationStageResultCarrier(carrier);
  const attached = transferCandidateValidatedReadbackPermission(outcome, attachAlgebraMetadata(
    outcome,
    originalResolvedLatex,
    request,
  ));
  return buildEquationStageResultCarrier(attached);
}

function rangeGuardOutcome(
  range: Extract<RangeImpossibilityResult, { kind: 'impossible' }>,
) {
  const outcome = createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex: '\\varnothing',
    answerRows: {
      label: 'No real solution',
      rows: [{ latex: '\\varnothing' }],
    },
    resultOrigin: 'symbolic',
    solveBadges: ['Range Guard'],
    solveSummaryParts: range.summaryParts,
    warnings: [range.error],
  });
  return buildEquationStageResultCarrier(createEquationResultOutcome(outcome, {
    mathValues: equationMathValuesWithOwnedReadback({
      outcome,
      routeId: 'equation.domain-boundary',
      leaves: [
        {
          canonicalLatex: '\\varnothing',
          mathJson: 'EmptySet',
          source: 'equation-range-guard-empty-solution-set',
        },
        ...(range.mathJsonLeaves ?? []),
      ],
    }),
  }));
}

function runGuardedStageSequence(
  descriptors: GuardedEquationStageDescriptor[],
  context: GuardedEquationStageContext,
): EquationStageResultCarrierV1 | null {
  for (const descriptor of descriptors) {
    const beforeStageCancellation = checkpointAndMaybeCancel(context, {
      phase: 'before-stage',
      stageId: descriptor.id,
    });
    if (beforeStageCancellation) {
      return attachCarrierAlgebraMetadata(
        beforeStageCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const stageContext: GuardedEquationStageContext = {
      ...context,
      runner: (nextRequest, nextDepth, nextTrail) => {
        const recursiveCancellation = checkpointAndMaybeCancel(context, {
          phase: 'before-recursive-handoff',
          stageId: descriptor.id,
        });
        if (recursiveCancellation) {
          return recursiveCancellation;
        }

        return context.runner(nextRequest, nextDepth, nextTrail);
      },
    };

    const outcome = descriptor.execute(stageContext);
    context.trace?.attempts.push({
      depth: context.depth,
      stageId: descriptor.id,
      returnedOutcome: Boolean(outcome),
    });
    if (outcome) {
      return attachCarrierAlgebraMetadata(
        outcome,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const afterNoOutcomeCancellation = checkpointAndMaybeCancel(context, {
      phase: 'after-stage-no-outcome',
      stageId: descriptor.id,
    });
    if (afterNoOutcomeCancellation) {
      return attachCarrierAlgebraMetadata(
        afterNoOutcomeCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }
  }

  return null;
}

async function runGuardedStageSequenceAsync(
  descriptors: GuardedEquationStageDescriptor[],
  context: GuardedEquationStageContext,
): Promise<EquationStageResultCarrierV1 | null> {
  for (const descriptor of descriptors) {
    const beforeStageCancellation = await checkpointYieldAndMaybeCancel(context, {
      phase: 'before-stage',
      stageId: descriptor.id,
    });
    if (beforeStageCancellation) {
      return attachCarrierAlgebraMetadata(
        beforeStageCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const stageContext: GuardedEquationStageAsyncContext = {
      ...context,
      runner: (nextRequest, nextDepth, nextTrail) => {
        const recursiveCancellation = checkpointAndMaybeCancel(context, {
          phase: 'before-recursive-handoff',
          stageId: descriptor.id,
        });
        if (recursiveCancellation) {
          return recursiveCancellation;
        }

        return context.runner(nextRequest, nextDepth, nextTrail);
      },
      asyncRunner: async (nextRequest, nextDepth, nextTrail) => {
        const recursiveCancellation = await checkpointYieldAndMaybeCancel(context, {
          phase: 'before-recursive-handoff',
          stageId: descriptor.id,
          helperId: descriptor.id,
          family: 'recursive-handoff',
        });
        if (recursiveCancellation) {
          return recursiveCancellation;
        }

        return context.asyncRunner
          ? context.asyncRunner(nextRequest, nextDepth, nextTrail)
          : context.runner(nextRequest, nextDepth, nextTrail);
      },
      cooperativeCheckpoint: (input) => checkpointYieldAndMaybeCancel(context, {
        phase: 'helper-checkpoint',
        stageId: descriptor.id,
        ...input,
      }),
    };

    const outcome = descriptor.id === 'direct-symbolic'
      ? await runDirectSymbolicStageAsync(stageContext)
      : descriptor.executeAsync
        ? await descriptor.executeAsync(stageContext)
        : descriptor.execute(stageContext);
    context.trace?.attempts.push({
      depth: context.depth,
      stageId: descriptor.id,
      returnedOutcome: Boolean(outcome),
    });
    if (outcome) {
      return attachCarrierAlgebraMetadata(
        outcome,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }

    const afterNoOutcomeCancellation = await checkpointYieldAndMaybeCancel(context, {
      phase: 'after-stage-no-outcome',
      stageId: descriptor.id,
    });
    if (afterNoOutcomeCancellation) {
      return attachCarrierAlgebraMetadata(
        afterNoOutcomeCancellation,
        context.originalResolvedLatex,
        context.preparedRequest,
      );
    }
  }

  return null;
}

function runGuardedEquationSolveInternal(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  descriptors: GuardedEquationStageDescriptor[],
  options: GuardedEquationSolveOptions = {},
  trace?: GuardedEquationStageReplayTrace,
): EquationStageResultCarrierV1 {
  const executionBudget = getEquationExecutionBudget();
  const preparedRequest = prepareAlgebraSolveRequest(request);
  let symbolicCache: ReturnType<typeof runExpressionAction> | null = null;
  const getSymbolic = () => {
    if (symbolicCache) {
      return symbolicCache;
    }

    symbolicCache = runExpressionAction(
      {
        mode: 'equation',
        document: { latex: preparedRequest.resolvedLatex },
        angleUnit: preparedRequest.angleUnit,
        outputStyle: preparedRequest.outputStyle,
        variables: { Ans: preparedRequest.ansLatex },
      },
      'solve',
    );

      return symbolicCache;
    };
  const runner: GuardedSolveRunner = (nextRequest, nextDepth, nextTrail) => runGuardedEquationSolveInternal(
    nextRequest,
    nextDepth,
    nextTrail,
    descriptors,
    options,
    trace,
  );
  const stateKey = equationStateKey(preparedRequest.resolvedLatex);
  if (trail.has(stateKey)) {
    return attachCarrierAlgebraMetadata(
      buildEquationStageResultCarrier(errorOutcome(
        'Solve',
        'This equation re-entered an equivalent guarded-solve state. Use Numeric Solve with a chosen interval.',
      )),
      request.resolvedLatex,
      preparedRequest,
    );
  }
  trail.add(stateKey);

  const validationRangeImpossibility = detectRealRangeImpossibility(
    preparedRequest.validationLatex ?? preparedRequest.resolvedLatex,
  );
  const rangeImpossibility = validationRangeImpossibility.kind === 'impossible'
    ? validationRangeImpossibility
    : detectRealRangeImpossibility(preparedRequest.resolvedLatex);

  if (rangeImpossibility.kind === 'impossible') {
    return attachCarrierAlgebraMetadata(
      rangeGuardOutcome(rangeImpossibility),
      request.resolvedLatex,
      preparedRequest,
    );
  }

  const stagedOutcome = runGuardedStageSequence(
    descriptors,
    {
      preparedRequest,
      originalResolvedLatex: request.resolvedLatex,
      depth,
      trail,
      executionBudget,
      getSymbolic,
      runner,
      control: options.control,
      trace,
    },
  );
  if (stagedOutcome) {
    return stagedOutcome;
  }
  return attachCarrierAlgebraMetadata(
    buildEquationStageResultCarrier(errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    )),
    request.resolvedLatex,
    preparedRequest,
  );
}

async function runGuardedEquationSolveInternalAsync(
  request: GuardedSolveRequest,
  depth: number,
  trail: Set<string>,
  descriptors: GuardedEquationStageDescriptor[],
  options: GuardedEquationSolveOptions = {},
  trace?: GuardedEquationStageReplayTrace,
): Promise<EquationStageResultCarrierV1> {
  const executionBudget = getEquationExecutionBudget();
  const preparedRequest = prepareAlgebraSolveRequest(request);
  let symbolicCache: ReturnType<typeof runExpressionAction> | null = null;
  const getSymbolic = () => {
    if (symbolicCache) {
      return symbolicCache;
    }

    symbolicCache = runExpressionAction(
      {
        mode: 'equation',
        document: { latex: preparedRequest.resolvedLatex },
        angleUnit: preparedRequest.angleUnit,
        outputStyle: preparedRequest.outputStyle,
        variables: { Ans: preparedRequest.ansLatex },
      },
      'solve',
    );

      return symbolicCache;
    };
  const runner: GuardedSolveRunner = (nextRequest, nextDepth, nextTrail) => runGuardedEquationSolveInternal(
    nextRequest,
    nextDepth,
    nextTrail,
    descriptors,
    options,
    trace,
  );
  const asyncRunner: AsyncGuardedSolveRunner = (nextRequest, nextDepth, nextTrail) => runGuardedEquationSolveInternalAsync(
    nextRequest,
    nextDepth,
    nextTrail,
    descriptors,
    options,
    trace,
  );
  const stateKey = equationStateKey(preparedRequest.resolvedLatex);
  if (trail.has(stateKey)) {
    return attachCarrierAlgebraMetadata(
      buildEquationStageResultCarrier(errorOutcome(
        'Solve',
        'This equation re-entered an equivalent guarded-solve state. Use Numeric Solve with a chosen interval.',
      )),
      request.resolvedLatex,
      preparedRequest,
    );
  }
  trail.add(stateKey);

  const validationRangeImpossibility = detectRealRangeImpossibility(
    preparedRequest.validationLatex ?? preparedRequest.resolvedLatex,
  );
  const rangeImpossibility = validationRangeImpossibility.kind === 'impossible'
    ? validationRangeImpossibility
    : detectRealRangeImpossibility(preparedRequest.resolvedLatex);

  if (rangeImpossibility.kind === 'impossible') {
    return attachCarrierAlgebraMetadata(
      rangeGuardOutcome(rangeImpossibility),
      request.resolvedLatex,
      preparedRequest,
    );
  }

  const stagedOutcome = await runGuardedStageSequenceAsync(
    descriptors,
    {
      preparedRequest,
      originalResolvedLatex: request.resolvedLatex,
      depth,
      trail,
      executionBudget,
      getSymbolic,
      runner,
      asyncRunner,
      control: options.control,
      trace,
      directSymbolicRunner: options.directSymbolicRunner,
    },
  );
  if (stagedOutcome) {
    return stagedOutcome;
  }
  return attachCarrierAlgebraMetadata(
    buildEquationStageResultCarrier(errorOutcome(
      'Solve',
      UNSUPPORTED_FAMILY_ERROR,
    )),
    request.resolvedLatex,
    preparedRequest,
  );
}

export {
  runGuardedEquationSolveInternal,
  runGuardedEquationSolveInternalAsync,
};
