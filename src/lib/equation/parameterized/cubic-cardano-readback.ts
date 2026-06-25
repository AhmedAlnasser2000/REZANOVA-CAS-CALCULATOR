import type { ComplexExactForm } from '../../../types/calculator';
import {
  cubicCardanoOmegaDefinitionLatex,
} from '../roots/cubic-cardano-roots';

export type CubicCardanoLatexParts = {
  shift: string;
  p: string;
  q: string;
  delta: string;
  primaryRadicand: string;
  negatedQ: string;
};

function isZeroLatex(latex: string) {
  return latex === '0';
}

function isOneLatex(latex: string) {
  return latex === '1';
}

function isSimpleLatex(latex: string) {
  return /^-?[A-Za-z0-9]+$/u.test(latex);
}

function groupLatex(latex: string) {
  return isSimpleLatex(latex) ? latex : `\\left(${latex}\\right)`;
}

function fractionLatex(numerator: string, denominator: string) {
  if (isZeroLatex(numerator)) {
    return '0';
  }
  if (isOneLatex(denominator)) {
    return numerator;
  }
  return `\\frac{${numerator}}{${denominator}}`;
}

function negateLatex(latex: string) {
  if (isZeroLatex(latex)) {
    return '0';
  }
  if (latex.startsWith('-') && !latex.startsWith('-\\frac')) {
    return latex.slice(1);
  }
  if (latex.startsWith('\\frac') || isSimpleLatex(latex)) {
    return `-${latex}`;
  }
  return `-\\left(${latex}\\right)`;
}

function addLatexTerms(terms: string[]) {
  const filtered = terms.filter((term) => term.length > 0 && !isZeroLatex(term));
  if (filtered.length === 0) {
    return '0';
  }
  return filtered.reduce((current, term, index) => {
    if (index === 0) {
      return term;
    }
    return term.startsWith('-') ? `${current}-${term.slice(1)}` : `${current}+${term}`;
  }, '');
}

function multiplyLatexFactors(factors: string[]) {
  if (factors.some(isZeroLatex)) {
    return '0';
  }
  const filtered = factors.filter((factor) => !isOneLatex(factor));
  if (filtered.length === 0) {
    return '1';
  }
  return filtered.map(groupLatex).join('');
}

function rootSetLatex(entries: string[]) {
  return `\\left\\{${entries.join(',\\ ')}\\right\\}`;
}

export function substitutedComplexCardanoDefinitionLines(options: {
  latexParts: CubicCardanoLatexParts;
  noDenominator: boolean;
  complexExactForm: ComplexExactForm;
}) {
  const branchIndexes = [0, 1, 2] as const;
  return [
    `p=${options.latexParts.p}`,
    `q=${options.latexParts.q}`,
    `\\Delta=${options.latexParts.delta}`,
    ...(!options.noDenominator ? [`R=${options.latexParts.primaryRadicand}`] : []),
    ...branchIndexes.map((branchIndex) =>
      cubicCardanoOmegaDefinitionLatex(branchIndex, options.complexExactForm)),
    options.noDenominator
      ? `x_{k}=${addLatexTerms([
        options.latexParts.shift,
        `\\operatorname{PrincipalRoot}_{3}\\left(${options.latexParts.negatedQ}\\right)\\omega_{k}`,
      ])},\\quad k=0,1,2`
      : `x_{k}=${addLatexTerms([
        options.latexParts.shift,
        `\\operatorname{PrincipalRoot}_{3}\\left(R\\right)\\omega_{k}`,
        `-\\frac{${options.latexParts.p}}{3\\operatorname{PrincipalRoot}_{3}\\left(R\\right)\\omega_{k}}`,
      ])},\\quad k=0,1,2`,
  ];
}

export function realCardanoSubstitutedRows(
  latexParts: CubicCardanoLatexParts,
): { valueLatex: string; conditionLatex: string }[] {
  const negQHalf = negateLatex(fractionLatex(latexParts.q, '2'));
  const sqrtDelta = `\\sqrt{${latexParts.delta}}`;
  const cbrtPlus = `\\sqrt[3]{${addLatexTerms([negQHalf, sqrtDelta])}}`;
  const cbrtMinus = `\\sqrt[3]{${addLatexTerms([negQHalf, negateLatex(sqrtDelta)])}}`;
  const threeQ = multiplyLatexFactors(['3', latexParts.q]);
  const twoP = multiplyLatexFactors(['2', latexParts.p]);
  const casusScale = multiplyLatexFactors([
    '2',
    `\\sqrt{${negateLatex(fractionLatex(latexParts.p, '3'))}}`,
  ]);
  const casusAngle = addLatexTerms([
    `\\frac{1}{3}\\arccos\\left(${fractionLatex(threeQ, twoP)}\\sqrt{${fractionLatex('-3', latexParts.p)}}\\right)`,
    '-\\frac{2\\pi k}{3}',
  ]);

  return [
    {
      valueLatex: rootSetLatex([addLatexTerms([latexParts.shift, cbrtPlus, cbrtMinus])]),
      conditionLatex: '\\Delta>0',
    },
    {
      valueLatex: rootSetLatex([latexParts.shift]),
      conditionLatex: '\\Delta=0,\\ p=0,\\ q=0',
    },
    {
      valueLatex: rootSetLatex([
        addLatexTerms([latexParts.shift, fractionLatex(threeQ, latexParts.p)]),
        addLatexTerms([latexParts.shift, negateLatex(fractionLatex(threeQ, twoP))]),
      ]),
      conditionLatex: '\\Delta=0,\\ p\\ne0',
    },
    {
      valueLatex: `\\left\\{${addLatexTerms([
        latexParts.shift,
        `${casusScale}\\cos\\left(${casusAngle}\\right)`,
      ])}\\mid k=0,1,2\\right\\}`,
      conditionLatex: '\\Delta<0,\\ p<0',
    },
  ];
}
