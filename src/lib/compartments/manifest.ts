export type CompartmentStateSurface = 'ooe' | 'static' | 'future';
export type CompartmentSurfaceExposureCandidate = 'none' | 'internal-diagnostics' | 'future-surface';
export type CompartmentDependencyPolicy =
  | 'app-runtime-boundary'
  | 'app-surface-boundary'
  | 'display-no-ooe'
  | 'guide-labs-no-private-solvers'
  | 'library-no-app-ui'
  | 'no-source-mirrors'
  | 'private-solver-boundary'
  | 'shared-compute-isolated'
  | 'workspace-runtime-request-boundary';

export type CompartmentOoeFactMapping = {
  exact?: readonly string[];
  prefixes?: readonly string[];
};

export type CompartmentManifestEntry = {
  id: string;
  label: string;
  diagnosticsLabel: string;
  stateSurface: CompartmentStateSurface;
  surfaceExposureCandidate: CompartmentSurfaceExposureCandidate;
  ownedPaths: readonly string[];
  publicSeams: readonly string[];
  privatePaths: readonly string[];
  dependencyPolicies: readonly CompartmentDependencyPolicy[];
  ooeFacts?: CompartmentOoeFactMapping;
};

export const COMPARTMENT_MANIFEST = [
  {
    id: 'app-shell',
    label: 'App Shell',
    diagnosticsLabel: 'App Shell',
    stateSurface: 'static',
    surfaceExposureCandidate: 'internal-diagnostics',
    ownedPaths: [
      'src/App.tsx',
      'src/AppMain.tsx',
      'src/App.css',
      'src/app/shell/',
      'src/app/workspaces/',
      'src/components/',
      'src/styles/app/',
    ],
    publicSeams: [
      'src/app/shell/CompartmentErrorBoundary.tsx',
      'src/app/shell/DisplayPanel.tsx',
      'src/components/OoeDiagnosticsPanel.tsx',
    ],
    privatePaths: [
      'src/app/shell/display-panel/',
    ],
    dependencyPolicies: [
      'app-surface-boundary',
      'no-source-mirrors',
    ],
  },
  {
    id: 'app-runtime',
    label: 'App Runtime',
    diagnosticsLabel: 'App Runtime',
    stateSurface: 'static',
    surfaceExposureCandidate: 'internal-diagnostics',
    ownedPaths: [
      'src/app/runtime/',
      'src/app/logic/',
    ],
    publicSeams: [
      'src/app/runtime/useAppPersistenceRuntime.ts',
      'src/app/runtime/useHistoryDisplayRuntime.ts',
      'src/app/runtime/useLauncherRuntime.ts',
    ],
    privatePaths: [],
    dependencyPolicies: [
      'app-runtime-boundary',
      'no-source-mirrors',
    ],
  },
  {
    id: 'app-state-history-variables',
    label: 'App State / History / Variables',
    diagnosticsLabel: 'App State',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'src/lib/app-state/',
      'src/lib/algebra/variable-memory.ts',
      'src/lib/algebra/variable-memory/',
      'src/lib/algebra/variable-memory-store.ts',
      'src/lib/algebra/variable-hints.ts',
      'src/lib/algebra/named-variable.ts',
    ],
    publicSeams: [
      'src/lib/app-state/persistence.ts',
      'src/lib/algebra/variable-memory.ts',
      'src/lib/algebra/variable-hints.ts',
      'src/lib/algebra/named-variable.ts',
    ],
    privatePaths: [
      'src/lib/app-state/schemas.ts',
      'src/lib/app-state/tauri.ts',
      'src/lib/algebra/variable-memory/',
      'src/lib/algebra/variable-memory-store.ts',
    ],
    dependencyPolicies: [
      'no-source-mirrors',
    ],
  },
  {
    id: 'ooe',
    label: 'OOE',
    diagnosticsLabel: 'OOE',
    stateSurface: 'static',
    surfaceExposureCandidate: 'internal-diagnostics',
    ownedPaths: [
      'src/lib/ooe/',
      'src-tauri/src/ooe/',
    ],
    publicSeams: [
      'src/lib/ooe/diagnostics/panel-surface.ts',
      'src/lib/ooe/pilots/provenance-summary.ts',
      'src/lib/ooe/pilots/workspace-pilot.ts',
    ],
    privatePaths: [
      'src/lib/ooe/bridge-schema/',
      'src/lib/ooe/diagnostics/',
      'src/lib/ooe/events/',
      'src/lib/ooe/job-launch/',
      'src/lib/ooe/runtime-control/',
    ],
    dependencyPolicies: [
      'no-source-mirrors',
    ],
  },
  {
    id: 'canonical-result-contract',
    label: 'Canonical Result Contract',
    diagnosticsLabel: 'Result Contract',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'src/lib/result-contract/',
    ],
    publicSeams: [
      'src/lib/result-contract/index.ts',
    ],
    privatePaths: [
      'src/lib/result-contract/runtime-outcome.ts',
      'src/lib/result-contract/validation.ts',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
    ],
  },
  {
    id: 'display',
    label: 'Display',
    diagnosticsLabel: 'Display',
    stateSurface: 'static',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/display/',
    ],
    publicSeams: [
      'src/lib/display/branch-readback.ts',
      'src/lib/display/format.ts',
      'src/lib/display/math-notation.ts',
      'src/lib/display/math-notation-context.ts',
      'src/lib/display/numeric-output.ts',
      'src/lib/display/result-detail-lines.ts',
      'src/lib/display/symbolic-display.ts',
      'src/lib/display/symbolic-output-hygiene.ts',
    ],
    privatePaths: [
      'src/lib/display/result/',
      'src/lib/display/scheduling/',
      'src/lib/display/notation/',
    ],
    dependencyPolicies: [
      'display-no-ooe',
      'library-no-app-ui',
      'no-source-mirrors',
    ],
  },
  {
    id: 'language',
    label: 'Language',
    diagnosticsLabel: 'Language',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'src/lib/language/',
    ],
    publicSeams: [
      'src/lib/language/index.ts',
      'src/lib/language/language-context.ts',
    ],
    privatePaths: [
      'src/lib/language/languages/',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
    ],
  },
  {
    id: 'calculate',
    label: 'Calculate',
    diagnosticsLabel: 'Calculate',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/modes/calculate.ts',
      'src/lib/modes/calculate/',
    ],
    publicSeams: [
      'src/lib/modes/calculate.ts',
    ],
    privatePaths: [
      'src/lib/modes/calculate/',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
    ],
    ooeFacts: {
      exact: ['expression.evaluate'],
      prefixes: ['calculate.'],
    },
  },
  {
    id: 'graphing',
    label: 'Graphing',
    diagnosticsLabel: 'Graphing',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/graphing/',
    ],
    publicSeams: [
      'src/lib/graphing/index.ts',
      'src/lib/graphing/contracts/index.ts',
      'src/lib/graphing/ooe/index.ts',
    ],
    privatePaths: [
      'src/lib/graphing/contracts/validation.ts',
      'src/lib/graphing/contracts/workloads.ts',
      'src/lib/graphing/ooe/application-host.ts',
      'src/lib/graphing/ooe/graph-sampling.worker.ts',
      'src/lib/graphing/ooe/pilot.ts',
      'src/lib/graphing/ooe/worker-contract.ts',
      'src/lib/graphing/sampling/request.ts',
      'src/lib/graphing/ooe/analysis-application-host.ts',
      'src/lib/graphing/ooe/graph-analysis.worker.ts',
      'src/lib/graphing/ooe/analysis-pilot.ts',
      'src/lib/graphing/ooe/analysis-worker-contract.ts',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
      'private-solver-boundary',
    ],
    ooeFacts: {
      exact: ['graph.sample', 'graph.analyze'],
    },
  },
  {
    id: 'equation',
    label: 'Equation',
    diagnosticsLabel: 'Equation',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/equation/',
      'src/lib/modes/equation.ts',
      'src/lib/modes/equation/',
    ],
    publicSeams: [
      'src/lib/equation/guarded-solve.ts',
      'src/lib/equation/implicit-derivative-solve.ts',
      'src/lib/equation/equation-solve-result.ts',
      'src/lib/equation/shared-solve.ts',
      'src/lib/modes/equation.ts',
    ],
    privatePaths: [
      'src/lib/equation/candidate/',
      'src/lib/equation/complex/',
      'src/lib/equation/composition/',
      'src/lib/equation/direct-symbolic-worker/',
      'src/lib/equation/guarded/',
      'src/lib/equation/inequality/',
      'src/lib/equation/isolation/',
      'src/lib/equation/numeric-interval/',
      'src/lib/equation/parameterized/',
      'src/lib/equation/polynomial/',
      'src/lib/equation/solve-result/',
      'src/lib/equation/target/',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
      'private-solver-boundary',
    ],
    ooeFacts: {
      prefixes: ['equation.'],
    },
  },
  {
    id: 'calculus',
    label: 'Calculus',
    diagnosticsLabel: 'Calculus',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/calculus/',
      'src/lib/modes/calculus.ts',
    ],
    publicSeams: [
      'src/lib/calculus/calculus-identity.ts',
      'src/lib/calculus/calculus-workbench.ts',
      'src/lib/calculus/calculus-strategy.ts',
      'src/lib/modes/calculus.ts',
    ],
    privatePaths: [
      'src/lib/calculus/engine/',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
      'private-solver-boundary',
    ],
    ooeFacts: {
      prefixes: ['calculus.'],
    },
  },
  {
    id: 'trigonometry',
    label: 'Trigonometry',
    diagnosticsLabel: 'Trigonometry',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/trigonometry/',
      'src/lib/modes/trigonometry.ts',
    ],
    publicSeams: [
      'src/lib/trigonometry/runtime-request.ts',
      'src/lib/trigonometry/navigation.ts',
      'src/lib/modes/trigonometry.ts',
    ],
    privatePaths: [
      'src/lib/trigonometry/angles.ts',
      'src/lib/trigonometry/core.ts',
      'src/lib/trigonometry/equation-match.ts',
      'src/lib/trigonometry/equations.ts',
      'src/lib/trigonometry/functions.ts',
      'src/lib/trigonometry/identities.ts',
      'src/lib/trigonometry/normalize.ts',
      'src/lib/trigonometry/parser.ts',
      'src/lib/trigonometry/period-phase.ts',
      'src/lib/trigonometry/rewrite-solve.ts',
      'src/lib/trigonometry/rewrite/',
      'src/lib/trigonometry/runtime-input.ts',
      'src/lib/trigonometry/serializer.ts',
      'src/lib/trigonometry/triangles.ts',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
      'workspace-runtime-request-boundary',
    ],
    ooeFacts: {
      prefixes: ['trigonometry.'],
    },
  },
  {
    id: 'statistics',
    label: 'Statistics',
    diagnosticsLabel: 'Statistics',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/statistics/',
      'src/lib/modes/statistics.ts',
    ],
    publicSeams: [
      'src/lib/statistics/runtime-request.ts',
      'src/lib/statistics/examples.ts',
      'src/lib/modes/statistics.ts',
    ],
    privatePaths: [
      'src/lib/statistics/core.ts',
      'src/lib/statistics/engine.ts',
      'src/lib/statistics/inference.ts',
      'src/lib/statistics/parser.ts',
      'src/lib/statistics/runtime-input.ts',
      'src/lib/statistics/shared.ts',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
      'workspace-runtime-request-boundary',
    ],
    ooeFacts: {
      prefixes: ['statistics.'],
    },
  },
  {
    id: 'geometry',
    label: 'Geometry',
    diagnosticsLabel: 'Geometry',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/geometry/',
      'src/lib/modes/geometry.ts',
    ],
    publicSeams: [
      'src/lib/geometry/runtime-request.ts',
      'src/lib/geometry/navigation.ts',
      'src/lib/modes/geometry.ts',
    ],
    privatePaths: [
      'src/lib/geometry/circles.ts',
      'src/lib/geometry/core.ts',
      'src/lib/geometry/coordinate.ts',
      'src/lib/geometry/parser.ts',
      'src/lib/geometry/runtime-input.ts',
      'src/lib/geometry/serializer.ts',
      'src/lib/geometry/shapes.ts',
      'src/lib/geometry/shared.ts',
      'src/lib/geometry/solve-missing/',
      'src/lib/geometry/triangles.ts',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
      'workspace-runtime-request-boundary',
    ],
    ooeFacts: {
      prefixes: ['geometry.'],
    },
  },
  {
    id: 'linear-algebra',
    label: 'Linear Algebra',
    diagnosticsLabel: 'Linear Algebra',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/linear-algebra/',
      'src/lib/modes/matrix.ts',
      'src/lib/modes/vector.ts',
    ],
    publicSeams: [
      'src/lib/linear-algebra/runtime-request.ts',
      'src/lib/modes/matrix.ts',
      'src/lib/modes/vector.ts',
    ],
    privatePaths: [
      'src/lib/linear-algebra/',
    ],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
      'workspace-runtime-request-boundary',
    ],
    ooeFacts: {
      exact: ['linearAlgebra.matrix', 'linearAlgebra.vector'],
    },
  },
  {
    id: 'table',
    label: 'Table',
    diagnosticsLabel: 'Table',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/modes/table.ts',
      'src/lib/modes/table-core.ts',
    ],
    publicSeams: [
      'src/lib/modes/table.ts',
      'src/lib/modes/table-core.ts',
    ],
    privatePaths: [],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
    ],
    ooeFacts: {
      prefixes: ['table.'],
    },
  },
  {
    id: 'algebra',
    label: 'Algebra',
    diagnosticsLabel: 'Algebra',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'src/lib/algebra/',
    ],
    publicSeams: [
      'src/lib/algebra/algebra-transform.ts',
      'src/lib/algebra/algebra-transform-ui.ts',
      'src/lib/algebra/named-variable.ts',
      'src/lib/algebra/variable-hints.ts',
    ],
    privatePaths: [
      'src/lib/algebra/absolute-value/',
      'src/lib/algebra/domain-range/',
      'src/lib/algebra/inequality/',
      'src/lib/algebra/polynomial-core/',
      'src/lib/algebra/polynomial-elimination/',
      'src/lib/algebra/polynomial-factor/',
      'src/lib/algebra/radical/',
      'src/lib/algebra/rational-function/',
      'src/lib/algebra/transform-core/',
      'src/lib/algebra/variable-core/',
      'src/lib/algebra/variable-memory/',
    ],
    dependencyPolicies: [
      'no-source-mirrors',
      'private-solver-boundary',
      'shared-compute-isolated',
    ],
  },
  {
    id: 'symbolic-engine',
    label: 'Symbolic Engine',
    diagnosticsLabel: 'Symbolic Engine',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'src/lib/symbolic-engine/',
    ],
    publicSeams: [
      'src/lib/symbolic-engine/factoring.ts',
      'src/lib/symbolic-engine/integration.ts',
      'src/lib/symbolic-engine/limits.ts',
      'src/lib/symbolic-engine/rational.ts',
    ],
    privatePaths: [
      'src/lib/symbolic-engine/integration/',
      'src/lib/symbolic-engine/limits/',
      'src/lib/symbolic-engine/mixed-factor/',
      'src/lib/symbolic-engine/patterns/',
      'src/lib/symbolic-engine/power-log/',
      'src/lib/symbolic-engine/primitives/',
      'src/lib/symbolic-engine/radical/',
      'src/lib/symbolic-engine/rational/',
    ],
    dependencyPolicies: [
      'no-source-mirrors',
      'private-solver-boundary',
      'shared-compute-isolated',
    ],
  },
  {
    id: 'engine',
    label: 'Engine',
    diagnosticsLabel: 'Engine',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'src/lib/engine/',
    ],
    publicSeams: [
      'src/lib/engine/math-analysis.ts',
      'src/lib/engine/math-engine.ts',
      'src/lib/engine/result-guard.ts',
      'src/lib/engine/semantic-planner.ts',
    ],
    privatePaths: [
      'src/lib/engine/math-engine/',
      'src/lib/engine/semantic-planner/',
    ],
    dependencyPolicies: [
      'no-source-mirrors',
      'private-solver-boundary',
      'shared-compute-isolated',
    ],
  },
  {
    id: 'guide',
    label: 'Guide',
    diagnosticsLabel: 'Guide',
    stateSurface: 'static',
    surfaceExposureCandidate: 'future-surface',
    ownedPaths: [
      'src/lib/guide/',
    ],
    publicSeams: [
      'src/lib/guide/content.ts',
      'src/lib/guide/navigation.ts',
    ],
    privatePaths: [
      'src/lib/guide/content/',
    ],
    dependencyPolicies: [
      'guide-labs-no-private-solvers',
      'library-no-app-ui',
      'no-source-mirrors',
    ],
  },
  {
    id: 'navigation-input-kernel',
    label: 'Navigation / Input',
    diagnosticsLabel: 'Navigation/Input',
    stateSurface: 'ooe',
    surfaceExposureCandidate: 'internal-diagnostics',
    ownedPaths: [
      'src/lib/navigation/',
      'src/lib/input/',
      'src/lib/kernel/',
      'src/lib/editor/',
      'src/lib/numeric/',
      'src/lib/virtual-keyboard/',
    ],
    publicSeams: [
      'src/lib/editor/editor-analysis-control.ts',
      'src/lib/navigation/launcher.ts',
      'src/lib/virtual-keyboard/catalog.ts',
    ],
    privatePaths: [],
    dependencyPolicies: [
      'library-no-app-ui',
      'no-source-mirrors',
    ],
    ooeFacts: {
      prefixes: ['editor.'],
    },
  },
  {
    id: 'labs',
    label: 'Labs',
    diagnosticsLabel: 'Labs',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'src/lib/labs/',
    ],
    publicSeams: [
      'src/lib/labs/catalog.ts',
    ],
    privatePaths: [],
    dependencyPolicies: [
      'guide-labs-no-private-solvers',
      'no-source-mirrors',
    ],
  },
  {
    id: 'playground',
    label: 'Playground',
    diagnosticsLabel: 'Playground',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'playground/',
    ],
    publicSeams: [],
    privatePaths: [
      'playground/',
    ],
    dependencyPolicies: [
      'no-source-mirrors',
    ],
  },
  {
    id: 'reference-mirrors',
    label: 'Reference Mirrors',
    diagnosticsLabel: 'Reference Mirrors',
    stateSurface: 'static',
    surfaceExposureCandidate: 'none',
    ownedPaths: [
      'reference-mirror-registry/',
    ],
    publicSeams: [],
    privatePaths: [
      'reference-mirror-registry/',
    ],
    dependencyPolicies: [
      'no-source-mirrors',
    ],
  },
] as const satisfies readonly CompartmentManifestEntry[];

