/**
 * Contour spacing for a real surface: a 1/2/5 x 10^n step giving about six
 * bands across the height range. Shared by the CPU contour lines and the GPU
 * iso-bands so both draw the same levels (every multiple of the step).
 */
export function graphSurfaceContourStep(minimum: number, maximum: number): number {
  if (!(maximum > minimum)) return 0;
  const raw = (maximum - minimum) / 6;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, Number.EPSILON)));
  const normalized = raw / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}
