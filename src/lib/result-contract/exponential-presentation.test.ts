import {expect, it} from 'vitest';
import type {SerializableMathJson} from '../../types/calculator';
import {executeIntegration} from '../calculus/new-integration/service';
import {DEFAULT_INTEGRATION_LIMITS as limits} from '../calculus/new-integration/types';
import {readIntegrationPresentation} from './integration-presentation';
import {exactIntegrationMathLatex} from './current/integration-schema';
const run = (body: string) => executeIntegration({request: {source: `\\int ${body}\\,dx`, limits}});
it.each(['e^{-x}', 'e^{x+1}', '\\frac{e^x}{e^{2x}+1}', '\\frac{1}{(1+e^x)^2}'])('renders %s as superscript exponentials and self-contained expanded copy', body => {
  const r = run(body); expect(r.document.outcomeKind).toBe('success');
  const before = JSON.stringify(r), p = readIntegrationPresentation(r.document)!;
  expect(p.copy()).toContain('e^{'); expect(p.copy()).not.toContain('\\exp');
  expect(p.copy()).not.toMatch(/[LqG]_\{/); expect(p.copy()).not.toMatch(/(?:^|[{}&+])t(?:[{}&+]|$)/);
  expect(JSON.stringify(r)).toBe(before);
  if (p.terms.length) {expect(p.expanded()).toContain('\\sum_'); expect(p.terms[0].argument).toContain('e^{');}
});
it.each(['e^{x^2}', '\\frac{1}{e^x+x}'])('copies a proved negative conclusion for %s rather than a primitive', body => {
  const r = run(body), p = readIntegrationPresentation(r.document)!;
  expect(p.negative).toBe(true); expect(p.explanation).toContain('No elementary antiderivative');
  expect(p.copy()).toContain('No elementary antiderivative'); expect(p.copy()).toContain('\\int'); expect(p.copy()).toContain('e^{');
});
it('retains canceled family/exponent restrictions in rational answers and original provenance', () => {
  const r = run('\\frac{e^{1/x}}{e^{1/x}}');
  expect(r.document.primary?.kind).toBe('rational-antiderivative');
  const p = readIntegrationPresentation(r.document)!;
  expect(p.conditions.some(c => c.latex === 'x\\ne0')).toBe(true);
  expect(p.copy()).toContain('e^{'); expect(p.copy()).toContain('\\ne0');
  expect(p.originals.some(c => c.origins.some(o => o.includes('source.')))).toBe(true);
});
it('abbreviates large constructions only in compact; expands lazily with explicit fallback notice', () => {
  const r = run('e^x'), doc = structuredClone(r.document);
  if (doc.primary?.kind !== 'exponential-antiderivative') throw Error('fixture');
  // A representation fixture tests formatting independently of integration execution.
  const tree: SerializableMathJson = ['Add', ...Array.from({length: 100}, (_, i): SerializableMathJson => ['Power', 'x', i + 1])];
  doc.primary.construction.argument = {mathJson: tree, canonicalLatex: exactIntegrationMathLatex(tree)};
  const p = readIntegrationPresentation(doc)!;
  expect(p.compact).toContain('t'); expect(p.generatorDefinition).toContain('e^{');
  expect(p.expanded()).toContain('x^{100}'); expect(p.expanded()).not.toMatch(/(?:^|[{}&+])t(?:[{}&+]|$)/); expect(p.copy()).not.toMatch(/(?:^|[{}&+])t(?:[{}&+]|$)/);
  const fallback = readIntegrationPresentation(doc, {maxNodes: 32})!;
  expect(fallback.expanded()).toContain('t'); expect(fallback.expansionUnavailable()).toContain('unavailable');
  expect(fallback.fallbackDefinition).toContain('t=e^{'); expect(fallback.copy()).toContain('t=e^{'); expect(doc.outcomeKind).toBe('success');
});