export type CompartmentId = typeof COMPARTMENT_MANIFEST[number]['id'];
export type OoeBackedCompartmentId = Extract<
  CompartmentId,
  | 'graphing'
  | 'calculate'
  | 'equation'
  | 'calculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry'
  | 'linear-algebra'
  | 'table'
  | 'navigation-input-kernel'
>;

export type OoeBackedCompartmentMetadata = {
  compartmentId: OoeBackedCompartmentId;
  compartmentLabel: string;
};

export type OoeCompartmentResolutionInput = {
  capabilityId?: string;
  routeLabel?: string;
  hostId?: string;
};

function normalizeFact(value: string | undefined) {
  return value?.trim() || undefined;
}

function matchesMapping(fact: string, mapping: CompartmentOoeFactMapping | undefined) {
  if (!mapping) {
    return false;
  }
  return Boolean(
    mapping.exact?.includes(fact)
    || mapping.prefixes?.some((prefix) => fact.startsWith(prefix)),
  );
}

export function getCompartmentManifestEntry(
  compartmentId: CompartmentId,
): typeof COMPARTMENT_MANIFEST[number] | undefined {
  return COMPARTMENT_MANIFEST.find((entry) => entry.id === compartmentId);
}

export function listOoeBackedCompartmentOptions(): OoeBackedCompartmentMetadata[] {
  return COMPARTMENT_MANIFEST
    .filter((entry): entry is Extract<typeof COMPARTMENT_MANIFEST[number], {
      stateSurface: 'ooe';
    }> => entry.stateSurface === 'ooe')
    .map((entry) => ({
      compartmentId: entry.id,
      compartmentLabel: entry.diagnosticsLabel,
    }));
}

function resolveFromFact(fact: string | undefined): OoeBackedCompartmentMetadata | undefined {
  const normalizedFact = normalizeFact(fact);
  if (!normalizedFact) {
    return undefined;
  }

  const entry = COMPARTMENT_MANIFEST.find((candidate) =>
    candidate.stateSurface === 'ooe' && matchesMapping(normalizedFact, candidate.ooeFacts));

  return entry && entry.stateSurface === 'ooe'
    ? {
        compartmentId: entry.id,
        compartmentLabel: entry.diagnosticsLabel,
      }
    : undefined;
}

export function resolveOoeBackedCompartment(
  input: OoeCompartmentResolutionInput,
): OoeBackedCompartmentMetadata | undefined {
  return resolveFromFact(input.capabilityId)
    ?? resolveFromFact(input.routeLabel)
    ?? resolveFromFact(input.hostId);
}
