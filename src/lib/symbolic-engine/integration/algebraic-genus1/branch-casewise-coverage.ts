import type { DisplayDetailSection } from '../../../../types/calculator';
import {
  mixedDetailSection,
  textPart,
} from '../../../display/result-detail-lines';
import {
  buildAlgebraicGenus1RealBranchFacts,
  type AlgebraicGenus1RealBranchFactsResult,
} from './real-branch-facts';

export type AlgebraicGenus1BranchCasewiseRow = {
  conditionLatex: string;
  radicandSignLatex: 'P>0' | 'P<0';
  realRadicalStatus: 'real-valued' | 'not-real-valued';
  endpointPolicy: 'excluded' | 'included-where-radicand-zero';
  endpointFactsLatex: string[];
  samplePoint: number;
};

export type AlgebraicGenus1BranchCasewiseCoverage = {
  kind: 'success';
  variable: string;
  status: 'branch-casewise-ready';
  branchRowCap: 12;
  radicandLatex: string;
  rootCount: number;
  rows: AlgebraicGenus1BranchCasewiseRow[];
  realValuedRows: AlgebraicGenus1BranchCasewiseRow[];
  endpointExclusionsLatex: string[];
  canAdoptLive: false;
  detailSections: DisplayDetailSection[];
  readinessNotes: string[];
  proofObligations: string[];
};

export type AlgebraicGenus1BranchCasewiseCoverageResult =
  | AlgebraicGenus1BranchCasewiseCoverage
  | {
      kind: 'stop';
      variable: string;
      reason: 'branch-facts-stop';
      branchFacts: AlgebraicGenus1RealBranchFactsResult;
      detail?: string;
    };

const BRANCH_ROW_CAP = 12;

function endpointLatex(fact: { expressionLatex?: string; relation?: string; latex?: string }) {
  return fact.latex ?? `${fact.expressionLatex ?? ''}${fact.relation ?? ''}`;
}

function detailSection(input: AlgebraicGenus1BranchCasewiseCoverage) {
  return mixedDetailSection(
    'Genus-1 Branch Casewise Coverage',
    [
      [textPart('status: '), textPart(input.status)],
      [textPart('rows: '), textPart(`${input.rows.length}/${input.branchRowCap}`)],
      [textPart('real-valued rows: '), textPart(String(input.realValuedRows.length))],
      [textPart('endpoint exclusions: '), textPart(String(input.endpointExclusionsLatex.length))],
      [textPart('live-adoptable: '), textPart(input.canAdoptLive ? 'yes' : 'no')],
    ],
  );
}

export function buildAlgebraicGenus1BranchCasewiseCoverage(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1BranchCasewiseCoverageResult {
  const branchFacts = buildAlgebraicGenus1RealBranchFacts(node, variable);
  if (branchFacts.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'branch-facts-stop',
      branchFacts,
      detail: branchFacts.detail,
    };
  }

  const rows = branchFacts.branchRows.map((row): AlgebraicGenus1BranchCasewiseRow => ({
    conditionLatex: row.intervalLatex,
    radicandSignLatex: row.sign > 0 ? 'P>0' : 'P<0',
    realRadicalStatus: row.sign > 0 ? 'real-valued' : 'not-real-valued',
    endpointPolicy: row.endpointPolicy,
    endpointFactsLatex: row.endpointFactsLatex,
    samplePoint: row.samplePoint,
  }));
  const realValuedRows = rows.filter((row) => row.realRadicalStatus === 'real-valued');
  const endpointExclusionsLatex = branchFacts.endpointExclusionFacts.map(endpointLatex);

  const result: AlgebraicGenus1BranchCasewiseCoverage = {
    kind: 'success',
    variable,
    status: 'branch-casewise-ready',
    branchRowCap: BRANCH_ROW_CAP,
    radicandLatex: branchFacts.radicandLatex,
    rootCount: branchFacts.rootCount,
    rows,
    realValuedRows,
    endpointExclusionsLatex,
    canAdoptLive: false,
    detailSections: [],
    readinessNotes: [
      ...branchFacts.readinessNotes,
      'Exact-rational genus-1 branch rows are now packaged as capped casewise coverage evidence.',
      'Rows classify the real radical domain separately from endpoint exclusions before any live second-kind or symbolic widening.',
    ],
    proofObligations: [
      'Keep branch-row explosions controlled by the fixed cap before live adoption.',
      'Thread selected branch rows into future elliptic coefficient solving and antiderivative backchecks.',
      'Reject symbolic branch formulas until their row count, assumptions, and readback are capped.',
    ],
  };

  return {
    ...result,
    detailSections: [
      detailSection(result),
    ],
  };
}
