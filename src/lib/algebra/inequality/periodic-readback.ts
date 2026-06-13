import type { PeriodicInequalityInterval, PeriodicInequalitySet } from './types';

function periodicShiftLatex(periodLatex: string) {
  const normalized = periodLatex.trim();
  if (normalized === '\\pi') {
    return 'k\\pi';
  }
  if (normalized === '-\\pi') {
    return '-k\\pi';
  }

  let match = normalized.match(/^(-?\d+)\\pi$/);
  if (match) {
    const coefficient = Number(match[1]);
    if (coefficient === 1) {
      return 'k\\pi';
    }
    if (coefficient === -1) {
      return '-k\\pi';
    }
    return `${coefficient}k\\pi`;
  }

  match = normalized.match(/^\\frac\{\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `\\frac{k\\pi}{${match[1]}}`;
  }

  match = normalized.match(/^\\frac\{(-?\d+)\\pi\}\{([^{}]+)\}$/);
  if (match) {
    const coefficient = Number(match[1]);
    if (coefficient === 1) {
      return `\\frac{k\\pi}{${match[2]}}`;
    }
    if (coefficient === -1) {
      return `-\\frac{k\\pi}{${match[2]}}`;
    }
    return `\\frac{${coefficient}k\\pi}{${match[2]}}`;
  }

  return `k\\cdot ${normalized}`;
}

function appendPeriodicShift(boundLatex: string, shiftLatex: string) {
  if (boundLatex === '0') {
    return shiftLatex;
  }
  if (shiftLatex.startsWith('-')) {
    return `${boundLatex}${shiftLatex}`;
  }
  return `${boundLatex}+${shiftLatex}`;
}

function periodicIntervalToLatex(variable: string, periodLatex: string, interval: PeriodicInequalityInterval) {
  const lowerOperator = interval.lowerInclusive ? '\\le ' : '<';
  const upperOperator = interval.upperInclusive ? '\\le ' : '<';
  const period = periodicShiftLatex(periodLatex);
  return `${appendPeriodicShift(interval.lowerLatex, period)}${lowerOperator}${variable}${upperOperator}${appendPeriodicShift(interval.upperLatex, period)}`;
}

export function periodicInequalitySetToLatex(set: PeriodicInequalitySet) {
  if (set.intervals.length === 0) {
    return `${set.variable}\\in\\varnothing`;
  }
  const intervals = set.intervals
    .map((interval) => periodicIntervalToLatex(set.variable, set.periodLatex, interval))
    .join('\\;\\cup\\;');
  return intervals;
}

function latexAngleToText(latex: string) {
  const normalized = latex.trim();
  let match = normalized.match(/^\\frac\{([^{}]+)\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `${match[1] === '1' ? '' : match[1]}pi/${match[2]}`;
  }
  match = normalized.match(/^\\frac\{\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `pi/${match[1]}`;
  }
  match = normalized.match(/^(-?\d*)\\pi$/);
  if (match) {
    const coefficient = match[1];
    if (!coefficient || coefficient === '1') {
      return 'pi';
    }
    if (coefficient === '-') {
      return '-pi';
    }
    return `${coefficient}*pi`;
  }
  return normalized.replaceAll('\\pi', 'pi').replaceAll('\\cdot', '*');
}

function periodicShiftText(periodLatex: string) {
  const normalized = periodLatex.trim();
  if (normalized === '\\pi') {
    return 'k*pi';
  }

  let match = normalized.match(/^(-?\d+)\\pi$/);
  if (match) {
    const coefficient = Number(match[1]);
    if (coefficient === 1) {
      return 'k*pi';
    }
    if (coefficient === -1) {
      return '-k*pi';
    }
    return `${coefficient}k*pi`;
  }

  match = normalized.match(/^\\frac\{\\pi\}\{([^{}]+)\}$/);
  if (match) {
    return `k*pi/${match[1]}`;
  }

  match = normalized.match(/^\\frac\{(-?\d+)\\pi\}\{([^{}]+)\}$/);
  if (match) {
    const coefficient = Number(match[1]);
    if (coefficient === 1) {
      return `k*pi/${match[2]}`;
    }
    if (coefficient === -1) {
      return `-k*pi/${match[2]}`;
    }
    return `${coefficient}k*pi/${match[2]}`;
  }

  return `k*${latexAngleToText(normalized)}`;
}

export function periodicInequalitySetToText(set: PeriodicInequalitySet) {
  if (set.intervals.length === 0) {
    return `${set.variable} has no real values`;
  }
  const period = periodicShiftText(set.periodLatex);
  const periodText = latexAngleToText(set.periodLatex);
  const intervals = set.intervals
    .map((interval) => {
      const lower = interval.lowerInclusive ? '<=' : '<';
      const upper = interval.upperInclusive ? '<=' : '<';
      return `${latexAngleToText(interval.lowerLatex)} + ${period} ${lower} ${set.variable} ${upper} ${latexAngleToText(interval.upperLatex)} + ${period}`;
    })
    .join(' or ');
  return `${intervals}, repeating every ${periodText}`;
}

