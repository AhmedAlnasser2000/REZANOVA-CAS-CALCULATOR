import { describe, expect, it } from 'vitest';
import { buildDisplayBlocks } from '../../display/result/display-blocks';
import {
  runEquationMode,
} from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode complex domain', () => {
  it('keeps simple real linear equations stable when Complex intent is enabled', () => {
    const real = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationDomainIntent: 'real',
    });
    const complex = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+1=2',
      equationDomainIntent: 'complex',
    });

    expect(real.kind).toBe('success');
    expect(complex.kind).toBe('success');
    if (real.kind !== 'success' || complex.kind !== 'success') {
      throw new Error('Expected real and complex linear successes');
    }
    expect(complex.exactLatex).toBe(real.exactLatex);
    expect(complex.resultOrigin).toBe('symbolic');
  });

  it('keeps Complex Off real-first for symbolic complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Complex Off to keep the real-first stop');
    }
    expect(result.answerDomain).toBeUndefined();
    expect(result.error).toContain('outside the supported exact symbolic solve families');
  });

  it('treats explicit imaginary input as Complex-only Equation intent', () => {
    const complexOff = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x+\\imaginaryI=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(complexOff.kind).toBe('error');
    if (complexOff.kind !== 'error') {
      throw new Error('Expected Complex Off guidance');
    }
    expect(complexOff.error).toContain('Enable Complex');
    expect(complexOff.detailSections?.some((section) => section.title === 'Complex Input')).toBe(true);
  });

  it('solves bounded symbolic quadratics over the complex domain when Complex is enabled', () => {
    const pureImaginary = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+1=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });
    const shifted = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(pureImaginary.kind).toBe('success');
    expect(shifted.kind).toBe('success');
    if (pureImaginary.kind !== 'success' || shifted.kind !== 'success') {
      throw new Error('Expected complex quadratic successes');
    }
    expect(pureImaginary.answerDomain).toBe('complex');
    expect(pureImaginary.exactLatex).toContain('-i');
    expect(pureImaginary.exactLatex).toContain('i');
    expect(shifted.answerDomain).toBe('complex');
    expect(shifted.exactLatex).toContain('-1-i');
    expect(shifted.exactLatex).toContain('-1+i');
    expect(shifted.detailSections?.some((section) => section.title === 'Complex Domain')).toBe(true);
  });

  it('solves simple selected-target powers with bounded complex branches when Complex is enabled', () => {
    const square = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^2=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });
    const cube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^3=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });

    expect(square.kind).toBe('success');
    expect(cube.kind).toBe('success');
    if (square.kind !== 'success' || cube.kind !== 'success') {
      throw new Error('Expected complex power successes');
    }
    expect(square.answerDomain).toBe('complex');
    expect(square.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{2}\left(a\right)\omega_{0}`);
    expect(square.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{2}\left(a\right)\omega_{1}`);
    expect(square.exactSupplementLatex ?? []).not.toContain('a\\ge0');
    expect(cube.answerDomain).toBe('complex');
    expect(cube.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(a\right)\omega_{0}`);
    expect(cube.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(a\right)\omega_{2}`);
    const definitions = cube.detailSections?.find((section) => section.title === 'Complex Power Definitions');
    expect(definitions?.lines.join(' ')).toContain(String.raw`\omega_{1}=\cos\left(\frac{2\pi}{3}\right)+i\sin\left(\frac{2\pi}{3}\right)`);

    const concreteCube = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3+8=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });
    expect(concreteCube.kind).toBe('success');
    if (concreteCube.kind !== 'success') {
      throw new Error('Expected concrete complex cube success');
    }
    expect(concreteCube.exactLatex).toContain('-2');
    expect(concreteCube.exactLatex).toContain('1-\\sqrt{3}i');
    expect(concreteCube.exactLatex).toContain('1+\\sqrt{3}i');
    expect(concreteCube.exactLatex).not.toContain('\\right)\\left(');
  });

  it('uses the selected exact form for high-degree special-form powers in Complex exact mode', () => {
    const rectangular = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^5=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'rectangular',
    });
    const polar = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^5=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'polar',
    });
    const cis = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^5=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });

    expect(rectangular.kind).toBe('success');
    expect(polar.kind).toBe('success');
    expect(cis.kind).toBe('success');
    if (rectangular.kind !== 'success' || polar.kind !== 'success' || cis.kind !== 'success') {
      throw new Error('Expected high-degree complex special-form success');
    }
    expect(rectangular.answerDomain).toBe('complex');
    expect(rectangular.exactLatex).not.toContain('\\operatorname{cis}');
    expect(rectangular.exactLatex).toContain('\\cos\\left(\\frac{2\\pi}{5}\\right)+i\\sin\\left(\\frac{2\\pi}{5}\\right)');
    expect(polar.exactLatex).not.toContain('\\operatorname{cis}');
    expect(polar.exactLatex).toContain('\\cos\\left(\\frac{2\\pi}{5}\\right)+i\\sin\\left(\\frac{2\\pi}{5}\\right)');
    expect(cis.exactLatex).toContain('\\operatorname{cis}\\left(\\frac{2\\pi}{5}\\right)');
    const rectangularBranches = rectangular.branchReadback?.branchesLatex.join(' ') ?? '';
    const polarBranches = polar.branchReadback?.branchesLatex.join(' ') ?? '';
    const cisBranches = cis.branchReadback?.branchesLatex.join(' ') ?? '';
    expect(rectangularBranches).not.toContain('\\operatorname{cis}');
    expect(rectangularBranches).toContain('\\cos\\left(\\frac{2\\pi}{5}\\right)+i\\sin\\left(\\frac{2\\pi}{5}\\right)');
    expect(polarBranches).not.toContain('\\operatorname{cis}');
    expect(polarBranches).toContain('\\cos\\left(\\frac{2\\pi}{5}\\right)+i\\sin\\left(\\frac{2\\pi}{5}\\right)');
    expect(cisBranches).toContain('\\operatorname{cis}\\left(\\frac{2\\pi}{5}\\right)');
    expect(rectangular.detailSections?.some((section) => section.title === 'Complex Special-Form Route')).toBe(true);
  });

  it('solves symbolic high-degree powers with explicit PrincipalRoot notation in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'u^5=a',
      equationSolveTarget: 'u',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected symbolic complex degree-five power success');
    }
    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{0}`);
    expect(result.exactLatex).toContain(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)\omega_{4}`);
    expect(result.exactLatex).not.toContain(String.raw`\sqrt[5]{a}`);
    expect(result.branchReadback?.branchesLatex).toHaveLength(5);
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('PrincipalRoot notation')))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('RootOf');
  });

  it('solves general symbolic cubics with the Complex Cardano route', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a*x^3+b*x^2+c*x+d=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex Cardano success');
    }
    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).toContain(String.raw`-\frac{A}{3}+U_{0}-\frac{p}{3U_{0}}`);
    expect(result.exactLatex).toContain(String.raw`U_{1}`);
    expect(result.exactLatex).toContain(String.raw`U_{2}`);
    expect(result.exactLatex).not.toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(result.exactLatex).not.toContain(String.raw`\frac{b}{a}`);
    expect(result.branchReadback?.branchesLatex).toHaveLength(3);
    expect(result.branchReadback?.branchesLatex.every((branch) => branch.length < 90)).toBe(true);
    expect(result.exactSupplementLatex).toEqual([String.raw`a\ne0`, String.raw`R\ne0`]);
    const definitions = result.detailSections?.find((section) => section.title === 'Cardano Definitions');
    expect(definitions?.lines.join(' ')).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(R\right)`);
    expect(definitions?.lines.join(' ')).toContain(String.raw`\operatorname{cis}`);
    const answerBlock = buildDisplayBlocks(result).find((block) => block.id === 'answer');
    expect(answerBlock?.renderKind).toBe('branchList');
    const answerRows = answerBlock?.renderKind === 'branchList'
      ? (answerBlock.lines ?? []).map((line) => line.latex).join(' ')
      : '';
    expect(answerRows).toContain(String.raw`x=-\frac{A}{3}+U_{0}-\frac{p}{3U_{0}}`);
    expect(answerRows).not.toContain(String.raw`\frac{b}{a}`);
    expect(JSON.stringify(result)).not.toContain('RootOf');
  });

  it('solves general symbolic cubics with the Real Cardano route', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a*x^3+b*x^2+c*x+d=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Real Cardano success');
    }
    expect(result.answerDomain).toBe('real');
    expect(result.exactLatex).toContain(String.raw`x\in\begin{cases}`);
    expect(result.exactLatex).toContain(String.raw`\Delta>0`);
    expect(result.exactLatex).toContain(String.raw`\Delta=0,\ p\ne0`);
    expect(result.exactLatex).toContain(String.raw`\Delta<0,\ p<0`);
    expect(result.exactSupplementLatex).toEqual([String.raw`a\ne0`]);
    expect(result.detailSections?.some((section) => section.title === 'Real Cardano Definitions')).toBe(true);
    const answerBlock = buildDisplayBlocks(result).find((block) => block.id === 'answer');
    expect(answerBlock?.renderKind).toBe('caseMath');
    expect(answerBlock?.lines?.map((line) => line.label)).toEqual([
      String.raw`\Delta>0`,
      String.raw`\Delta=0,\ p=0,\ q=0`,
      String.raw`\Delta=0,\ p\ne0`,
      String.raw`\Delta<0,\ p<0`,
    ]);
    expect(JSON.stringify(result)).not.toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(JSON.stringify(result)).not.toContain('RootOf');
  });

  it('solves general symbolic cubics for non-x selected targets over the real domain', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a*z^3+b*z^2+c*z+d=0',
      equationSolveTarget: 'z',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Real Cardano success for z');
    }
    expect(result.answerDomain).toBe('real');
    expect(result.exactLatex).toContain(String.raw`z\in\begin{cases}`);
    expect(JSON.stringify(result)).not.toContain(String.raw`\operatorname{PrincipalRoot}`);
  });

  it('uses Real Cardano as the late exact fallback for non-factorable numeric cubics', () => {
    const deltaPositive = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3+x+1=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });
    const casusIrreducibilis = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3-3*x+1=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(deltaPositive.kind).toBe('success');
    expect(casusIrreducibilis.kind).toBe('success');
    if (deltaPositive.kind !== 'success' || casusIrreducibilis.kind !== 'success') {
      throw new Error('Expected numeric Real Cardano fallback successes');
    }
    expect(deltaPositive.answerDomain).toBe('real');
    expect(deltaPositive.exactLatex).toContain(String.raw`\Delta>0`);
    expect(casusIrreducibilis.exactLatex).toContain(String.raw`\Delta<0,\ p<0`);
    expect(casusIrreducibilis.exactLatex).toContain(String.raw`\arccos`);
    expect(deltaPositive.detailSections?.some((section) => section.title === 'Real Cardano Definitions')).toBe(true);
    expect(JSON.stringify(deltaPositive)).not.toContain(String.raw`\operatorname{PrincipalRoot}`);
    expect(JSON.stringify(casusIrreducibilis)).not.toContain('RootOf');
  });

  it('keeps exact-rational factorable cubics ahead of the Real Cardano fallback', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^3-6*x^2+11*x-6=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'real',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected factorable cubic success');
    }
    expect(result.exactLatex).toBe(String.raw`x\in\left\{1, 2, 3\right\}`);
    expect(result.detailSections?.some((section) => section.title === 'Real Cardano Definitions')).not.toBe(true);
  });

  it('keeps general symbolic quartics blocked in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'a*x^4+b*x^3+c*x^2+d*x+f=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected Ferrari boundary to stay unsupported');
    }
    expect(result.error).toContain('Quartic formula output');
    expect(result.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('Ferrari route');
    expect(JSON.stringify(result)).not.toContain('RootOf');
    expect(JSON.stringify(result)).not.toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
  });

  it('solves exact-rational pure carrier special forms in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^6-5x^3+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected complex pure-carrier special-form success');
    }
    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).not.toContain('\\operatorname{cis}');
    expect(result.exactLatex).toContain('\\cos\\left(\\frac{2\\pi}{3}\\right)+i\\sin\\left(\\frac{2\\pi}{3}\\right)');
    const branches = result.branchReadback?.branchesLatex.join(' ') ?? '';
    expect(branches).not.toContain('\\operatorname{cis}');
    expect(branches).toContain('\\cos\\left(\\frac{2\\pi}{3}\\right)+i\\sin\\left(\\frac{2\\pi}{3}\\right)');
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('Total selected-target degree: 6')))).toBe(true);
  });

  it('solves exact-rational affine carrier special forms in Complex exact mode', () => {
    const cisResult = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(2*x-1)^{12}-5*(2*x-1)^6+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'cis',
    });
    const rectangularResult = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(2*x-1)^{12}-5*(2*x-1)^6+4=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
      complexExactForm: 'rectangular',
    });

    expect(cisResult.kind).toBe('success');
    expect(rectangularResult.kind).toBe('success');
    if (cisResult.kind !== 'success' || rectangularResult.kind !== 'success') {
      throw new Error('Expected affine complex special-form success');
    }
    expect(cisResult.answerDomain).toBe('complex');
    expect(cisResult.exactLatex).toContain('\\operatorname{cis}');
    expect(cisResult.branchReadback?.branchesLatex.join(' ')).toContain('\\operatorname{cis}');
    expect(rectangularResult.exactLatex).not.toContain('\\operatorname{cis}');
    expect(rectangularResult.exactLatex).toContain('\\cos\\left');
    expect(rectangularResult.branchReadback?.branchesLatex.join(' ')).not.toContain('\\operatorname{cis}');
    expect(rectangularResult.branchReadback?.branchesLatex.join(' ')).toContain('\\cos\\left');
    expect(cisResult.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('Total selected-target degree: 12')))).toBe(true);
  });

  it('keeps symbolic-coefficient special-form carrier roots deferred in Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^6-a*x^3+b=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected symbolic-carrier complex boundary to stay unsupported');
    }
    expect(result.error).toContain('symbolic carrier coefficients are deferred');
    expect(result.error).toContain('principal-branch root policy');
    expect(result.detailSections?.some((section) =>
      section.lines.some((line) => line.includes('principal-branch root policy')))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('RootOf');
  });

  it('solves expanded quadratic carrier follow-on equations over Complex exact mode', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x^2+x)^2-(x^2+x)-1=0',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected complex quadratic carrier follow-on success');
    }
    expect(result.answerDomain).toBe('complex');
    expect(result.exactLatex).toContain('i');
    expect(result.exactLatex).toMatch(/\\sqrt\{5\}|5\^\{1\/2\}/);
    expect(result.exactLatex).not.toContain('ii');
    expect(result.exactLatex).not.toContain('\\imaginaryI\\imaginaryI');
    expect(result.exactLatex).not.toContain('+-');
    expect(result.exactLatex).not.toContain('1+-4');
    expect(result.exactLatex).not.toContain('1+\\left(-4');
    expect(result.exactLatex).not.toContain('+\\frac{-');
    expect(result.exactLatex).not.toContain('-\\frac{-');
    expect(result.exactLatex).not.toContain('+\\frac{1}{2}(-');
    expect(result.exactLatex).not.toContain('+\\frac{-1}{2}');
    expect(result.exactLatex).not.toContain('-\\frac{-1}{2}');
    expect(result.exactLatex).not.toContain('\\frac{1}{2}(-\\sqrt');
    const branches = result.branchReadback?.branchesLatex.join(' ') ?? '';
    expect(branches).not.toContain('ii');
    expect(branches).not.toContain('+-');
    expect(branches).not.toContain('1+-4');
    expect(branches).not.toContain('1+\\left(-4');
    expect(branches).not.toContain('+\\frac{-');
    expect(branches).not.toContain('-\\frac{-');
    expect(branches).not.toContain('\\frac{1}{2}(-\\sqrt');
    expect(branches).not.toContain('\\frac{1}{2}(\\sqrt');
    expect(branches).toContain('-\\frac{1}{2}-\\frac{1}{2}\\sqrt');
    expect(branches).toContain('-\\frac{1}{2}+\\frac{1}{2}\\sqrt');

    const answerBlock = buildDisplayBlocks(result).find((block) => block.id === 'answer');
    expect(answerBlock?.renderKind).toBe('branchList');
    const answerRows = answerBlock?.renderKind === 'branchList'
      ? (answerBlock.lines ?? []).map((line) => line.latex).join(' ')
      : '';
    expect(answerRows).not.toContain('+-');
    expect(answerRows).not.toContain('1+-4');
    expect(answerRows).not.toContain('1+\\left(-4');
    expect(answerRows).not.toContain('+\\frac{-');
    expect(answerRows).not.toContain('-\\frac{-');
    expect(answerRows).not.toContain('\\frac{1}{2}(-\\sqrt');
    expect(answerRows).not.toContain('\\frac{1}{2}(\\sqrt');
    expect(answerRows).toContain('x=-\\frac{1}{2}-\\frac{1}{2}\\sqrt');
    expect(answerRows).toContain('x=-\\frac{1}{2}+\\frac{1}{2}\\sqrt');
    expect(result.detailSections?.some((section) => section.title === 'Complex Carrier Follow-On')).toBe(true);
  });

  it('caps Complex special-form branch readback at twelve visible branches', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '(x+a)^{13}=32',
      equationSolveTarget: 'x',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected complex degree-thirteen boundary');
    }
    expect(result.error).toContain('capped at 12 visible branches');
  });

  it('rejects reserved-only equations without inventing a solve target', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '\\sin\\left(\\pi\\right)=e',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toContain('reserved');
  });

  it('keeps symbolic mode symbolic-only for complex cases', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: 'x^2+2x+2=0',
    });

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome');
    }
    expect(result.error).toBe('This equation is outside the supported exact symbolic solve families.');
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'unsupported-family',
      source: 'stage',
    });
    expect(result.runtimeAdvisories?.equationNumericSolve).toEqual({
      kind: 'suggest-on-error',
    });
  });

  it('keeps Complex On inequality answers on the real order line', () => {
    const result = runEquationMode({
      ...makeRequest(),
      equationScreen: 'symbolic',
      equationLatex: '2x+3\\le7',
      equationAnswerMode: 'exact',
      equationDomainIntent: 'complex',
    });

    expect(result.kind).toBe('success');
    if (result.kind !== 'success') {
      throw new Error('Expected Complex On inequality success');
    }

    expect(result.exactLatex).toBe('x\\le2');
    expect(result.answerDomain).toBe('conditional-real');
    expect(result.solutionKind).toBe('inequality-solution-set');
    expect(result.exactSupplementLatex?.join(' ')).toContain(
      'Complex intent is enabled; ordered inequalities are solved over the real line.',
    );
  });
});
