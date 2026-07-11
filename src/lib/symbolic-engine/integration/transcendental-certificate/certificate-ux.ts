import type { DisplayDetailSection } from '../../../../types/calculator';

export type CertificateUxFact = {
  expressionLatex: string;
  relation: string;
};

export type CertificateUxProofObligation = {
  summary: string;
  latex?: string;
};

function factLatex(fact: CertificateUxFact) {
  if (fact.relation === '0<expr<1') {
    return `0<${fact.expressionLatex}<1`;
  }
  if (fact.relation === '>1') {
    return `${fact.expressionLatex}>1`;
  }
  return `${fact.expressionLatex}${fact.relation}`;
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.replace(/\s+/g, '');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function factSection(
  title: string,
  facts: CertificateUxFact[],
  emptyText: string,
): DisplayDetailSection {
  const lines = uniqueLines(facts.map(factLatex));
  if (lines.length === 0) {
    return {
      title,
      lineKind: 'text',
      lines: [emptyText],
    };
  }

  return {
    title,
    lines,
    lineKinds: lines.map(() => 'math'),
  };
}

export function certificateProofObligationSection(
  obligations: CertificateUxProofObligation[],
): DisplayDetailSection {
  if (obligations.length === 0) {
    return {
      title: 'Proof Obligations',
      lineKind: 'text',
      lines: ['No separate proof obligation was required for this certificate slice.'],
    };
  }

  const lines: string[] = [];
  const lineKinds: Array<'text' | 'math'> = [];
  for (const obligation of obligations) {
    lines.push(obligation.summary);
    lineKinds.push('text');
    if (obligation.latex) {
      lines.push(obligation.latex);
      lineKinds.push('math');
    }
  }

  return {
    title: 'Proof Obligations',
    lines,
    lineKinds,
  };
}

export function certificateUxDetailSections(input: {
  inputFacts?: CertificateUxFact[];
  branchFacts?: CertificateUxFact[];
  proofObligations?: CertificateUxProofObligation[];
}): DisplayDetailSection[] {
  const sections = [
    factSection(
      'Input Facts',
      input.inputFacts ?? [],
      'No extra input fact is required beyond the selected integration variable and exact coefficient scope.',
    ),
    factSection(
      'Branch Facts',
      input.branchFacts ?? [],
      'No real-branch split or branch exclusion is needed for this certificate row.',
    ),
  ];
  if (input.proofObligations !== undefined) {
    sections.push(certificateProofObligationSection(input.proofObligations));
  }
  return sections;
}
