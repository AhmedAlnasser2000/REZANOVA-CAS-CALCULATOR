import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  DETAIL_SECTION_CONTAINER_PROPERTIES,
  DETAIL_SEGMENT_HELPERS,
  DETAIL_SEGMENT_LANES,
} from './detail-segment-migration-registry.mjs';

export const DETAIL_SEGMENT_BASELINE_VERSION = 1;

function slash(value) {
  return value.replaceAll('\\', '/');
}
function stableHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function normalizeSourceText(value) {
  return value.replace(/\s+/gu, ' ').trim();
}

function propertyName(node) {
  if (!node?.name) return undefined;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) {
    return node.name.text;
  }
  return undefined;
}

function calleeName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return undefined;
}

function matches(repoPath, matcher) {
  return matcher.kind === 'exact'
    ? repoPath === matcher.value
    : repoPath.startsWith(matcher.value);
}

function laneForFile(repoPath) {
  return DETAIL_SEGMENT_LANES.find((lane) =>
    lane.matchers.some((matcher) => matches(repoPath, matcher)));
}

function functionContext(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isFunctionDeclaration(current)
      || ts.isMethodDeclaration(current)
      || ts.isFunctionExpression(current)
      || ts.isArrowFunction(current)
    ) {
      if ('name' in current && current.name && ts.isIdentifier(current.name)) {
        return current.name.text;
      }
      if (ts.isVariableDeclaration(current.parent) && ts.isIdentifier(current.parent.name)) {
        return current.parent.name.text;
      }
      return '<anonymous>';
    }
  }
  return '<module>';
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function collectSourceFiles(rootDir) {
  const sourceRoot = path.join(rootDir, 'src');
  if (!fs.existsSync(sourceRoot)) return [];
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (
        /\.(?:ts|tsx)$/u.test(entry.name)
        && !/\.(?:test|spec)\.(?:ts|tsx)$/u.test(entry.name)
        && !entry.name.endsWith('.d.ts')
      ) {
        files.push(absolute);
      }
    }
  };
  visit(sourceRoot);
  return files.sort();
}

function readCompilerOptions(rootDir) {
  const configPath = ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.app.json')
    ?? ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) return {};
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) return {};
  return ts.parseJsonConfigFileContent(loaded.config, ts.sys, rootDir).options;
}

function typeHasDetailContract(type, checker) {
  if (!type) return false;
  if (type.isUnionOrIntersection()) {
    return type.types.some((entry) => typeHasDetailContract(entry, checker));
  }
  const properties = new Set(checker.getPropertiesOfType(type).map((property) => property.name));
  return properties.has('title')
    && properties.has('lines')
    && properties.has('lineKind')
    && properties.has('lineKinds')
    && properties.has('lineParts');
}

function isInsideDetailContainer(node) {
  for (let current = node.parent, depth = 0; current && depth < 6; current = current.parent, depth += 1) {
    if (
      ts.isPropertyAssignment(current)
      && DETAIL_SECTION_CONTAINER_PROPERTIES.has(propertyName(current))
    ) {
      return true;
    }
    if (ts.isFunctionLike(current) || ts.isSourceFile(current)) break;
  }
  return false;
}

function isDetailSectionObject(node, checker) {
  const contextualType = checker.getContextualType(node);
  if (typeHasDetailContract(contextualType, checker)) return true;
  if (isInsideDetailContainer(node)) return true;

  for (let current = node.parent, depth = 0; current && depth < 4; current = current.parent, depth += 1) {
    if (ts.isVariableDeclaration(current) && current.type) {
      if (typeHasDetailContract(checker.getTypeFromTypeNode(current.type), checker)) return true;
    }
    if (ts.isReturnStatement(current)) {
      const fn = current.parent;
      if (ts.isFunctionLike(fn) && fn.type) {
        const returnType = checker.getTypeFromTypeNode(fn.type);
        if (typeHasDetailContract(returnType, checker)) return true;
        const element = checker.getIndexTypeOfType(returnType, ts.IndexKind.Number);
        if (typeHasDetailContract(element, checker)) return true;
      }
    }
  }
  return false;
}

