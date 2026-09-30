import { describe, expect, it } from 'vitest';
import { executeIntegration } from '../calculus/new-integration/service';
import { DEFAULT_INTEGRATION_LIMITS } from '../calculus/new-integration/types';
import { readIntegrationPresentation } from './integration-presentation';
const run = (source: string) => executeIntegration({request: {source, limits: {...DEFAULT_INTEGRATION_LIMITS, integerBits: source.includes('y^5') ? 8192 : DEFAULT_INTEGRATION_LIMITS.integerBits}}});
describe('New Integration presentation preserves verified authority', () => {
  it('expands all binding data, deduplicates conditions and preserves the original document/artifact', () => {
    const response = run(String.raw`\int \frac{1}{x^2+1}\,dx`), before = JSON.stringify(response);
    expect(response.document.version).toBe(5);
    const p = readIntegrationPresentation(response.document)!;
    expect(p.compact).toBe('L_{1}+C'); expect(p.terms[0].argument).not.toContain('0');
    expect(p.conditions).toHaveLength(1); expect(p.conditions[0].origins).toEqual(['Source exclusion', 'Input denominator', 'Log norm']);
    expect(p.originals).toHaveLength(4); expect(p.originals.some(c => c.latex === '1\\ne0')).toBe(true);
    expect(p.expanded()).toContain('\\sum_'); expect(p.expanded()).not.toMatch(/[LqG]_\{/);
    expect(p.copy()).toContain('x^{2}+1\\ne0'); expect(p.copy()).toContain('\\begin{aligned}');
    expect(JSON.stringify(response)).toBe(before);
    const fallback = readIntegrationPresentation(response.document, {maxNodes: 0})!;
    expect(fallback.expanded()).toContain('\\sum_'); expect(fallback.conditions).toHaveLength(2);
    expect(JSON.stringify(response)).toBe(before);
  });
  it.each([String.raw`\int \frac{x}{x}\,dx`, String.raw`\int \frac{0}{x-1}\,dx`])('keeps source exclusions in V2: %s', source => {
    const response = run(source); expect(response.document.version).toBe(2);
    const p = readIntegrationPresentation(response.document)!;
    expect(p.terms).toHaveLength(0); expect(p.conditions).toHaveLength(1);
    expect(p.copy()).toContain('\\ne0'); expect(p.originals).toHaveLength(3);
    if (source.includes('{0}')) {expect(p.compact).toBe('C'); expect(p.conditions[0].latex).toBe('x-1\\ne0');}
  });
  it.each([
    String.raw`\int \frac{x}{x^4+x^3+x+1}\,dx`,
    String.raw`\int \frac{y}{1+\frac{y^4}{y+5}+y^3}\,dy`,
    String.raw`\int \frac{1}{y^5+\frac{y}{1+y^4}}-\frac{2y}{3+\frac{5}{2y+y^4}}\,dy`,
    String.raw`\int \frac{1}{x^5-x-1}\,dx`,
    String.raw`\int \frac{x}{x^2-1}\,dx`,
    String.raw`\int \frac{1}{(x^2+1)^2}\,dx`,
    String.raw`\int \frac{1}{a^2+1}\,da`,
    String.raw`\int C^2\,dC`,
  ])('formats verified corpus without altering evidence: %s', source => {
    const response = run(source); expect(response.document.outcomeKind, JSON.stringify(response.document)).toBe('success');
    const before = JSON.stringify(response), p = readIntegrationPresentation(response.document)!;
    expect(p.compact).not.toContain('+-'); expect(p.copy()).not.toMatch(/[LqG]_\{/);
    expect(p.copy()).not.toContain('undefined'); expect(JSON.stringify(response)).toBe(before);
    if (source.includes('a^2')) expect(p.expanded()).toContain('a_{1}');
    if (source.includes('dC')) expect(p.compact).toContain('C_{1}');
  });
});
