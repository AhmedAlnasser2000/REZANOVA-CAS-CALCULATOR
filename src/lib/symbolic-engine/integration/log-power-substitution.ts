import type { DisplayDetailSection } from '../../../types/calculator';
import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import { readExactScalarNode, type ExactScalar } from '../../algebra/polynomial-core';
import {
  backcheckAntiderivative,
  type AntiderivativeBackcheck,
} from '../../calculus/engine/verification';
import { flattenMultiply, isNodeArray } from '../patterns';
import { sameNode } from './node-helpers';
import { scaleByExactScalar } from './rational-latex';

type LogPowerResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
  detailSections: DisplayDetailSection[];
};

const LOG_POWER_CAP = 8;

function conditionFact(expressionLatex: string, relation: '>0' | '\\ne0'): ExactSupplementEntry {
  return {
    kind: relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex,
    relation,
    source: 'candidate-validation',
  };
}

function logNode(node: unknown, variable: string) {
  return isNodeArray(node)
    && (node[0] === 'Ln' || node[0] === 'Log')
    && node.length === 2
    && sameNode(node[1], variable);
}

function logPower(node: unknown, variable: string): number | undefined {
  if (logNode(node, variable)) {
    return 1;
  }

  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3 || !logNode(node[1], variable)) {
    return undefined;
  }

  const exponent = readExactScalarNode(node[2]);
  return exponent?.denominator === 1 && exponent.numerator >= 1 && exponent.numerator <= LOG_POWER_CAP
    ? exponent.numerator
    : undefined;
}

function logLatex(variable: string) {
  return `\\ln\\left(${variable}\\right)`;
}

function positiveLogPowerLatex(variable: string, power: number) {
  return power === 1
    ? logLatex(variable)
    : `\\left(${logLatex(variable)}\\right)^{${power}}`;
}

function reciprocalLogPowerLatex(variable: string, power: number) {
  const denominator = power === 1
    ? logLatex(variable)
    : positiveLogPowerLatex(variable, power);
  return `\\frac{1}{${denominator}}`;
}

function divideByVariableForm(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3 || !sameNode(node[2], variable)) {
    return undefined;
  }

  return logPower(node[1], variable);
}

function reciprocalLogPowerForm(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3 || readExactScalarNode(node[1])?.numerator !== 1) {
    return undefined;
  }

  const denominatorFactors = flattenMultiply(node[2]);
  let sawVariable = false;
  let logExponent: number | undefined;
  for (const factor of denominatorFactors) {
    if (sameNode(factor, variable)) {
      sawVariable = true;
      continue;
    }

    const exponent = logPower(factor, variable);
    if (exponent !== undefined && logExponent === undefined) {
      logExponent = exponent;
      continue;
    }

    return undefined;
  }

  return sawVariable ? logExponent : undefined;
}

function exactTemplateProofAfterBackcheck(
  verification: AntiderivativeBackcheck,
): AntiderivativeBackcheck | undefined {
  return verification.status === 'verified-exact'
    || verification.status === 'verified-numeric-confidence'
    ? {
      status: 'verified-exact',
      reason: 'verified by bounded log-power substitution after derivative backcheck',
    }
    : undefined;
}

function logPowerDetail(lines: string[]): DisplayDetailSection {
  return {
    title: 'Integration Log-Power Substitution',
    lines,
  };
}

function supplements(variable: string, needsLogExclusion: boolean) {
  return mergeExactSupplementLatex({
    entries: [
      conditionFact(variable, '>0'),
      ...(needsLogExclusion ? [conditionFact(logLatex(variable), '\\ne0')] : []),
    ],
    source: 'candidate-validation',
  });
}

function verifiedLogPowerResult(
  node: unknown,
  variable: string,
  exactLatex: string,
  detail: string[],
  needsLogExclusion: boolean,
): LogPowerResult | undefined {
  const verification = exactTemplateProofAfterBackcheck(backcheckAntiderivative({
    antiderivativeLatex: exactLatex,
    integrand: node,
    variable,
  }));
  return verification
    ? {
      exactLatex,
      verification,
      exactSupplementLatex: supplements(variable, needsLogExclusion),
      detailSections: [logPowerDetail([
        ...detail,
        'Accepted only after derivative backcheck against the original integrand.',
      ])],
    }
    : undefined;
}

export function tryLogPowerSubstitutionRule(
  node: unknown,
  variable: string,
): LogPowerResult | undefined {
  const numeratorLogPower = divideByVariableForm(node, variable);
  if (numeratorLogPower !== undefined) {
    const coefficient: ExactScalar = { numerator: 1, denominator: numeratorLogPower + 1 };
    return verifiedLogPowerResult(
      node,
      variable,
      scaleByExactScalar(positiveLogPowerLatex(variable, numeratorLogPower + 1), coefficient),
      [
        `Recognized form: ln(${variable})^${numeratorLogPower}/${variable}.`,
        `Substitution carrier: ${logLatex(variable)}.`,
      ],
      false,
    );
  }

  const denominatorLogPower = reciprocalLogPowerForm(node, variable);
  if (denominatorLogPower === undefined) {
    return undefined;
  }

  if (denominatorLogPower === 1) {
    return verifiedLogPowerResult(
      node,
      variable,
      `\\ln\\left|${logLatex(variable)}\\right|`,
      [
        `Recognized form: 1/(${variable} ln(${variable})).`,
        `Substitution carrier: ${logLatex(variable)}.`,
      ],
      true,
    );
  }

  return verifiedLogPowerResult(
    node,
    variable,
    scaleByExactScalar(reciprocalLogPowerLatex(variable, denominatorLogPower - 1), {
      numerator: -1,
      denominator: denominatorLogPower - 1,
    }),
    [
      `Recognized form: 1/(${variable} ln(${variable})^${denominatorLogPower}).`,
      `Substitution carrier: ${logLatex(variable)}.`,
    ],
    true,
  );
}
