import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  FALLBACK_REGISTRATIONS,
  INPUT_LATEX_PROPERTY_NAMES,
  MIGRATION_MARKER_NAMES,
  MIGRATION_WRAPPER_NAMES,
  NON_PRODUCER_RESULT_REGISTRATIONS,
  PROSE_PROPERTY_NAMES,
  REFERENCE_CONTENT_MATCHERS,
  RESULT_BUILDER_SPECS,
  RESULT_PROPERTY_NAMES,
} from './printer-migration-registry.mjs';

export const PRINTER_MIGRATION_BASELINE_VERSION = 1;

function slash(value) {
  return value.replaceAll('\\', '/');
}

function matches(repoPath, matcher) {
  return matcher.kind === 'exact'
    ? repoPath === matcher.value
    : repoPath.startsWith(matcher.value);
}

function matchesAny(repoPath, matchers) {
  return matchers.some((matcher) => matches(repoPath, matcher));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function stableObject(entries) {
  return Object.fromEntries([...entries].sort(([left], [right]) => left.localeCompare(right)));
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

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function combineOrigins(origins) {
  if (origins.includes('authored')) return 'authored';
  if (origins.includes('forwarded')) return 'forwarded';
  return 'absent';
}

function expressionOrigin(expression, checker, seen = new Set()) {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    if (current.text === 'undefined') return 'absent';
    const symbol = checker.getSymbolAtLocation(current);
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (!declaration || seen.has(declaration)) return 'forwarded';
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      seen.add(declaration);
      return expressionOrigin(declaration.initializer, checker, seen);
    }
    if (ts.isPropertyAssignment(declaration)) {
      seen.add(declaration);
      return expressionOrigin(declaration.initializer, checker, seen);
    }
    return 'forwarded';
  }
  if (current.kind === ts.SyntaxKind.NullKeyword) return 'absent';
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text === 'latex' ? 'authored' : 'forwarded';
  }
  if (ts.isElementAccessExpression(current)) return 'forwarded';
  if (ts.isConditionalExpression(current)) {
    return combineOrigins([
      expressionOrigin(current.whenTrue, checker, new Set(seen)),
      expressionOrigin(current.whenFalse, checker, new Set(seen)),
    ]);
  }
  if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    return combineOrigins([
      expressionOrigin(current.left, checker, new Set(seen)),
      expressionOrigin(current.right, checker, new Set(seen)),
    ]);
  }
  return 'authored';
}

function resolvedExpressionText(expression, checker, seen = new Set()) {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    const symbol = checker.getSymbolAtLocation(current);
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && !seen.has(declaration)) {
      if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
        seen.add(declaration);
        return `${current.text}=${resolvedExpressionText(declaration.initializer, checker, seen)}`;
      }
      if (ts.isPropertyAssignment(declaration)) {
        seen.add(declaration);
        return `${current.text}=${resolvedExpressionText(declaration.initializer, checker, seen)}`;
      }
    }
  }
  return normalizeSourceText(current.getText(current.getSourceFile()));
}

function hasMigrationMarker(node) {
  if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
    const objectLiteral = ts.isObjectLiteralExpression(node.parent) ? node.parent : undefined;
    if (!objectLiteral) return false;
    return objectLiteral.properties.some((property) => {
      if (ts.isSpreadAssignment(property)) {
        return [...MIGRATION_MARKER_NAMES].some((marker) =>
          new RegExp(`\\b${marker}\\b`, 'u').test(property.getText(property.getSourceFile())));
      }
      const name = propertyName(property);
      return name ? MIGRATION_MARKER_NAMES.has(name) : false;
    });
  }

  for (let current = node.parent, depth = 0; current && depth < 6; current = current.parent, depth += 1) {
    if (ts.isCallExpression(current) && MIGRATION_WRAPPER_NAMES.has(calleeName(current.expression))) {
      return true;
    }
  }
  return false;
}

function registrationMatches(candidate, registration) {
  return registration.properties.includes(candidate.property)
    && matchesAny(candidate.file, registration.matchers);
}

function matchingRegistrations(candidate, registrations) {
  return registrations.filter((registration) => registrationMatches(candidate, registration));
}

function validateRegistry() {
  const ids = new Set();
  for (const registration of [
    ...FALLBACK_REGISTRATIONS,
    ...NON_PRODUCER_RESULT_REGISTRATIONS,
  ]) {
    if (!registration.id || ids.has(registration.id)) {
      throw new Error(`Printer migration registration id must be unique: ${registration.id || '<empty>'}`);
    }
    ids.add(registration.id);
    if (!registration.owner?.trim() || !registration.rationale?.trim()) {
      throw new Error(`Printer migration registration ${registration.id} requires owner and rationale`);
    }
    if (!Array.isArray(registration.properties) || registration.properties.length === 0) {
      throw new Error(`Printer migration registration ${registration.id} requires properties`);
    }
    for (const matcher of registration.matchers ?? []) {
      if (!['exact', 'prefix'].includes(matcher.kind) || !matcher.value || matcher.value === 'src/') {
        throw new Error(`Printer migration registration ${registration.id} has a broad or invalid matcher`);
      }
    }
  }
}

