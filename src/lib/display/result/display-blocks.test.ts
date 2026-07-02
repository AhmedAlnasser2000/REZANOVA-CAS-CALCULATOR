import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../../types/calculator';
import { buildDisplayBlocks, displayBlockSummaryText } from './display-blocks';

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

  it('keeps Matrix system proof details visible but collapsible by default', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Ax=b',
      exactLatex: 'x=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      detailSections: [{
        title: 'System Proof',
        lines: [
          '\\operatorname{rank}(A)=\\operatorname{rank}([A|b])=2',
          '\\operatorname{unknowns}=2',
          'Only this vector x satisfies the system.',
        ],
        lineKinds: ['math', 'math', 'text'],
      }],
      warnings: [],
    };

    const card = buildDisplayBlocks(outcome).find((block) => block.label === 'System Proof');

    expect(card).toMatchObject({
      kind: 'detail',
      collapsible: true,
      defaultCollapsed: false,
    });
  });

  it('keeps Matrix coordinate proof details visible but collapsible by default', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: '\\operatorname{coords}(A,v)',
      exactLatex: '[v]_{A}=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
      sourceMode: 'matrix',
      detailSections: [{
        title: 'Coordinate Proof',
        lines: [
          'Ac=v',
          'c=\\begin{bmatrix}1\\\\2\\end{bmatrix}',
          'The basis matrix has one pivot in every column, so the coordinate vector is unique.',
        ],
        lineKinds: ['math', 'math', 'text'],
      }],
      warnings: [],
    };

    const card = buildDisplayBlocks(outcome).find((block) => block.label === 'Coordinate Proof');

    expect(card).toMatchObject({
      kind: 'detail',
      collapsible: true,
      defaultCollapsed: false,
    });
  });

  it('keeps solve notes collapsed by default even when the prose is short', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex: 'x=3',
      detailSections: [{
        title: 'Solve Note',
        lines: ['Composition branch reduced to a periodic carrier family.'],
      }],
      warnings: [],
    };

    const card = buildDisplayBlocks(outcome).find((block) => block.label === 'Solve Note');

    expect(card).toMatchObject({
      kind: 'detail',
      defaultCollapsed: true,
    });
  });

  it('keeps Matrix row-reduction traces collapsed by default even when short', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'rref(A)',
      exactLatex: '\\begin{bmatrix}1 & 2\\\\0 & 0\\end{bmatrix}',
      detailSections: [{
        title: 'Row Reduction Steps',
        lines: ['R_{2}\\leftarrow R_{2}-2R_{1}'],
        lineKind: 'math',
      }],
      warnings: [],
    };

    const card = buildDisplayBlocks(outcome).find((block) => block.label === 'Row Reduction Steps');

    expect(card).toMatchObject({
      kind: 'detail',
      defaultCollapsed: true,
    });
  });

  it('keeps Linear Algebra proof cards visible even when their math is long', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'gram(u,v)',
      exactLatex: '\\operatorname{orthogonal\\ basis}=\\left\\{u,v\\right\\}',
      sourceMode: 'vector',
      detailSections: [{
        title: 'Gram-Schmidt Proof',
        lines: [
          'w_{2}=\\begin{bmatrix}4\\\\5\\\\6\\end{bmatrix}-\\operatorname{proj}_{w_{1}}(\\begin{bmatrix}4\\\\5\\\\6\\end{bmatrix})=\\begin{bmatrix}1.714286\\\\0.428571\\\\-0.857143\\end{bmatrix}',
        ],
        lineKind: 'math',
      }],
      warnings: [],
    };

    const card = buildDisplayBlocks(outcome).find((block) => block.label === 'Gram-Schmidt Proof');

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
      countSummary: {
        kind: 'roots',
        rootCount: 2,
        text: '2 roots',
      },
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

  it('does not describe Linear Algebra finite sets as roots', () => {
    const vectorOutcome: DisplayOutcome = {
      kind: 'success',
      title: 'gram(u,v)',
      exactLatex: [
        '\\text{orthogonal basis}=\\left\\{',
        '\\begin{bmatrix}1\\\\2\\\\3\\end{bmatrix},',
        '\\begin{bmatrix}2\\\\0\\\\-1\\end{bmatrix}',
        '\\right\\}',
      ].join(''),
      sourceMode: 'vector',
      warnings: [],
    };
    const vectorAnswer = buildDisplayBlocks(vectorOutcome).find((block) => block.id === 'answer');

    expect(vectorAnswer).toMatchObject({
      kind: 'answer',
      renderKind: 'math',
      latex: vectorOutcome.exactLatex,
    });
    expect(vectorAnswer?.countSummary).toBeUndefined();
    expect(displayBlockSummaryText(vectorAnswer!)).toBeUndefined();

    const matrixOutcome: DisplayOutcome = {
      kind: 'success',
      title: 'eigen(A)',
      exactLatex: 'eigen(A)=\\left\\{\\lambda=3,\\lambda=1\\right\\}',
      sourceMode: 'matrix',
      warnings: [],
    };
    const matrixAnswer = buildDisplayBlocks(matrixOutcome).find((block) => block.id === 'answer');

    expect(matrixAnswer).toMatchObject({
      kind: 'answer',
      renderKind: 'math',
      latex: matrixOutcome.exactLatex,
    });
    expect(displayBlockSummaryText(matrixAnswer!)).toBeUndefined();
  });

  it('uses source-mode options to protect older Linear Algebra outcomes', () => {
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'gram(u,v)',
      exactLatex: '\\text{orthogonal basis}=\\left\\{u,v\\right\\}',
      warnings: [],
    };

    const answerBlock = buildDisplayBlocks(outcome, { sourceMode: 'vector' })
      .find((block) => block.id === 'answer');

    expect(answerBlock?.renderKind).toBe('math');
    expect(answerBlock?.countSummary).toBeUndefined();
  });

  it('uses candidate-root count wording for guarded finite branch metadata', () => {
    const exactLatex = 'z\\in\\left\\{b-\\sqrt{a},\\ b+\\sqrt{a}\\right\\}';
    const outcome: DisplayOutcome = {
      kind: 'success',
      title: 'Symbolic',
      exactLatex,
      branchReadback: {
        targetLatex: 'z',
        relationLatex: '\\in',
        branchesLatex: ['b-\\sqrt{a}', 'b+\\sqrt{a}'],
        countLabel: 'candidateRoots',
      },
      warnings: [],
    };

    const answerBlock = buildDisplayBlocks(outcome).find((block) => block.id === 'answer');

    expect(answerBlock?.countSummary).toMatchObject({
      kind: 'roots',
      rootCount: 2,
      rootLabel: 'candidateRoots',
      text: '2 candidate roots',
    });
  });

  it('adds route-specific trust wording to answer summaries', () => {
    const exact = buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      resultOrigin: 'symbolic',
      exactLatex: 'x\\in\\left\\{-1,5\\right\\}',
      warnings: [],
    }).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(exact!)).toBe('Exact roots · 2 roots');

    const certified = buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      solutionKind: 'approximate-numeric',
      resultOrigin: 'numeric-fallback',
      approxText: 'x ≈ 1.300766',
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\approx',
        branchesLatex: ['1.300766'],
      },
      detailSections: [{
        title: 'Numeric Confidence',
        lines: [
          'All real polynomial roots certified.',
          'Candidate roots validated against original equation.',
        ],
      }],
      warnings: [],
    }).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(certified!)).toBe('Certified polynomial roots');

    const interval = buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      solutionKind: 'approximate-numeric',
      resultOrigin: 'numeric-fallback',
      approxText: 'x ≈ 0, 3.141593',
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\approx',
        branchesLatex: ['0', '3.141593'],
      },
      detailSections: [
        {
          title: 'Numeric Confidence',
          lines: ['All roots in this interval.'],
        },
        {
          title: 'Numeric Interval Scope',
          lines: ['Searched real interval [0, 10] with 256 subdivisions.'],
        },
      ],
      warnings: [],
    }).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(interval!)).toBe('Local numeric roots in [0, 10] · 2 roots');

    const bounded = buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      solutionKind: 'approximate-numeric',
      resultOrigin: 'numeric-fallback',
      approxText: 'x ≈ 0.567143',
      branchReadback: {
        targetLatex: 'x',
        relationLatex: '\\approx',
        branchesLatex: ['0.567143'],
      },
      detailSections: [{
        title: 'Numeric Confidence',
        lines: ['Validated roots from bounded search.'],
      }],
      warnings: [],
    }).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(bounded!))
      .toBe('Validated approximate roots from bounded search');

    const complexRegion = buildDisplayBlocks({
      kind: 'success',
      title: 'Symbolic',
      solutionKind: 'approximate-numeric',
      resultOrigin: 'numeric-fallback',
      approxText: 'z ≈ 0+0i',
      branchReadback: {
        targetLatex: 'z',
        relationLatex: '\\approx',
        branchesLatex: ['0+0i'],
      },
      detailSections: [{
        title: 'Numeric Confidence',
        lines: ['roots found in this complex region.'],
      }],
      warnings: [],
    }).find((block) => block.id === 'answer');
    expect(displayBlockSummaryText(complexRegion!)).toBe('Region-local complex roots');
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
      countSummary: {
        kind: 'roots',
        rootCount: 3,
        text: '3 roots',
      },
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
