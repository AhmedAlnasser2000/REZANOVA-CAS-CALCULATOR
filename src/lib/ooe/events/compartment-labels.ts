export type OoeEventCompartmentId =
  | 'calculate'
  | 'equation'
  | 'calculus'
  | 'trigonometry'
  | 'statistics'
  | 'geometry'
  | 'linear-algebra'
  | 'table'
  | 'navigation-input-kernel';

export type OoeEventCompartmentMetadata = {
  compartmentId: OoeEventCompartmentId;
  compartmentLabel: string;
};

export const OOE_EVENT_COMPARTMENT_OPTIONS = [
  { compartmentId: 'calculate', compartmentLabel: 'Calculate' },
  { compartmentId: 'equation', compartmentLabel: 'Equation' },
  { compartmentId: 'calculus', compartmentLabel: 'Calculus' },
  { compartmentId: 'trigonometry', compartmentLabel: 'Trigonometry' },
  { compartmentId: 'statistics', compartmentLabel: 'Statistics' },
  { compartmentId: 'geometry', compartmentLabel: 'Geometry' },
  { compartmentId: 'linear-algebra', compartmentLabel: 'Linear Algebra' },
  { compartmentId: 'table', compartmentLabel: 'Table' },
  { compartmentId: 'navigation-input-kernel', compartmentLabel: 'Navigation/Input' },
] as const satisfies readonly OoeEventCompartmentMetadata[];

const COMPARTMENT_LABELS: Record<OoeEventCompartmentId, string> = {
  calculate: 'Calculate',
  equation: 'Equation',
  calculus: 'Calculus',
  trigonometry: 'Trigonometry',
  statistics: 'Statistics',
  geometry: 'Geometry',
  'linear-algebra': 'Linear Algebra',
  table: 'Table',
  'navigation-input-kernel': 'Navigation/Input',
};

function compartmentMetadata(
  compartmentId: OoeEventCompartmentId,
): OoeEventCompartmentMetadata {
  return {
    compartmentId,
    compartmentLabel: COMPARTMENT_LABELS[compartmentId],
  };
}

function normalizeFact(value: string | undefined) {
  return value?.trim() || undefined;
}

function resolveFromFact(value: string | undefined): OoeEventCompartmentMetadata | undefined {
  const fact = normalizeFact(value);
  if (!fact) {
    return undefined;
  }

  if (fact === 'expression.evaluate' || fact.startsWith('calculate.')) {
    return compartmentMetadata('calculate');
  }
  if (fact.startsWith('equation.')) {
    return compartmentMetadata('equation');
  }
  if (fact.startsWith('calculus.')) {
    return compartmentMetadata('calculus');
  }
  if (fact.startsWith('trigonometry.')) {
    return compartmentMetadata('trigonometry');
  }
  if (fact.startsWith('statistics.')) {
    return compartmentMetadata('statistics');
  }
  if (fact.startsWith('geometry.')) {
    return compartmentMetadata('geometry');
  }
  if (fact === 'linearAlgebra.matrix' || fact === 'linearAlgebra.vector') {
    return compartmentMetadata('linear-algebra');
  }
  if (fact.startsWith('table.')) {
    return compartmentMetadata('table');
  }
  if (fact.startsWith('editor.')) {
    return compartmentMetadata('navigation-input-kernel');
  }

  return undefined;
}

export function resolveOoeEventCompartment(input: {
  capabilityId?: string;
  routeLabel?: string;
  hostId?: string;
}): OoeEventCompartmentMetadata | undefined {
  return resolveFromFact(input.capabilityId)
    ?? resolveFromFact(input.routeLabel)
    ?? resolveFromFact(input.hostId);
}
