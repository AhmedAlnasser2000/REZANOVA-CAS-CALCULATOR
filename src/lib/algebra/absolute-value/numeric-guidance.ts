import type { AngleUnit } from '../../../types/calculator';
import { evaluateLatexAt } from '../../equation/domain-guards';
import { boxLatex } from '../../symbolic-engine/patterns';
import { ABS_NUMERIC_EPSILON } from './constants';
import {
  absoluteValuePlaceholderInline,
  buildAbsoluteValueFamilyLabel,
  matchDirectAbsoluteValueEquationLatex,
} from './families';

function sampleFiniteValues(
  expressionLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) {
  const values: number[] = [];
  const step = (end - start) / subdivisions;
  for (let index = 0; index <= subdivisions; index += 1) {
    const x = start + step * index;
    const value = evaluateLatexAt(expressionLatex, x, angleUnit).value;
    if (value !== null && Number.isFinite(value)) {
      values.push(value);
    }
  }
  return values;
}

type AbsoluteValueBranchPotential = {
  branchEquation: string;
  potential: boolean;
  finiteSampleCount: number;
};

function analyzeAbsoluteValueBranchPotential(
  equationLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) : AbsoluteValueBranchPotential {
  const samples = sampleFiniteValues(`(${equationLatex.split('=')[0]})-(${equationLatex.split('=').slice(1).join('=')})`, start, end, subdivisions, angleUnit);
  const nearZeroHit = samples.some((value) => Math.abs(value) <= ABS_NUMERIC_EPSILON);
  let signChange = false;

  for (let index = 1; index < samples.length; index += 1) {
    if (samples[index - 1] * samples[index] < 0) {
      signChange = true;
      break;
    }
  }

  return {
    branchEquation: equationLatex,
    potential: nearZeroHit || signChange,
    finiteSampleCount: samples.length,
  };
}

export function buildAbsoluteValueNumericGuidance(
  equationLatex: string,
  start: number,
  end: number,
  subdivisions: number,
  angleUnit: AngleUnit,
) {
  const family = matchDirectAbsoluteValueEquationLatex(equationLatex);
  if (!family) {
    return null;
  }

  const familyLabel = buildAbsoluteValueFamilyLabel(family);
  const guidanceLead = family.normalizationKind === 'outer-nonperiodic'
    ? `This recognized ${familyLabel} reduces through a bounded outer non-periodic layer over ${absoluteValuePlaceholderInline(family)}`
    : `This recognized ${familyLabel}`;

  if (family.branchEquations.length === 0) {
    return family.emptyBranchError
      ?? `This recognized ${familyLabel} does not produce any admissible real absolute-value branches on the current bounded exact surface.`;
  }

  if (family.kind !== 'abs-equals-abs') {
    const comparisonValues = sampleFiniteValues(
      boxLatex(family.comparisonNode),
      start,
      end,
      subdivisions,
      angleUnit,
    );

    if (comparisonValues.length > 0 && comparisonValues.every((value) => value < -ABS_NUMERIC_EPSILON)) {
      return `${guidanceLead} and requires ${boxLatex(family.comparisonNode)}\\ge0, but it stays negative across the chosen interval.`;
    }
  }

  const branchPotentials = family.branchEquations.map((branchEquation) =>
    analyzeAbsoluteValueBranchPotential(branchEquation, start, end, Math.min(subdivisions, 48), angleUnit));
  const activeBranches = branchPotentials.filter((entry) => entry.potential);
  const domainBlockedBranches = branchPotentials.filter((entry) => entry.finiteSampleCount === 0);

  if (family.branchEquations.length === 1) {
    return `${guidanceLead} and reduces to the single branch ${family.branchEquations[0]}. Shift the interval toward that branch if you want numeric confirmation.`;
  }

  if (activeBranches.length === 0) {
    const domainText = domainBlockedBranches.length > 0
      ? ' One or more branches leave the real-domain carrier range across the chosen interval.'
      : '';
    return `${guidanceLead} and generates ${family.branchEquations.join(' and ')}, but the chosen interval does not sample a sign change or near-zero hit on any admissible branch.${domainText}`;
  }

  if (activeBranches.length === 1) {
    const domainText = domainBlockedBranches.some((entry) => entry.branchEquation !== activeBranches[0].branchEquation)
      ? ' The other branch leaves the real-domain carrier range over this interval.'
      : '';
    return `${guidanceLead} and generates ${family.branchEquations.join(' and ')}; the chosen interval only samples the ${activeBranches[0].branchEquation} branch.${domainText}`;
  }

  return `${guidanceLead} and generates ${family.branchEquations.join(' and ')}. Try isolating one branch with a narrower interval or shifting the interval center.`;
}
