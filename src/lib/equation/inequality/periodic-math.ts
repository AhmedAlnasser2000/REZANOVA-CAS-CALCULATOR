import { TRIG_EPSILON } from './type-imports';

export function normalizePeriodicNumber(value: number, period: number) {
  const normalized = ((value % period) + period) % period;
  return Math.abs(normalized - period) < TRIG_EPSILON ? 0 : normalized;
}
