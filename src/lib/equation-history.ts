import type {
  EquationReplayTarget,
  HistoryEntry,
  PolynomialEquationView,
} from '../types/calculator';

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

export function inferEquationReplayTarget(entry: HistoryEntry): EquationReplayTarget {
  const polynomialTarget = parseGeneratedPolynomialEquationLatex(entry.inputLatex);
  if (polynomialTarget) {
    return polynomialTarget;
  }

  const simultaneousScreen = inferSimultaneousReplayScreen(entry.resultLatex);
  if (entry.inputLatex === 'linear-system' && simultaneousScreen) {
    return {
      screen: simultaneousScreen,
      equationLatex: entry.inputLatex,
    };
  }

  return {
    screen: 'symbolic',
    equationLatex: entry.inputLatex,
  };
}
