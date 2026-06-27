import {
  addFormulaLatexTerms,
  fractionFormulaLatex,
  groupFormulaLatex,
  multiplyFormulaLatexFactors,
  negateFormulaLatex,
  powerFormulaLatex,
} from './formula-readback-polish';

export type QuarticFerrariLatexParts = {
  a: string;
  A: string;
  B: string;
  C: string;
  D: string;
  p: string;
  q: string;
  r: string;
};

type RealFerrariCaseRow = {
  valueLatex: string;
  conditionLatex: string;
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

function powerLatex(base: string, degree: number) {
  return powerFormulaLatex(base, degree);
}

function groupLatex(latex: string) {
  return groupFormulaLatex(latex);
}

function ferrariShiftLatex(lines: QuarticFerrariLatexParts) {
  return negateLatex(fractionLatex(lines.A, '4'));
}

function ferrariBiquadraticSubstitution(lines: QuarticFerrariLatexParts) {
  const discriminant = addLatexTerms([
    powerLatex(lines.p, 2),
    negateLatex(multiplyLatexFactors(['4', lines.r])),
  ]);
  return {
    sPlus: fractionLatex(addLatexTerms([negateLatex(lines.p), `\\sqrt{${discriminant}}`]), '2'),
    sMinus: fractionLatex(addLatexTerms([negateLatex(lines.p), negateLatex(`\\sqrt{${discriminant}}`)]), '2'),
  };
}

function ferrariAuxiliarySubstitution(lines: QuarticFerrariLatexParts) {
  const P = addLatexTerms([
    negateLatex(fractionLatex(powerLatex(lines.p, 2), '12')),
    negateLatex(lines.r),
  ]);
  const Q = addLatexTerms([
    negateLatex(fractionLatex(powerLatex(lines.p, 3), '108')),
    fractionLatex(multiplyLatexFactors([lines.p, lines.r]), '3'),
    negateLatex(fractionLatex(powerLatex(lines.q, 2), '8')),
  ]);
  const delta = addLatexTerms([
    powerLatex(fractionLatex(Q, '2'), 2),
    powerLatex(fractionLatex(P, '3'), 3),
  ]);
  return { P, Q, delta };
}

function realFerrariYFromT(lines: QuarticFerrariLatexParts, tLatex: string) {
  return addLatexTerms([
    negateLatex(fractionLatex(multiplyLatexFactors(['5', lines.p]), '6')),
    tLatex,
  ]);
}

function realFerrariClosedRootSet(
  lines: QuarticFerrariLatexParts,
  tLatex: string,
  extraSetQualifiers: string[] = [],
) {
  const y = realFerrariYFromT(lines, tLatex);
  const sArgument = addLatexTerms([
    lines.p,
    multiplyLatexFactors(['2', y]),
  ]);
  const sRoot = `\\sqrt{${sArgument}}`;
  const fSigmaArgument = negateLatex(groupLatex(addLatexTerms([
    multiplyLatexFactors(['3', lines.p]),
    multiplyLatexFactors(['2', y]),
    `\\sigma ${fractionLatex(multiplyLatexFactors(['2', lines.q]), sRoot)}`,
  ])));
  const rootTerm = fractionLatex(addLatexTerms([
    `\\sigma${sRoot}`,
    `\\tau\\sqrt{${fSigmaArgument}}`,
  ]), '2');
  const qualifiers = [
    '\\sigma,\\tau\\in\\{-1,1\\}',
    ...extraSetQualifiers,
    `${fSigmaArgument}\\ge0`,
  ];

  return {
    valueLatex: `\\left\\{${addLatexTerms([ferrariShiftLatex(lines), rootTerm])}\\mid ${qualifiers.join(',\\ ')}\\right\\}`,
    sArgument,
  };
}

function realFerrariDeltaPositiveT(auxiliary: ReturnType<typeof ferrariAuxiliarySubstitution>) {
  const negQHalf = negateLatex(fractionLatex(auxiliary.Q, '2'));
  const sqrtDelta = `\\sqrt{${auxiliary.delta}}`;
  return addLatexTerms([
    `\\sqrt[3]{${addLatexTerms([negQHalf, sqrtDelta])}}`,
    `\\sqrt[3]{${addLatexTerms([negQHalf, negateLatex(sqrtDelta)])}}`,
  ]);
}

function realFerrariCasusT(auxiliary: ReturnType<typeof ferrariAuxiliarySubstitution>) {
  const scale = multiplyLatexFactors([
    '2',
    `\\sqrt{${negateLatex(fractionLatex(auxiliary.P, '3'))}}`,
  ]);
  const angle = addLatexTerms([
    `\\frac{1}{3}\\arccos\\left(${fractionLatex(
      multiplyLatexFactors(['3', auxiliary.Q]),
      multiplyLatexFactors(['2', auxiliary.P]),
    )}\\sqrt{${fractionLatex('-3', auxiliary.P)}}\\right)`,
    '-\\frac{2\\pi k}{3}',
  ]);
  return `${scale}\\cos\\left(${angle}\\right)`;
}

function realFerrariClosedCaseRows(lines: QuarticFerrariLatexParts): RealFerrariCaseRow[] {
  const auxiliary = ferrariAuxiliarySubstitution(lines);
  const rows = [
    {
      conditionParts: [`${auxiliary.delta}>0`],
      tLatex: realFerrariDeltaPositiveT(auxiliary),
    },
    {
      conditionParts: [`${auxiliary.delta}=0`, `${auxiliary.P}=0`, `${auxiliary.Q}=0`],
      tLatex: '0',
    },
    {
      conditionParts: [`${auxiliary.delta}=0`, `${auxiliary.P}\\ne0`],
      tLatex: fractionLatex(multiplyLatexFactors(['3', auxiliary.Q]), auxiliary.P),
    },
    {
      conditionParts: [`${auxiliary.delta}=0`, `${auxiliary.P}\\ne0`],
      tLatex: negateLatex(fractionLatex(
        multiplyLatexFactors(['3', auxiliary.Q]),
        multiplyLatexFactors(['2', auxiliary.P]),
      )),
    },
    {
      conditionParts: [`${auxiliary.delta}<0`, `${auxiliary.P}<0`, 'k=0,1,2'],
      setQualifiers: ['k=0,1,2'],
      tLatex: realFerrariCasusT(auxiliary),
    },
  ];

  return rows.map((row) => {
    const closed = realFerrariClosedRootSet(lines, row.tLatex, row.setQualifiers);
    return {
      valueLatex: closed.valueLatex,
      conditionLatex: [...row.conditionParts, `${closed.sArgument}>0`].join(',\\ '),
    };
  });
}

function realRootValueSet() {
  return '\\left\\{-\\frac{A}{4}+\\frac{\\sigma\\sqrt{p+2Y}+\\tau\\sqrt{F_{\\sigma}}}{2}\\mid \\sigma,\\tau\\in\\{-1,1\\},\\ F_{\\sigma}\\ge0\\right\\}';
}

export function realFerrariCaseRows(
  mode: 'general' | 'biquadratic',
  lines?: QuarticFerrariLatexParts,
): RealFerrariCaseRow[] {
  if (mode === 'biquadratic') {
    if (lines) {
      const substituted = ferrariBiquadraticSubstitution(lines);
      const shift = ferrariShiftLatex(lines);
      return [
        {
          valueLatex: `\\left\\{${addLatexTerms([shift, `\\sqrt{${substituted.sPlus}}`])},\\ ${addLatexTerms([shift, negateLatex(`\\sqrt{${substituted.sPlus}}`)])}\\right\\}`,
          conditionLatex: `${substituted.sPlus}\\ge0`,
        },
        {
          valueLatex: `\\left\\{${addLatexTerms([shift, `\\sqrt{${substituted.sMinus}}`])},\\ ${addLatexTerms([shift, negateLatex(`\\sqrt{${substituted.sMinus}}`)])}\\right\\}`,
          conditionLatex: `${substituted.sMinus}\\ge0`,
        },
      ];
    }

    return [
      {
        valueLatex: '\\left\\{-\\frac{A}{4}+\\sqrt{s_{+}},\\ -\\frac{A}{4}-\\sqrt{s_{+}}\\right\\}',
        conditionLatex: 's_{+}\\ge0',
      },
      {
        valueLatex: '\\left\\{-\\frac{A}{4}+\\sqrt{s_{-}},\\ -\\frac{A}{4}-\\sqrt{s_{-}}\\right\\}',
        conditionLatex: 's_{-}\\ge0',
      },
    ];
  }

  if (lines) {
    return realFerrariClosedCaseRows(lines);
  }

  const valueLatex = realRootValueSet();
  return [
    {
      valueLatex,
      conditionLatex: '\\Delta>0,\\ t=\\sqrt[3]{-\\frac{Q}{2}+\\sqrt{\\Delta}}+\\sqrt[3]{-\\frac{Q}{2}-\\sqrt{\\Delta}},\\ p+2Y>0',
    },
    {
      valueLatex,
      conditionLatex: '\\Delta=0,\\ P=0,\\ Q=0,\\ t=0,\\ p+2Y>0',
    },
    {
      valueLatex,
      conditionLatex: '\\Delta=0,\\ P\\ne0,\\ t=\\frac{3Q}{P},\\ p+2Y>0',
    },
    {
      valueLatex,
      conditionLatex: '\\Delta=0,\\ P\\ne0,\\ t=-\\frac{3Q}{2P},\\ p+2Y>0',
    },
    {
      valueLatex,
      conditionLatex: '\\Delta<0,\\ P<0,\\ t=2\\sqrt{-\\frac{P}{3}}\\cos\\left(\\frac{1}{3}\\arccos\\left(\\frac{3Q}{2P}\\sqrt{-\\frac{3}{P}}\\right)-\\frac{2\\pi k}{3}\\right),\\ k=0,1,2,\\ p+2Y>0',
    },
  ];
}
