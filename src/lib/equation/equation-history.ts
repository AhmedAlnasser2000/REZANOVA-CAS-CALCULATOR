import type {
  EquationReplaySeed,
  EquationReplayTarget,
  HistoryEntry,
  PolynomialEquationView,
} from '../../types/calculator';

function normalizeLatex(latex: string) {
  return latex.replace(/\s+/g, '');
}

function degreeToScreen(degree: number): PolynomialEquationView | null {
  if (degree === 2) {
    return 'quadratic';
  }

  if (degree === 3) {
    return 'cubic';
  }

  if (degree === 4) {
    return 'quartic';
  }

  return null;
}

export function parseGeneratedPolynomialEquationLatex(latex: string) {
  const normalized = normalizeLatex(latex);
  if (!normalized.endsWith('=0')) {
    return null;
  }

  const leftSide = normalized.slice(0, -2);
  if (!leftSide || !leftSide.includes('x')) {
    return null;
  }

  const signedLeftSide = /^[+-]/.test(leftSide) ? leftSide : `+${leftSide}`;
  const rawTerms = signedLeftSide.match(/[+-][^+-]+/g);
  if (!rawTerms || rawTerms.length === 0) {
    return null;
  }

  const coefficientMap = new Map<number, number>();
  let degree = 0;

  for (const rawTerm of rawTerms) {
    const sign = rawTerm.startsWith('-') ? -1 : 1;
    const body = rawTerm.slice(1);

    if (!body) {
      return null;
    }

    if (body.includes('x')) {
      const [coefficientPart, powerPart = ''] = body.split('x');
      const coefficient = coefficientPart === '' ? 1 : Number(coefficientPart);
      if (!Number.isFinite(coefficient)) {
        return null;
      }

      let power = 1;
      if (powerPart) {
        const match = powerPart.match(/^\^\{(\d+)\}$/);
        if (!match) {
          return null;
        }

        power = Number(match[1]);
      }

      degree = Math.max(degree, power);
      coefficientMap.set(power, (coefficientMap.get(power) ?? 0) + sign * coefficient);
      continue;
    }

    const constant = Number(body);
    if (!Number.isFinite(constant)) {
      return null;
    }

    coefficientMap.set(0, (coefficientMap.get(0) ?? 0) + sign * constant);
  }

  const screen = degreeToScreen(degree);
  if (!screen) {
    return null;
  }

  const coefficients = Array.from({ length: degree + 1 }, (_, index) =>
    coefficientMap.get(degree - index) ?? 0,
  );

  if (Math.abs(coefficients[0] ?? 0) < 1e-10) {
    return null;
  }

  return {
    screen,
    coefficients,
    equationLatex: latex,
  };
}

export function inferSimultaneousReplayScreen(resultLatex?: string) {
  if (!resultLatex) {
    return null;
  }

  const hasX = resultLatex.includes('x=');
  const hasY = resultLatex.includes('y=');
  const hasZ = resultLatex.includes('z=');

  if (!hasX || !hasY) {
    return null;
  }

  return hasZ ? 'linear3' : 'linear2';
}

function copySystem(system: readonly (readonly number[])[]) {
  return system.map((row) => [...row]);
}

function replayTargetFromSeed(seed: EquationReplaySeed): EquationReplayTarget {
  if (seed.screen === 'symbolic') {
    return {
      screen: 'symbolic',
      equationLatex: seed.equationLatex,
      equationSolveTarget: seed.equationSolveTarget ?? null,
      ...(seed.numericInterval ? { numericInterval: seed.numericInterval } : {}),
      ...(seed.complexRegion ? { complexRegion: seed.complexRegion } : {}),
    };
  }

  if (seed.screen === 'quadratic' || seed.screen === 'cubic' || seed.screen === 'quartic') {
    return {
      screen: seed.screen,
      coefficients: [...seed.coefficients],
      equationLatex: seed.equationLatex,
    };
  }

  if (seed.screen === 'polynomialSystem2') {
    return {
      screen: 'polynomialSystem2',
      equationLatex: seed.equationLatex,
      polynomialSystem2Latex: [...seed.polynomialSystem2Latex] as [string, string],
    };
  }

  if (seed.screen === 'linear2' || seed.screen === 'linear3') {
    return {
      screen: seed.screen,
      equationLatex: seed.equationLatex,
      system: copySystem(seed.system),
    };
  }

  return seed;
}

export function inferEquationReplayTarget(entry: HistoryEntry): EquationReplayTarget {
  if (entry.equationSeed) {
    return replayTargetFromSeed(entry.equationSeed);
  }

  const polynomialTarget = parseGeneratedPolynomialEquationLatex(entry.inputLatex);
  if (polynomialTarget) {
    return polynomialTarget;
  }

  const systemVariableCount = entry.resultDocument.systemReadback?.variables.length ?? 0;
  const simultaneousScreen = systemVariableCount >= 3
    ? 'linear3'
    : systemVariableCount >= 2
      ? 'linear2'
      : null;
  if (entry.inputLatex === 'linear-system' && simultaneousScreen) {
    return {
      screen: simultaneousScreen,
      equationLatex: entry.inputLatex,
    };
  }

  return {
    screen: 'symbolic',
    equationLatex: entry.inputLatex,
    equationSolveTarget: entry.equationSolveTarget ?? null,
  };
}
