import type {
  AngleConvertState,
  CosineRuleState,
  RightTriangleState,
  SineRuleState,
  TrigEquationState,
  TrigFunctionState,
  TrigIdentityState,
  TrigScreen,
} from '../../types/calculator';
import { buildTrigStructuredDraft, serializeTrigRequest } from './serializer';

export const DEFAULT_TRIG_FUNCTION_STATE: TrigFunctionState = {
  expressionLatex: '\\sin\\left(30\\right)',
};

export const DEFAULT_TRIG_IDENTITY_STATE: TrigIdentityState = {
  expressionLatex: '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)',
  targetForm: 'simplified',
};

export const DEFAULT_TRIG_EQUATION_STATE: TrigEquationState = {
  equationLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
  variable: 'x',
  angleUnit: 'deg',
};

export const DEFAULT_RIGHT_TRIANGLE_STATE: RightTriangleState = {
  knownSideA: '3',
  knownSideB: '4',
  knownSideC: '',
  knownAngleA: '',
  knownAngleB: '',
};

export const DEFAULT_SINE_RULE_STATE: SineRuleState = {
  sideA: '7',
  sideB: '10',
  sideC: '',
  angleA: '30',
  angleB: '',
  angleC: '',
};

export const DEFAULT_COSINE_RULE_STATE: CosineRuleState = {
  sideA: '5',
  sideB: '7',
  sideC: '',
  angleA: '',
  angleB: '',
  angleC: '60',
};

export const DEFAULT_ANGLE_CONVERT_STATE: AngleConvertState = {
  value: '30',
  from: 'deg',
  to: 'rad',
};

export const TRIG_TARGET_FORM_LABELS: Record<TrigIdentityState['targetForm'], string> = {
  simplified: 'Simplified',
  productToSum: 'Product to Sum',
  sumToProduct: 'Sum to Product',
  doubleAngle: 'Double Angle',
  halfAngle: 'Half Angle',
};

export function buildRightTriangleLatex(state: RightTriangleState) {
  return serializeTrigRequest({
    kind: 'rightTriangle',
    knownSideA: state.knownSideA,
    knownSideB: state.knownSideB,
    knownSideC: state.knownSideC,
    knownAngleA: state.knownAngleA,
    knownAngleB: state.knownAngleB,
  });
}

export function buildSineRuleLatex(state: SineRuleState) {
  return serializeTrigRequest({
    kind: 'sineRule',
    sideA: state.sideA,
    sideB: state.sideB,
    sideC: state.sideC,
    angleA: state.angleA,
    angleB: state.angleB,
    angleC: state.angleC,
  });
}

export function buildCosineRuleLatex(state: CosineRuleState) {
  return serializeTrigRequest({
    kind: 'cosineRule',
    sideA: state.sideA,
    sideB: state.sideB,
    sideC: state.sideC,
    angleA: state.angleA,
    angleB: state.angleB,
    angleC: state.angleC,
  });
}

export function buildAngleConvertLatex(state: AngleConvertState) {
  return serializeTrigRequest({
    kind: 'angleConvert',
    valueLatex: state.value,
    from: state.from,
    to: state.to,
  });
}

export function buildTrigInputLatex(
  screen: TrigScreen,
  state: {
    trigFunction: TrigFunctionState;
    trigIdentity: TrigIdentityState;
    trigEquation: TrigEquationState;
    rightTriangle: RightTriangleState;
    sineRule: SineRuleState;
    cosineRule: CosineRuleState;
    angleConvert: AngleConvertState;
    specialAnglesExpression: string;
  },
) {
  return buildTrigStructuredDraft(screen, state);
}

export function defaultTrigDraftForScreen(screen: TrigScreen) {
  if (screen === 'functions') {
    return DEFAULT_TRIG_FUNCTION_STATE.expressionLatex;
  }

  if (screen === 'identitySimplify' || screen === 'identityConvert') {
    return DEFAULT_TRIG_IDENTITY_STATE.expressionLatex;
  }

  if (screen === 'equationSolve') {
    return DEFAULT_TRIG_EQUATION_STATE.equationLatex;
  }

  if (screen === 'specialAngles') {
    return '\\cos\\left(\\frac{\\pi}{3}\\right)';
  }

  return buildTrigStructuredDraft(screen, {
    trigFunction: DEFAULT_TRIG_FUNCTION_STATE,
    trigIdentity: DEFAULT_TRIG_IDENTITY_STATE,
    trigEquation: DEFAULT_TRIG_EQUATION_STATE,
    rightTriangle: DEFAULT_RIGHT_TRIANGLE_STATE,
    sineRule: DEFAULT_SINE_RULE_STATE,
    cosineRule: DEFAULT_COSINE_RULE_STATE,
    angleConvert: DEFAULT_ANGLE_CONVERT_STATE,
    specialAnglesExpression: '\\cos\\left(\\frac{\\pi}{3}\\right)',
  });
}
