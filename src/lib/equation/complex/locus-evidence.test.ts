import { describe, expect, it } from 'vitest';
import { diagnoseComplexLocusPolicyForLatex } from './locus-policy';
import { buildComplexLocusEvidenceSections } from './locus-evidence';

function evidenceText(equationLatex: string) {
  const report = diagnoseComplexLocusPolicyForLatex(equationLatex, { target: 'z' });
  const sections = buildComplexLocusEvidenceSections({
    report,
    equationLatex,
    target: 'z',
    complexRegion: {
      reMin: '-2',
      reMax: '2',
      imMin: '-2',
      imMax: '2',
      gridSize: 8,
    },
  });
  return sections.flatMap((section) => [section.title, ...section.lines]).join(' ');
}

function evidenceTextWithoutRegion(equationLatex: string) {
  const report = diagnoseComplexLocusPolicyForLatex(equationLatex, { target: 'z' });
  const sections = buildComplexLocusEvidenceSections({
    report,
    equationLatex,
    target: 'z',
  });
  return sections.flatMap((section) => [section.title, ...section.lines]).join(' ');
}

describe('Complex locus evidence', () => {
  it('records bounded circle evidence without presenting a solution set', () => {
    const text = evidenceText(String.raw`\left|z-1\right|=2`);

    expect(text).toContain('Region Sampling');
    expect(text).toContain('Sampled cells: 64.');
    expect(text).toContain('Residual band across sampled cell centers/probes');
    expect(text).toContain('Candidate finite points from bounded sampling/probes');
    expect(text).toContain('circle-like locus centered at 1');
    expect(text).toContain('Do not treat sampled/probed points as a complete Complex solution set.');
  });

  it('records finite-point magnitude evidence for abs(z)=0', () => {
    const text = evidenceText('abs(z)=0');

    expect(text).toContain('Absolute-value magnitude collapses to the candidate point z=0.');
    expect(text).toContain('z≈0 with residual 0');
  });

  it('records line evidence for real part, imaginary part, and conjugate loci', () => {
    expect(evidenceText('Re(z)=1')).toContain('vertical line z=x+iy with x=1');
    expect(evidenceText('Im(z)=1')).toContain('horizontal line z=x+iy with y=1');
    expect(evidenceText('conj(z)=z')).toContain('real-axis locus y=0');
  });

  it('explains simple locus meaning even before region sampling', () => {
    const realPart = evidenceTextWithoutRegion('Re(z)=1');
    const circle = evidenceTextWithoutRegion('abs(z-1)=2');

    expect(realPart).toContain('Locus Meaning');
    expect(realPart).toContain('vertical line z=x+iy with x=1');
    expect(realPart).toContain('No Complex Region bounds were supplied');
    expect(circle).toContain('circle-like locus centered at 1');
  });
});
