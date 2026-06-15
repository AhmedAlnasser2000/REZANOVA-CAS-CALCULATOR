export type CompartmentStateSurface = 'ooe' | 'static' | 'future';

export type CompartmentOoeFactMapping = {
  exact?: readonly string[];
  prefixes?: readonly string[];
};

export type CompartmentManifestEntry = {
  id: string;
  label: string;
  diagnosticsLabel: string;
  stateSurface: CompartmentStateSurface;
  ooeFacts?: CompartmentOoeFactMapping;
};

export const COMPARTMENT_MANIFEST = [
  {
    id: 'app-shell',
    label: 'App Shell',
    diagnosticsLabel: 'App Shell',
    stateSurface: 'static',
  },
  {
    id: 'app-runtime',
    label: 'App Runtime',
    diagnosticsLabel: 'App Runtime',
    stateSurface: 'static',
  },
  {
    id: 'app-state-history-variables',
    label: 'App State / History / Variables',
    diagnosticsLabel: 'App State',
    stateSurface: 'static',
  },
  {
    id: 'ooe',
    label: 'OOE',
    diagnosticsLabel: 'OOE',
    stateSurface: 'static',
  },
  {
    id: 'display',
    label: 'Display',
    diagnosticsLabel: 'Display',
    stateSurface: 'static',
  },
  {
    id: 'calculate',
    label: 'Calculate',
    diagnosticsLabel: 'Calculate',
    stateSurface: 'ooe',
    ooeFacts: {
      exact: ['expression.evaluate'],
      prefixes: ['calculate.'],
    },
  },
  {
    id: 'equation',
    label: 'Equation',
    diagnosticsLabel: 'Equation',
    stateSurface: 'ooe',
    ooeFacts: {
      prefixes: ['equation.'],
    },
  },
  {
    id: 'calculus',
    label: 'Calculus',
    diagnosticsLabel: 'Calculus',
    stateSurface: 'ooe',
    ooeFacts: {
      prefixes: ['calculus.'],
    },
  },
  {
    id: 'trigonometry',
    label: 'Trigonometry',
    diagnosticsLabel: 'Trigonometry',
    stateSurface: 'ooe',
    ooeFacts: {
      prefixes: ['trigonometry.'],
    },
  },
  {
    id: 'statistics',
    label: 'Statistics',
    diagnosticsLabel: 'Statistics',
    stateSurface: 'ooe',
    ooeFacts: {
      prefixes: ['statistics.'],
    },
  },
  {
    id: 'geometry',
    label: 'Geometry',
    diagnosticsLabel: 'Geometry',
    stateSurface: 'ooe',
    ooeFacts: {
      prefixes: ['geometry.'],
    },
  },
  {
    id: 'linear-algebra',
    label: 'Linear Algebra',
    diagnosticsLabel: 'Linear Algebra',
    stateSurface: 'ooe',
    ooeFacts: {
      exact: ['linearAlgebra.matrix', 'linearAlgebra.vector'],
    },
  },
  {
    id: 'table',
    label: 'Table',
    diagnosticsLabel: 'Table',
    stateSurface: 'ooe',
    ooeFacts: {
      prefixes: ['table.'],
    },
  },
  {
    id: 'algebra',
    label: 'Algebra',
    diagnosticsLabel: 'Algebra',
    stateSurface: 'static',
  },
  {
    id: 'symbolic-engine',
    label: 'Symbolic Engine',
    diagnosticsLabel: 'Symbolic Engine',
    stateSurface: 'static',
  },
  {
    id: 'engine',
    label: 'Engine',
    diagnosticsLabel: 'Engine',
    stateSurface: 'static',
  },
  {
    id: 'guide',
    label: 'Guide',
    diagnosticsLabel: 'Guide',
    stateSurface: 'static',
  },
  {
    id: 'navigation-input-kernel',
    label: 'Navigation / Input',
    diagnosticsLabel: 'Navigation/Input',
    stateSurface: 'ooe',
    ooeFacts: {
      prefixes: ['editor.'],
    },
  },
  {
    id: 'labs',
    label: 'Labs',
    diagnosticsLabel: 'Labs',
    stateSurface: 'static',
  },
  {
    id: 'playground',
    label: 'Playground',
    diagnosticsLabel: 'Playground',
    stateSurface: 'static',
  },
  {
    id: 'reference-mirrors',
    label: 'Reference Mirrors',
    diagnosticsLabel: 'Reference Mirrors',
    stateSurface: 'static',
  },
] as const satisfies readonly CompartmentManifestEntry[];

export type CompartmentId = typeof COMPARTMENT_MANIFEST[number]['id'];
export type OoeBackedCompartmentId = Extract<
  CompartmentId,
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
