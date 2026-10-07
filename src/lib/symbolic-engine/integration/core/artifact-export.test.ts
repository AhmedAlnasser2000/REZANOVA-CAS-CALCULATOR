import {expect, it} from 'vitest';
import {ExecutionContext, AlgebraError} from './execution';
import {inspectExactArtifact, optionalArtifactExport, ArtifactExportTooLarge} from './artifact-bounds';
const limits = {work: 10000, allocation: 10000, integerBits: 32, degree: 8};
const bounds = {artifactBytes: 8, artifactDepth: 8, artifactNodes: 100};
it('optional export byte failure leaves arithmetic live and always removes its scope', () => {
  const ctx = new ExecutionContext(limits);
  expect(() => optionalArtifactExport(ctx, () => inspectExactArtifact(ctx, bounds, 'long derivation'))).toThrow(ArtifactExportTooLarge);
  expect(() => ctx.tick()).not.toThrow();
  expect(() => inspectExactArtifact(ctx, bounds, 'long derivation')).toThrow(AlgebraError);
  expect(() => ctx.tick()).toThrow(AlgebraError);
});
it.each(['work', 'allocation', 'depth', 'nodes'])('optional export does not downgrade %s exhaustion', kind => {
  const ctx = new ExecutionContext({...limits, ...(kind === 'work' ? {work: 0} : kind === 'allocation' ? {allocation: 0} : {})});
  expect(() => optionalArtifactExport(ctx, () => inspectExactArtifact(ctx, {...bounds, artifactBytes: 1000,
    artifactDepth: kind === 'depth' ? 1 : 8, artifactNodes: kind === 'nodes' ? 1 : 100}, {a: {b: 1}}))).toThrow(AlgebraError);
  expect(() => ctx.tick()).toThrow(AlgebraError);
});
it('optional byte export retains strict malformed-data checking', () => {
  const ctx = new ExecutionContext(limits);
  expect(() => optionalArtifactExport(ctx, () => inspectExactArtifact(ctx, {...bounds, artifactBytes: 1000}, {value: () => 1}))).toThrow(AlgebraError);
  expect(() => ctx.tick()).not.toThrow();
});
