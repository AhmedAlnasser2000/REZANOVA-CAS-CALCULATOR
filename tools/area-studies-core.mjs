import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REQUIRED_TEMPLATE_HEADINGS = {
  'templates/lite-synthesis.md': [
    '## Problem',
    '## Evidence',
    '## Decision',
    '## Risk',
  ],
  'templates/standard-synthesis.md': [
    '## Scope',
    '## Source Notes',
    '## Comparison',
    '## Calcwiz Fit',
    '## Proposal',
    '## Risks',
  ],
  'templates/missing-capability-gate.md': [
    '## Capability',
    '## Classification',
    '## Evidence',
    '## Stop Reason',
    '## Next Step',
  ],
  'templates/full-synthesis/00-scope.md': [
    '## Capability Area',
    '## Goal',
    '## In Scope',
    '## Out Of Scope',
    '## Prerequisite Check',
  ],
  'templates/full-synthesis/01-source-note.md': [
    '## Source',
    '## Relevant Capability',
    '## Enabling Pattern',
    '## Cost',
    '## Calcwiz Translation Hint',
  ],
  'templates/full-synthesis/02-cross-source-comparison.md': [
    '## Compared Sources',
    '## Shared Patterns',
    '## Divergences',
    '## Calcwiz Relevance',
    '## Non-Adoption Notes',
  ],
  'templates/full-synthesis/03-pattern-extraction.md': [
    '## Pattern',
    '## Why It Matters',
    '## Smallest Bounded Translation',
    '## Required Prerequisites',
    '## Risks',
  ],
  'templates/full-synthesis/04-calcwiz-fit-evaluation.md': [
    '## Fit',
    '## Owner Layer',
    '## Bounded Version',
    '## Stop Reasons',
    '## User Value',
  ],
  'templates/full-synthesis/05-synthesis.md': [
    '## Findings',
    '## What To Carry Forward',
    '## What Not To Inherit',
    '## Capability Boundary',
    '## Decision',
  ],
  'templates/full-synthesis/06-calcwiz-native-proposal.md': [
    '## Proposal',
    '## Stable Owner',
    '## Playground Path',
    '## Acceptance Criteria',
    '## Non-Goals',
  ],
  'templates/full-synthesis/07-benchmark-families.md': [
    '## Family',
    '## Source',
    '## Intended Use',
    '## Boundary Notes',
    '## Adoption Status',
  ],
  'templates/full-synthesis/08-risks.md': [
    '## Correctness Risk',
    '## Honesty Risk',
    '## Architecture Risk',
    '## Licensing Risk',
    '## Mitigation',
  ],
};

const REQUIRED_STUDY_FILES = {
  'README.md': [
    '## Purpose',
    '## Decision',
    '## Boundaries',
  ],
  '00-scope.md': [
    '## Capability Area',
    '## Goal',
    '## In Scope',
    '## Out Of Scope',
    '## Prerequisite Check',
  ],
  '01-source-notes.md': [
    '## Source',
    '## Relevant Capability',
    '## Enabling Pattern',
    '## Cost',
    '## Calcwiz Translation Hint',
  ],
  '02-cross-source-comparison.md': [
    '## Compared Sources',
    '## Shared Patterns',
    '## Divergences',
    '## Calcwiz Relevance',
    '## Non-Adoption Notes',
  ],
  '03-pattern-extraction.md': [
    '## Pattern',
    '## Why It Matters',
    '## Smallest Bounded Translation',
    '## Required Prerequisites',
    '## Risks',
  ],
  '04-calcwiz-fit-evaluation.md': [
    '## Fit',
    '## Owner Layer',
    '## Bounded Version',
    '## Stop Reasons',
    '## User Value',
  ],
  '05-synthesis.md': [
    '## Findings',
    '## What To Carry Forward',
    '## What Not To Inherit',
    '## Capability Boundary',
    '## Decision',
  ],
  '06-calcwiz-native-proposal.md': [
    '## Proposal',
    '## Stable Owner',
    '## Playground Path',
    '## Acceptance Criteria',
    '## Non-Goals',
  ],
  '07-benchmark-families.md': [
    '## Family',
    '## Source',
    '## Intended Use',
    '## Boundary Notes',
    '## Adoption Status',
  ],
  '08-risks.md': [
    '## Correctness Risk',
    '## Honesty Risk',
    '## Architecture Risk',
    '## Licensing Risk',
    '## Mitigation',
  ],
};

