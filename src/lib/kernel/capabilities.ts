import type { CalculateAction, EquationAction } from '../../types/calculator';

export type KernelCapabilityId =
  | 'expression.evaluate'
  | 'expression.simplify'
  | 'expression.factor'
  | 'expression.expand'
  | 'equation.solve'
  | 'table.build';

export type KernelCapabilityDescriptor = {
  id: KernelCapabilityId;
  category: 'expression' | 'equation' | 'table';
  entrypoint:
    | 'runExpressionAction'
    | 'runEquationMode'
    | 'buildTable';
  description: string;
};

const KERNEL_CAPABILITIES: Record<KernelCapabilityId, KernelCapabilityDescriptor> = {
  'expression.evaluate': {
    id: 'expression.evaluate',
    category: 'expression',
    entrypoint: 'runExpressionAction',
    description: 'Evaluate a Calculate expression through the shared expression runtime.',
  },
  'expression.simplify': {
    id: 'expression.simplify',
    category: 'expression',
    entrypoint: 'runExpressionAction',
    description: 'Simplify a Calculate expression through the shared expression runtime.',
  },
  'expression.factor': {
    id: 'expression.factor',
    category: 'expression',
    entrypoint: 'runExpressionAction',
    description: 'Factor a Calculate expression through the shared expression runtime.',
  },
  'expression.expand': {
    id: 'expression.expand',
    category: 'expression',
    entrypoint: 'runExpressionAction',
    description: 'Expand a Calculate expression through the shared expression runtime.',
  },
  'equation.solve': {
    id: 'equation.solve',
    category: 'equation',
    entrypoint: 'runEquationMode',
    description: 'Solve an Equation workflow through the guarded equation runtime.',
  },
  'table.build': {
    id: 'table.build',
    category: 'table',
    entrypoint: 'buildTable',
    description: 'Build a numeric table through the shared table runtime.',
  },
};

const EXPRESSION_ACTION_TO_CAPABILITY: Record<CalculateAction | EquationAction, KernelCapabilityId> = {
  evaluate: 'expression.evaluate',
  simplify: 'expression.simplify',
  factor: 'expression.factor',
  expand: 'expression.expand',
  solve: 'equation.solve',
};

export function listKernelCapabilities(): KernelCapabilityDescriptor[] {
  return Object.values(KERNEL_CAPABILITIES);
}

export function getKernelCapabilityDescriptor(
  capabilityId: KernelCapabilityId,
): KernelCapabilityDescriptor {
  return KERNEL_CAPABILITIES[capabilityId];
}

export function getKernelCapabilityForAction(
  action: CalculateAction | EquationAction,
): KernelCapabilityDescriptor {
  return getKernelCapabilityDescriptor(EXPRESSION_ACTION_TO_CAPABILITY[action]);
}

export function getTableBuildCapability(): KernelCapabilityDescriptor {
  return getKernelCapabilityDescriptor('table.build');
}
