export const MATH_CAPABILITY_READINESS_STATUSES = [
  'ready',
  'ready-with-adapter',
  'blocked',
  'defer',
] as const;

export type MathCapabilityReadinessStatus =
  (typeof MATH_CAPABILITY_READINESS_STATUSES)[number];

export type MathCapabilityReadinessId =
  | 'polynomial-core'
  | 'domain-range-core'
  | 'calculus-core'
  | 'calculus-verification'
  | 'symbolic-integration'
  | 'limit-core'
  | 'result-envelope'
  | 'numeric-fallback-policy'
  | 'vector-matrix-core'
  | 'exact-linear-algebra';

export type MathCapabilityReadinessLayer =
  | 'algebra'
  | 'calculus'
  | 'linear-algebra'
  | 'runtime'
  | 'result-surface';

export type MathCapabilityReadinessDescriptor = {
  id: MathCapabilityReadinessId;
  label: string;
  layer: MathCapabilityReadinessLayer;
  status: MathCapabilityReadinessStatus;
  summary: string;
  evidence: readonly string[];
  blockers: readonly string[];
  nextMilestone?: string;
  dependsOn: readonly MathCapabilityReadinessId[];
};

const MATH_CAPABILITY_READINESS: readonly MathCapabilityReadinessDescriptor[] = [
  {
    id: 'polynomial-core',
    label: 'Polynomial Core',
    layer: 'algebra',
    status: 'ready-with-adapter',
    summary: 'Bounded one-variable exact polynomial support exists, but broader readiness still needs POLY-CORE-AUDIT1.',
    evidence: ['src/lib/polynomial-core.ts', 'src/lib/polynomial-core.test.ts'],
    blockers: ['No recorded readiness map for gcd/cancel/square-free/resultant/Grobner prerequisites yet.'],
    nextMilestone: 'POLY-CORE-AUDIT1',
    dependsOn: [],
  },
  {
    id: 'domain-range-core',
    label: 'Domain/Range Core',
    layer: 'algebra',
    status: 'ready',
    summary: 'Bounded real-domain/range facts are shared by equation and calculus consumers.',
    evidence: ['src/lib/algebra/domain-range-core.ts', 'src/lib/algebra/domain-range-core.test.ts'],
    blockers: [],
    dependsOn: [],
  },
  {
    id: 'calculus-core',
    label: 'Calculus Core',
    layer: 'calculus',
    status: 'ready',
    summary: 'Basic Calculus and Advanced Calc share calculus evaluation boundaries for shipped behavior.',
    evidence: ['src/lib/calculus-core.ts', 'src/lib/calculus-core.test.ts'],
    blockers: [],
    dependsOn: ['domain-range-core', 'result-envelope'],
  },
  {
    id: 'calculus-verification',
    label: 'Calculus Verification',
    layer: 'calculus',
    status: 'ready-with-adapter',
    summary: 'Derivative-backed antiderivative verification exists for bounded integration candidates.',
    evidence: ['src/lib/calculus-verification.ts', 'src/lib/symbolic-engine/integration.test.ts'],
    blockers: ['Numeric-confidence checks are not proof and broader equivalence remains out of scope.'],
    dependsOn: ['calculus-core'],
  },
  {
    id: 'symbolic-integration',
    label: 'Symbolic Integration',
    layer: 'calculus',
    status: 'ready-with-adapter',
    summary: 'Bounded symbolic integration families exist with strategy metadata, but broad Risch/rational integration is deferred.',
    evidence: ['src/lib/symbolic-engine/integration.ts', 'src/lib/symbolic-engine/integration.test.ts'],
    blockers: ['Partial fractions, broad rational integration, and Risch/Liouville integration need later prerequisites.'],
    nextMilestone: 'INT-CANDIDATE2',
    dependsOn: ['polynomial-core', 'calculus-verification', 'domain-range-core'],
  },
  {
    id: 'limit-core',
    label: 'Limit Core',
    layer: 'calculus',
    status: 'ready-with-adapter',
    summary: 'Shared finite/infinite limit behavior supports bounded known forms, local equivalents, and honesty stops.',
    evidence: ['src/lib/symbolic-engine/limits.ts', 'src/lib/calculus-core.test.ts'],
    blockers: ['General series/asymptotic/MRV behavior remains Playground-only or deferred.'],
    dependsOn: ['domain-range-core', 'result-envelope'],
  },
  {
    id: 'result-envelope',
    label: 'Result Envelope',
    layer: 'result-surface',
    status: 'ready',
    summary: 'DisplayOutcome and runtime envelope helpers provide shared result metadata and detail sections.',
    evidence: ['src/types/calculator/display-types.ts', 'src/lib/kernel/runtime-envelope.ts'],
    blockers: [],
    dependsOn: [],
  },
  {
    id: 'numeric-fallback-policy',
    label: 'Numeric Fallback Policy',
    layer: 'runtime',
    status: 'ready-with-adapter',
    summary: 'Runtime budgets and result origins distinguish supported numeric fallback from exact symbolic wins.',
    evidence: ['src/lib/kernel/runtime-profile.ts', 'src/lib/kernel/runtime-policy.ts'],
    blockers: ['Future hosts still need explicit fallback permissions before adding new approximate paths.'],
    dependsOn: ['result-envelope'],
  },
  {
    id: 'vector-matrix-core',
    label: 'Vector/Matrix Core',
    layer: 'linear-algebra',
    status: 'blocked',
    summary: 'Current Matrix/Vector behavior is numeric workspace logic plus notation helpers, not a reusable core.',
    evidence: ['src/lib/matrix.ts', 'src/lib/vector.ts', '.memory/research/vector-matrix-readiness-audit.md'],
    blockers: ['Needs VEC-MAT-CORE0 to define reusable value models, validation, operation envelopes, and core ownership.'],
    nextMilestone: 'VEC-MAT-CORE0',
    dependsOn: ['result-envelope'],
  },
  {
    id: 'exact-linear-algebra',
    label: 'Exact Linear Algebra',
    layer: 'linear-algebra',
    status: 'defer',
    summary: 'Exact matrix/vector algebra stays deferred until vector/matrix core and exact scalar readiness exist.',
    evidence: ['.memory/research/vector-matrix-readiness-audit.md'],
    blockers: ['Requires vector-matrix-core plus exact scalar/coefficient-domain gates before MATRIX-EXACT0 can reopen.'],
    nextMilestone: 'MATRIX-EXACT0',
    dependsOn: ['vector-matrix-core', 'polynomial-core', 'result-envelope'],
  },
] as const;

export function listMathCapabilityReadiness(): readonly MathCapabilityReadinessDescriptor[] {
  return MATH_CAPABILITY_READINESS;
}

export function getMathCapabilityReadinessDescriptor(
  id: MathCapabilityReadinessId,
): MathCapabilityReadinessDescriptor {
  const descriptor = MATH_CAPABILITY_READINESS.find((entry) => entry.id === id);
  if (!descriptor) {
    throw new Error(`Unknown math capability readiness id: ${id}`);
  }
  return descriptor;
}

export function getMathCapabilityReadinessStatus(
  id: MathCapabilityReadinessId,
): MathCapabilityReadinessStatus {
  return getMathCapabilityReadinessDescriptor(id).status;
}