function objectProperties(node) {
  return new Map(node.properties
    .filter((property) => ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))
    .map((property) => [propertyName(property), property]));
}

function objectDeclaration(properties) {
  if (properties.has('lineParts')) return 'typed-parts';
  if (properties.has('lineKinds')) return 'explicit-per-line';
  if (properties.has('lineKind')) return 'explicit-uniform';
  return 'undeclared';
}

function registryDigest() {
  return stableHash(JSON.stringify({
    helpers: [...DETAIL_SEGMENT_HELPERS.entries()],
    lanes: DETAIL_SEGMENT_LANES,
    containers: [...DETAIL_SECTION_CONTAINER_PROPERTIES].sort(),
  }));
}

function candidateFingerprint(candidate) {
  return [
    candidate.file,
    candidate.context,
    candidate.sourceKind,
    stableHash(candidate.sourceText),
  ].join('::');
}

function stableLaneCounts(candidates) {
  const counts = new Map(DETAIL_SEGMENT_LANES.map((lane) => [lane.id, {
    total: 0,
    declared: 0,
    undeclared: 0,
  }]));
  for (const candidate of candidates) {
    const count = counts.get(candidate.lane);
    count.total += 1;
    if (candidate.declaration === 'undeclared') count.undeclared += 1;
    else count.declared += 1;
  }
  return Object.fromEntries([...counts.entries()]);
}

