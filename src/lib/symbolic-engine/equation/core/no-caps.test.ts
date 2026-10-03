import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EQUATION_STOPS } from './execution';

/**
 * The Equation core may stop only for work, allocation or cancellation.
 * Shape limits (degree, depth, node, branch, count, size caps) are forbidden.
 */
const CAP_NAME = /\b(?:const|let|var|readonly)\s+([A-Za-z0-9_]*(?:MAX|LIMIT|CAP|DEPTH|BUDGET|CEILING)[A-Za-z0-9_]*)\s*[:=]/g;
const CAP_FIELD = /\b(max(?:Degree|Depth|Nodes?|Branch(?:es)?|Count|Terms|Size|Steps|Passes|Iterations|Candidates|Bits)|(?:degree|depth|node|branch|integerBits)Limit)\b/g;
const RESOURCE_THROW = /new\s+EquationAlgebraError\(\s*'resource'/g;

export function capViolations(file: string, text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(CAP_NAME)) if (/[A-Z]/.test(m[1]) && m[1] === m[1].toUpperCase()) found.push(`${file}: cap constant ${m[1]}`);
  for (const m of text.matchAll(CAP_FIELD)) found.push(`${file}: cap field ${m[1]}`);
  if (!file.endsWith('execution.ts') && RESOURCE_THROW.test(text)) found.push(`${file}: resource stop outside execution context`);
  RESOURCE_THROW.lastIndex = 0;
  return found;
}

function productionFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...productionFiles(file));
    else if (/\.ts$/.test(file) && !/\.(test|spec)\.ts$/.test(file) && !file.endsWith('test-support.ts')) out.push(file);
  }
  return out;
}

describe('no-caps ratchet', () => {
  it('allows only the three typed resource stops', () => {
    expect([...EQUATION_STOPS]).toEqual(['work', 'allocation', 'cancelled']);
  });

  it('finds no shape caps in core production files', () => {
    const files = productionFiles(resolve('src/lib/symbolic-engine/equation/core'));
    expect(files.length).toBeGreaterThan(0);
    expect(files.flatMap(f => capViolations(f, readFileSync(f, 'utf8')))).toEqual([]);
  });

  it('detects the patterns it forbids', () => {
    expect(capViolations('x.ts', 'const MAX_DEGREE = 4;')).toHaveLength(1);
    expect(capViolations('x.ts', 'export const COMPOSITION_DEPTH_LIMIT = 3;')).toHaveLength(1);
    expect(capViolations('x.ts', 'const options = { maxBranches: 12 };')).toHaveLength(1);
    expect(capViolations('x.ts', "throw new EquationAlgebraError('resource', 'degree');")).toHaveLength(1);
    expect(capViolations('x.ts', 'const KARATSUBA_THRESHOLD = 32; const maximum = 1;')).toEqual([]);
  });
});
