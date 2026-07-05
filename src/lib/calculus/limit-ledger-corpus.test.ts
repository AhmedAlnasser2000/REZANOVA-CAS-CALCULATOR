import { describe, expect, it } from 'vitest';
import { classifyNaturalLimitRoute } from './limit-route-classifier';
import { evaluateCalculusLimit } from './workspace/limits';
import type { DisplayDetailSection } from '../../types/calculator';
import corpusJsonl from '../../../benchmarks/calculus-corpus/limits/ledger/unique-cases.jsonl?raw';

type LimitCorpusCase = {
  case_id: string;
  canonical_limit_latex: string;
  route_expectation: string;
  expected_result_kind: string;
  expected_answer_latex?: string;
  expected_error_contains?: string;
  expected_detail_titles?: string[];
  expected_detail_contains?: string[];
  domain_intent?: 'real' | 'complex';
  status: string;
};

function readJsonl<T>(text: string): T[] {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function detailSectionText(section: DisplayDetailSection): string {
  const partText = section.lineParts
    ?.flatMap((line) => line.map((part) => part.kind === 'math' ? part.latex : part.text))
    .join(' ');

  return [
    section.title,
    ...section.lines,
    partText,
  ].filter(Boolean).join(' ');
}

function allDetailText(sections: DisplayDetailSection[] | undefined): string {
  return (sections ?? []).map(detailSectionText).join(' ');
}

const cases = readJsonl<LimitCorpusCase>(corpusJsonl).filter((entry) => entry.status === 'supported');

describe('limits ledger corpus seed', () => {
  it('keeps every supported seed case on its expected route', () => {
    for (const entry of cases) {
      const route = classifyNaturalLimitRoute(entry.canonical_limit_latex);
      expect(route.kind, entry.case_id).toBe(entry.route_expectation);
    }
  });

  it('evaluates supported seed answers and controlled failures', () => {
    for (const entry of cases) {
      const result = evaluateCalculusLimit({
        requestLatex: entry.canonical_limit_latex,
        equationDomainIntent: entry.domain_intent,
      });

      if (entry.expected_answer_latex) {
        expect(result.error, entry.case_id).toBeUndefined();
        expect(result.exactLatex, entry.case_id).toBe(entry.expected_answer_latex);
      }

      if (entry.expected_error_contains) {
        expect(result.error, entry.case_id).toContain(entry.expected_error_contains);
      }

      const detailTitles = result.detailSections?.map((section) => section.title) ?? [];
      for (const title of entry.expected_detail_titles ?? []) {
        expect(detailTitles, entry.case_id).toContain(title);
      }

      const detailText = allDetailText(result.detailSections);
      for (const expectedText of entry.expected_detail_contains ?? []) {
        expect(detailText, entry.case_id).toContain(expectedText);
      }
    }
  });
});
