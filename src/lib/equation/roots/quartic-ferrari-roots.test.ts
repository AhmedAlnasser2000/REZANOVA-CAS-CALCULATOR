import { describe, expect, it } from 'vitest';
import {
  createQuarticFerrariBranchNode,
  quarticFerrariFDefinitionLatex,
  renderQuarticFerrariBranchNode,
} from './quartic-ferrari-roots';

describe('Quartic Ferrari branch nodes', () => {
  it('renders compact general Ferrari branches through auxiliary symbols', () => {
    const branch = createQuarticFerrariBranchNode({
      mode: 'general',
      sigma: 1,
      tau: -1,
    });

    expect(renderQuarticFerrariBranchNode(branch)).toBe(
      String.raw`-\frac{A}{4}+\frac{S-\operatorname{PrincipalRoot}_{2}\left(F_{+}\right)}{2}`,
    );
  });

  it('renders negative-sigma Ferrari branches with F minus', () => {
    const branch = createQuarticFerrariBranchNode({
      mode: 'general',
      sigma: -1,
      tau: 1,
    });

    expect(renderQuarticFerrariBranchNode(branch)).toBe(
      String.raw`-\frac{A}{4}+\frac{-S+\operatorname{PrincipalRoot}_{2}\left(F_{-}\right)}{2}`,
    );
  });

  it('renders compact biquadratic branches without U or S symbols', () => {
    const branch = createQuarticFerrariBranchNode({
      mode: 'biquadratic',
      sIndex: 'minus',
      tau: -1,
    });

    expect(renderQuarticFerrariBranchNode(branch)).toBe(
      String.raw`-\frac{A}{4}-\operatorname{PrincipalRoot}_{2}\left(s_{-}\right)`,
    );
  });

  it('exposes F plus and F minus definitions', () => {
    expect(quarticFerrariFDefinitionLatex(1))
      .toBe(String.raw`F_{+}=-\left(3p+2Y+\frac{2q}{S}\right)`);
    expect(quarticFerrariFDefinitionLatex(-1))
      .toBe(String.raw`F_{-}=-\left(3p+2Y-\frac{2q}{S}\right)`);
  });
});