const REQUIRED_STUDIES = new Set([
  'area-poly-rat0',
  'area-poly-rat1',
  'area-simplify0',
  'area-assumptions0',
  'area-poly-elim0',
  'area-exact-linear-algebra0',
  'area-multivar0',
]);
const ALLOWED_ROOT_ENTRIES = new Set(['README.md', 'INDEX.md', 'templates', 'studies']);
const ALLOWED_TEMPLATE_ENTRIES = new Set([
  'lite-synthesis.md',
  'standard-synthesis.md',
  'missing-capability-gate.md',
  'full-synthesis',
]);

function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function assertFileExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing area-study file: ${normalizeRepoPath(relativePath)}`);
  }
  return fullPath;
}

function assertAllowedEntries(rootDir, relativePath, allowedEntries) {
  const fullPath = path.join(rootDir, relativePath);
  const unexpected = readdirSync(fullPath)
    .filter((entry) => !allowedEntries.has(entry))
    .sort();

  if (unexpected.length > 0) {
    throw new Error(
      `${normalizeRepoPath(relativePath)} has unsupported entries: ${unexpected.join(', ')}`,
    );
  }
}

function assertDirectoryExists(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing area-study directory: ${normalizeRepoPath(relativePath)}`);
  }
  return fullPath;
}

function assertHeadings(rootDir, relativePath, headings) {
  const text = readFileSync(assertFileExists(rootDir, relativePath), 'utf8');
  for (const heading of headings) {
    if (!text.includes(heading)) {
      throw new Error(`${normalizeRepoPath(relativePath)} is missing heading "${heading}"`);
    }
  }
}

function validateCommittedStudies(rootDir, areaStudiesDir) {
  const studiesDir = path.join(areaStudiesDir, 'studies');
  const fullStudiesDir = assertDirectoryExists(rootDir, studiesDir);
  const studyIds = readdirSync(fullStudiesDir).sort();
  const unsupported = studyIds.filter((studyId) => !REQUIRED_STUDIES.has(studyId));
  if (unsupported.length > 0) {
    throw new Error(`${studiesDir} has unsupported studies: ${unsupported.join(', ')}`);
  }

  for (const studyId of REQUIRED_STUDIES) {
    const studyDir = path.join(studiesDir, studyId);
    assertDirectoryExists(rootDir, studyDir);
    const allowedEntries = new Set(Object.keys(REQUIRED_STUDY_FILES));
    assertAllowedEntries(rootDir, studyDir, allowedEntries);
    for (const [relativePath, headings] of Object.entries(REQUIRED_STUDY_FILES)) {
      assertHeadings(rootDir, path.join(studyDir, relativePath), headings);
    }
  }

  return REQUIRED_STUDIES.size * Object.keys(REQUIRED_STUDY_FILES).length;
}

export function validateAreaStudies(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const areaStudiesDir = options.areaStudiesDir ?? 'playground/area-studies';
  const fullAreaStudiesDir = path.join(rootDir, areaStudiesDir);

  if (!existsSync(fullAreaStudiesDir)) {
    throw new Error(`Missing area studies directory: ${areaStudiesDir}`);
  }

  assertAllowedEntries(rootDir, areaStudiesDir, ALLOWED_ROOT_ENTRIES);
  assertAllowedEntries(rootDir, path.join(areaStudiesDir, 'templates'), ALLOWED_TEMPLATE_ENTRIES);

  for (const [relativePath, headings] of Object.entries(REQUIRED_TEMPLATE_HEADINGS)) {
    assertHeadings(rootDir, path.join(areaStudiesDir, relativePath), headings);
  }

  const indexText = readFileSync(path.join(fullAreaStudiesDir, 'INDEX.md'), 'utf8');
  for (const requiredText of [
    'AREA-POLY-RAT0',
    'area-poly-rat0',
    'bounded INT-RAT1',
    'AREA-POLY-RAT1',
    'area-poly-rat1',
    'POLY-RAT-CORE1',
    'AREA-SIMPLIFY0',
    'area-simplify0',
    'SIMPLIFY-CORE0',
    'AREA-ASSUMPTIONS0',
    'area-assumptions0',
    'ASSUMPTIONS-CORE0',
    'AREA-POLY-ELIM0',
    'area-poly-elim0',
    'AREA-EXACT-LINEAR-ALGEBRA0',
    'area-exact-linear-algebra0',
    'EXACT-LINEAR-ALGEBRA1',
    'AREA-MULTIVAR0',
    'area-multivar0',
    'VARIABLE-CORE1',
  ]) {
    if (!indexText.includes(requiredText)) {
      throw new Error(`${areaStudiesDir}/INDEX.md is missing "${requiredText}"`);
    }
  }

  return Object.keys(REQUIRED_TEMPLATE_HEADINGS).length
    + validateCommittedStudies(rootDir, areaStudiesDir);
}
