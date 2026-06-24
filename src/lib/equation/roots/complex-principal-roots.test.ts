import { describe, expect, it } from 'vitest';
import {
  complexPrincipalRootBranches,
  createComplexPrincipalRootBranchNode,
  principalRootMultiplierLatex,
  renderComplexPrincipalRootBranchNode,
} from './complex-principal-roots';

describe('Complex principal-root branch policy', () => {
  it('creates a principal branch plus root-of-unity multipliers for degree five', () => {
    const branches = complexPrincipalRootBranches('a', 5);

    expect(branches).toHaveLength(5);
    expect(branches[0]).toMatchObject({
      kind: 'equation-complex-principal-root-branch',
      radicand: 'a',
      degree: 5,
      branchIndex: 0,
    });
    expect(branches[0].facts).toEqual([{
      principalArgumentRange: '(-pi, pi]',
      branchCut: 'principal-root-branch-cut',
      visible: false,
    }]);
    expect(renderComplexPrincipalRootBranchNode(branches[0]))
      .toBe(String.raw`\operatorname{PrincipalRoot}_{5}\left(a\right)`);
    expect(renderComplexPrincipalRootBranchNode(branches[1]))
      .toContain(String.raw`\cos\left(\frac{2\pi}{5}\right)+i\sin\left(\frac{2\pi}{5}\right)`);
  });

  it('uses cis notation only when the selected Complex exact form asks for it', () => {
    const branch = createComplexPrincipalRootBranchNode({
      radicand: 'a',
      degree: 12,
      branchIndex: 11,
    });

    expect(principalRootMultiplierLatex(branch, 'rectangular'))
      .toBe(String.raw`\cos\left(\frac{11\pi}{6}\right)+i\sin\left(\frac{11\pi}{6}\right)`);
    expect(principalRootMultiplierLatex(branch, 'cis'))
      .toBe(String.raw`\operatorname{cis}\left(\frac{11\pi}{6}\right)`);
    expect(renderComplexPrincipalRootBranchNode(branch, { complexExactForm: 'cis' }))
      .toContain(String.raw`\operatorname{cis}\left(\frac{11\pi}{6}\right)`);
  });
});
