import { exactSymbolLatex } from './exact-arithmetic-latex';
import type { CanonicalResultDocumentV5 } from '../../types/calculator';
import { validateCanonicalResultDocumentV5 } from './validation-v5';

export function readRationalPrimitiveV5(input: unknown) {
  const checked = validateCanonicalResultDocumentV5(input);
  if (!checked.ok) throw new Error(checked.failure.message);
  const document: CanonicalResultDocumentV5 = checked.validated.value;
  const p = document.primary;
  const terms = p.terms.map(t => `\\sum_{${t.modulus.canonicalLatex}=0}\\left(${t.weight.canonicalLatex}\\right)\\log\\left(${t.argument.canonicalLatex}\\right)`);
  const latex = [p.rationalPart.canonicalLatex, ...terms, exactSymbolLatex(p.integrationConstant)].join('+');
  const conditions = [
    ...p.conditions.sourceExclusions.map(v => ({origin: 'Source exclusion', latex: v.canonicalLatex + '\\ne0'})),
    {origin: 'Input denominator', latex: p.conditions.inputDenominator.canonicalLatex + '\\ne0'},
    {origin: 'Primitive denominator', latex: p.conditions.rationalDenominator.canonicalLatex + '\\ne0'},
    ...p.conditions.logNorms.map(v => ({origin: 'Log norm', latex: v.canonicalLatex + '\\ne0'})),
  ];
  return {document, latex, conditions, semantics: p.semantics};
}
