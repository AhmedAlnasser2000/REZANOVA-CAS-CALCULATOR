import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { buildDisplayBlocks } from './display-blocks';

describe('display block adapter', () => {
  it('builds answer, approx, valid-when, detail, and warning blocks', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=2',
      approxText: 'x ~= 2',
      exactSupplementLatex: ['\\text{Conditions: } x\\ne0'],
      detailSections: [
        {
          title: 'Generated',
          lines: ['x+1=3', 'Selected target: x'],
          lineKinds: ['math', 'text'],
          lineParts: [
            [{ kind: 'math', latex: 'x+1=3' }],
            [{ kind: 'text', text: 'Selected target: ' }, { kind: 'math', latex: 'x' }],
          ],
        },
      ],
      warnings: ['Check domain.'],
    };

    const before = structuredClone(outcome);
    const blocks = buildDisplayBlocks(outcome, {
      showApproxReadback: true,
    });

    expect(blocks.map((block) => block.id)).toEqual([
      'answer',
      'valid-when',
      'approx',
      'detail-0',
      'warnings',
    ]);
    expect(blocks.find((block) => block.id === 'answer')).toMatchObject({
      kind: 'answer',
      label: 'Answer',
      renderKind: 'math',
      latex: 'x=2',
    });
    expect(blocks.find((block) => block.id === 'valid-when')).toMatchObject({
      kind: 'validWhen',
      label: 'Valid when',
      renderKind: 'mathList',
      rawContent: ['x\\ne0'],
    });
    expect(blocks.find((block) => block.id === 'approx')).toMatchObject({
      kind: 'approx',
      renderKind: 'text',
      text: 'x ~= 2',
    });
    expect(blocks.find((block) => block.id === 'detail-0')?.lines?.[0]).toMatchObject({
      lineKind: 'math',
      parts: [{ kind: 'math', latex: 'x+1=3' }],
      testId: 'display-outcome-detail-line-0-0',
      text: 'x+1=3',
    });
    expect(blocks.find((block) => block.id === 'detail-0')?.lines?.[1]).toMatchObject({
      lineKind: 'text',
      parts: [{ kind: 'text', text: 'Selected target: ' }, { kind: 'math', latex: 'x' }],
      testId: 'display-outcome-detail-line-0-1',
      text: 'Selected target: x',
    });
    expect(blocks.find((block) => block.id === 'warnings')).toMatchObject({
      kind: 'warning',
      renderKind: 'text',
      rawContent: ['Check domain.'],
    });
    expect(outcome).toEqual(before);
  });

  it('converts periodic family fields into stable render blocks', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Periodic',
      periodicFamily: {
        carrierLatex: '\\sin(x)',
        parameterLatex: 'k',
        parameterConstraintLatex: ['2k\\pi\\ge0'],
        branchesLatex: ['x=2k\\pi'],
        representatives: [
          { label: 'principal', exactLatex: 'x=0', approxText: 'x ~= 0' },
        ],
        principalRangeLatex: '-\\pi<x\\le\\pi',
        piecewiseBranches: [
          { conditionLatex: 'k\\in\\mathbb{Z}', resultLatex: 'x=2k\\pi' },
        ],
        discoveredFamilies: ['x=2k\\pi'],
        reducedCarrierLatex: 'x',
        structuredStopReason: 'periodic-depth-cap',
        suggestedIntervals: [
          { label: 'try', start: '-\\pi', end: '\\pi' },
        ],
      },
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome, {
      getPeriodicStopReasonText: (reason) => `Reason: ${reason}`,
    });

    expect(blocks.map((block) => block.id)).toEqual([
      'periodic-representatives',
      'periodic-principal-range',
      'periodic-piecewise',
      'periodic-parameter-constraints',
      'periodic-discovered-families',
      'periodic-reduced-carrier',
      'periodic-stop-reason',
      'periodic-intervals',
    ]);
    expect(blocks.find((block) => block.id === 'periodic-representatives')).toMatchObject({
      kind: 'periodicFamily',
      label: 'Representative Branches',
      renderKind: 'mixed',
    });
    expect(blocks.find((block) => block.id === 'periodic-piecewise')?.rawContent).toEqual([
      '\\text{if } k\\in\\mathbb{Z}',
      'x=2k\\pi',
    ]);
    expect(blocks.find((block) => block.id === 'periodic-parameter-constraints')).toMatchObject({
      label: 'Parameter constraints',
      renderKind: 'mathList',
      rawContent: ['2k\\pi\\ge0'],
    });
    expect(blocks.find((block) => block.id === 'periodic-stop-reason')).toMatchObject({
      label: 'Exact Closure Boundary',
      renderKind: 'text',
      text: 'Reason: periodic-depth-cap',
    });
  });

  it('builds error text blocks without requiring result schema migration', () => {
    const outcome: DisplayOutcome = {
      kind: 'error',
      title: 'Symbolic',
      error: 'Unsupported route.',
      exactLatex: 'x=1',
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome);

    expect(blocks.map((block) => [block.kind, block.id])).toEqual([
      ['errorText', 'error-text'],
      ['answer', 'answer'],
    ]);
  });

  it('keeps extraneous solution detail cards visible by default', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=3',
      detailSections: [{
        title: 'Extraneous Solutions',
        lines: [
          'Candidate -1 rejected: does not satisfy the original equation after substitution.',
          'Candidate 2 rejected: does not satisfy the original equation after substitution.',
          'Candidate 4 rejected: does not satisfy the original equation after substitution.',
        ],
      }],
      warnings: [],
    };

    const card = buildDisplayBlocks(outcome).find((block) => block.label === 'Extraneous Solutions');

    expect(card).toMatchObject({
      kind: 'detail',
      defaultCollapsed: false,
    });
  });

  it('adapts safe finite answer sets into branch-list blocks', () => {
    const exactLatex = 's\\in\\left\\{\\frac{d}{4}+r+\\sqrt{x+j},\\ \\frac{d}{4}-r-\\sqrt{x+j}\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex,
      warnings: [],
    };

    const answerBlock = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answerBlock).toMatchObject({
      kind: 'answer',
      label: 'Answer',
      renderKind: 'branchList',
      branchCount: 2,
      latex: exactLatex,
      rawContent: [exactLatex],
    });
    expect(answerBlock?.lines?.map((line) => line.latex)).toEqual([
      's=\\frac{d}{4}+r+\\sqrt{x+j}',
      's=\\frac{d}{4}-r-\\sqrt{x+j}',
    ]);
    expect(answerBlock?.lines?.map((line) => [
      line.branchPrefixLatex,
      line.branchLatex,
    ])).toEqual([
      ['s=', '\\frac{d}{4}+r+\\sqrt{x+j}'],
      ['s=', '\\frac{d}{4}-r-\\sqrt{x+j}'],
    ]);
  });

  it('renders compact Cardano exact roots as branch rows', () => {
    const branchesLatex = [
      String.raw`-\frac{A}{3}+U_{0}-\frac{p}{3U_{0}}`,
      String.raw`-\frac{A}{3}+U_{1}-\frac{p}{3U_{1}}`,
      String.raw`-\frac{A}{3}+U_{2}-\frac{p}{3U_{2}}`,
    ];
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex: String.raw`x\in\left\{${branchesLatex.join(',\\ ')}\right\}`,
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\in',
        branchesLatex,
        source: 'equation-cubic-cardano',
      },
      exactSupplementLatex: [String.raw`a\ne0`, String.raw`R\ne0`],
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome);
    const answer = blocks.find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'branchList',
      branchCount: 3,
    });
    expect(answer?.lines?.map((line) => line.latex)).toEqual([
      String.raw`x=-\frac{A}{3}+U_{0}-\frac{p}{3U_{0}}`,
      String.raw`x=-\frac{A}{3}+U_{1}-\frac{p}{3U_{1}}`,
      String.raw`x=-\frac{A}{3}+U_{2}-\frac{p}{3U_{2}}`,
    ]);
    expect(blocks.find((block) => block.id === 'valid-when')).toMatchObject({
      label: 'Valid when · 2 facts',
      rawContent: [String.raw`a\ne0`, String.raw`R\ne0`],
    });
  });

  it('promotes Real Cardano producer case rows into a case-math answer block', () => {
    const exactLatex = String.raw`x\in\begin{cases}\left\{-\frac{A}{3}+\sqrt[3]{-\frac{q}{2}+\sqrt{\Delta}}+\sqrt[3]{-\frac{q}{2}-\sqrt{\Delta}}\right\},&\Delta>0\\left\{-\frac{A}{3}\right\},&\Delta=0,\ p=0,\ q=0\end{cases}`;
    const positiveRoot = String.raw`\left\{-\frac{A}{3}+\sqrt[3]{-\frac{q}{2}+\sqrt{\Delta}}+\sqrt[3]{-\frac{q}{2}-\sqrt{\Delta}}\right\}`;
    const tripleRoot = String.raw`\left\{-\frac{A}{3}\right\}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      exactSupplementLatex: [String.raw`a\ne0`],
      detailSections: [{
        title: 'Real Cardano Definitions',
        lines: [String.raw`A=\frac{b}{a}`, String.raw`\Delta=\left(\frac{q}{2}\right)^2+\left(\frac{p}{3}\right)^3`],
        lineKind: 'math',
      }, {
        title: 'Real Cardano Cases',
        lines: [
          String.raw`${positiveRoot}, \Delta>0`,
          String.raw`${tripleRoot}, \Delta=0,\ p=0,\ q=0 has multiplicity 3`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: positiveRoot },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
          [
            { kind: 'math', latex: tripleRoot },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta=0,\ p=0,\ q=0` },
            { kind: 'text', text: ' has multiplicity 3' },
          ],
        ],
      }],
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome);
    const answer = blocks.find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`x\in`,
    });
    expect(answer?.lines?.map((line) => [line.latex, line.label, line.conditionLatex])).toEqual([
      [positiveRoot, String.raw`\Delta>0`, String.raw`\Delta>0`],
      [tripleRoot, String.raw`\Delta=0,\ p=0,\ q=0`, String.raw`\Delta=0,\ p=0,\ q=0`],
    ]);
    expect(answer?.branchCount).toBeUndefined();
    expect(blocks.find((block) => block.id === 'valid-when')).toMatchObject({
      label: 'Valid when',
      rawContent: [String.raw`a\ne0`],
    });
    expect(blocks.find((block) => block.label === 'Real Cardano Definitions')).toMatchObject({
      renderKind: 'mixed',
    });
    expect(blocks.find((block) => block.label === 'Real Cardano Cases')).toMatchObject({
      renderKind: 'mixed',
      defaultCollapsed: true,
    });
  });

  it('promotes Real Ferrari producer case rows into a case-math answer block', () => {
    const exactLatex = String.raw`z\in\begin{cases}\left\{-\frac{A}{4}+\sqrt{s_{+}}\right\},&s_{+}\ge0\end{cases}`;
    const positiveRoot = String.raw`\left\{-\frac{A}{4}+\sqrt{s_{+}}\right\}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Real Ferrari Definitions',
        lines: [String.raw`s_{+}=\frac{-p+\sqrt{p^2-4r}}{2}`],
        lineKind: 'math',
      }, {
        title: 'Real Ferrari Cases',
        lines: [String.raw`${positiveRoot}, s_{+}\ge0`],
        lineParts: [[
          { kind: 'math', latex: positiveRoot },
          { kind: 'text', text: ', ' },
          { kind: 'math', latex: String.raw`s_{+}\ge0` },
        ]],
      }],
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome);
    const answer = blocks.find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`z\in`,
    });
    expect(answer?.lines?.map((line) => [line.latex, line.label, line.conditionLatex])).toEqual([
      [positiveRoot, String.raw`s_{+}\ge0`, String.raw`s_{+}\ge0`],
    ]);
    expect(blocks.find((block) => block.label === 'Real Ferrari Cases')).toMatchObject({
      defaultCollapsed: true,
    });
  });

  it('promotes grouped absolute-value formula case rows into one case-math answer block', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=b\\\Delta>0}\\z_2,&\substack{z^3+z+1=-b\\\Delta>0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Absolute-Value Formula Cases',
        lines: [
          String.raw`z^3+z+1=b: z_1, \Delta>0`,
          String.raw`z^3+z+1=-b: z_2, \Delta>0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=b` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
          [
            { kind: 'math', latex: String.raw`z^3+z+1=-b` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_2' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
        ],
      }, {
        title: 'Abs Branch 1 - Real Cardano Definitions',
        lines: [String.raw`A=0`],
        lineKind: 'math',
      }],
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome);
    const answer = blocks.find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`z\in`,
    });
    expect(answer?.lines?.map((line) => [
      line.groupLatex,
      line.latex,
      line.label,
      line.conditionLatex,
    ])).toEqual([
      [String.raw`z^3+z+1=b`, 'z_1', String.raw`\Delta>0`, String.raw`\Delta>0`],
      [String.raw`z^3+z+1=-b`, 'z_2', String.raw`\Delta>0`, String.raw`\Delta>0`],
    ]);
    expect(blocks.find((block) => block.label === 'Absolute-Value Formula Cases')).toMatchObject({
      renderKind: 'mixed',
      defaultCollapsed: true,
    });
  });

  it('promotes grouped square-power formula case rows into one case-math answer block', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=\sqrt{b}\\\Delta>0}\\z_2,&\substack{z^3+z+1=-\sqrt{b}\\\Delta>0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Square-Power Formula Cases',
        lines: [
          String.raw`z^3+z+1=\sqrt{b}: z_1, \Delta>0`,
          String.raw`z^3+z+1=-\sqrt{b}: z_2, \Delta>0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=\sqrt{b}` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
          [
            { kind: 'math', latex: String.raw`z^3+z+1=-\sqrt{b}` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_2' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
        ],
      }],
      warnings: [],
    };

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`z\in`,
    });
    expect(answer?.lines?.map((line) => [line.groupLatex, line.latex, line.label])).toEqual([
      [String.raw`z^3+z+1=\sqrt{b}`, 'z_1', String.raw`\Delta>0`],
      [String.raw`z^3+z+1=-\sqrt{b}`, 'z_2', String.raw`\Delta>0`],
    ]);
  });

  it('promotes grouped higher even-power formula case rows into one case-math answer block', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=\sqrt[4]{b}\\\Delta>0}\\z_2,&\substack{z^3+z+1=-\sqrt[4]{b}\\\Delta>0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Even-Power Formula Cases',
        lines: [
          String.raw`z^3+z+1=\sqrt[4]{b}: z_1, \Delta>0`,
          String.raw`z^3+z+1=-\sqrt[4]{b}: z_2, \Delta>0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=\sqrt[4]{b}` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
          [
            { kind: 'math', latex: String.raw`z^3+z+1=-\sqrt[4]{b}` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_2' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
        ],
      }],
      warnings: [],
    };

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`z\in`,
    });
    expect(answer?.lines?.map((line) => [line.groupLatex, line.latex, line.label])).toEqual([
      [String.raw`z^3+z+1=\sqrt[4]{b}`, 'z_1', String.raw`\Delta>0`],
      [String.raw`z^3+z+1=-\sqrt[4]{b}`, 'z_2', String.raw`\Delta>0`],
    ]);
  });

  it('promotes nth-root formula case rows and hides the single generated-branch label', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=b^3\\\Delta>0}\\z_2,&\substack{z^3+z+1=b^3\\\Delta=0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Nth-Root Formula Cases',
        lines: [
          String.raw`z^3+z+1=b^3: z_1, \Delta>0`,
          String.raw`z^3+z+1=b^3: z_2, \Delta=0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=b^3` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
          [
            { kind: 'math', latex: String.raw`z^3+z+1=b^3` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_2' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta=0` },
          ],
        ],
      }],
      warnings: [],
    };

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`z\in`,
    });
    expect(answer?.lines?.map((line) => [line.groupLatex, line.latex, line.label])).toEqual([
      [undefined, 'z_1', String.raw`\Delta>0`],
      [undefined, 'z_2', String.raw`\Delta=0`],
    ]);
  });

  it('promotes grouped trig formula case rows into one case-math answer block', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=\arcsin(b)+2\pi n\\\Delta>0}\\z_2,&\substack{z^3+z+1=\pi-\arcsin(b)+2\pi n\\\Delta=0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Trig Formula Cases',
        lines: [
          String.raw`z^3+z+1=\arcsin(b)+2\pi n: z_1, \Delta>0`,
          String.raw`z^3+z+1=\pi-\arcsin(b)+2\pi n: z_2, \Delta=0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=\arcsin(b)+2\pi n` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
          [
            { kind: 'math', latex: String.raw`z^3+z+1=\pi-\arcsin(b)+2\pi n` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_2' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta=0` },
          ],
        ],
      }],
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome);
    const answer = blocks.find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`z\in`,
    });
    expect(answer?.lines?.map((line) => [
      line.groupLatex,
      line.latex,
      line.label,
      line.conditionLatex,
    ])).toEqual([
      [String.raw`z^3+z+1=\arcsin(b)+2\pi n`, 'z_1', String.raw`\Delta>0`, String.raw`\Delta>0`],
      [String.raw`z^3+z+1=\pi-\arcsin(b)+2\pi n`, 'z_2', String.raw`\Delta=0`, String.raw`\Delta=0`],
    ]);
    expect(blocks.find((block) => block.label === 'Trig Formula Cases')).toMatchObject({
      renderKind: 'mixed',
      defaultCollapsed: true,
    });
  });

  it('hides redundant grouped absolute-value labels for exact-zero collapse answers', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=0\\\Delta>0}\\z_2,&\substack{z^3+z+1=0\\\Delta=0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Absolute-Value Formula Cases',
        lines: [
          String.raw`z^3+z+1=0: z_1, \Delta>0`,
          String.raw`z^3+z+1=0: z_2, \Delta=0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=0` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
          [
            { kind: 'math', latex: String.raw`z^3+z+1=0` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_2' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta=0` },
          ],
        ],
      }],
      warnings: [],
    };

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
      latex: exactLatex,
      text: String.raw`z\in`,
    });
    expect(answer?.lines?.map((line) => [line.groupLatex, line.latex, line.label])).toEqual([
      [undefined, 'z_1', String.raw`\Delta>0`],
      [undefined, 'z_2', String.raw`\Delta=0`],
    ]);
  });

  it('prefers validated branch metadata over fallback latex extraction', () => {
    const exactLatex = 'x\\in\\left\\{1,2\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex,
      branchReadback: {
        targetLatex: 's',
        relationLatex: '\\in',
        branchesLatex: ['a+b', 'a-b'],
        source: 'unit-test',
      },
      warnings: [],
    };

    const before = structuredClone(outcome);
    const answerBlock = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answerBlock).toMatchObject({
      kind: 'answer',
      label: 'Answer',
      renderKind: 'branchList',
      branchCount: 2,
      latex: exactLatex,
      rawContent: [exactLatex],
    });
    expect(answerBlock?.lines?.map((line) => line.latex)).toEqual([
      's=a+b',
      's=a-b',
    ]);
    expect(answerBlock?.lines?.map((line) => [
      line.branchPrefixLatex,
      line.branchLatex,
    ])).toEqual([
      ['s=', 'a+b'],
      ['s=', 'a-b'],
    ]);
    expect(outcome).toEqual(before);
  });

  it('renders approximate producer metadata as branch rows', () => {
    const exactLatex = 'x\\approx\\left\\{0.739,1.414\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Approximate',
      exactLatex,
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\approx',
        branchesLatex: ['0.739', '1.414'],
        source: 'unit-test-approx',
      },
      warnings: [],
    };

    const answerBlock = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answerBlock).toMatchObject({
      kind: 'answer',
      renderKind: 'branchList',
      branchCount: 2,
      latex: exactLatex,
      rawContent: [exactLatex],
    });
    expect(answerBlock?.lines?.map((line) => [
      line.latex,
      line.branchPrefixLatex,
      line.branchLatex,
    ])).toEqual([
      ['x\\approx0.739', 'x\\approx', '0.739'],
      ['x\\approx1.414', 'x\\approx', '1.414'],
    ]);
  });

  it('uses numeric interval approx roots as the primary answer when exact output is absent', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Numeric',
      approxText: 'x ~= -1, 1',
      resultOrigin: 'numeric-fallback',
      solutionKind: 'approximate-numeric',
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\approx',
        branchesLatex: ['-1', '1'],
        source: 'equation-numeric-interval',
      },
      warnings: [],
    };

    const blocks = buildDisplayBlocks(outcome, { showApproxReadback: true });
    const answerBlock = blocks.find((block) => block.id === 'answer');

    expect(blocks.some((block) => block.id === 'approx')).toBe(false);
    expect(answerBlock).toMatchObject({
      kind: 'answer',
      label: 'Numeric Roots',
      renderKind: 'branchList',
      branchCount: 2,
      latex: 'x\\approx\\left\\{-1, 1\\right\\}',
      rawContent: ['x ~= -1, 1'],
    });
    expect(answerBlock?.lines?.map((line) => [
      line.latex,
      line.branchPrefixLatex,
      line.branchLatex,
    ])).toEqual([
      ['x\\approx-1', 'x\\approx', '-1'],
      ['x\\approx1', 'x\\approx', '1'],
    ]);
  });

  it('uses single numeric interval approx roots as a primary text answer', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Numeric',
      approxText: 'x ~= 0.739',
      resultOrigin: 'numeric-fallback',
      solutionKind: 'approximate-numeric',
      warnings: [],
    };

    expect(buildDisplayBlocks(outcome)).toEqual([
      expect.objectContaining({
        id: 'answer',
        kind: 'answer',
        label: 'Numeric Roots',
        renderKind: 'text',
        text: 'x ~= 0.739',
        rawContent: ['x ~= 0.739'],
      }),
    ]);
  });

  it('falls back safely when branch metadata is malformed', () => {
    const exactLatex = 'x\\in\\left\\{1,2\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex,
      branchReadback: {
        targetLatex: '(x,y)',
        relationLatex: '\\in',
        branchesLatex: ['(1,2)', '(3,4)'],
      },
      warnings: [],
    };

    const answerBlock = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answerBlock).toMatchObject({
      kind: 'answer',
      renderKind: 'branchList',
      branchCount: 2,
    });
    expect(answerBlock?.lines?.map((line) => line.latex)).toEqual(['x=1', 'x=2']);
  });

  it('fails closed to a normal answer block for ambiguous branch sets', () => {
    const exactLatex = '(x,y)\\in\\left\\{(1,2),(3,4)\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex,
      warnings: [],
    };

    expect(buildDisplayBlocks(outcome).find((block) => block.id === 'answer')).toMatchObject({
      kind: 'answer',
      renderKind: 'math',
      latex: exactLatex,
      rawContent: [exactLatex],
    });
  });
});
