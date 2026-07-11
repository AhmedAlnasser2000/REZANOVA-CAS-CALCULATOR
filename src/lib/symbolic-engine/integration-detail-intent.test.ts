import { ComputeEngine } from '@cortex-js/compute-engine';
import { describe, expect, it } from 'vitest';
import type { DisplayDetailSection } from '../../types/calculator';
import { detailLineIntentAt } from '../display/result-detail-lines';
import { resolveSymbolicIntegralFromLatex } from './integration';
import { profileTranscendentalCertificateTower } from './integration/transcendental-certificate/profile';
import { buildTranscendentalNonElementaryCertificate } from './integration/transcendental-certificate/result-shape';

const ce = new ComputeEngine();

function expectDeclaredSection(section: DisplayDetailSection) {
  section.lines.forEach((_line, index) => {
    expect(detailLineIntentAt(section, index)).not.toBe('undeclared');
  });
  if (section.lineParts) {
    expect(section.lineParts.map((row) => row.map((part) => (
      part.kind === 'math' ? part.latex : part.text
    )).join(''))).toEqual(section.lines);
  }
}

function sectionFor(input: string, title: string) {
  const result = resolveSymbolicIntegralFromLatex(input);
  const section = result.detailSections?.find((candidate) => candidate.title === title);
  expect(section, `${title} for ${input}`).toBeDefined();
  if (!section) throw new Error(`Missing ${title}`);
  return section;
}

describe('Symbolic Integration detail intent', () => {
  it.each([
    [String.raw`\frac{3}{2}\sqrt{x}`, 'Integration Normal Form'],
    [String.raw`(\sin(x)-\cos(x))^2`, 'Integration Trig Rewrite'],
    [String.raw`-\pi\sin(\pi x)`, 'Integration Scalar Multiple'],
    [String.raw`\frac{\ln(x)^2}{x}`, 'Integration Log-Power Substitution'],
    [String.raw`x\arcsin(x)`, 'Integration By Parts'],
    [String.raw`\sinh^2(x)`, 'Integration Hyperbolic Table'],
    [String.raw`\frac{1}{(4-x^2)^{3/2}}`, 'Integration Radical Template'],
    [String.raw`\frac{2x^3-3x^2+1}{x^2-3x+1}`, 'Integration Polynomial Division'],
    [String.raw`x^2+\sin(x^2)`, 'Integration Term Plan'],
    [String.raw`\sin(x)^{13}`, 'Integration Trig Power Boundary'],
  ])('declares %s through %s', (input, title) => {
    const section = sectionFor(input, title);
    expectDeclaredSection(section);
    expect(section.lineParts?.flat().some((part) => part.kind === 'math')).toBe(true);
  }, 60000);

  it('keeps non-elementary certificate explanation explicitly prose-only', () => {
    const profile = profileTranscendentalCertificateTower(ce.parse('e^{a*x^2+b*x+c}').json, 'x');
    const certificate = buildTranscendentalNonElementaryCertificate(profile);
    const section = certificate?.detailSections.find((candidate) => (
      candidate.title === 'Non-Elementary Certificate'
    ));

    expect(section).toBeDefined();
    if (!section) throw new Error('Missing non-elementary certificate detail');
    expect(section.lineKind).toBe('text');
    expectDeclaredSection(section);
  });
});
