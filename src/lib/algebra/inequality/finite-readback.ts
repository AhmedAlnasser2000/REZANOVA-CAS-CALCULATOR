import { INEQUALITY_EPSILON, type InequalityInterval, type InequalitySet } from './types';
import { boundLabel, isEmptyInequalitySet } from './intervals';

function intervalToText(variable: string, interval: InequalityInterval) {
  const lower = boundLabel(interval.lower, interval.lowerLatex);
  const upper = boundLabel(interval.upper, interval.upperLatex);
  if (interval.lower === undefined && interval.upper === undefined) {
    return `${variable} is any real number`;
  }
  if (
    interval.lower !== undefined
    && interval.upper !== undefined
    && Math.abs(interval.lower - interval.upper) < INEQUALITY_EPSILON
    && interval.lowerInclusive
    && interval.upperInclusive
  ) {
    return `${variable} = ${lower}`;
  }
  if (interval.lower === undefined && interval.upper !== undefined) {
    return `${variable} ${interval.upperInclusive ? '<=' : '<'} ${upper}`;
  }
  if (interval.lower !== undefined && interval.upper === undefined) {
    return `${variable} ${interval.lowerInclusive ? '>=' : '>'} ${lower}`;
  }

  return `${lower} ${interval.lowerInclusive ? '<=' : '<'} ${variable} ${interval.upperInclusive ? '<=' : '<'} ${upper}`;
}

function intervalToLatex(variable: string, interval: InequalityInterval) {
  const lower = boundLabel(interval.lower, interval.lowerLatex);
  const upper = boundLabel(interval.upper, interval.upperLatex);
  if (interval.lower === undefined && interval.upper === undefined) {
    return `${variable}\\in\\mathbb{R}`;
  }
  if (
    interval.lower !== undefined
    && interval.upper !== undefined
    && Math.abs(interval.lower - interval.upper) < INEQUALITY_EPSILON
    && interval.lowerInclusive
    && interval.upperInclusive
  ) {
    return `${variable}=${lower}`;
  }
  if (interval.lower === undefined && interval.upper !== undefined) {
    return `${variable}${interval.upperInclusive ? '\\le' : '<'}${upper}`;
  }
  if (interval.lower !== undefined && interval.upper === undefined) {
    return `${variable}${interval.lowerInclusive ? '\\ge' : '>'}${lower}`;
  }

  return `${lower}${interval.lowerInclusive ? '\\le ' : '<'}${variable}${interval.upperInclusive ? '\\le ' : '<'}${upper}`;
}

export function inequalitySetToText(set: InequalitySet) {
  if (isEmptyInequalitySet(set)) {
    return `${set.variable} has no real values`;
  }
  return set.intervals.map((interval) => intervalToText(set.variable, interval)).join(' or ');
}

export function inequalitySetToLatex(set: InequalitySet) {
  if (isEmptyInequalitySet(set)) {
    return `${set.variable}\\in\\varnothing`;
  }
  return set.intervals.map((interval) => intervalToLatex(set.variable, interval)).join('\\;\\cup\\;');
}