function registryDigest() {
  return stableHash(JSON.stringify({
    fallback: FALLBACK_REGISTRATIONS,
    nonProducer: NON_PRODUCER_RESULT_REGISTRATIONS,
    builders: RESULT_BUILDER_SPECS,
    resultProperties: RESULT_PROPERTY_NAMES,
  }));
}

function collectSourceFiles(rootDir) {
  const sourceRoot = path.join(rootDir, 'src');
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

function classifyNonResult(file, name) {
  if (matchesAny(file, REFERENCE_CONTENT_MATCHERS)) return 'reference-content';
  if (PROSE_PROPERTY_NAMES.has(name)) return 'prose-only';
  if (name === 'canonicalLatex' && file.startsWith('src/lib/display/printer/')) {
    return 'canonical-printer';
  }
  if (name === 'primaryLatex') return 'downstream-presentation';
  if (INPUT_LATEX_PROPERTY_NAMES.has(name) || /(?:input|request|source|raw|original|resolved|editor).*latex/iu.test(name)) {
    return 'input-syntax';
  }
  if (/latex/iu.test(name)) return 'presentation-math';
  return undefined;
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function buildCandidate({ file, node, expression, property, sourceKind, sourceFile, checker }) {
  return {
    file,
    property,
    sourceKind,
    line: lineOf(sourceFile, node),
    context: functionContext(node),
    origin: expressionOrigin(expression, checker),
    expressionText: resolvedExpressionText(expression, checker),
    migrated: hasMigrationMarker(node),
    node,
  };
}

function classifyResultCandidate(candidate, violations) {
  const nonProducer = matchingRegistrations(candidate, NON_PRODUCER_RESULT_REGISTRATIONS);
  const fallback = matchingRegistrations(candidate, FALLBACK_REGISTRATIONS);
  if (nonProducer.length + fallback.length === 0) {
    violations.push({
      kind: 'unclassified-result-serialization',
      file: candidate.file,
      line: candidate.line,
      property: candidate.property,
      message: 'Result serialization has no narrow producer or non-producer registration.',
    });
    return { ...candidate, classification: 'unclassified' };
  }
  if (nonProducer.length + fallback.length > 1) {
    violations.push({
      kind: 'ambiguous-result-registration',
      file: candidate.file,
      line: candidate.line,
      property: candidate.property,
      message: `Result serialization matches multiple registrations: ${[
        ...nonProducer,
        ...fallback,
      ].map((entry) => entry.id).join(', ')}`,
    });
    return { ...candidate, classification: 'ambiguous' };
  }
  if (nonProducer.length === 1) {
    return {
      ...candidate,
      classification: nonProducer[0].category,
      registrationId: nonProducer[0].id,
    };
  }

  const registration = fallback[0];
  if (candidate.migrated) {
    return {
      ...candidate,
      classification: 'migrated-dual-write',
      lane: registration.lane,
      registrationId: registration.id,
    };
  }
  if (candidate.origin === 'forwarded' || candidate.origin === 'absent') {
    return {
      ...candidate,
      classification: candidate.origin === 'absent' ? 'absent-result-slot' : 'result-forwarder',
      lane: registration.lane,
      registrationId: registration.id,
    };
  }
  return {
    ...candidate,
    classification: 'compatibility-fallback',
    lane: registration.lane,
    registrationId: registration.id,
  };
}

export function scanPrinterMigrationRepository({ rootDir = process.cwd() } = {}) {
  validateRegistry();
  const files = collectSourceFiles(rootDir);
  const program = ts.createProgram({
    rootNames: files,
    options: { ...readCompilerOptions(rootDir), noEmit: true },
  });
  const checker = program.getTypeChecker();
  const categoryCounts = new Map();
  const resultCandidates = [];

  for (const absolute of files) {
    const sourceFile = program.getSourceFile(absolute);
    if (!sourceFile) continue;
    const file = slash(path.relative(rootDir, absolute));
    const referenceContent = matchesAny(file, REFERENCE_CONTENT_MATCHERS);

    const visit = (node) => {
      if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
        const name = propertyName(node);
        if (name) {
          if (referenceContent && (RESULT_PROPERTY_NAMES.includes(name) || /latex/iu.test(name))) {
            categoryCounts.set('reference-content', (categoryCounts.get('reference-content') ?? 0) + 1);
          } else if (RESULT_PROPERTY_NAMES.includes(name)) {
            const expression = ts.isPropertyAssignment(node) ? node.initializer : node.name;
            resultCandidates.push(buildCandidate({
              file,
              node,
              expression,
              property: name,
              sourceKind: 'property',
              sourceFile,
              checker,
            }));
            categoryCounts.set('result-path', (categoryCounts.get('result-path') ?? 0) + 1);
          } else {
            const category = classifyNonResult(file, name);
            if (category) categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
          }
        }
      }

      if (ts.isCallExpression(node)) {
        const name = calleeName(node.expression);
        const specs = RESULT_BUILDER_SPECS.filter((spec) =>
          spec.callee === name && matchesAny(file, spec.matchers));
        for (const spec of specs) {
          const expression = node.arguments[spec.argumentIndex];
          if (!expression) continue;
          resultCandidates.push(buildCandidate({
            file,
            node,
            expression,
            property: 'exactLatex',
            sourceKind: `builder:${spec.id}`,
            sourceFile,
            checker,
          }));
          categoryCounts.set('result-path', (categoryCounts.get('result-path') ?? 0) + 1);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const violations = [];
  const classified = resultCandidates
    .sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line)
    .map((candidate) => classifyResultCandidate(candidate, violations));
  const occurrences = new Map();
  const compatibilityAssignments = classified
    .filter((candidate) => candidate.classification === 'compatibility-fallback')
    .map((candidate) => {
      const fingerprint = stableHash(JSON.stringify({
        file: candidate.file,
        property: candidate.property,
        sourceKind: candidate.sourceKind,
        context: candidate.context,
        expressionText: candidate.expressionText,
        registrationId: candidate.registrationId,
      }));
      const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
      occurrences.set(fingerprint, occurrence);
      return {
        id: `${fingerprint}:${occurrence}`,
        file: candidate.file,
        line: candidate.line,
        property: candidate.property,
        sourceKind: candidate.sourceKind,
        lane: candidate.lane,
        fallbackId: candidate.registrationId,
      };
    });

  const laneStats = new Map();
  const registrationStats = new Map();
  for (const candidate of classified) {
    if (!candidate.lane) continue;
    const lane = laneStats.get(candidate.lane) ?? {
      compatibility: 0,
      migrated: 0,
      forwarded: 0,
      absent: 0,
    };
    if (candidate.classification === 'compatibility-fallback') lane.compatibility += 1;
    else if (candidate.classification === 'migrated-dual-write') lane.migrated += 1;
    else if (candidate.classification === 'result-forwarder') lane.forwarded += 1;
    else if (candidate.classification === 'absent-result-slot') lane.absent += 1;
    laneStats.set(candidate.lane, lane);

    if (candidate.classification === 'compatibility-fallback') {
      registrationStats.set(
        candidate.registrationId,
        (registrationStats.get(candidate.registrationId) ?? 0) + 1,
      );
    }
  }

  const classificationCounts = new Map();
  for (const candidate of classified) {
    classificationCounts.set(
      candidate.classification,
      (classificationCounts.get(candidate.classification) ?? 0) + 1,
    );
  }

  return {
    version: 1,
    registryDigest: registryDigest(),
    summary: {
      sourceFileCount: files.length,
      resultPathCount: classified.length,
      compatibilityFallbackCount: compatibilityAssignments.length,
      migratedDualWriteCount: classificationCounts.get('migrated-dual-write') ?? 0,
      forwardedResultCount: classificationCounts.get('result-forwarder') ?? 0,
      nonProducerResultCount: classificationCounts.get('persistence-schema') ?? 0,
      violationCount: violations.length,
    },
    categoryCounts: stableObject(categoryCounts),
    classificationCounts: stableObject(classificationCounts),
    lanes: stableObject(laneStats),
    registrationCounts: stableObject(registrationStats),
    compatibilityAssignments,
    violations,
  };
}

function baselineAssignment(entry) {
  return {
    id: entry.id,
    file: entry.file,
    property: entry.property,
    sourceKind: entry.sourceKind,
    lane: entry.lane,
    fallbackId: entry.fallbackId,
  };
}

export function buildPrinterMigrationBaseline(report, acceptedReason) {
  if (!acceptedReason?.trim()) {
    throw new Error('Printer migration baseline updates require a non-empty reason');
  }
  if (report.violations.length > 0) {
    throw new Error(`Cannot baseline ${report.violations.length} unclassified or ambiguous result path(s)`);
  }
  return {
    schemaVersion: PRINTER_MIGRATION_BASELINE_VERSION,
    acceptedReason: acceptedReason.trim(),
    registryDigest: report.registryDigest,
    resultProperties: [...RESULT_PROPERTY_NAMES],
    laneFloors: stableObject(
      Object.entries(report.lanes).map(([lane, counts]) => [lane, counts.compatibility]),
    ),
    registrationFloors: stableObject(Object.entries(report.registrationCounts)),
    categoryCounts: report.categoryCounts,
    compatibilityAssignments: report.compatibilityAssignments.map(baselineAssignment),
  };
}

function validateBaselineShape(baseline) {
  if (baseline?.schemaVersion !== PRINTER_MIGRATION_BASELINE_VERSION) {
    throw new Error(`Unsupported printer migration baseline schema: ${baseline?.schemaVersion}`);
  }
  if (!baseline.acceptedReason?.trim()) {
    throw new Error('Printer migration baseline requires an accepted reason');
  }
  if (!Array.isArray(baseline.compatibilityAssignments)) {
    throw new Error('Printer migration baseline requires compatibility assignments');
  }
}

export function validatePrinterMigrationReport(report, baseline) {
  validateBaselineShape(baseline);
  const errors = report.violations.map((violation) =>
    `${violation.kind}: ${violation.file}:${violation.line} ${violation.property}`);
  if (baseline.registryDigest !== report.registryDigest) {
    errors.push('Printer migration registry changed without an accepted baseline update.');
  }

  const expected = new Set(baseline.compatibilityAssignments.map((entry) => entry.id));
  const current = new Set(report.compatibilityAssignments.map((entry) => entry.id));
  const added = [...current].filter((id) => !expected.has(id)).sort();
  const stale = [...expected].filter((id) => !current.has(id)).sort();
  if (added.length > 0) {
    errors.push(`New or changed compatibility result serialization: ${added.join(', ')}`);
  }
  if (stale.length > 0) {
    errors.push(`Compatibility floor can be lowered; accept a baseline update for: ${stale.join(', ')}`);
  }

  for (const [lane, counts] of Object.entries(report.lanes)) {
    const floor = baseline.laneFloors?.[lane] ?? 0;
    if (counts.compatibility > floor) {
      errors.push(`Lane ${lane} compatibility count ${counts.compatibility} exceeds floor ${floor}.`);
    }
  }
  for (const [registrationId, count] of Object.entries(report.registrationCounts)) {
    const floor = baseline.registrationFloors?.[registrationId] ?? 0;
    if (count > floor) {
      errors.push(`Fallback ${registrationId} count ${count} exceeds floor ${floor}.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    addedAssignmentIds: added,
    staleAssignmentIds: stale,
  };
}

export function assertPrinterMigrationBaselineUpdateAllowed(report, previousBaseline) {
  if (report.violations.length > 0) {
    throw new Error(`Cannot update with ${report.violations.length} unclassified or ambiguous result path(s)`);
  }
  if (!previousBaseline) return;
  validateBaselineShape(previousBaseline);
  for (const [lane, counts] of Object.entries(report.lanes)) {
    const floor = previousBaseline.laneFloors?.[lane] ?? 0;
    if (counts.compatibility > floor) {
      throw new Error(`Printer migration lane ${lane} cannot rise from ${floor} to ${counts.compatibility}`);
    }
  }
  for (const [registrationId, count] of Object.entries(report.registrationCounts)) {
    const floor = previousBaseline.registrationFloors?.[registrationId] ?? 0;
    if (count > floor) {
      throw new Error(`Printer fallback ${registrationId} cannot rise from ${floor} to ${count}`);
    }
  }
}

export function formatPrinterMigrationReport(report, validation) {
  const lines = [
    `Printer migration ratchet v${report.version}`,
    `Source files: ${report.summary.sourceFileCount}`,
    `Result paths: ${report.summary.resultPathCount}`,
    `Compatibility fallbacks: ${report.summary.compatibilityFallbackCount}`,
    `Migrated dual writes: ${report.summary.migratedDualWriteCount}`,
    `Forwarders: ${report.summary.forwardedResultCount}`,
    '',
    'Compatibility floors by lane:',
  ];
  for (const [lane, counts] of Object.entries(report.lanes)) {
    lines.push(
      `  ${lane}: ${counts.compatibility} compatibility, ${counts.migrated} migrated, ${counts.forwarded} forwarded`,
    );
  }
  lines.push('', 'Fallback registrations:');
  for (const registration of FALLBACK_REGISTRATIONS) {
    lines.push(
      `  ${registration.id}: ${report.registrationCounts[registration.id] ?? 0} | ${registration.owner} | ${registration.rationale}`,
    );
  }
  lines.push('', 'Separate classifications:');
  for (const [category, count] of Object.entries(report.categoryCounts)) {
    lines.push(`  ${category}: ${count}`);
  }
  if (validation) {
    lines.push('', `Baseline: ${validation.ok ? 'pass' : 'fail'}`);
    for (const error of validation.errors) lines.push(`  ${error}`);
  }
  return lines.join('\n');
}
