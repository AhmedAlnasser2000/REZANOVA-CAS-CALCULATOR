import type { EquationSelectedTargetFamilyStopDetails } from '../equation-target-shape';
import type {
  GeneratedFormulaHandoffPayload,
  GeneratedFormulaScopedFact,
} from './generated-formula-handoff-payload';

export type GeneratedFormulaValidationBlockReason =
  | 'real-case-math-not-flattenable'
  | 'case-local-conditions'
  | 'branch-local-conditions'
  | 'scoped-facts-not-liftable'
  | 'missing-wrapper-back-substitution-validation'
  | 'missing-candidate-validation';

export type GeneratedFormulaValidationBlock = {
  reason: GeneratedFormulaValidationBlockReason;
  message: string;
};

export type GeneratedFormulaValidationEvidence = {
  wrapperBackSubstitutionValidated?: boolean;
  candidatesValidated?: boolean;
  scopedFactsLifted?: boolean;
};

export type GeneratedFormulaValidationDecision =
  | {
      kind: 'ready';
      payload: GeneratedFormulaHandoffPayload;
    }
  | {
      kind: 'blocked';
      reason: 'generated-formula-validation-required';
      payload: GeneratedFormulaHandoffPayload;
      blocks: GeneratedFormulaValidationBlock[];
      message: string;
    };

function hasLocalFacts(
  facts: readonly GeneratedFormulaScopedFact[] | undefined,
  kind: 'branch' | 'case',
) {
  return Boolean(facts?.some((fact) => fact.scope.kind === kind));
}

function hasNonGlobalFacts(facts: readonly GeneratedFormulaScopedFact[] | undefined) {
  return Boolean(facts?.some((fact) => fact.scope.kind !== 'global'));
}

function block(
  reason: GeneratedFormulaValidationBlockReason,
  message: string,
): GeneratedFormulaValidationBlock {
  return { reason, message };
}

function validationMessage(blocks: readonly GeneratedFormulaValidationBlock[]) {
  const reasonList = blocks.map((entry) => entry.reason).join(', ');
  return `Generated formula payload is represented but not live until wrapper validation is complete (${reasonList}).`;
}

export function inspectGeneratedFormulaPayloadValidation(
  payload: GeneratedFormulaHandoffPayload,
  evidence: GeneratedFormulaValidationEvidence = {},
): GeneratedFormulaValidationDecision {
  const blocks: GeneratedFormulaValidationBlock[] = [];

  if (payload.output.kind === 'case-math') {
    blocks.push(block(
      'real-case-math-not-flattenable',
      'Real formula case output cannot be flattened into an unconditional generated branch list.',
    ));
  }

  if (payload.candidateSet.kind === 'conditional-cases' || hasLocalFacts(payload.scopedFacts, 'case')) {
    blocks.push(block(
      'case-local-conditions',
      'Case-local formula conditions must stay attached to their case rows.',
    ));
  }

  if (hasLocalFacts(payload.scopedFacts, 'branch')) {
    blocks.push(block(
      'branch-local-conditions',
      'Branch-local formula facts must stay attached to their branch rows.',
    ));
  }

  if (hasNonGlobalFacts(payload.scopedFacts) && !evidence.scopedFactsLifted) {
    blocks.push(block(
      'scoped-facts-not-liftable',
      'Scoped wrapper/formula facts cannot be merged into global supplements without validation.',
    ));
  }

  if (!evidence.wrapperBackSubstitutionValidated) {
    blocks.push(block(
      'missing-wrapper-back-substitution-validation',
      'Wrapper back-substitution has not been validated against the original equation.',
    ));
  }

  if (!evidence.candidatesValidated) {
    blocks.push(block(
      'missing-candidate-validation',
      'Formula candidates have not been validated against the original generated-wrapper equation.',
    ));
  }

  if (!blocks.length) {
    return {
      kind: 'ready',
      payload,
    };
  }

  return {
    kind: 'blocked',
    reason: 'generated-formula-validation-required',
    payload,
    blocks,
    message: validationMessage(blocks),
  };
}

export function generatedFormulaValidationTraceDetails(
  decision: GeneratedFormulaValidationDecision,
): EquationSelectedTargetFamilyStopDetails {
  const { payload } = decision;
  return {
    formulaPayload: true,
    algorithm: payload.formula.algorithm,
    degree: payload.formula.degree,
    domain: payload.formula.domain,
    outputKind: payload.output.kind,
    blockCount: decision.kind === 'blocked' ? decision.blocks.length : 0,
  };
}
