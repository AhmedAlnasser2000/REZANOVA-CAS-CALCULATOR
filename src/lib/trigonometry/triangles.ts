import type { CosineRuleState, RightTriangleState, SineRuleState } from '../../types/calculator';
import { formatNumber } from '../format';
import { parseSignedNumberInput } from '../signed-number';
import type { TrigEvaluation } from './angles';

const DEGREE = Math.PI / 180;
const EPSILON = 1e-9;

type TriangleSolution = {
  sideA: number;
  sideB: number;
  sideC: number;
  angleA: number;
  angleB: number;
  angleC: number;
};

function parsePositiveDraft(value: string) {
  const parsed = parseSignedNumberInput(value);
  if (parsed === null) {
    return null;
  }
  return parsed > 0 ? parsed : null;
}

function degrees(value: number) {
  return value / DEGREE;
}

function radians(value: number) {
  return value * DEGREE;
}

function asLatex(solution: TriangleSolution) {
  return [
    `a=${formatNumber(solution.sideA)}`,
    `b=${formatNumber(solution.sideB)}`,
    `c=${formatNumber(solution.sideC)}`,
    `A=${formatNumber(solution.angleA)}^{\\circ}`,
    `B=${formatNumber(solution.angleB)}^{\\circ}`,
    `C=${formatNumber(solution.angleC)}^{\\circ}`,
  ].join(',\\ ');
}

function triangleResult(solution: TriangleSolution, warnings: string[] = []): TrigEvaluation {
  return {
    exactLatex: asLatex(solution),
    approxText: [
      `a=${formatNumber(solution.sideA)}`,
      `b=${formatNumber(solution.sideB)}`,
      `c=${formatNumber(solution.sideC)}`,
      `A=${formatNumber(solution.angleA)} deg`,
      `B=${formatNumber(solution.angleB)} deg`,
      `C=${formatNumber(solution.angleC)} deg`,
    ].join(', '),
    warnings,
    resultOrigin: 'triangle-solver',
  };
}

function solveFromThreeSides(sideA: number, sideB: number, sideC: number) {
  if (sideA + sideB <= sideC + EPSILON || sideA + sideC <= sideB + EPSILON || sideB + sideC <= sideA + EPSILON) {
    return undefined;
  }

  const angleA = degrees(Math.acos((sideB ** 2 + sideC ** 2 - sideA ** 2) / (2 * sideB * sideC)));
  const angleB = degrees(Math.acos((sideA ** 2 + sideC ** 2 - sideB ** 2) / (2 * sideA * sideC)));
  const angleC = 180 - angleA - angleB;
  return { sideA, sideB, sideC, angleA, angleB, angleC };
}

