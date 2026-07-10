export type InverseTrigFunction = 'asin' | 'acos' | 'atan';

const EPSILON = 1e-12;

function closeTo(left: number, right: number) {
  return Math.abs(left - right) < EPSILON;
}

export function exactInverseTrigDegrees(kind: InverseTrigFunction, value: number) {
  if (kind === 'asin') {
    if (closeTo(value, -1)) return -90;
    if (closeTo(value, -Math.sqrt(3) / 2)) return -60;
    if (closeTo(value, -Math.SQRT1_2)) return -45;
    if (closeTo(value, -0.5)) return -30;
    if (closeTo(value, 0)) return 0;
    if (closeTo(value, 0.5)) return 30;
    if (closeTo(value, Math.SQRT1_2)) return 45;
    if (closeTo(value, Math.sqrt(3) / 2)) return 60;
    if (closeTo(value, 1)) return 90;
    return undefined;
  }

  if (kind === 'acos') {
    if (closeTo(value, -1)) return 180;
    if (closeTo(value, -Math.sqrt(3) / 2)) return 150;
    if (closeTo(value, -Math.SQRT1_2)) return 135;
    if (closeTo(value, -0.5)) return 120;
    if (closeTo(value, 0)) return 90;
    if (closeTo(value, 0.5)) return 60;
    if (closeTo(value, Math.SQRT1_2)) return 45;
    if (closeTo(value, Math.sqrt(3) / 2)) return 30;
    if (closeTo(value, 1)) return 0;
    return undefined;
  }

  if (closeTo(value, -Math.sqrt(3))) return -60;
  if (closeTo(value, -1)) return -45;
  if (closeTo(value, -Math.sqrt(3) / 3)) return -30;
  if (closeTo(value, 0)) return 0;
  if (closeTo(value, Math.sqrt(3) / 3)) return 30;
  if (closeTo(value, 1)) return 45;
  if (closeTo(value, Math.sqrt(3))) return 60;
  return undefined;
}
