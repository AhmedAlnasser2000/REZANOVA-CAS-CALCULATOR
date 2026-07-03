import { describe, expect, it } from 'vitest';
import {
  canonicalizeMathInput,
  normalizeHarmlessMathSpacing,
  normalizeLiveInputOperatorLatex,
  normalizeRelationOperatorLatex,
  trimHarmlessTrailingMathSpacing,
} from './input-canonicalization';

describe('canonicalizeMathInput', () => {
  it('canonicalizes reserved function tokens on open parentheses', () => {
    const result = canonicalizeMathInput('sin(', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\sin(');
  });

  it('canonicalizes typed trig functions to the same function commands used by the keyboard', () => {
    const result = canonicalizeMathInput('cos(x)', {
      mode: 'equation',
      screenHint: 'symbolic',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toContain('\\cos');
    expect(result.canonicalLatex).toContain('(x)');
  });

  it('canonicalizes pasted reserved functions after numeric coefficients', () => {
    const result = canonicalizeMathInput('2abs(x-1)+3=11', {
      mode: 'equation',
      screenHint: 'symbolic',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('2\\operatorname{abs}(x-1)+3=11');
  });

  it('canonicalizes derivative shortcuts only in guided derivative contexts', () => {
    const ordinary = canonicalizeMathInput('ddt(sin(t))', {
      mode: 'calculus',
      screenHint: 'derivative',
      liveAssist: true,
    });
    const partial = canonicalizeMathInput('pdy(x^2y+y^3)', {
      mode: 'calculus',
      screenHint: 'partialDerivative',
      liveAssist: true,
    });
    const plainPartial = canonicalizeMathInput('pd', {
      mode: 'calculus',
      screenHint: 'partialDerivative',
      liveAssist: true,
    });
    const nonDerivative = canonicalizeMathInput('pdy(x)', {
      mode: 'calculus',
      screenHint: 'finiteLimit',
      liveAssist: true,
    });

    expect(ordinary.ok && ordinary.canonicalLatex).toBe('\\frac{d}{dt}(\\sin(t))');
    expect(partial.ok && partial.canonicalLatex).toBe(
      '\\frac{\\partial}{\\partial y}(x^2y+y^3)',
    );
    expect(plainPartial.ok && plainPartial.canonicalLatex).toBe('\\partial');
    expect(nonDerivative.ok && nonDerivative.canonicalLatex).toBe('pdy(x)');
  });

  it('normalizes live derivative shortcut input before derivative evaluation state sees it', () => {
    expect(normalizeLiveInputOperatorLatex('pdx(x^2y)', {
      mode: 'calculus',
      screenHint: 'partialDerivative',
    })).toBe('\\frac{\\partial}{\\partial x}(x^2y)');
    expect(normalizeLiveInputOperatorLatex('ddtheta(sin(\\theta))', {
      mode: 'calculus',
      screenHint: 'derivative',
    })).toBe('\\frac{d}{d\\theta}(sin(\\theta))');
    expect(normalizeLiveInputOperatorLatex('pdx(x^2y)', {
      mode: 'equation',
      screenHint: 'symbolic',
    })).toBe('pdx(x^2y)');
  });

  it('canonicalizes pasted reciprocal trig function names', () => {
    const result = canonicalizeMathInput('csc(2x+3)^2+sec(x)tan(x)+cot(x)', {
      mode: 'calculus',
      screenHint: 'indefiniteIntegral',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\csc(2x+3)^2+\\sec(x)\\tan(x)+\\cot(x)');
  });

  it('canonicalizes Calculus special-function names without changing Equation shorthand', () => {
    const calculus = canonicalizeMathInput(
      'erf(x)+erfi(x)+Si(2x+1)+Ci(x)+Ei(x)+li(x)+FresnelS(x)+FresnelC(x)+EllipticF(x,m)+EllipticE(x,m)+EllipticPi(n,x,m)',
      {
        mode: 'calculus',
        screenHint: 'derivative',
        liveAssist: true,
      },
    );
    const splitPaste = canonicalizeMathInput('S i\\left(2x+1\\right)+Fresnel S(x)+Elliptic Pi(n,x,m)', {
      mode: 'calculus',
      screenHint: 'indefiniteIntegral',
      liveAssist: true,
    });
    const equation = canonicalizeMathInput('Si(x)=1', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });

    expect(calculus.ok && calculus.canonicalLatex).toBe(
      '\\operatorname{erf}(x)+\\operatorname{erfi}(x)+\\operatorname{Si}(2x+1)+\\operatorname{Ci}(x)+\\operatorname{Ei}(x)+\\operatorname{li}(x)+\\operatorname{FresnelS}(x)+\\operatorname{FresnelC}(x)+\\operatorname{EllipticF}(x,m)+\\operatorname{EllipticE}(x,m)+\\operatorname{EllipticPi}(n,x,m)',
    );
    expect(splitPaste.ok && splitPaste.canonicalLatex).toBe(
      '\\operatorname{Si}(2x+1)+\\operatorname{FresnelS}(x)+\\operatorname{EllipticPi}(n,x,m)',
    );
    expect(equation.ok && equation.canonicalLatex).toBe('Si(x)=1');
  });

  it('normalizes Calculus live special-function input before workspace state sees it', () => {
    expect(normalizeLiveInputOperatorLatex('Si(2x+1)', {
      mode: 'calculus',
      screenHint: 'derivative',
    })).toBe('\\operatorname{Si}(2x+1)');
    expect(normalizeLiveInputOperatorLatex('Fresnel C(x)', {
      mode: 'calculus',
      screenHint: 'indefinite-integral',
    })).toBe('\\operatorname{FresnelC}(x)');
    expect(normalizeLiveInputOperatorLatex('Elliptic F(x,m)', {
      mode: 'calculus',
      screenHint: 'derivative',
    })).toBe('\\operatorname{EllipticF}(x,m)');
    expect(normalizeLiveInputOperatorLatex('Si(x)=1', {
      mode: 'equation',
      screenHint: 'symbolic',
    })).toBe('Si(x)=1');
  });

  it('canonicalizes pi but leaves bare e alone', () => {
    const piResult = canonicalizeMathInput('pi+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });
    const eResult = canonicalizeMathInput('e+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });

    expect(piResult.ok && piResult.canonicalLatex).toBe('\\pi+1');
    expect(eResult.ok && eResult.canonicalLatex).toBe('e+1');
  });

  it('canonicalizes standalone imaginary unit only for Equation input', () => {
    const equationResult = canonicalizeMathInput('x+i=0', {
      mode: 'equation',
      screenHint: 'symbolic',
    });
    const commandResult = canonicalizeMathInput('x+\\imaginaryI=0', {
      mode: 'equation',
      screenHint: 'symbolic',
    });
    const gluedResult = canonicalizeMathInput('xi+index+j=0', {
      mode: 'equation',
      screenHint: 'symbolic',
    });
    const ordinaryJkResult = canonicalizeMathInput('x+i+j+k=0', {
      mode: 'equation',
      screenHint: 'symbolic',
    });
    const calculateResult = canonicalizeMathInput('x+i', {
      mode: 'calculate',
      screenHint: 'standard',
    });

    expect(equationResult.ok && equationResult.canonicalLatex).toBe('x+\\imaginaryI=0');
    expect(commandResult.ok && commandResult.canonicalLatex).toBe('x+\\imaginaryI=0');
    expect(gluedResult.ok && gluedResult.canonicalLatex).toBe('xi+index+j=0');
    expect(ordinaryJkResult.ok && ordinaryJkResult.canonicalLatex).toBe('x+\\imaginaryI+j+k=0');
    expect(calculateResult.ok && calculateResult.canonicalLatex).toBe('x+i');
  });

  it('does not guess glued tokens such as sinx', () => {
    const result = canonicalizeMathInput('sinx+1', {
      mode: 'calculate',
      screenHint: 'standard',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('sinx+1');
  });

  it('canonicalizes table editors the same way as calculate and equation', () => {
    const result = canonicalizeMathInput('tan(x)', {
      mode: 'table',
      screenHint: 'table',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toContain('\\tan');
  });

  it('canonicalizes pasted natural-log text with MathLive left-right fences', () => {
    const result = canonicalizeMathInput('ln\\left(x^2+1\\right)', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\ln(x^2+1)');
  });

  it('preserves explicitly grouped function quotients as fractions before MathLive insertion', () => {
    const plain = canonicalizeMathInput('ln((z^4+z+1)/(z-m))+c=b', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });
    const command = canonicalizeMathInput('\\ln((z^4+z+1)/(z-m))+c=b', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });
    const fenced = canonicalizeMathInput('\\ln\\left((z^4+z+1)/(z-m)\\right)+c=b', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });
    const ungrouped = canonicalizeMathInput('ln(z^4+z+1/z-m)+c=b', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });

    const expected = '\\ln(\\frac{z^4+z+1}{z-m})+c=b';
    expect(plain.ok && plain.canonicalLatex).toBe(expected);
    expect(command.ok && command.canonicalLatex).toBe(expected);
    expect(fenced.ok && fenced.canonicalLatex).toBe(expected);
    expect(ungrouped.ok && ungrouped.canonicalLatex).toBe('\\ln(z^4+z+1/z-m)+c=b');
  });

  it('canonicalizes split natural-log letters produced by plain-text paste', () => {
    const result = canonicalizeMathInput('l n\\left(x^2+1\\right)', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\ln(x^2+1)');
  });

  it('removes empty MathLive definite-integral bounds before evaluation', () => {
    const result = canonicalizeMathInput('\\int_{}^{} 2x ln\\left(x^2+1\\right)\\,dx', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\int 2x \\ln(x^2+1)\\,dx');
  });

  it('repairs MathLive integral remnants left after deleting definite bounds', () => {
    const result = canonicalizeMathInput('\\int2x ln\\left(x^2+1\\right)\\,dx\\int_{}^{}', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\int 2x \\ln(x^2+1)\\,dx');
  });

  it('keeps non-empty definite-integral bounds intact', () => {
    const result = canonicalizeMathInput('\\int_0^1 x\\,dx', {
      mode: 'calculate',
      screenHint: 'standard',
      liveAssist: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected a canonicalization result');
    }
    expect(result.canonicalLatex).toBe('\\int_0^1 x\\,dx');
  });

  it('canonicalizes pasted relation operator pairs before runtime parsing', () => {
    const lessEqual = canonicalizeMathInput('(x-1)^2 < = 0', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });
    const greaterEqual = canonicalizeMathInput('x >= -1', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });
    const notEqual = canonicalizeMathInput('x != 0', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });

    expect(lessEqual.ok && lessEqual.canonicalLatex).toBe('(x-1)^2\\le 0');
    expect(greaterEqual.ok && greaterEqual.canonicalLatex).toBe('x\\ge-1');
    expect(notEqual.ok && notEqual.canonicalLatex).toBe('x\\ne 0');
  });

  it('groups pasted multi-digit numeric exponents before MathLive parses them', () => {
    const affinePower = canonicalizeMathInput('(x+a)^12=b', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });
    const carrierPower = canonicalizeMathInput('x^12-5x^6+4=0', {
      mode: 'equation',
      screenHint: 'symbolic',
      liveAssist: true,
    });

    expect(affinePower.ok && affinePower.canonicalLatex).toBe('(x+a)^{12}=b');
    expect(carrierPower.ok && carrierPower.canonicalLatex).toBe('x^{12}-5x^6+4=0');
  });

  it('canonicalizes pasted grouped exponents before MathLive can split them', () => {
    const exponential = canonicalizeMathInput('e^(x/2+1)', {
      mode: 'calculus',
      screenHint: 'indefinite-integral',
      liveAssist: true,
    });
    const rationalBase = canonicalizeMathInput('(1/2)^(3x-1)', {
      mode: 'calculus',
      screenHint: 'indefinite-integral',
      liveAssist: true,
    });

    expect(exponential.ok && exponential.canonicalLatex).toBe('\\exponentialE^{x/2+1}');
    expect(rationalBase.ok && rationalBase.canonicalLatex).toBe('(1/2)^{3x-1}');
  });

  it('normalizes copied and unicode relation variants before routing', () => {
    expect(normalizeRelationOperatorLatex('(x-1)^2 =< 0')).toBe('(x-1)^2 \\le 0');
    expect(normalizeRelationOperatorLatex('x => -1')).toBe('x \\ge -1');
    expect(normalizeRelationOperatorLatex('x≤2')).toBe('x\\le2');
    expect(normalizeRelationOperatorLatex('x≧-3')).toBe('x\\ge-3');
    expect(normalizeRelationOperatorLatex('x\\leqslant 4')).toBe('x\\le 4');
    expect(normalizeRelationOperatorLatex('x\\geqslant 4')).toBe('x\\ge 4');
  });
});

describe('trimHarmlessTrailingMathSpacing', () => {
  it('removes harmless trailing MathLive spacing commands before execution', () => {
    expect(trimHarmlessTrailingMathSpacing('x+1\\,\\quad  ')).toBe('x+1');
    expect(trimHarmlessTrailingMathSpacing('\\frac{1}{3}+\\frac{1}{6}\\;')).toBe('\\frac{1}{3}+\\frac{1}{6}');
  });

  it('removes MathLive spacing around plain infix operations before preview and execution', () => {
    expect(normalizeHarmlessMathSpacing('y=\\ln(x)\\quad+\\quad 4')).toBe('y=\\ln(x)+4');
    expect(normalizeHarmlessMathSpacing('x\\quad-\\quad 1')).toBe('x-1');
    expect(normalizeHarmlessMathSpacing('x\\quad*\\quad y')).toBe('x*y');
    expect(normalizeHarmlessMathSpacing('x\\quad/\\quad y')).toBe('x/y');
    expect(normalizeHarmlessMathSpacing('x\\quad=\\quad y')).toBe('x=y');
    expect(normalizeHarmlessMathSpacing('x\\quad<\\quad y')).toBe('x<y');
    expect(normalizeHarmlessMathSpacing('x\\quad,\\quad y')).toBe('x,y');
  });

  it('removes MathLive spacing before command operators without gluing command names', () => {
    expect(normalizeHarmlessMathSpacing('x\\quad\\times y')).toBe('x\\times y');
    expect(normalizeHarmlessMathSpacing('x\\quad\\cdot y')).toBe('x\\cdot y');
    expect(normalizeHarmlessMathSpacing('x\\quad\\le y')).toBe('x\\le y');
    expect(normalizeHarmlessMathSpacing('x\\times\\quad y')).toBe('x\\times y');
    expect(normalizeHarmlessMathSpacing('x\\le\\quad y')).toBe('x\\le y');
  });

  it('preserves meaningful interior spacing', () => {
    expect(trimHarmlessTrailingMathSpacing('x\\,y+1')).toBe('x\\,y+1');
    expect(trimHarmlessTrailingMathSpacing('\\frac{d}{dx}\\left(x\\right)')).toBe('\\frac{d}{dx}\\left(x\\right)');
  });
});
