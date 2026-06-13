import { describe, expect, it } from 'vitest';
import { baseEquationSolveRequest as request } from '../test-support/equation-request';
import { runGuardedEquationSolve } from '../guarded-solve';

describe('runGuardedEquationSolve composition and periodic routing', () => {
  it('branches into a finite trig family when the proven inner image leaves finitely many admissible inverses', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected finite trig composition branch success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.periodicFamily?.branchesLatex.join(' ')).toContain('\\arccos');
    expect(result.periodicFamily?.suggestedIntervals?.length ?? 0).toBeGreaterThan(0);
  });

  it('solves bounded nonlinear-in-k families like sin(x^2)=1/2 as symbolic parameterized branches', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(x^2\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x^2\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected parameterized periodic family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.exactLatex ?? '').toContain('\\sqrt');
    expect(result.exactSupplementLatex?.join(' ') ?? '').toContain('Parameter constraints');
    expect(result.periodicFamily?.suggestedIntervals?.length ?? 0).toBeGreaterThan(0);
  });

  it('solves bounded affine power-form carriers like sin((2x+1)^3)=0 as symbolic parameterized branches', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left((2x+1)^3\\right)=0',
      resolvedLatex: '\\sin\\left((2x+1)^3\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected affine power-form periodic family success');
    }
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('x');
    expect(result.exactLatex ?? '').toContain('k');
  });

  it('keeps even-power periodic families honest by preserving branch parameter constraints', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left((x+1)^2\\right)=0',
      resolvedLatex: '\\sin\\left((x+1)^2\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected even-power periodic family success');
    }
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('\\sqrt');
    expect(result.exactSupplementLatex?.join(' ') ?? '').toContain('\\ge0');
  });

  it('solves bounded tan composition families as explicit periodic branch families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
      resolvedLatex: '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected periodic tan composition success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.exactLatex ?? '').toContain('\\exp');
    expect(result.exactLatex ?? '').toContain('\\pi k');
    expect(result.periodicFamily?.suggestedIntervals?.[0]?.start).toContain('0.');
  });

  it('solves positive-exponential periodic follow-on families when the downstream exact handoff stays bounded', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(e^x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(e^x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected periodic exponential follow-on success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.exactLatex ?? '').toContain('\\ln');
    expect(result.exactSupplementLatex?.join(' ') ?? '').toContain('Branch conditions');
    expect(result.periodicFamily?.suggestedIntervals?.length ?? 0).toBeGreaterThan(0);
  });

  it('formats periodic branch families in the selected non-radian unit', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\ln\\left(\\sin\\left(x\\right)\\right)=0',
      resolvedLatex: '\\ln\\left(\\sin\\left(x\\right)\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected degree-mode periodic family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.exactLatex ?? '').toContain('360k+90');
    expect(result.periodicFamily?.representatives?.[0]?.exactLatex ?? '').toContain('90');
  });

  it('solves bounded outer inverse-trig handoff through a direct affine carrier', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arcsin\\left(2x-1\\right)=30',
      resolvedLatex: '\\arcsin\\left(2x-1\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected bounded inverse-trig handoff success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.exactLatex).toContain('x=');
    expect(result.candidateValues?.[0]).toBeCloseTo(0.75, 8);
  });

  it('solves bounded outer inverse-trig handoff through one supported non-periodic follow-on step', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arctan\\left(\\ln\\left(x+1\\right)\\right)=45',
      resolvedLatex: '\\arctan\\left(\\ln\\left(x+1\\right)\\right)=45',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected inverse-trig ln handoff success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('e');
  });

  it('closes inverse/direct trig outers over supported nonlinear carriers like x^2 exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arcsin\\left(\\sin\\left(x^2\\right)\\right)=30',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(x^2\\right)\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected supported nonlinear sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('360k');
  });

  it('solves quadratic periodic carriers like sin(x^2+x)=1/2 as symbolic parameterized branches', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(x^2+x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x^2+x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected quadratic periodic-family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('\\sqrt');
    expect(result.exactLatex ?? '').toContain('2\\pi k');
    expect(result.periodicFamily?.parameterConstraintLatex?.length ?? 0).toBeGreaterThan(0);
  });

  it('returns exact reduced-carrier periodic families for broader polynomial carriers like sin(x^3+x)=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(x^3+x\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x^3+x\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected reduced-carrier periodic-family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Composition Branch');
    expect(result.exactLatex ?? '').toContain('x^3+x');
    expect(result.exactLatex ?? '').toContain('\\pi');
  });

  it('returns exact reduced-carrier periodic families for shifted radical carriers like sin(sqrt(x+1)-2)=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\sqrt{x+1}-2\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\sqrt{x+1}-2\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted radical reduced-carrier periodic success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.exactLatex ?? '').toContain('\\sqrt{x+1}-2');
    expect(result.periodicFamily?.reducedCarrierLatex ?? '').toContain('\\sqrt{x+1}-2');
    expect(result.solveSummaryText ?? '').toContain('Exact reduced-carrier periodic family');
  });

  it('returns exact reduced-carrier periodic families for abs-backed carriers like sin(|x-1|)=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\left|x-1\\right|\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\left|x-1\\right|\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected abs-backed reduced-carrier periodic success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.exactLatex ?? '').toContain('\\vert x-1\\vert');
    expect(result.periodicFamily?.reducedCarrierLatex ?? '').toContain('\\vert x-1\\vert');
    expect(result.solveSummaryText ?? '').toContain('Exact reduced-carrier periodic family');
  });

  it('returns exact reduced-carrier periodic families for shifted rational-power carriers like sin(x^(1/3)-1)=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(x^{\\frac{1}{3}}-1\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(x^{\\frac{1}{3}}-1\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted rational-power reduced-carrier periodic success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.exactLatex ?? '').toMatch(/(\\sqrt\[3\]\{x\}|x\^\{\\frac\{1\}\{3\}\})/);
    expect(result.exactLatex ?? '').toContain('-1');
  });

  it('returns exact reduced-carrier periodic families for shifted logarithmic carriers like sin(ln(x+1)-2)=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\ln\\left(x+1\\right)-2\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\ln\\left(x+1\\right)-2\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted logarithmic reduced-carrier periodic success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.exactLatex ?? '').toContain('\\ln(x+1)-2');
    expect(result.periodicFamily?.reducedCarrierLatex ?? '').toContain('\\ln(x+1)-2');
    expect(result.solveSummaryText ?? '').toContain('Exact reduced-carrier periodic family');
  });

  it('still prefers explicit x closure when sin(ln(x+1))=1/2 can be solved back to x exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\ln\\left(x+1\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected explicit-x periodic-family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.periodicFamily?.carrierLatex).toBe('x');
    expect(result.exactLatex ?? '').not.toContain('\\ln\\left(x+1\\right)');
  });

  it('keeps inverse-trig follow-ons outside the affine/power templates recognized but unresolved', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arctan\\left(x^3+x\\right)=45',
      resolvedLatex: '\\arctan\\left(x^3+x\\right)=45',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected unresolved inverse-trig follow-on guidance');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.error).toContain('current exact bounded solve set');
  });

  it('reduces one deeper periodic layer through inverse-trig carriers when the principal range leaves a finite branch set', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected deeper periodic inverse-trig follow-on success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('\\frac{\\pi}{3}');
    expect(result.periodicFamily?.branchesLatex.length ?? 0).toBeGreaterThan(1);
  });

  it('solves inverse-trig wrappers over deeper periodic carriers in non-radian mode', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arcsin\\left(\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)\\right)=30',
      resolvedLatex: '\\arcsin\\left(\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected non-radian inverse-trig periodic follow-on success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('360k+60');
  });

  it('keeps deep nested periodic carriers honest when exact closure would require a second independent periodic parameter', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\sin\\left(\\cos\\left(\\tan\\left(x\\right)\\right)\\right)=0.00002',
      resolvedLatex: '\\sin\\left(\\cos\\left(\\tan\\left(x\\right)\\right)\\right)=0.00002',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected structured deep-periodic guidance');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.error).toContain('second independent periodic parameter');
    expect(result.exactLatex ?? '').toContain('\\tan(x)');
  });

  it('solves direct reciprocal trig equations like cot(x)=0 as symbolic periodic families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\cot\\left(x\\right)=0',
      resolvedLatex: '\\cot\\left(x\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected cot periodic family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Reciprocal Rewrite');
    expect(result.exactLatex ?? '').toContain('\\frac{\\pi}{2}');
    expect(result.periodicFamily?.reducedCarrierLatex).toContain('\\cos');
  });

  it('rejects reciprocal trig targets outside the reachable real image after bounded rewrite', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sec\\left(\\sin\\left(x\\right)\\right)=2',
      resolvedLatex: '\\sec\\left(\\sin\\left(x\\right)\\right)=2',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected reciprocal trig range rejection');
    }
    expect(result.solveBadges).toContain('Range Guard');
    expect(result.solveBadges).toContain('Reciprocal Rewrite');
    expect(result.solveSummaryText ?? '').toContain('Reciprocal rewrite');
    expect(result.error).toContain('inner image');
  });

  it('reduces inverse/direct trig identities exactly when the inner carrier stays inside the principal range', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arctan\\left(\\tan\\left(\\cos\\left(x\\right)\\right)\\right)=1',
      resolvedLatex: '\\arctan\\left(\\tan\\left(\\cos\\left(x\\right)\\right)\\right)=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected principal-range exact reduction');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.exactLatex).toBe('x=360k');
    expect(result.exactSupplementLatex?.join(' ') ?? '').toContain('\\text{Principal range: }');
    expect(result.periodicFamily?.principalRangeLatex).toContain('-90');
    expect(result.periodicFamily?.piecewiseBranches?.[0]?.resultLatex ?? '').toContain('\\cos(x)');
  });

  it('closes affine inverse/direct trig sawtooth identities exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arcsin\\left(\\sin\\left(2x+10\\right)\\right)=30',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(2x+10\\right)\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected affine sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.exactLatex ?? '').toContain('360k');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
    expect(result.periodicFamily?.principalRangeLatex ?? '').toContain('90');
  });

  it('closes sign-flipped affine inverse/direct trig identities exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arctan\\left(\\tan\\left(10-2x\\right)\\right)=30',
      resolvedLatex: '\\arctan\\left(\\tan\\left(10-2x\\right)\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected sign-flipped affine sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.exactLatex ?? '').toContain('180k');
    expect(result.periodicFamily?.piecewiseBranches?.[0]?.resultLatex ?? '').toContain('\\arctan');
  });

  it('allows one safe outer-inversion handoff into affine sawtooth closure', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\ln\\left(\\arctan\\left(\\tan\\left(x+100\\right)\\right)\\right)=\\ln\\left(30\\right)',
      resolvedLatex: '\\ln\\left(\\arctan\\left(\\tan\\left(x+100\\right)\\right)\\right)=\\ln\\left(30\\right)',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected safe outer-inversion sawtooth handoff success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('180k');
  });

  it('closes power-form inverse/direct trig sawtooth identities exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arcsin\\left(\\sin\\left(x^2\\right)\\right)=30',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(x^2\\right)\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected power-form sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('360k');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
  });

  it('closes logarithmic inverse/direct trig sawtooth identities exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arcsin\\left(\\sin\\left(\\ln\\left(x+1\\right)\\right)\\right)=30',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(\\ln\\left(x+1\\right)\\right)\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected logarithmic sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('\\exp(');
  });

  it('closes exponential inverse/direct trig sawtooth identities exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arctan\\left(\\tan\\left(e^x\\right)\\right)=45',
      resolvedLatex: '\\arctan\\left(\\tan\\left(e^x\\right)\\right)=45',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected exponential sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('\\ln');
  });

  it('returns exact reduced-carrier sawtooth families for shifted radical carriers like arcsin(sin(sqrt(x+1)-2))=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(\\sqrt{x+1}-2\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(\\sqrt{x+1}-2\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted radical reduced-carrier sawtooth success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.periodicFamily?.reducedCarrierLatex ?? '').toContain('\\sqrt{x+1}-2');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
    expect(result.exactLatex ?? '').toContain('\\sqrt{x+1}-2');
  });

  it('closes quadratic inverse/direct trig sawtooth identities exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(x^2+x\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(x^2+x\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected quadratic sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('\\sqrt');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
  });

  it('closes shifted quadratic inverse/direct trig sawtooth identities exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\arctan\\left(\\tan\\left((2x+1)^2+3\\right)\\right)=30',
      resolvedLatex: '\\arctan\\left(\\tan\\left((2x+1)^2+3\\right)\\right)=30',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted quadratic sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('180k+27');
    expect(result.periodicFamily?.piecewiseBranches?.[0]?.resultLatex ?? '').toContain('\\arctan');
  });

  it('closes shifted cubic periodic carriers like sin((2x+1)^3+5)=0 exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\sin\\left((2x+1)^3+5\\right)=0',
      resolvedLatex: '\\sin\\left((2x+1)^3+5\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted cubic periodic-family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('\\sqrt[3]');
  });

  it('closes shifted fourth-power periodic carriers exactly', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\sin\\left((x+1)^4+5\\right)=0',
      resolvedLatex: '\\sin\\left((x+1)^4+5\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted fourth-power periodic-family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Parameterized Family');
    expect(result.exactLatex ?? '').toContain('\\sqrt[4]');
    expect(result.periodicFamily?.parameterConstraintLatex?.length ?? 0).toBeGreaterThan(0);
  });

  it('returns exact reduced-carrier sawtooth families for broader polynomial inverse/direct trig identities', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(x^3+x\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(x^3+x\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected reduced-carrier sawtooth exact closure');
    }
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.periodicFamily?.reducedCarrierLatex).toContain('x^3+x');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
    expect(result.exactLatex ?? '').toContain('x^3+x');
  });

  it('returns exact reduced-carrier sawtooth families for abs-backed carriers like arcsin(sin(|x-1|))=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(\\left|x-1\\right|\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(\\left|x-1\\right|\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected abs-backed reduced-carrier sawtooth success');
    }
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.periodicFamily?.reducedCarrierLatex ?? '').toContain('\\vert x-1\\vert');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
    expect(result.exactLatex ?? '').toContain('\\vert x-1\\vert');
  });

  it('returns exact reduced-carrier sawtooth families for shifted rational-power carriers like arcsin(sin(x^(1/3)-1))=1/2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(x^{\\frac{1}{3}}-1\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(x^{\\frac{1}{3}}-1\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected shifted rational-power reduced-carrier sawtooth success');
    }
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
    expect(result.exactLatex ?? '').toMatch(/(\\sqrt\[3\]\{x\}|x\^\{\\frac\{1\}\{3\}\})/);
    expect(result.exactLatex ?? '').toContain('-1');
  });

  it('closes selected direct trig nested families like sin(tan(x))=1/2 with two periodic parameters', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\tan\\left(x\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\tan\\left(x\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected selected two-parameter periodic-family success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.periodicFamily?.parameterLatex).toBe('k,m\\in\\mathbb{Z}');
    expect(result.exactLatex ?? '').toContain('\\arctan');
    expect(result.exactLatex ?? '').toContain('\\pi m');
  });

  it('closes selected inverse/direct trig nested families like arcsin(sin(tan(x)))=1/2 with two periodic parameters', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(\\tan\\left(x\\right)\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(\\tan\\left(x\\right)\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected selected two-parameter sawtooth success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.periodicFamily?.parameterLatex).toBe('k,m\\in\\mathbb{Z}');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(1);
    expect(result.exactLatex ?? '').toContain('\\arctan');
  });

  it('keeps bounded nested periodic reductions exact for sin(cos(x))=0', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=0',
      resolvedLatex: '\\sin\\left(\\cos\\left(x\\right)\\right)=0',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected bounded nested periodic exact success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('90');
    expect(result.periodicFamily?.discoveredFamilies?.length ?? 0).toBeGreaterThan(0);
  });

  it('keeps reciprocal nested periodic reductions exact for sec(cos(x))=1', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\sec\\left(\\cos\\left(x\\right)\\right)=1',
      resolvedLatex: '\\sec\\left(\\cos\\left(x\\right)\\right)=1',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected reciprocal nested periodic exact success');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Reciprocal Rewrite');
    expect(result.exactLatex ?? '').toContain('90');
    expect(result.periodicFamily?.discoveredFamilies?.some((family) => family.includes('\\cos'))).toBe(true);
  });

  it('tracks discovered periodic families before stopping on multi-parameter nested trig families', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'deg',
      originalLatex: '\\sin\\left(\\cos\\left(\\tan\\left(x\\right)\\right)\\right)=0.00002',
      resolvedLatex: '\\sin\\left(\\cos\\left(\\tan\\left(x\\right)\\right)\\right)=0.00002',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected structured deep-periodic guidance');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.periodicFamily?.structuredStopReason).toBe('multi-parameter-periodic-family');
    expect(result.periodicFamily?.discoveredFamilies?.length ?? 0).toBeGreaterThan(1);
    expect(result.periodicFamily?.discoveredFamilies?.some((family) => family.includes('\\tan'))).toBe(true);
  });

  it('keeps mixed poly-rad periodic carriers on structured guidance because mixed reduced carriers stay out of scope', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\sin\\left(\\sqrt{x+1}+x^{\\frac{1}{3}}\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\sqrt{x+1}+x^{\\frac{1}{3}}\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected mixed-carrier bounded guidance');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.error).toContain('mixed carrier');
    expect(result.error).toContain('one admitted carrier family at a time');
    expect(result.exactLatex ?? '').toContain('\\sqrt{x+1}');
    expect(result.solveSummaryText ?? '').toContain('Reduced-carrier boundary');
  });

  it('keeps mixed single-family continuations honest when sawtooth reduction leaves the shipped exact sink set', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(\\ln\\left(\\sqrt{x+1}+\\sqrt{x}\\right)\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(\\ln\\left(\\sqrt{x+1}+\\sqrt{x}\\right)\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected bounded sawtooth guidance when continuation leaves the sink set');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.error).toContain('leaves the current bounded exact sink set');
    expect(result.solveSummaryText ?? '').toContain('Continuation boundary');
    expect(result.periodicFamily?.piecewiseBranches?.length ?? 0).toBeGreaterThan(0);
  });

  it('stops on the bounded periodic depth cap before attempting a third periodic reduction', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      periodicReductionDepth: 3,
      originalLatex: '\\sin\\left(\\tan\\left(x\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\sin\\left(\\tan\\left(x\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected periodic depth-cap guidance');
    }
    expect(result.solveBadges).toContain('Periodic Family');
    expect(result.periodicFamily?.structuredStopReason).toBe('periodic-depth-cap');
    expect(result.error).toContain('depth cap');
  });

  it('closes one more bounded outer inversion step for ln(sqrt(log_3((x+1)^2)))=2', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
      resolvedLatex: '\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)=2',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected deeper outer-inversion success');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.exactLatex ?? '').toContain('x');
    expect(result.exactLatex ?? '').toContain('3');
  });

  it('keeps broader polynomial sawtooth carriers above degree four on structured guidance', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\arcsin\\left(\\sin\\left(x^5+x\\right)\\right)=\\frac{1}{2}',
      resolvedLatex: '\\arcsin\\left(\\sin\\left(x^5+x\\right)\\right)=\\frac{1}{2}',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected higher-degree polynomial-carrier guidance');
    }
    expect(result.solveBadges).toContain('Principal Range');
    expect(result.periodicFamily?.reducedCarrierLatex).toContain('x^5+x');
    expect(result.error).toContain('degree 4');
    expect(result.solveSummaryText ?? '').toContain('degree-4 surface');
  });

  it('still stops when a composition would exceed the three-step inversion cap', () => {
    const result = runGuardedEquationSolve({
      ...request,
      angleUnit: 'rad',
      originalLatex: '\\ln\\left(\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)\\right)=0',
      resolvedLatex: '\\ln\\left(\\ln\\left(\\sqrt{\\log_{3}\\left((x+1)^2\\right)}\\right)\\right)=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected updated composition depth-cap guidance');
    }
    expect(result.solveBadges).toContain('Outer Inversion');
    expect(result.solveBadges).toContain('Nested Recursion');
    expect(result.error).toContain('three-step outer-inversion limit');
  });
});
