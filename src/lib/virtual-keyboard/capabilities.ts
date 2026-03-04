import type {
  CapabilityId,
  EquationScreen,
  KeyboardContext,
  LessonSpec,
  ModeId,
} from '../../types/calculator';

export const ACTIVE_CAPABILITIES = [
  'keyboard-foundation',
  'algebra-core',
  'discrete-core',
  'calculus-core',
  'linear-algebra-core',
  'advanced-calculus-core',
  'trigonometry-core',
  'geometry-core',
] as const satisfies readonly CapabilityId[];

export const ACTIVE_MILESTONE = 'milestone-08-geometry-core';
export const ACTIVE_MILESTONE_TITLE = 'Keyboard Foundation + Algebra Core + Discrete Core + Calculus Core + Linear Algebra Core + Advanced Calculus + Trigonometry + Geometry';

export const MILESTONE_LABELS: Record<CapabilityId, string> = {
  'keyboard-foundation': 'Keyboard Foundation',
  'algebra-core': 'Algebra Core',
  'discrete-core': 'Discrete Core',
  'calculus-core': 'Calculus Core',
  'linear-algebra-core': 'Linear Algebra Core',
  'advanced-calculus-core': 'Advanced Calculus',
  'trigonometry-core': 'Trigonometry',
  'statistics-core': 'Statistics',
  'geometry-core': 'Geometry',
};

export function isCapabilityEnabled(
  enabledCapabilities: readonly CapabilityId[],
  capability: CapabilityId,
) {
  return enabledCapabilities.includes(capability);
}

export function createKeyboardContext(
  mode: ModeId,
  equationScreen?: EquationScreen,
): KeyboardContext {
  return {
    mode,
    equationScreen,
    enabledCapabilities: [...ACTIVE_CAPABILITIES],
  };
}

export function modeSupportsAdvancedKeyboard(mode: ModeId) {
  return ['calculate', 'equation', 'matrix', 'vector', 'table', 'advancedCalculus', 'trigonometry', 'statistics', 'geometry'].includes(mode);
}

export function activeMilestoneGuideRefs(lessons: readonly LessonSpec[]) {
  return lessons.filter((lesson) =>
    lesson.milestone === 'Keyboard Foundation'
      || lesson.milestone === 'Algebra Core'
      || lesson.milestone === 'Discrete Core'
      || lesson.milestone === 'Calculus Core'
      || lesson.milestone === 'Linear Algebra Core'
      || lesson.milestone === 'Advanced Calculus'
      || lesson.milestone === 'Trigonometry'
      || lesson.milestone === 'Geometry',
  );
}
