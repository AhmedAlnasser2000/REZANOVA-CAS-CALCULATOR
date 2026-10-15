import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RETIRED_BROWSER_SPECS,
  RETIRED_ENGINE_TEST_FILES,
  RETIRED_INTERNAL_TEST_FILES,
  RETIRED_VITEST_EXCLUDES,
  RETIRED_WORKSPACE_TEST_FILES,
  RETIRED_WORKSPACE_TEST_FOLDERS,
} from '../../../tools/retired-workspace-tests.mjs';

const root = process.cwd();

function listFiles(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${dir}/${entry.name}`;
    return entry.isDirectory() ? listFiles(relative) : [relative];
  });
}

function globPattern(glob: string) {
  const source = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .split('**')
    .map((part) => part.replace(/\*/g, '[^/]*'))
    .join('.*');
  return new RegExp(`^${source}$`);
}

const sourceFiles = listFiles('src');
const browserSpecs = listFiles('e2e');

/** Areas whose tests must keep running: the kept workspaces, Integration and the internals. */
const KEPT_AREAS = [
  /^src\/lib\/symbolic-engine\/equation\//,
  /^src\/lib\/new-equation\//,
  /^src\/app\/new-equation\//,
  /^src\/lib\/calculus\/new-integration\//,
  /^src\/app\/new-integration\//,
  /integration/,
  /graph/i,
  /notebook/i,
  /settings/i,
  /histor/i,
  /guide(?!d)/i,
  /^src\/lib\/(ooe|surface-protocol|compartments|__golden__|kernel|app-state|history-replay|clipboard|display)\//,
  /canar/,
];

describe('retired workspace tests', () => {
  it('names only files and folders that exist, so the tests stay on disk', () => {
    for (const file of [...RETIRED_WORKSPACE_TEST_FILES, ...RETIRED_ENGINE_TEST_FILES, ...RETIRED_INTERNAL_TEST_FILES]) {
      expect(existsSync(path.join(root, file)), file).toBe(true);
      expect(file).toMatch(/\.test\.tsx?$/);
    }
    for (const folder of RETIRED_WORKSPACE_TEST_FOLDERS) {
      const pattern = globPattern(folder);
      expect(sourceFiles.some((file) => pattern.test(file) && /\.test\.tsx?$/.test(file)), folder).toBe(true);
    }
    for (const spec of RETIRED_BROWSER_SPECS) {
      const pattern = globPattern(spec);
      expect(browserSpecs.some((file) => pattern.test(file)), spec).toBe(true);
    }
  });

  it('never excludes a test of a kept workspace, Integration or an internal', () => {
    const excluded = sourceFiles.filter((file) => /\.test\.tsx?$/.test(file) && RETIRED_VITEST_EXCLUDES.some((glob) => globPattern(glob).test(file)));
    const internals = new Set(RETIRED_INTERNAL_TEST_FILES);
    for (const file of excluded) {
      if (internals.has(file)) continue;
      for (const area of KEPT_AREAS) expect(file, `${file} is in a kept area`).not.toMatch(area);
    }
    for (const spec of RETIRED_BROWSER_SPECS) {
      expect(spec).not.toMatch(/new-equation|new-integration|graphing|notebook|history-persistence|guide|canaries/);
    }
  });

  it('lists each file once', () => {
    expect(new Set(RETIRED_VITEST_EXCLUDES).size).toBe(RETIRED_VITEST_EXCLUDES.length);
  });
});
