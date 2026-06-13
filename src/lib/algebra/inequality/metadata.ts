import type { AssumptionFact } from '../assumptions-core';
import {
  buildInequalityConstraintFact,
  buildValueDomainMetadata,
  type ValueDomainMetadata,
} from '../value-domain-core';
import { inequalitySetToLatex, inequalitySetToText } from './finite-readback';
import type { InequalityFactOptions, InequalitySet } from './types';

export function inequalitySetToAssumptionFacts(
  set: InequalitySet,
  options: InequalityFactOptions = {},
): AssumptionFact[] {
  return [buildInequalityConstraintFact({
    source: 'inequality-core',
    trust: 'proved',
    scope: 'result',
    expressionLatex: options.expressionLatex ?? inequalitySetToLatex(set),
    variable: set.variable,
    message: inequalitySetToText(set),
    details: options.details,
  })];
}

export function valueDomainMetadataFromInequalitySet(
  set: InequalitySet,
  options: InequalityFactOptions = {},
): ValueDomainMetadata {
  return buildValueDomainMetadata({
    answerDomain: 'conditional-real',
    solutionKind: 'inequality-solution-set',
    facts: inequalitySetToAssumptionFacts(set, options),
  });
}

