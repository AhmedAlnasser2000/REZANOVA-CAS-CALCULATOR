import type { MathJson } from '../parameterized/math-json';

export type QuarticFerrariSign = -1 | 1;

export type QuarticFerrariBranchNode = {
  kind: 'equation-quartic-ferrari-branch';
  mode: 'general' | 'biquadratic';
  sigma?: QuarticFerrariSign;
  tau: QuarticFerrariSign;
  sIndex?: 'plus' | 'minus';
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
}) {
  const signs = [1, -1] as const;
  return signs.flatMap((sigma) =>
    signs.map((tau) =>
      createQuarticFerrariBranchNode({
        mode: 'general',
        sigma,
        tau,
        ...(options.metadata ? { metadata: options.metadata } : {}),
      })));
}

export function quarticFerrariBiquadraticBranchNodes(options: {
  metadata?: QuarticFerrariBranchNode['metadata'];
}) {
  const signs = [1, -1] as const;
  const indexes = ['plus', 'minus'] as const;
  return indexes.flatMap((sIndex) =>
    signs.map((tau) =>
      createQuarticFerrariBranchNode({
        mode: 'biquadratic',
        sIndex,
        tau,
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

export function renderQuarticFerrariBranchNode(node: unknown) {
  if (!isQuarticFerrariBranchNode(node)) {
    return null;
  }

  const shift = '-\\frac{A}{4}';
  if (node.mode === 'biquadratic') {
    const root = `\\operatorname{PrincipalRoot}_{2}\\left(${sSymbol(node.sIndex)}\\right)`;
    return addTerms([
      shift,
      signedTerm(node.tau, root),
    ]);
  }

  const sigma = node.sigma ?? 1;
  const numerator = addTerms([
    signedTerm(sigma, 'S'),
    signedTerm(node.tau, `\\operatorname{PrincipalRoot}_{2}\\left(${fSymbol(sigma)}\\right)`),
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
