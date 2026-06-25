import type { ComplexExactForm } from '../../../types/calculator';
import {
  cubicCardanoOmegaDefinitionLatex,
} from '../roots/cubic-cardano-roots';
import {
  addFormulaLatexTerms,
  fractionFormulaLatex,
  multiplyFormulaLatexFactors,
  negateFormulaLatex,
} from './formula-readback-polish';

export type CubicCardanoLatexParts = {
  shift: string;
  p: string;
  q: string;
  delta: string;
  primaryRadicand: string;
  negatedQ: string;
};

function fractionLatex(numerator: string, denominator: string) {
  return fractionFormulaLatex(numerator, denominator);
}

function negateLatex(latex: string) {
  return negateFormulaLatex(latex);
}

function addLatexTerms(terms: string[]) {
  return addFormulaLatexTerms(terms);
}

function multiplyLatexFactors(factors: string[]) {
  return multiplyFormulaLatexFactors(factors);
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
