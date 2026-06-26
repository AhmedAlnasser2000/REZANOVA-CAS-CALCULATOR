import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { buildDisplayBlocks } from './display-blocks';

describe('display case-math block adapter', () => {
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
      renderKind: 'caseMath',
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
      renderKind: 'caseMath',
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
      renderKind: 'caseMath',
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
      renderKind: 'caseMath',
      defaultCollapsed: true,
    });
  });

  it('keeps formula case details on the budgeted case-math path', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=\arcsin(b)+2\pi n\\\Delta>0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Trig Formula Cases',
        lines: [
          String.raw`z^3+z+1=\arcsin(b)+2\pi n: z_1, \Delta>0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=\arcsin(b)+2\pi n` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
        ],
      }],
      warnings: [],
    };

    const detail = buildDisplayBlocks(outcome)
      .find((block) => block.label === 'Trig Formula Cases');

    expect(detail).toMatchObject({
      kind: 'detail',
      renderKind: 'caseMath',
      defaultCollapsed: true,
      text: '',
    });
    expect(detail?.lines?.map((line) => [
      line.groupLatex,
      line.latex,
      line.conditionLatex,
    ])).toEqual([
      [undefined, 'z_1', String.raw`\Delta>0`],
    ]);
  });

  it('rebuilds formula case answers when replayed latex has surrounding whitespace', () => {
    const exactLatex = `\n  ${String.raw`z\in \begin{cases}z_1,&\substack{z^3+z+1=\arcsin(b)+2\pi n\\\Delta>0}\end{cases}`}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      detailSections: [{
        title: 'Trig Formula Cases',
        lines: [
          String.raw`z^3+z+1=\arcsin(b)+2\pi n: z_1, \Delta>0`,
        ],
        lineParts: [
          [
            { kind: 'math', latex: String.raw`z^3+z+1=\arcsin(b)+2\pi n` },
            { kind: 'text', text: ': ' },
            { kind: 'math', latex: 'z_1' },
            { kind: 'text', text: ', ' },
            { kind: 'math', latex: String.raw`\Delta>0` },
          ],
        ],
      }],
      warnings: [],
    };

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      renderKind: 'caseMath',
      text: String.raw`z\in`,
    });
  });

  it('parses replayed substack case latex when structured detail rows are unavailable', () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{\frac{z^3+z+1}{z-m}=\arcsin(b)+2\pi n\\\Delta>0}\\z_2,&\substack{\frac{z^3+z+1}{z-m}=\pi-\arcsin(b)+2\pi n\\\Delta=0}\end{cases}`;
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Solve',
      exactLatex,
      warnings: [],
    };

    const answer = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answer).toMatchObject({
      renderKind: 'caseMath',
      text: String.raw`z\in`,
      latex: exactLatex,
    });
    expect(answer?.lines?.map((line) => [
      line.groupLatex,
      line.latex,
      line.conditionLatex,
    ])).toEqual([
      [
        String.raw`\frac{z^3+z+1}{z-m}=\arcsin(b)+2\pi n`,
        'z_1',
        String.raw`\Delta>0`,
      ],
      [
        String.raw`\frac{z^3+z+1}{z-m}=\pi-\arcsin(b)+2\pi n`,
        'z_2',
        String.raw`\Delta=0`,
      ],
    ]);
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
});