export function scanDetailSegmentRepository({ rootDir = process.cwd() } = {}) {
  const files = collectSourceFiles(rootDir);
  const program = ts.createProgram({
    rootNames: files,
    options: { ...readCompilerOptions(rootDir), noEmit: true },
  });
  const checker = program.getTypeChecker();
  const candidates = [];
  const violations = [];

  for (const absolute of files) {
    const sourceFile = program.getSourceFile(absolute);
    if (!sourceFile) continue;
    const file = slash(path.relative(rootDir, absolute));
    const lane = laneForFile(file);

    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = objectProperties(node);
        if (
          properties.has('title')
          && properties.has('lines')
          && isDetailSectionObject(node, checker)
        ) {
          const declaration = objectDeclaration(properties);
          const candidate = {
            file,
            line: lineOf(sourceFile, node),
            context: functionContext(node),
            sourceKind: 'object',
            declaration,
            lane: lane?.id ?? 'unclassified',
            sourceText: normalizeSourceText(node.getText(sourceFile)),
          };
          candidates.push(candidate);
          if (!lane) {
            violations.push({
              kind: 'unclassified-detail-producer',
              file,
              line: candidate.line,
              message: 'Live detail producer has no registered migration lane.',
            });
          }
        }
      } else if (ts.isCallExpression(node)) {
        const helper = DETAIL_SEGMENT_HELPERS.get(calleeName(node.expression));
        if (helper) {
          const candidate = {
            file,
            line: lineOf(sourceFile, node),
            context: functionContext(node),
            sourceKind: `helper:${calleeName(node.expression)}`,
            declaration: helper,
            lane: lane?.id ?? 'unclassified',
            sourceText: normalizeSourceText(node.getText(sourceFile)),
          };
          candidates.push(candidate);
          if (!lane) {
            violations.push({
              kind: 'unclassified-detail-producer',
              file,
              line: candidate.line,
              message: 'Typed detail helper call has no registered migration lane.',
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const serializableCandidates = candidates
    .map((candidate) => ({
      ...candidate,
      fingerprint: candidateFingerprint(candidate),
    }))
    .sort((left, right) =>
      left.file.localeCompare(right.file)
      || left.line - right.line
      || left.sourceKind.localeCompare(right.sourceKind));
  const undeclared = serializableCandidates.filter((candidate) =>
    candidate.declaration === 'undeclared');

  return {
    version: DETAIL_SEGMENT_BASELINE_VERSION,
    registryDigest: registryDigest(),
    laneCounts: stableLaneCounts(serializableCandidates),
    summary: {
      producerCount: serializableCandidates.length,
      declaredCount: serializableCandidates.length - undeclared.length,
      undeclaredCount: undeclared.length,
      violationCount: violations.length,
    },
    undeclaredAssignments: undeclared,
    violations,
  };
}

export function buildDetailSegmentBaseline(report, reason) {
  if (!reason?.trim()) throw new Error('Detail-segment baseline requires a non-empty reason');
  if (report.violations.length > 0) {
    throw new Error('Cannot baseline unclassified detail producers');
  }
  return {
    version: DETAIL_SEGMENT_BASELINE_VERSION,
    acceptedReason: reason.trim(),
    registryDigest: report.registryDigest,
    laneFloors: Object.fromEntries(Object.entries(report.laneCounts)
      .map(([lane, counts]) => [lane, counts.undeclared])),
    undeclaredFingerprints: report.undeclaredAssignments.map((entry) => entry.fingerprint).sort(),
  };
}

export function assertDetailSegmentBaselineUpdateAllowed(report, existingBaseline) {
  if (report.violations.length > 0) {
    throw new Error('Cannot update the detail-segment baseline with scan violations');
  }
  if (!existingBaseline) return;
  for (const [lane, counts] of Object.entries(report.laneCounts)) {
    const previous = existingBaseline.laneFloors?.[lane];
    if (typeof previous === 'number' && counts.undeclared > previous) {
      throw new Error(
        `Detail-segment baseline cannot increase ${lane} debt from ${previous} to ${counts.undeclared}`,
      );
    }
  }
}

function multisetDifference(left, right) {
  const remaining = new Map();
  for (const value of right) remaining.set(value, (remaining.get(value) ?? 0) + 1);
  const difference = [];
  for (const value of left) {
    const count = remaining.get(value) ?? 0;
    if (count > 0) remaining.set(value, count - 1);
    else difference.push(value);
  }
  return difference;
}

export function validateDetailSegmentReport(report, baseline) {
  const errors = [];
  if (baseline.version !== DETAIL_SEGMENT_BASELINE_VERSION) {
    errors.push(`Unsupported detail-segment baseline version: ${baseline.version}`);
  }
  if (baseline.registryDigest !== report.registryDigest) {
    errors.push('Detail-segment registry changed without an accepted baseline update.');
  }
  errors.push(...report.violations.map((violation) =>
    `${violation.file}:${violation.line} ${violation.message}`));

  for (const [lane, counts] of Object.entries(report.laneCounts)) {
    const floor = baseline.laneFloors?.[lane];
    if (typeof floor !== 'number') {
      errors.push(`Detail-segment baseline is missing lane ${lane}.`);
    } else if (counts.undeclared > floor) {
      errors.push(`${lane} undeclared detail debt grew from ${floor} to ${counts.undeclared}.`);
    }
  }

  const actual = report.undeclaredAssignments.map((entry) => entry.fingerprint).sort();
  const expected = [...(baseline.undeclaredFingerprints ?? [])].sort();
  const added = multisetDifference(actual, expected);
  const removed = multisetDifference(expected, actual);
  if (added.length > 0) {
    errors.push(`New or changed undeclared detail producer(s): ${added.join(', ')}`);
  }
  if (removed.length > 0) {
    errors.push('Undeclared detail debt was removed; accept a lower baseline before merging.');
  }
  return { ok: errors.length === 0, errors };
}

export function formatDetailSegmentReport(report, validation) {
  const lines = [
    `Detail segment producers: ${report.summary.producerCount}`,
    `Declared: ${report.summary.declaredCount}`,
    `Undeclared: ${report.summary.undeclaredCount}`,
  ];
  for (const [lane, counts] of Object.entries(report.laneCounts)) {
    lines.push(`- ${lane}: ${counts.undeclared} undeclared / ${counts.total} total`);
  }
  if (validation && !validation.ok) {
    lines.push('Validation failures:', ...validation.errors.map((error) => `- ${error}`));
  }
  return lines.join('\n');
}