export function solveRightTriangle(state: RightTriangleState): TrigEvaluation {
  const sideA = parsePositiveDraft(state.knownSideA);
  const sideB = parsePositiveDraft(state.knownSideB);
  const sideC = parsePositiveDraft(state.knownSideC);
  const angleA = parsePositiveDraft(state.knownAngleA);
  const angleB = parsePositiveDraft(state.knownAngleB);

  const knownCount = [sideA, sideB, sideC, angleA, angleB].filter((value) => value !== null).length;
  if (knownCount !== 2) {
    return {
      error: 'Enter exactly two known values for the right triangle, with at least one side.',
      warnings: [],
    };
  }

  if (angleA !== null && (angleA <= 0 || angleA >= 90)) {
    return { error: 'Angle A must be between 0 and 90 degrees.', warnings: [] };
  }
  if (angleB !== null && (angleB <= 0 || angleB >= 90)) {
    return { error: 'Angle B must be between 0 and 90 degrees.', warnings: [] };
  }

  if (sideA !== null && sideB !== null) {
    const hypotenuse = Math.sqrt(sideA ** 2 + sideB ** 2);
    const solvedAngleA = degrees(Math.atan2(sideA, sideB));
    return triangleResult({
      sideA,
      sideB,
      sideC: hypotenuse,
      angleA: solvedAngleA,
      angleB: 90 - solvedAngleA,
      angleC: 90,
    });
  }

  if (sideA !== null && sideC !== null) {
    if (sideC <= sideA) {
      return { error: 'The hypotenuse must be longer than side a.', warnings: [] };
    }
    const solvedAngleA = degrees(Math.asin(sideA / sideC));
    return triangleResult({
      sideA,
      sideB: Math.sqrt(sideC ** 2 - sideA ** 2),
      sideC,
      angleA: solvedAngleA,
      angleB: 90 - solvedAngleA,
      angleC: 90,
    });
  }

  if (sideB !== null && sideC !== null) {
    if (sideC <= sideB) {
      return { error: 'The hypotenuse must be longer than side b.', warnings: [] };
    }
    const solvedAngleB = degrees(Math.asin(sideB / sideC));
    return triangleResult({
      sideA: Math.sqrt(sideC ** 2 - sideB ** 2),
      sideB,
      sideC,
      angleA: 90 - solvedAngleB,
      angleB: solvedAngleB,
      angleC: 90,
    });
  }

  const primaryAngle = angleA ?? (angleB === null ? null : 90 - angleB);
  if (primaryAngle === null) {
    return { error: 'A side and an acute angle are required.', warnings: [] };
  }

  if (sideA !== null) {
    const angleARad = radians(primaryAngle);
    return triangleResult({
      sideA,
      sideB: sideA / Math.tan(angleARad),
      sideC: sideA / Math.sin(angleARad),
      angleA: primaryAngle,
      angleB: 90 - primaryAngle,
      angleC: 90,
    });
  }

  if (sideB !== null) {
    const angleBRad = radians(90 - primaryAngle);
    return triangleResult({
      sideA: sideB / Math.tan(angleBRad),
      sideB,
      sideC: sideB / Math.sin(angleBRad),
      angleA: primaryAngle,
      angleB: 90 - primaryAngle,
      angleC: 90,
    });
  }

  if (sideC === null) {
    return { error: 'A valid side is required.', warnings: [] };
  }

  const angleARad = radians(primaryAngle);
  return triangleResult({
    sideA: sideC * Math.sin(angleARad),
    sideB: sideC * Math.cos(angleARad),
    sideC,
    angleA: primaryAngle,
    angleB: 90 - primaryAngle,
    angleC: 90,
  });
}

export function solveSineRule(state: SineRuleState): TrigEvaluation {
  const sideA = parsePositiveDraft(state.sideA);
  const sideB = parsePositiveDraft(state.sideB);
  const sideC = parsePositiveDraft(state.sideC);
  const angleA = parsePositiveDraft(state.angleA);
  const angleB = parsePositiveDraft(state.angleB);
  const angleC = parsePositiveDraft(state.angleC);

  const sidePairs = [
    { side: sideA, angle: angleA, key: 'A' },
    { side: sideB, angle: angleB, key: 'B' },
    { side: sideC, angle: angleC, key: 'C' },
  ];

  const basePair = sidePairs.find((pair) => pair.side !== null && pair.angle !== null);
  if (!basePair || basePair.side === null || basePair.angle === null) {
    return {
      error: 'Enter at least one matching side-angle pair before using the sine rule.',
      warnings: [],
    };
  }

  if (basePair.angle <= 0 || basePair.angle >= 180) {
    return { error: 'Known triangle angles must be between 0 and 180 degrees.', warnings: [] };
  }

  const warnings: string[] = [];
  const scale = basePair.side / Math.sin(radians(basePair.angle));

  let solvedA = angleA;
  let solvedB = angleB;
  let solvedC = angleC;
  let solvedSideA = sideA;
  let solvedSideB = sideB;
  let solvedSideC = sideC;

  const knownAngles = [solvedA, solvedB, solvedC].filter((value) => value !== null).length;
  if (knownAngles >= 2) {
    const total = (solvedA ?? 0) + (solvedB ?? 0) + (solvedC ?? 0);
    if (total >= 180) {
      return { error: 'Triangle angles must add to less than 180 degrees before solving.', warnings: [] };
    }
    if (solvedA === null) solvedA = 180 - total;
    if (solvedB === null) solvedB = 180 - total;
    if (solvedC === null) solvedC = 180 - total;
  } else {
    let invalidRatio = false;
    const inferAngle = (side: number | null) => {
      if (side === null) {
        return null;
      }
      const ratio = side / scale;
      if (ratio < -1 - EPSILON || ratio > 1 + EPSILON) {
        invalidRatio = true;
        return null;
      }
      const principal = degrees(Math.asin(Math.max(-1, Math.min(1, ratio))));
      const alternate = 180 - principal;
      if (principal > 0 && alternate > 0 && Math.abs(alternate - principal) > EPSILON) {
        warnings.push('SSA can be ambiguous; the principal acute solution was selected.');
      }
      return principal;
    };

    if (solvedA === null) solvedA = inferAngle(solvedSideA);
    if (solvedB === null) solvedB = inferAngle(solvedSideB);
    if (solvedC === null) solvedC = inferAngle(solvedSideC);

    if (invalidRatio) {
      return { error: 'The provided values do not form a valid triangle under the sine rule.', warnings: [] };
    }

    const availableAngles = [solvedA, solvedB, solvedC].filter((value) => value !== null) as number[];
    if (availableAngles.length < 2) {
      return {
        error: 'Provide a second side or angle so the sine rule can determine the triangle.',
        warnings: [],
      };
    }

    const total = availableAngles[0] + availableAngles[1];
    if (solvedA === null) solvedA = 180 - total;
    if (solvedB === null) solvedB = 180 - total;
    if (solvedC === null) solvedC = 180 - total;
  }

  if (solvedA === null || solvedB === null || solvedC === null || solvedA + solvedB + solvedC >= 180 + EPSILON) {
    return { error: 'The provided values do not form a valid triangle.', warnings: [] };
  }

  solvedSideA ??= scale * Math.sin(radians(solvedA));
  solvedSideB ??= scale * Math.sin(radians(solvedB));
  solvedSideC ??= scale * Math.sin(radians(solvedC));

  return triangleResult({
    sideA: solvedSideA,
    sideB: solvedSideB,
    sideC: solvedSideC,
    angleA: solvedA,
    angleB: solvedB,
    angleC: solvedC,
  }, warnings);
}

