import { ComputeEngine } from '@cortex-js/compute-engine';

export type MathJsonProofComparisonMode = 'answer' | 'standard';

export type MathJsonProofComparisonCacheValue = {
  semanticRelation: 'structural' | 'equal' | 'simplified';
  serializedLatex: string;
  printerSource: 'math-json' | 'compatibility-fallback';
};

export type MathJsonProofVerificationDiagnostics = {
  computeEngineCreations: number;
  comparisonExecutions: number;
  cacheHits: number;
  cacheWrites: number;
};

declare const mathJsonProofVerificationSessionBrand: unique symbol;

export type MathJsonProofVerificationSession = {
  readonly [mathJsonProofVerificationSessionBrand]: true;
  getComputeEngine: () => ComputeEngine;
  getCachedSuccess: (key: string) => MathJsonProofComparisonCacheValue | undefined;
  setCachedSuccess: (key: string, value: MathJsonProofComparisonCacheValue) => void;
  recordComparisonExecution: () => void;
  diagnostics: () => MathJsonProofVerificationDiagnostics;
};

const activeSessions = new Map<MathJsonProofVerificationSession, number>();

export function createMathJsonProofVerificationSession(): MathJsonProofVerificationSession {
  let computeEngine: ComputeEngine | undefined;
  const successfulComparisons = new Map<string, MathJsonProofComparisonCacheValue>();
  const diagnostics: MathJsonProofVerificationDiagnostics = {
    computeEngineCreations: 0,
    comparisonExecutions: 0,
    cacheHits: 0,
    cacheWrites: 0,
  };

  return {
    getComputeEngine: () => {
      if (!computeEngine) {
        computeEngine = new ComputeEngine();
        diagnostics.computeEngineCreations += 1;
      }
      return computeEngine;
    },
    getCachedSuccess: (key) => {
      const cached = successfulComparisons.get(key);
      if (cached) diagnostics.cacheHits += 1;
      return cached;
    },
    setCachedSuccess: (key, value) => {
      successfulComparisons.set(key, value);
      diagnostics.cacheWrites += 1;
    },
    recordComparisonExecution: () => {
      diagnostics.comparisonExecutions += 1;
    },
    diagnostics: () => ({ ...diagnostics }),
  } as MathJsonProofVerificationSession;
}

export function activeMathJsonProofVerificationSession():
  MathJsonProofVerificationSession | undefined {
  if (activeSessions.size !== 1) return undefined;
  return activeSessions.keys().next().value;
}

export async function runWithMathJsonProofVerificationSession<T>(
  session: MathJsonProofVerificationSession,
  run: () => Promise<T>,
): Promise<T> {
  activeSessions.set(session, (activeSessions.get(session) ?? 0) + 1);
  try {
    return await run();
  } finally {
    const remaining = (activeSessions.get(session) ?? 1) - 1;
    if (remaining > 0) activeSessions.set(session, remaining);
    else activeSessions.delete(session);
  }
}

export function mathJsonProofComparisonCacheKey(input: {
  canonicalLatex: string;
  serializedMathJson: string;
  mode: MathJsonProofComparisonMode;
}) {
  return `${input.mode}\u0000${input.canonicalLatex}\u0000${input.serializedMathJson}`;
}
