import { describe, expect, it } from 'vitest';
import {
  createCubicCardanoBranchNode,
  renderCubicCardanoBranchNode,
} from './cubic-cardano-roots';

describe('Cubic Cardano branch nodes', () => {
  it('renders general Cardano branches with PrincipalRoot_3 denominators', () => {
    const branch = createCubicCardanoBranchNode({
      shift: 0,
      p: 'p',
      q: 'q',
      delta: 'Delta',
      primaryRadicand: 'R',
      branchIndex: 1,
      noDenominator: false,
    });

    const rendered = renderCubicCardanoBranchNode(branch);

    expect(rendered).toContain(String.raw`\operatorname{PrincipalRoot}_{3}\left(R\right)`);
    expect(rendered).toContain(String.raw`\cos\left(\frac{2\pi}{3}\right)+i\sin\left(\frac{2\pi}{3}\right)`);
    expect(rendered).toContain(String.raw`-\frac{p}{3\left(`);
  });

  it('honors cis notation for Cardano branch multipliers', () => {
    const branch = createCubicCardanoBranchNode({
      shift: 0,
      p: 'p',
      q: 'q',
      delta: 'Delta',
      primaryRadicand: 'R',
      branchIndex: 2,
      noDenominator: false,
    });

    expect(renderCubicCardanoBranchNode(branch, { complexExactForm: 'cis' }))
      .toContain(String.raw`\operatorname{cis}\left(\frac{4\pi}{3}\right)`);
  });

  it('uses the p=0 no-denominator branch form', () => {
    const branch = createCubicCardanoBranchNode({
      shift: 0,
      p: 0,
      q: 'q',
      delta: ['Divide', ['Power', 'q', 2], 4],
      primaryRadicand: ['Negate', 'q'],
      branchIndex: 0,
      noDenominator: true,
    });

    const rendered = renderCubicCardanoBranchNode(branch);

    expect(rendered).toContain(String.raw`\operatorname{PrincipalRoot}_{3}`);
    expect(rendered).toContain('-q');
    expect(rendered).not.toContain(String.raw`\frac{0}`);
  });
});
