import type {
  AngleConvertState,
  CosineRuleState,
  RightTriangleState,
  SineRuleState,
  TrigEquationState,
  TrigFunctionState,
  TrigIdentityState,
  TrigRequest,
  TrigScreen,
  TrigSerializerOptions,
} from '../../types/calculator';

function filledValue(value?: string) {
  return value?.trim() || '?';
}

export function serializeTrigRequest(
  request: TrigRequest,
  options: TrigSerializerOptions = { style: 'structured' },
) {
  if (options.style !== 'structured') {
    return '';
  }

  switch (request.kind) {
    case 'function':
      return request.expressionLatex;
    case 'identitySimplify':
      return `identitySimplify(expr=${filledValue(request.expressionLatex)})`;
    case 'identityConvert':
      return `identityConvert(expr=${filledValue(request.expressionLatex)}, target=${request.targetForm})`;
    case 'equationSolve':
      return `equationSolve(eq=${filledValue(request.equationLatex)})`;
    case 'rightTriangle':
      return `rightTriangle(a=${filledValue(request.knownSideA)}, b=${filledValue(request.knownSideB)}, c=${filledValue(request.knownSideC)}, A=${filledValue(request.knownAngleA)}, B=${filledValue(request.knownAngleB)})`;
    case 'sineRule':
      return `sineRule(a=${filledValue(request.sideA)}, b=${filledValue(request.sideB)}, c=${filledValue(request.sideC)}, A=${filledValue(request.angleA)}, B=${filledValue(request.angleB)}, C=${filledValue(request.angleC)})`;
    case 'cosineRule':
      return `cosineRule(a=${filledValue(request.sideA)}, b=${filledValue(request.sideB)}, c=${filledValue(request.sideC)}, A=${filledValue(request.angleA)}, B=${filledValue(request.angleB)}, C=${filledValue(request.angleC)})`;
    case 'angleConvert':
      return `angleConvert(value=${filledValue(request.valueLatex)}, from=${request.from}, to=${request.to})`;
  }
}

export function buildTrigStructuredDraft(
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
  switch (screen) {
    case 'functions':
      return state.trigFunction.expressionLatex;
    case 'identitySimplify':
      return serializeTrigRequest({
        kind: 'identitySimplify',
        expressionLatex: state.trigIdentity.expressionLatex,
      });
    case 'identityConvert':
      return serializeTrigRequest({
        kind: 'identityConvert',
        expressionLatex: state.trigIdentity.expressionLatex,
        targetForm: state.trigIdentity.targetForm,
      });
    case 'equationSolve':
      return serializeTrigRequest({
        kind: 'equationSolve',
        equationLatex: state.trigEquation.equationLatex,
        variable: 'x',
      });
    case 'rightTriangle':
      return serializeTrigRequest({
        kind: 'rightTriangle',
        knownSideA: state.rightTriangle.knownSideA,
        knownSideB: state.rightTriangle.knownSideB,
        knownSideC: state.rightTriangle.knownSideC,
        knownAngleA: state.rightTriangle.knownAngleA,
        knownAngleB: state.rightTriangle.knownAngleB,
      });
    case 'sineRule':
      return serializeTrigRequest({
        kind: 'sineRule',
        sideA: state.sineRule.sideA,
        sideB: state.sineRule.sideB,
        sideC: state.sineRule.sideC,
        angleA: state.sineRule.angleA,
        angleB: state.sineRule.angleB,
        angleC: state.sineRule.angleC,
      });
    case 'cosineRule':
      return serializeTrigRequest({
        kind: 'cosineRule',
        sideA: state.cosineRule.sideA,
        sideB: state.cosineRule.sideB,
        sideC: state.cosineRule.sideC,
        angleA: state.cosineRule.angleA,
        angleB: state.cosineRule.angleB,
        angleC: state.cosineRule.angleC,
      });
    case 'angleConvert':
      return serializeTrigRequest({
        kind: 'angleConvert',
        valueLatex: state.angleConvert.value,
        from: state.angleConvert.from,
        to: state.angleConvert.to,
      });
    case 'specialAngles':
      return state.specialAnglesExpression;
    default:
      return '';
  }
}
