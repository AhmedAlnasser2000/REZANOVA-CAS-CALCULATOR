import type { GraphEvidenceLevel } from '../contracts';

// PTX (point tracing extreme) owns every traced point and point of interest:
// drawn geometry only says which object was hit and roughly where; PTX puts
// the point on the true object and says how sure it is.

/** How a PTX point is known: exact (proved symbolically), proved (by interval arithmetic), verified (bracketed or bounded), numeric (converged only). */
export type PtxLevel = Extract<GraphEvidenceLevel, 'exact-proved' | 'interval-proved' | 'numeric-validated' | 'sampled-estimate'>;

export type PtxRole = 'on-curve' | 'probe' | 'root' | 'intersection' | 'extremum' | 'y-intercept' | 'complex-zero';

export type PtxWarning = 'near-branch-cut' | 'near-pole' | 'near-crossing';

/** A certified point. In the complex plane x is Re z and y is Im z. */
export type PtxPoint = {
  role: PtxRole;
  plane: 'real' | 'complex';
  itemIds: string[];
  x: number;
  y: number;
  /** w = f(z) for a complex-map probe. */
  value?: { re: number; im: number };
  level: PtxLevel;
  /** Short exact form when proved, such as "e^(2πi/3)" or "−1/2 + √13/2". */
  exactLabel?: string | null;
  /** Bound on the distance from the reported point to the true one, in graph units. */
  errorBound: number;
  /** |F| at the reported point (0 when exact). */
  residual: number;
  extremum?: 'minimum' | 'maximum';
  warnings: PtxWarning[];
};

export type PtxWindow = { xMin: number; xMax: number; yMin: number; yMax: number };