export function solveCosineRule(state: CosineRuleState): TrigEvaluation {
  const sideA = parsePositiveDraft(state.sideA);
  const sideB = parsePositiveDraft(state.sideB);
  const sideC = parsePositiveDraft(state.sideC);
  const angleA = parsePositiveDraft(state.angleA);
  const angleB = parsePositiveDraft(state.angleB);
  const angleC = parsePositiveDraft(state.angleC);

  const knownSides = [sideA, sideB, sideC].filter((value) => value !== null).length;
  if (knownSides === 3 && sideA !== null && sideB !== null && sideC !== null) {
    const solved = solveFromThreeSides(sideA, sideB, sideC);
    return solved
      ? triangleResult(solved)
      : { error: 'The three side lengths do not satisfy the triangle inequality.', warnings: [] };
  }

  if (sideA !== null && sideB !== null && angleC !== null) {
    const sideCSolved = Math.sqrt(sideA ** 2 + sideB ** 2 - 2 * sideA * sideB * Math.cos(radians(angleC)));
    const solved = solveFromThreeSides(sideA, sideB, sideCSolved);
    return solved ? triangleResult(solved) : { error: 'The cosine-rule inputs do not form a valid triangle.', warnings: [] };
  }

  if (sideA !== null && sideC !== null && angleB !== null) {
    const sideBSolved = Math.sqrt(sideA ** 2 + sideC ** 2 - 2 * sideA * sideC * Math.cos(radians(angleB)));
    const solved = solveFromThreeSides(sideA, sideBSolved, sideC);
    return solved ? triangleResult(solved) : { error: 'The cosine-rule inputs do not form a valid triangle.', warnings: [] };
  }

  if (sideB !== null && sideC !== null && angleA !== null) {
    const sideASolved = Math.sqrt(sideB ** 2 + sideC ** 2 - 2 * sideB * sideC * Math.cos(radians(angleA)));
    const solved = solveFromThreeSides(sideASolved, sideB, sideC);
    return solved ? triangleResult(solved) : { error: 'The cosine-rule inputs do not form a valid triangle.', warnings: [] };
  }

  return {
    error: 'Use cosine rule with either three sides or two sides and the included angle.',
    warnings: [],
  };
}
