import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import {
  assertDisplayContractInversionBaselineUpdateAllowed,
  buildDisplayContractInversionBaseline,
  scanDisplayContractInversionRepository,
  validateDisplayContractInversionReport,
} from './display-contract-inversion-ratchet-core.mjs';

const temporaryRoots = [];

const DISPLAY_TYPES = `
  type Common = {
    title: string;
    warnings: string[];
    exactLatex?: string;
    canonicalResult?: { version: 1 };
    canonicalMath?: unknown;
    answerRows?: unknown;
    branchReadback?: unknown;
    systemReadback?: unknown;
    periodicFamily?: unknown;
    exactSupplementLatex?: string[];
    approxText?: string;
    detailSections?: unknown;
    answerMode?: unknown;
    answerDomain?: unknown;
    solutionKind?: unknown;
    resultOrigin?: unknown;
    calculusStrategy?: unknown;
    calculusDerivativeStrategies?: unknown;
    actions?: unknown;
    resolvedInputLatex?: string;
    plannerBadges?: unknown;
    solveBadges?: unknown;
    solveSummaryText?: string;
    solveSummaryParts?: unknown;
    transformBadges?: unknown;
    transformSummaryText?: string;
    transformSummaryLatex?: string;
    candidateValues?: number[];
    rejectedCandidateCount?: number;
    substitutionDiagnostics?: unknown;
    numericMethod?: string;
    sourceMode?: unknown;
    runtimeAdvisories?: unknown;
    variableSubstitutions?: unknown;
  };
  export type DisplayOutcome = Common & (
    | { kind: 'success' }
    | { kind: 'prompt'; message: string; targetMode: string; carryLatex: string }
    | { kind: 'error'; error: string }
  );
`;

function fixture(files) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calcwiz-display-inversion-'));
  temporaryRoots.push(rootDir);
  const allFiles = {
    'src/types/calculator/display-types.ts': DISPLAY_TYPES,
    ...files,
  };
  for (const [repoPath, source] of Object.entries(allFiles)) {
    const absolute = path.join(rootDir, repoPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, source);
  }
  return rootDir;
}

function rewrite(rootDir, repoPath, source) {
  const absolute = path.join(rootDir, repoPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, source);
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    fs.rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});

