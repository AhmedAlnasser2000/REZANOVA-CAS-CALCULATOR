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
  | 'rational-function-core'
  | 'simplify-policy'
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
    summary: 'Bounded one-variable exact polynomial support is mapped for shipped parsing, arithmetic, factor, rational, numeric-root, and solve consumers.',
    evidence: [
      'src/lib/algebra/polynomial-core.ts',
      'src/lib/algebra/polynomial-core.test.ts',
      '.memory/research/readiness/poly-core-readiness-matrix.md',
    ],
    blockers: [
      'Square-free factorization, resultants, broad partial fractions beyond bounded repeated/quadratic readiness, and Grobner/elimination are still absent.',
      'Exact scalar support is number-backed and needs stronger coefficient-domain gates before MATRIX-EXACT0.',
    ],
    nextMilestone: 'INT-RAT2',
    dependsOn: [],
  },
  {
    id: 'rational-function-core',
    label: 'Rational Function Core',
    layer: 'algebra',
    status: 'ready-with-adapter',
    summary: 'Exact one-variable rational-function normalization now uses shared polynomial division/GCD and has bounded distinct-linear, repeated-linear, and irreducible-quadratic partial-fraction readiness envelopes.',
    evidence: [
      'src/lib/algebra/rational-function-core.ts',
      'src/lib/algebra/rational-function-core.test.ts',
      '.memory/research/readiness/poly-rat-core0-readiness-matrix.md',
    ],
    blockers: [
      'Stable calculus has adopted only proper rational functions with distinct rational linear factors.',
      'Square-free factorization, resultants, Grobner/elimination, algebraic-root factors, and broad rational-integration adoption remain deferred.',
    ],
    nextMilestone: 'INT-RAT2',
    dependsOn: ['polynomial-core'],
  },
  {
    id: 'simplify-policy',
    label: 'Simplify/Readback Policy',
    layer: 'algebra',
    status: 'ready-with-adapter',
    summary: 'SIMPLIFY-CORE0 provides internal form-intent, equivalence-trust, and preserved-fact policy for future rational readback without adding broad simplification behavior.',
    evidence: [
      'src/lib/algebra/simplify-policy.ts',
      'src/lib/algebra/simplify-policy.test.ts',
      '.memory/research/roadmaps/poly-rat-native-roadmap.md',
    ],
    blockers: [
      'No broad canonical simplifier, assumptions engine, or branch-cut theorem prover is implied by this policy layer.',
    ],
    nextMilestone: 'INT-RAT2',
    dependsOn: ['polynomial-core', 'rational-function-core'],
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
    evidence: ['src/lib/calculus/calculus-core.ts', 'src/lib/calculus/calculus-core.test.ts'],
    blockers: [],
    dependsOn: ['domain-range-core', 'result-envelope'],
  },
  {
    id: 'calculus-verification',
    label: 'Calculus Verification',
    layer: 'calculus',
    status: 'ready-with-adapter',
    summary: 'Derivative-backed antiderivative verification exists for bounded integration candidates.',
    evidence: ['src/lib/calculus/calculus-verification.ts', 'src/lib/symbolic-engine/integration.test.ts'],
    blockers: ['Numeric-confidence checks are not proof and broader equivalence remains out of scope.'],
    dependsOn: ['calculus-core'],
  },
  {
    id: 'symbolic-integration',
    label: 'Symbolic Integration',
    layer: 'calculus',
    status: 'ready-with-adapter',
    summary: 'Bounded symbolic integration families include derivative-backed partial fractions for distinct rational linear denominators; repeated/quadratic substrate envelopes exist but are not adopted until a later calculus milestone.',
    evidence: [
      'src/lib/symbolic-engine/integration.ts',
      'src/lib/symbolic-engine/integration.test.ts',
      '.memory/research/readiness/int-candidate2-integration-candidate-metadata.md',
    ],
    blockers: ['Repeated-factor and irreducible-quadratic rational integration need INT-RAT2 adoption plus verification/readback work; broad rational integration and Risch/Liouville integration remain deferred.'],
    dependsOn: ['polynomial-core', 'rational-function-core', 'calculus-verification', 'domain-range-core'],
  },
  {
    id: 'limit-core',
    label: 'Limit Core',
    layer: 'calculus',
    status: 'ready-with-adapter',
    summary: 'Shared finite/infinite limit behavior supports bounded known forms, local equivalents, and honesty stops.',
    evidence: ['src/lib/symbolic-engine/limits.ts', 'src/lib/calculus/calculus-core.test.ts'],
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
    status: 'ready-with-adapter',
    summary: 'Separate reusable numeric Matrix and Vector cores exist, with product adapters preserving shipped behavior.',
    evidence: [
      'src/lib/linear-algebra/matrix-core.ts',
      'src/lib/linear-algebra/vector-core.ts',
      'src/lib/linear-algebra/matrix.ts',
      'src/lib/linear-algebra/vector.ts',
    ],
    blockers: ['The cores are numeric only; exact scalar and coefficient-domain ownership remain deferred.'],
    dependsOn: ['result-envelope'],
  },
  {
    id: 'exact-linear-algebra',
    label: 'Exact Linear Algebra',
    layer: 'linear-algebra',
    status: 'defer',
    summary: 'Exact matrix/vector algebra stays deferred until exact scalar readiness and coefficient-domain gates exist.',
    evidence: [
      'src/lib/linear-algebra/matrix-core.ts',
      'src/lib/linear-algebra/vector-core.ts',
      '.memory/research/vector-matrix-readiness-audit.md',
    ],
    blockers: ['Requires exact scalar/coefficient-domain gates before MATRIX-EXACT0 can reopen.'],
    nextMilestone: 'MATRIX-EXACT0',
    dependsOn: ['vector-matrix-core', 'polynomial-core', 'rational-function-core', 'result-envelope'],
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
