import type { CanonicalEquationSetV6, CanonicalResultDocumentV6 } from '../../types/calculator';

/**
 * The closed "Verified exactly" line of an answer: one fixed sentence per answer type, chosen from the typed V6
 * outcome (never from printed text). Non-answers have nothing verified and get no line. The per-check report is
 * a later gate (EQUATION-VERIFICATION-REPORT1).
 */
export interface VerificationSummary { readonly headline: string; readonly detail: string }

type Kind = CanonicalEquationSetV6['kind'];
const SENTENCES: Readonly<Record<Kind, string>> = {
  finite: 'Each solution was substituted back into the original rows exactly, and the engine proved there are no others.',
  cofinite: 'The excluded values were checked exactly, and every other value was proved to satisfy the rows.',
  intervals: 'Every endpoint and every interval was checked exactly against the original rows.',
  union: 'Each part of the answer was checked exactly against the original rows, and nothing else satisfies them.',
  'case-tree': 'Each case was checked exactly at parameter values covering every case, and the cases cover every parameter value.',
  'periodic-set': 'One full period was checked exactly; the answer repeats with that period.',
  'interval-family': 'The family of intervals was checked exactly over one period and repeats with it.',
  'root-set': 'Every root of the polynomial was checked exactly against the original rows.',
  periodic: 'Each family of solutions was substituted back exactly for every integer value, and no other solutions exist.',
  parametric: 'The parametrised solutions were substituted back into the original rows exactly.',
  'reduced-form': 'Each rewriting step was checked exactly to keep the same solutions.',
  unconfirmed: 'The candidates were checked exactly; they are shown as candidates.',
};

function kinds(s: CanonicalEquationSetV6, out: Set<Kind>): Set<Kind> {
  out.add(s.kind);
  if (s.kind === 'union') s.sets.forEach(x => kinds(x, out));
  if (s.kind === 'case-tree') s.cases.forEach(c => kinds(c.set, out));
  return out;
}

export function verificationSummary(doc: CanonicalResultDocumentV6): VerificationSummary | undefined {
  const p = doc.primary, o = p.outcome;
  if (p.provenance.verification !== 'independent' || (o.kind !== 'solved' && o.kind !== 'empty')) return undefined;
  const assumed = p.assumptions?.length ? ' Cases ruled out by the assumptions were checked to be excluded.' : '';
  if (o.kind === 'empty') return { headline: 'Verified exactly', detail: `The engine proved that no value satisfies every row.${assumed}` };
  const top = o.set.kind === 'case-tree' ? 'case-tree' : o.set.kind;
  const nested = [...kinds(o.set, new Set())].filter(k => k !== top && k !== 'union' && k !== 'case-tree');
  const detail = [SENTENCES[top], ...(top === 'case-tree' ? nested.slice(0, 1).map(k => SENTENCES[k]) : [])].join(' ');
  return { headline: 'Verified exactly', detail: `${detail}${assumed}` };
}
