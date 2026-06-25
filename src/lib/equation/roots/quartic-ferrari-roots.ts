import type { MathJson } from '../parameterized/math-json';

export type QuarticFerrariSign = -1 | 1;

export type QuarticFerrariBranchNode = {
  kind: 'equation-quartic-ferrari-branch';
  mode: 'general' | 'biquadratic';
  sigma?: QuarticFerrariSign;
  tau: QuarticFerrariSign;
  sIndex?: 'plus' | 'minus';
  latex?: {
    compact?: boolean;
    shift?: string;
    p?: string;
    q?: string;
    y?: string;
    sPlus?: string;
    sMinus?: string;
  };
  metadata?: {
    p?: MathJson;
    q?: MathJson;
    r?: MathJson;
  };
};

export function isQuarticFerrariBranchNode(node: unknown): node is QuarticFerrariBranchNode {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return false;
  }
  const candidate = node as Partial<QuarticFerrariBranchNode>;
  return candidate.kind === 'equation-quartic-ferrari-branch'
    && (candidate.mode === 'general' || candidate.mode === 'biquadratic')
    && (candidate.tau === -1 || candidate.tau === 1);
}

export function createQuarticFerrariBranchNode(
  options: Omit<QuarticFerrariBranchNode, 'kind'>,
): QuarticFerrariBranchNode {
  return {
    kind: 'equation-quartic-ferrari-branch',
    ...options,
  };
}

export function quarticFerrariGeneralBranchNodes(options: {
  metadata?: QuarticFerrariBranchNode['metadata'];
  latex?: QuarticFerrariBranchNode['latex'];
}) {
  const signs = [1, -1] as const;
  return signs.flatMap((sigma) =>
    signs.map((tau) =>
      createQuarticFerrariBranchNode({
        mode: 'general',
        sigma,
        tau,
        ...(options.latex ? { latex: options.latex } : {}),
        ...(options.metadata ? { metadata: options.metadata } : {}),
      })));
}

export function quarticFerrariBiquadraticBranchNodes(options: {
  metadata?: QuarticFerrariBranchNode['metadata'];
  latex?: QuarticFerrariBranchNode['latex'];
}) {
  const signs = [1, -1] as const;
  const indexes = ['plus', 'minus'] as const;
  return indexes.flatMap((sIndex) =>
    signs.map((tau) =>
      createQuarticFerrariBranchNode({
        mode: 'biquadratic',
        sIndex,
        tau,
        ...(options.latex ? { latex: options.latex } : {}),
        ...(options.metadata ? { metadata: options.metadata } : {}),
      })));
}

function addTerms(terms: string[]) {
  const filtered = terms.filter((term) => term.length > 0 && term !== '0');
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

function signedTerm(sign: QuarticFerrariSign, term: string) {
  return sign === 1 ? term : `-${term}`;
}

function fSymbol(sigma: QuarticFerrariSign) {
  return sigma === 1 ? 'F_{+}' : 'F_{-}';
}

function sSymbol(sIndex: 'plus' | 'minus' | undefined) {
  return sIndex === 'plus' ? 's_{+}' : 's_{-}';
}

function principalSquareRoot(argument: string) {
  return `\\operatorname{PrincipalRoot}_{2}\\left(${argument}\\right)`;
}

export function renderQuarticFerrariBranchNode(node: unknown) {
  if (!isQuarticFerrariBranchNode(node)) {
    return null;
  }

  const shift = node.latex?.compact ? '-\\frac{A}{4}' : node.latex?.shift ?? '-\\frac{A}{4}';
  if (node.mode === 'biquadratic') {
    const rootArgument = node.latex?.compact
      ? sSymbol(node.sIndex)
      : node.sIndex === 'plus'
        ? node.latex?.sPlus ?? sSymbol(node.sIndex)
        : node.latex?.sMinus ?? sSymbol(node.sIndex);
    const root = principalSquareRoot(rootArgument);
    return addTerms([
      shift,
      signedTerm(node.tau, root),
    ]);
  }

  const sigma = node.sigma ?? 1;
  if (!node.latex?.compact && node.latex?.p && node.latex.q && node.latex.y) {
    const sRoot = principalSquareRoot(addTerms([
      node.latex.p,
      `2\\left(${node.latex.y}\\right)`,
    ]));
    const threeP = `3\\left(${node.latex.p}\\right)`;
    const twoY = `2\\left(${node.latex.y}\\right)`;
    const twoQ = `2\\left(${node.latex.q}\\right)`;
    const fArgument = sigma === 1
      ? `-\\left(${threeP}+${twoY}+\\frac{${twoQ}}{${sRoot}}\\right)`
      : `-\\left(${threeP}+${twoY}-\\frac{${twoQ}}{${sRoot}}\\right)`;
    const numerator = addTerms([
      signedTerm(sigma, sRoot),
      signedTerm(node.tau, principalSquareRoot(fArgument)),
    ]);
    return addTerms([
      shift,
      `\\frac{${numerator}}{2}`,
    ]);
  }

  const numerator = addTerms([
    signedTerm(sigma, 'S'),
    signedTerm(node.tau, principalSquareRoot(fSymbol(sigma))),
  ]);
  return addTerms([
    shift,
    `\\frac{${numerator}}{2}`,
  ]);
}

export function quarticFerrariFDefinitionLatex(sigma: QuarticFerrariSign) {
  return sigma === 1
    ? 'F_{+}=-\\left(3p+2Y+\\frac{2q}{S}\\right)'
    : 'F_{-}=-\\left(3p+2Y-\\frac{2q}{S}\\right)';
}