describe('display contract inversion ratchet', () => {
  it('separates native, compatibility, control, and consumer authority', () => {
    const rootDir = fixture({
      'src/lib/modes/calculate/sample.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export const legacy = (): DisplayOutcome => ({ kind: 'success', title: 'Legacy', exactLatex: '4', warnings: [] });
        export const native = (): DisplayOutcome => ({ kind: 'success', title: 'Native', exactLatex: '5', canonicalResult: { version: 1 }, warnings: [] });
        export const control = (): DisplayOutcome => ({ kind: 'error', title: 'Stop', error: 'No input', warnings: [] });
        export function read(outcome: DisplayOutcome) {
          return [outcome.kind, outcome.title, outcome.canonicalResult, outcome.runtimeAdvisories];
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.summary.compatibilityProjectionCount, 1);
    assert.equal(report.summary.nativeDocumentCount, 1);
    assert.equal(report.categoryCounts['control-outcome'], 1);
    assert.equal(report.categoryCounts['legacy-read'], 1);
    assert.equal(report.categoryCounts['canonical-read'], 1);
    assert.equal(report.categoryCounts['control-read'], 1);
    assert.equal(report.categoryCounts['transient-read'], 1);
    assert.equal(report.summary.violationCount, 0);
    assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
    assert.deepEqual(scanDisplayContractInversionRepository({ rootDir }), report);
  });

  it('recognizes the registered canonical projection and forwarding boundaries', () => {
    const rootDir = fixture({
      'src/lib/result-contract/projection.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function projectCanonicalResultToDisplayOutcome(document: { version: 1 }): DisplayOutcome {
          const common = { title: 'Stored', canonicalResult: document, warnings: [] };
          return { kind: 'success', ...common };
        }
        export function forward(outcome: DisplayOutcome): DisplayOutcome { return outcome; }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.categoryCounts['canonical-projection'], 1);
    assert.equal(report.categoryCounts.forwarder, 1);
    assert.equal(report.summary.nativeDocumentCount, 0);
  });

  it('keeps the exact Equation cancellation projection in control authority', () => {
    const rootDir = fixture({
      'src/lib/equation/solve-result/boundary.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export function projectEquationOutcomeBoundaryToDisplay(reason: string): DisplayOutcome {
          return {
            kind: 'error',
            title: 'Solve',
            error: reason,
            warnings: [],
            plannerBadges: [],
            solveSummaryText: 'The worker was stopped.',
          };
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.lanes.equation['control-outcome'], 1);
    assert.equal(report.lanes.equation['compatibility-projection'], 0);
  });

  it('recognizes canonical adapter calls as native producer coverage', () => {
    const rootDir = fixture({
      'src/lib/modes/calculate/sample.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        declare function projectCanonicalResultToDisplayOutcome(document: { version: 1 }): DisplayOutcome;
        export function run(): DisplayOutcome {
          return projectCanonicalResultToDisplayOutcome({ version: 1 });
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.summary.nativeDocumentCount, 1);
    assert.equal(report.categoryCounts.forwarder, 0);
  });

  it('counts only directly wrapped authored results as native documents', () => {
    const rootDir = fixture({
      'src/lib/modes/equation/wrapped.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        declare function createEquationResultOutcome(input: {
          kind: 'success';
          title: string;
          exactLatex: string;
          warnings: string[];
        }): DisplayOutcome;
        export function wrapped(): DisplayOutcome {
          return createEquationResultOutcome({
            kind: 'success',
            title: 'Solve',
            exactLatex: 'x=1',
            warnings: [],
          });
        }
        export function unwrapped(): DisplayOutcome {
          return { kind: 'success', title: 'Solve', exactLatex: 'x=2', warnings: [] };
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.lanes.equation['native-document'], 1);
    assert.equal(report.lanes.equation['compatibility-projection'], 1);
    assert.equal(report.lanes.equation.forwarder, 0);
  });

  it('counts a producer wrapper around a typed builder result without double-counting literals', () => {
    const rootDir = fixture({
      'src/lib/modes/equation/builder.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        declare function createEquationResultOutcome(input: DisplayOutcome): DisplayOutcome;
        declare function buildRuntimeOutcome(): DisplayOutcome;
        export function built(): DisplayOutcome {
          return createEquationResultOutcome(buildRuntimeOutcome());
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.lanes.equation['native-document'], 1);
    assert.equal(report.lanes.equation['compatibility-projection'], 0);
    assert.equal(report.lanes.equation.forwarder, 0);
  });

  it('does not misclassify the exact producer adapter input as a downstream consumer', () => {
    const rootDir = fixture({
      'src/lib/equation/solve-result/producer.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export function createEquationResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.lanes.equation['legacy-read'], 0);
    assert.equal(report.lanes.equation['control-read'], 0);
    assert.equal(report.lanes.equation['native-document'], 1);
  });

  it('classifies the full Calculus adapter and its direct owner boundary as native', () => {
    const rootDir = fixture({
      'src/lib/calculus/workspace/result-document.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export function createCalculusResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
      'src/lib/calculus/workspace/engine.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        declare function createCalculusResultOutcome(input: DisplayOutcome): DisplayOutcome;
        export function runLimit(outcome: DisplayOutcome): DisplayOutcome {
          return createCalculusResultOutcome(outcome);
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.lanes.calculus['legacy-read'], 0);
    assert.equal(report.lanes.calculus['native-document'], 2);
    assert.equal(report.lanes.calculus['compatibility-projection'], 0);
  });

  it('classifies all guided-domain adapters and owner boundaries as native', () => {
    const rootDir = fixture({
      'src/lib/trigonometry/result-document.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function createTrigonometryResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
      'src/lib/trigonometry/runtime-run.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        declare function createTrigonometryResultOutcome(input: DisplayOutcome): DisplayOutcome;
        export function run(outcome: DisplayOutcome) { return createTrigonometryResultOutcome(outcome); }
      `,
      'src/lib/geometry/result-document.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function createGeometryResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
      'src/lib/geometry/runtime-run.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        declare function createGeometryResultOutcome(input: DisplayOutcome): DisplayOutcome;
        export function run(outcome: DisplayOutcome) { return createGeometryResultOutcome(outcome); }
      `,
      'src/lib/statistics/result-document.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function createStatisticsResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
      'src/lib/statistics/runtime-run.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        declare function createStatisticsResultOutcome(input: DisplayOutcome): DisplayOutcome;
        export function run(outcome: DisplayOutcome) { return createStatisticsResultOutcome(outcome); }
      `,
      'src/lib/modes/table-result-document.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function createTableResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
      'src/lib/modes/table-core.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        declare function createTableResultOutcome(input: DisplayOutcome): DisplayOutcome;
        export function run(outcome: DisplayOutcome) { return createTableResultOutcome(outcome); }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    for (const lane of ['trigonometry', 'geometry', 'statistics', 'table']) {
      assert.equal(report.lanes[lane]['legacy-read'], 0, lane);
      assert.equal(report.lanes[lane]['native-document'], 2, lane);
      assert.equal(report.lanes[lane]['compatibility-projection'], 0, lane);
    }
  });

  it('classifies independent Matrix and Vector adapters and owner boundaries as native', () => {
    const rootDir = fixture({
      'src/lib/modes/matrix-result-document.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function createMatrixResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
      'src/lib/modes/matrix.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        declare function createMatrixResultOutcome(input: DisplayOutcome): DisplayOutcome;
        export function run(outcome: DisplayOutcome) { return createMatrixResultOutcome(outcome); }
      `,
      'src/lib/modes/vector-result-document.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function createVectorResultOutcome(input: DisplayOutcome): DisplayOutcome {
          if (input.kind === 'prompt') return input;
          return { ...input, canonicalResult: { version: 1 } };
        }
      `,
      'src/lib/modes/vector.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        declare function createVectorResultOutcome(input: DisplayOutcome): DisplayOutcome;
        export function run(outcome: DisplayOutcome) { return createVectorResultOutcome(outcome); }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    for (const lane of ['matrix', 'vector']) {
      assert.equal(report.lanes[lane]['legacy-read'], 0, lane);
      assert.equal(report.lanes[lane]['native-document'], 2, lane);
      assert.equal(report.lanes[lane]['compatibility-projection'], 0, lane);
    }
  });

  it('separates registered owner assembly from live compatibility debt', () => {
    const rootDir = fixture({
      'src/lib/geometry/core.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export function evaluationToOutcome(): DisplayOutcome {
          return { kind: 'success', title: 'Geometry', exactLatex: '4', warnings: [] };
        }
        export function unregisteredOutcome(): DisplayOutcome {
          return { kind: 'success', title: 'Geometry', exactLatex: '5', warnings: [] };
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.lanes.geometry['owner-assembly'], 1);
    assert.equal(report.lanes.geometry['compatibility-projection'], 1);
    assert.equal(report.summary.ownerAssemblyCount, 1);
  });

  it('classifies workspace hard-stop payloads as control outcomes', () => {
    const rootDir = fixture({
      'src/lib/modes/worker-clients/calculate-worker-client.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export function buildCancelledPayload(): DisplayOutcome {
          return {
            kind: 'error',
            title: 'Calculate',
            error: 'Stopped',
            warnings: [],
            solveSummaryText: 'The worker was stopped.',
          };
        }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.lanes.calculate['control-outcome'], 1);
    assert.equal(report.lanes.calculate['compatibility-projection'], 0);
  });

  it('keeps live producer lanes at zero compatibility after owner closeout', () => {
    const report = scanDisplayContractInversionRepository({ rootDir: process.cwd() });
    const producerLanes = [
      'app-runtime',
      'calculate',
      'calculus',
      'equation',
      'geometry',
      'kernel-runtime',
      'linear-algebra-shared',
      'matrix',
      'statistics',
      'table',
      'trigonometry',
      'vector',
    ];

    for (const lane of producerLanes) {
      assert.equal(report.lanes[lane]['compatibility-projection'], 0, lane);
    }
    assert.equal(report.summary.compatibilityProjectionCount, 1);
    assert.equal(report.summary.ownerAssemblyCount, 29);
    assert.deepEqual(
      report.entries['compatibility-projection'].map((entry) => [entry.file, entry.context]),
      [['src/app/runtime/historyDisplayEntry.ts', 'legacyHistoryOutcome']],
    );
  });

  it('keeps Display blocks canonical-first with only deferred hygiene and legacy History reads', () => {
    const report = scanDisplayContractInversionRepository({ rootDir: process.cwd() });
    const lane = report.lanes['display-read-model'];
    const legacyReads = report.entries['legacy-read']
      .filter((entry) => entry.lane === 'display-read-model');
    const legacyReadsByFile = Object.fromEntries(
      [...new Set(legacyReads.map((entry) => entry.file))]
        .map((file) => [file, legacyReads.filter((entry) => entry.file === file).length]),
    );

    assert.equal(lane['canonical-projection'], 1);
    assert.equal(lane['compatibility-projection'], 0);
    assert.equal(lane['canonical-read'], 1);
    assert.equal(lane['legacy-read'], 21);
    assert.deepEqual(legacyReadsByFile, {
      'src/lib/display/notation/symbolic-output-hygiene.ts': 5,
      'src/lib/display/print-hygiene.ts': 15,
      'src/lib/display/result/display-read-model.ts': 1,
    });
    assert.deepEqual(
      legacyReads
        .filter((entry) => entry.file === 'src/lib/display/result/display-read-model.ts')
        .map((entry) => [entry.detail, entry.context]),
      [['detailSections', 'canonicalDocumentForDisplay']],
    );
  });

  it('classifies parameter destructuring and rejects dynamic or rest reads', () => {
    const rootDir = fixture({
      'src/lib/modes/calculate/sample.ts': `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export function fixed({ exactLatex }: DisplayOutcome) { return exactLatex; }
        export function dynamic(outcome: DisplayOutcome, key: keyof DisplayOutcome) { return outcome[key]; }
        export function rest({ kind, ...remaining }: DisplayOutcome) { return [kind, remaining]; }
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.categoryCounts['legacy-read'], 1);
    assert.equal(report.categoryCounts['control-read'], 1);
    assert.deepEqual(report.violations.map((entry) => entry.kind).sort(), [
      'display-outcome-rest-read',
      'dynamic-display-outcome-read',
    ]);
  });

  it('does not count curated golden expectations as live producers', () => {
    const rootDir = fixture({
      'src/lib/__golden__/golden-cases.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export const expected: DisplayOutcome = { kind: 'success', title: 'Fixture', exactLatex: '4', warnings: [] };
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.summary.producerCount, 0);
    assert.equal(report.summary.compatibilityProjectionCount, 0);
  });

  it('rejects producers and consumers outside every declared lane', () => {
    const rootDir = fixture({
      'src/lib/new-domain/result.ts': `
        import type { DisplayOutcome } from '../../types/calculator/display-types';
        export const result = (): DisplayOutcome => ({ kind: 'success', title: 'New', warnings: [] });
      `,
    });
    const report = scanDisplayContractInversionRepository({ rootDir });

    assert.equal(report.summary.violationCount, 1);
    assert.match(report.violations[0].kind, /unclassified-display-contract-path/u);
    assert.throws(
      () => buildDisplayContractInversionBaseline(report, 'Not allowed'),
      /unclassified DisplayOutcome path/u,
    );
  });

  it('pins source fingerprints while ignoring line-only movement', () => {
    const repoPath = 'src/lib/modes/calculate/sample.ts';
    const rootDir = fixture({
      [repoPath]: `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export const result = (): DisplayOutcome => ({ kind: 'success', title: 'Value', exactLatex: '4', warnings: [] });
      `,
    });
    const initial = scanDisplayContractInversionRepository({ rootDir });
    const baseline = buildDisplayContractInversionBaseline(initial, 'Initial authority inventory');
    assert.equal(validateDisplayContractInversionReport(initial, baseline).ok, true);

    rewrite(rootDir, repoPath, `

      import type { DisplayOutcome } from '../../../types/calculator/display-types';
      export const result = (): DisplayOutcome => ({ kind: 'success', title: 'Value', exactLatex: '4', warnings: [] });
    `);
    assert.equal(
      validateDisplayContractInversionReport(
        scanDisplayContractInversionRepository({ rootDir }),
        baseline,
      ).ok,
      true,
    );

    rewrite(rootDir, repoPath, `
      import type { DisplayOutcome } from '../../../types/calculator/display-types';
      export const result = (): DisplayOutcome => ({ kind: 'success', title: 'Value', exactLatex: '5', warnings: [] });
    `);
    const changed = validateDisplayContractInversionReport(
      scanDisplayContractInversionRepository({ rootDir }),
      baseline,
    );
    assert.equal(changed.ok, false);
    assert.equal(changed.changes['compatibility-projection'].added.length, 1);
    assert.equal(changed.changes['compatibility-projection'].stale.length, 1);
  });

  it('allows accepted migration updates but rejects debt growth or native coverage loss', () => {
    const repoPath = 'src/lib/modes/calculate/sample.ts';
    const rootDir = fixture({
      [repoPath]: `
        import type { DisplayOutcome } from '../../../types/calculator/display-types';
        export const result = (): DisplayOutcome => ({ kind: 'success', title: 'Value', exactLatex: '4', warnings: [] });
      `,
    });
    const initial = scanDisplayContractInversionRepository({ rootDir });
    const baseline = buildDisplayContractInversionBaseline(initial, 'Initial authority inventory');

    rewrite(rootDir, repoPath, `
      import type { DisplayOutcome } from '../../../types/calculator/display-types';
      export const first = (): DisplayOutcome => ({ kind: 'success', title: 'One', exactLatex: '4', warnings: [] });
      export const second = (): DisplayOutcome => ({ kind: 'success', title: 'Two', exactLatex: '5', warnings: [] });
    `);
    assert.throws(
      () => assertDisplayContractInversionBaselineUpdateAllowed(
        scanDisplayContractInversionRepository({ rootDir }),
        baseline,
      ),
      /debt cannot rise/u,
    );

    rewrite(rootDir, repoPath, `
      import type { DisplayOutcome } from '../../../types/calculator/display-types';
      export const result = (): DisplayOutcome => ({ kind: 'success', title: 'Value', exactLatex: '4', canonicalResult: { version: 1 }, warnings: [] });
    `);
    const migrated = scanDisplayContractInversionRepository({ rootDir });
    assert.doesNotThrow(() => assertDisplayContractInversionBaselineUpdateAllowed(migrated, baseline));
    const migratedBaseline = buildDisplayContractInversionBaseline(migrated, 'Migrate one producer');

    rewrite(rootDir, repoPath, `
      import type { DisplayOutcome } from '../../../types/calculator/display-types';
      export const passthrough = (outcome: DisplayOutcome) => outcome.kind;
    `);
    assert.throws(
      () => assertDisplayContractInversionBaselineUpdateAllowed(
        scanDisplayContractInversionRepository({ rootDir }),
        migratedBaseline,
      ),
      /native document coverage cannot fall/u,
    );
    assert.throws(
      () => buildDisplayContractInversionBaseline(initial, ''),
      /non-empty reason/u,
    );
  });
});
