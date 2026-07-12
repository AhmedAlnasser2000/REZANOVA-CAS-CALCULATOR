import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  CANONICAL_PROJECTION_REGISTRATIONS,
  CONTROL_OUTCOME_REGISTRATIONS,
  CONTROL_ONLY_ERROR_PROPERTIES,
  DISPLAY_CONTRACT_LANES,
  DISPLAY_OUTCOME_CANONICAL_PROPERTIES,
  DISPLAY_OUTCOME_CONTROL_PROPERTIES,
  DISPLAY_OUTCOME_LEGACY_PROPERTIES,
  DISPLAY_OUTCOME_TRANSIENT_PROPERTIES,
  NATIVE_DOCUMENT_CALL_NAMES,
  NATIVE_DOCUMENT_WRAPPER_CALL_NAMES,
  PRODUCER_INPUT_REGISTRATIONS,
  REFERENCE_OUTCOME_MATCHERS,
} from './display-contract-inversion-registry.mjs';

export const DISPLAY_CONTRACT_INVERSION_BASELINE_VERSION = 1;

const TRACKED_CATEGORIES = [
  'native-document',
  'canonical-projection',
  'compatibility-projection',
  'forwarder',
  'control-outcome',
  'canonical-read',
  'legacy-read',
  'control-read',
  'transient-read',
];

const DEBT_CATEGORIES = new Set(['compatibility-projection', 'legacy-read']);

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

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
    || ts.isAwaitExpression(current)
  ) {
    current = current.expression;
  }
  return current;
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

function objectProperty(node, name) {
  return node.properties.find((property) =>
    !ts.isSpreadAssignment(property) && propertyName(property) === name);
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
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
      if (ts.isPropertyAssignment(current.parent)) {
        return propertyName(current.parent) ?? '<anonymous>';
      }
      return '<anonymous>';
    }
  }
  return '<module>';
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

function findDisplayOutcomeType(program, checker) {
  const sourceFile = program.getSourceFiles().find((source) =>
    slash(source.fileName).endsWith('/src/types/calculator/display-types.ts'));
  const declaration = sourceFile?.statements.find((statement) =>
    ts.isTypeAliasDeclaration(statement) && statement.name.text === 'DisplayOutcome');
  if (!declaration || !ts.isTypeAliasDeclaration(declaration)) {
    throw new Error('DisplayOutcome type alias was not found in src/types/calculator/display-types.ts');
  }
  return checker.getTypeFromTypeNode(declaration.type);
}

function typeIncludesDisplayOutcome(type, displayType, checker) {
  if (!type || (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never))) {
    return false;
  }
  const nonNullable = checker.getNonNullableType(type);
  if (nonNullable.flags & ts.TypeFlags.Never) return false;
  if (!['kind', 'title', 'warnings'].every((property) => checker.getPropertyOfType(nonNullable, property))) {
    return false;
  }
  if (nonNullable.isUnion()) {
    return nonNullable.types.some((entry) => typeIncludesDisplayOutcome(entry, displayType, checker));
  }
  return checker.isTypeAssignableTo(nonNullable, displayType);
}

function displayOutcomeAssignableTo(type, displayType, checker) {
  if (!type || (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never))) {
    return false;
  }
  return checker.isTypeAssignableTo(displayType, type)
    || (type.isUnion() && type.types.some((entry) => displayOutcomeAssignableTo(entry, displayType, checker)));
}

function enclosingFunction(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      ts.isFunctionDeclaration(current)
      || ts.isMethodDeclaration(current)
      || ts.isFunctionExpression(current)
      || ts.isArrowFunction(current)
    ) return current;
  }
  return undefined;
}

function hasDisplayOutcomeContext(node, displayType, checker) {
  const contextual = checker.getContextualType(node);
  if (displayOutcomeAssignableTo(contextual, displayType, checker)) return true;

  const parent = node.parent;
  if (ts.isCallExpression(parent)) {
    const argumentIndex = parent.arguments.indexOf(node);
    const signature = checker.getResolvedSignature(parent);
    const parameter = signature?.parameters[Math.min(argumentIndex, signature.parameters.length - 1)];
    if (parameter) {
      const parameterType = checker.getTypeOfSymbolAtLocation(parameter, node);
      if (displayOutcomeAssignableTo(parameterType, displayType, checker)) return true;
    }
  }

  const owner = enclosingFunction(node);
  const signature = owner ? checker.getSignatureFromDeclaration(owner) : undefined;
  const returnType = signature ? checker.getReturnTypeOfSignature(signature) : undefined;
  return typeIncludesDisplayOutcome(returnType, displayType, checker);
}

function resolveObjectLiteral(expression, checker, seen = new Set()) {
  const current = unwrapExpression(expression);
  if (ts.isObjectLiteralExpression(current)) return current;
  if (!ts.isIdentifier(current)) return undefined;
  const symbol = checker.getSymbolAtLocation(current);
  const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  if (!declaration || seen.has(declaration)) return undefined;
  seen.add(declaration);
  if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
    return resolveObjectLiteral(declaration.initializer, checker, seen);
  }
  if (ts.isPropertyAssignment(declaration)) {
    return resolveObjectLiteral(declaration.initializer, checker, seen);
  }
  return undefined;
}

function objectCarriesCanonicalResult(node, checker, seen = new Set()) {
  if (seen.has(node)) return false;
  seen.add(node);
  if (objectProperty(node, 'canonicalResult')) return true;
  return node.properties.some((property) => {
    if (!ts.isSpreadAssignment(property)) return false;
    const spread = resolveObjectLiteral(property.expression, checker, new Set(seen));
    return spread ? objectCarriesCanonicalResult(spread, checker, new Set(seen)) : false;
  });
}

function literalOutcomeKind(node, checker) {
  const property = objectProperty(node, 'kind');
  if (property && ts.isPropertyAssignment(property)) {
    const value = unwrapExpression(property.initializer);
    if (ts.isStringLiteral(value) && ['success', 'error', 'prompt'].includes(value.text)) {
      return value.text;
    }
  }
  const type = checker.getTypeAtLocation(node);
  const symbol = type.getProperty('kind');
  if (!symbol) return undefined;
  const kindType = checker.getTypeOfSymbolAtLocation(symbol, node);
  const candidates = (kindType.isUnion() ? kindType.types : [kindType])
    .filter((entry) => entry.isStringLiteral())
    .map((entry) => entry.value)
    .filter((value) => ['success', 'error', 'prompt'].includes(value));
  return new Set(candidates).size === 1 ? candidates[0] : undefined;
}

function isControlOnlyError(node) {
  if (node.properties.some(ts.isSpreadAssignment)) return false;
  return node.properties.every((property) => {
    const name = propertyName(property);
    return name ? CONTROL_ONLY_ERROR_PROPERTIES.has(name) : false;
  });
}

function canonicalProjectionRegistration(file, context) {
  return CANONICAL_PROJECTION_REGISTRATIONS.find((registration) =>
    matchesAny(file, registration.matchers) && registration.functions.includes(context));
}

function controlOutcomeRegistration(file, context) {
  return CONTROL_OUTCOME_REGISTRATIONS.find((registration) =>
    matchesAny(file, registration.matchers) && registration.functions.includes(context));
}

function nativeDocumentWrapperName(node) {
  const parent = node.parent;
  if (!ts.isCallExpression(parent) || !parent.arguments.includes(node)) return undefined;
  const name = calleeName(parent.expression);
  return NATIVE_DOCUMENT_WRAPPER_CALL_NAMES.has(name) ? name : undefined;
}

function isProducerInputAssembly(file, context) {
  return PRODUCER_INPUT_REGISTRATIONS.some((registration) =>
    matchesAny(file, registration.matchers) && registration.functions.includes(context));
}

function laneFor(file) {
  return DISPLAY_CONTRACT_LANES.find((lane) => matchesAny(file, lane.matchers))?.id;
}

function classifyProducer(node, file, checker) {
  const context = functionContext(node);
  const kind = literalOutcomeKind(node, checker);
  const projection = canonicalProjectionRegistration(file, context);
  if (projection) {
    return { category: 'canonical-projection', detail: projection.id, context };
  }
  const controlRegistration = controlOutcomeRegistration(file, context);
  if (controlRegistration) {
    return { category: 'control-outcome', detail: controlRegistration.id, context };
  }
  if (kind === 'prompt' || (kind === 'error' && isControlOnlyError(node))) {
    return { category: 'control-outcome', detail: kind ?? 'control', context };
  }
  const wrapperName = nativeDocumentWrapperName(node);
  if (wrapperName) {
    return { category: 'native-document', detail: `wrapper:${wrapperName}`, context };
  }
  if (objectCarriesCanonicalResult(node, checker)) {
    return { category: 'native-document', detail: kind ?? 'result', context };
  }
  return { category: 'compatibility-projection', detail: kind ?? 'result', context };
}

function consumerCategory(property) {
  if (DISPLAY_OUTCOME_CANONICAL_PROPERTIES.has(property)) return 'canonical-read';
  if (DISPLAY_OUTCOME_LEGACY_PROPERTIES.has(property)) return 'legacy-read';
  if (DISPLAY_OUTCOME_CONTROL_PROPERTIES.has(property)) return 'control-read';
  if (DISPLAY_OUTCOME_TRANSIENT_PROPERTIES.has(property)) return 'transient-read';
  return undefined;
}

function allDisplayOutcomeProperties(displayType, checker) {
  const members = displayType.isUnion() ? displayType.types : [displayType];
  return new Set(members.flatMap((member) => checker.getPropertiesOfType(member).map((entry) => entry.name)));
}

function validateRegistry(displayType, checker) {
  const ids = new Set();
  for (const lane of DISPLAY_CONTRACT_LANES) {
    if (!lane.id || ids.has(lane.id)) throw new Error(`Display contract lane id must be unique: ${lane.id || '<empty>'}`);
    ids.add(lane.id);
    for (const matcher of lane.matchers ?? []) {
      if (!['exact', 'prefix'].includes(matcher.kind) || !matcher.value || matcher.value === 'src/') {
        throw new Error(`Display contract lane ${lane.id} has a broad or invalid matcher`);
      }
    }
  }
  for (const registration of CANONICAL_PROJECTION_REGISTRATIONS) {
    if (!registration.id || ids.has(registration.id)) {
      throw new Error(`Display contract registration id must be unique: ${registration.id || '<empty>'}`);
    }
    ids.add(registration.id);
    if (!registration.owner?.trim() || !registration.rationale?.trim()) {
      throw new Error(`Display contract registration ${registration.id} requires owner and rationale`);
    }
  }

  const classified = new Set([
    ...DISPLAY_OUTCOME_CANONICAL_PROPERTIES,
    ...DISPLAY_OUTCOME_CONTROL_PROPERTIES,
    ...DISPLAY_OUTCOME_LEGACY_PROPERTIES,
    ...DISPLAY_OUTCOME_TRANSIENT_PROPERTIES,
  ]);
  const actual = allDisplayOutcomeProperties(displayType, checker);
  const missing = [...actual].filter((property) => !classified.has(property)).sort();
  const stale = [...classified].filter((property) => !actual.has(property)).sort();
  if (missing.length > 0 || stale.length > 0) {
    throw new Error(`DisplayOutcome property registry mismatch; missing: ${missing.join(', ') || 'none'}; stale: ${stale.join(', ') || 'none'}`);
  }
}

function registryDigest() {
  return stableHash(JSON.stringify({
    lanes: DISPLAY_CONTRACT_LANES,
    canonicalProjections: CANONICAL_PROJECTION_REGISTRATIONS,
    controlOutcomeRegistrations: CONTROL_OUTCOME_REGISTRATIONS,
    canonicalProperties: [...DISPLAY_OUTCOME_CANONICAL_PROPERTIES].sort(),
    controlProperties: [...DISPLAY_OUTCOME_CONTROL_PROPERTIES].sort(),
    legacyProperties: [...DISPLAY_OUTCOME_LEGACY_PROPERTIES].sort(),
    transientProperties: [...DISPLAY_OUTCOME_TRANSIENT_PROPERTIES].sort(),
    controlOnlyErrorProperties: [...CONTROL_ONLY_ERROR_PROPERTIES].sort(),
    referenceOutcomeMatchers: REFERENCE_OUTCOME_MATCHERS,
    nativeDocumentCallNames: [...NATIVE_DOCUMENT_CALL_NAMES].sort(),
    nativeDocumentWrapperCallNames: [...NATIVE_DOCUMENT_WRAPPER_CALL_NAMES].sort(),
    producerInputRegistrations: PRODUCER_INPUT_REGISTRATIONS,
    trackedCategories: TRACKED_CATEGORIES,
  }));
}

function candidate({ category, detail, file, lane, line, context, sourceKind, sourceText }) {
  return {
    category,
    detail,
    file,
    lane,
    line,
    context,
    sourceKind,
    sourceText: normalizeSourceText(sourceText),
  };
}

function unwrapToObject(expression) {
  const current = unwrapExpression(expression);
  return ts.isObjectLiteralExpression(current) ? current : undefined;
}

function expressionContainsObjectLiteral(expression) {
  let found = false;
  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(expression);
  return found;
}

export function scanDisplayContractInversionRepository({ rootDir = process.cwd() } = {}) {
  const files = collectSourceFiles(rootDir);
  const program = ts.createProgram({
    rootNames: files,
    options: { ...readCompilerOptions(rootDir), noEmit: true },
  });
  const checker = program.getTypeChecker();
  const displayType = findDisplayOutcomeType(program, checker);
  validateRegistry(displayType, checker);

  const candidates = [];
  const violations = [];
  const forwarderNodes = new Set();

  const add = (entry, node, sourceFile) => {
    const lane = laneFor(entry.file);
    if (!lane) {
      violations.push({
        kind: 'unclassified-display-contract-path',
        file: entry.file,
        line: lineOf(sourceFile, node),
        message: 'DisplayOutcome producer or consumer is outside every declared lane.',
      });
      return;
    }
    candidates.push(candidate({
      ...entry,
      lane,
      line: lineOf(sourceFile, node),
    }));
  };

  for (const absolute of files) {
    const sourceFile = program.getSourceFile(absolute);
    if (!sourceFile) continue;
    const file = slash(path.relative(rootDir, absolute));

    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node) && !matchesAny(file, REFERENCE_OUTCOME_MATCHERS)) {
        const type = checker.getTypeAtLocation(node);
        const kind = literalOutcomeKind(node, checker);
        const isOutcome = typeIncludesDisplayOutcome(type, displayType, checker)
          || (kind && hasDisplayOutcomeContext(node, displayType, checker));
        if (isOutcome) {
          const classification = classifyProducer(node, file, checker);
          add({
            ...classification,
            file,
            sourceKind: 'object-literal',
            sourceText: node.getText(sourceFile),
          }, node, sourceFile);
        }
      }

      if (
        ts.isCallExpression(node)
        && (
          NATIVE_DOCUMENT_CALL_NAMES.has(calleeName(node.expression))
          || (
            NATIVE_DOCUMENT_WRAPPER_CALL_NAMES.has(calleeName(node.expression))
            && !unwrapToObject(node.arguments[0])
          )
        )
      ) {
        const type = checker.getTypeAtLocation(node);
        if (typeIncludesDisplayOutcome(type, displayType, checker)) {
          add({
            category: 'native-document',
            detail: `call:${calleeName(node.expression)}`,
            file,
            context: functionContext(node),
            sourceKind: 'canonical-adapter-call',
            sourceText: node.getText(sourceFile),
          }, node, sourceFile);
        }
      }

      if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
        const receiver = node.expression;
        const receiverType = checker.getTypeAtLocation(receiver);
        if (
          typeIncludesDisplayOutcome(receiverType, displayType, checker)
          && !isProducerInputAssembly(file, functionContext(node))
        ) {
          const property = ts.isPropertyAccessExpression(node)
            ? node.name.text
            : ts.isStringLiteral(node.argumentExpression)
              ? node.argumentExpression.text
              : undefined;
          if (!property && ts.isElementAccessExpression(node)) {
            violations.push({
              kind: 'dynamic-display-outcome-read',
              file,
              line: lineOf(sourceFile, node),
              message: 'Dynamic DisplayOutcome property reads cannot be classified safely.',
            });
          } else if (property) {
            const category = consumerCategory(property);
            if (category) {
              add({
                category,
                detail: property,
                file,
                context: functionContext(node),
                sourceKind: 'property-read',
                sourceText: node.getText(sourceFile),
              }, node, sourceFile);
            }
          }
        }
      }

      if (
        (ts.isVariableDeclaration(node) || ts.isParameter(node))
        && ts.isObjectBindingPattern(node.name)
      ) {
        const sourceType = ts.isVariableDeclaration(node) && node.initializer
          ? checker.getTypeAtLocation(node.initializer)
          : node.type
            ? checker.getTypeFromTypeNode(node.type)
            : checker.getTypeAtLocation(node);
        if (
          typeIncludesDisplayOutcome(sourceType, displayType, checker)
          && !isProducerInputAssembly(file, functionContext(node))
        ) {
          for (const element of node.name.elements) {
            if (element.dotDotDotToken) {
              violations.push({
                kind: 'display-outcome-rest-read',
                file,
                line: lineOf(sourceFile, element),
                message: 'DisplayOutcome rest reads hide legacy and canonical authority.',
              });
              continue;
            }
            const property = element.propertyName && ts.isIdentifier(element.propertyName)
              ? element.propertyName.text
              : ts.isIdentifier(element.name)
                ? element.name.text
                : undefined;
            if (!property) continue;
            const category = consumerCategory(property);
            if (category) {
              add({
                category,
                detail: property,
                file,
                context: functionContext(element),
                sourceKind: 'destructure-read',
                sourceText: element.getText(sourceFile),
              }, element, sourceFile);
            }
          }
        }
      }

      let forwardExpression;
      let sourceKind;
      if (ts.isReturnStatement(node) && node.expression) {
        forwardExpression = node.expression;
        sourceKind = 'return-forwarder';
      } else if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
        forwardExpression = node.body;
        sourceKind = 'arrow-forwarder';
      } else if (
        ts.isPropertyAssignment(node)
        && ['outcome', 'payload'].includes(propertyName(node) ?? '')
      ) {
        forwardExpression = node.initializer;
        sourceKind = `property-forwarder:${propertyName(node)}`;
      }
      if (forwardExpression) {
        const expression = unwrapExpression(forwardExpression);
        const expressionType = checker.getTypeAtLocation(expression);
        const isNativeDocumentCall = ts.isCallExpression(expression)
          && (
            NATIVE_DOCUMENT_CALL_NAMES.has(calleeName(expression.expression))
            || NATIVE_DOCUMENT_WRAPPER_CALL_NAMES.has(calleeName(expression.expression))
          );
        if (
          typeIncludesDisplayOutcome(expressionType, displayType, checker)
          && !unwrapToObject(expression)
          && !expressionContainsObjectLiteral(expression)
          && !isNativeDocumentCall
          && !forwarderNodes.has(node)
        ) {
          add({
            category: 'forwarder',
            detail: sourceKind,
            file,
            context: functionContext(node),
            sourceKind,
            sourceText: expression.getText(sourceFile),
          }, node, sourceFile);
          forwarderNodes.add(node);
        }
      }

      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const sorted = candidates.sort((left, right) =>
    left.file.localeCompare(right.file)
    || left.line - right.line
    || left.category.localeCompare(right.category)
    || left.detail.localeCompare(right.detail));
  const occurrences = new Map();
  const entries = sorted.map((entry) => {
    const fingerprint = stableHash(JSON.stringify({
      category: entry.category,
      detail: entry.detail,
      file: entry.file,
      lane: entry.lane,
      context: entry.context,
      sourceKind: entry.sourceKind,
      sourceText: entry.sourceText,
    }));
    const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
    occurrences.set(fingerprint, occurrence);
    return {
      id: `${fingerprint}:${occurrence}`,
      category: entry.category,
      detail: entry.detail,
      file: entry.file,
      lane: entry.lane,
      line: entry.line,
      context: entry.context,
      sourceKind: entry.sourceKind,
    };
  });

  const categoryCounts = new Map(TRACKED_CATEGORIES.map((category) => [category, 0]));
  const laneStats = new Map();
  for (const entry of entries) {
    categoryCounts.set(entry.category, (categoryCounts.get(entry.category) ?? 0) + 1);
    const lane = laneStats.get(entry.lane) ?? Object.fromEntries(
      TRACKED_CATEGORIES.map((category) => [category, 0]),
    );
    lane[entry.category] += 1;
    laneStats.set(entry.lane, lane);
  }

  const entriesByCategory = Object.fromEntries(TRACKED_CATEGORIES.map((category) => [
    category,
    entries.filter((entry) => entry.category === category),
  ]));

  return {
    version: 1,
    registryDigest: registryDigest(),
    summary: {
      sourceFileCount: files.length,
      producerCount: entries.filter((entry) => [
        'native-document',
        'canonical-projection',
        'compatibility-projection',
        'forwarder',
        'control-outcome',
      ].includes(entry.category)).length,
      consumerCount: entries.filter((entry) => entry.category.endsWith('-read')).length,
      compatibilityProjectionCount: categoryCounts.get('compatibility-projection'),
      legacyReadCount: categoryCounts.get('legacy-read'),
      nativeDocumentCount: categoryCounts.get('native-document'),
      violationCount: violations.length,
    },
    categoryCounts: stableObject(categoryCounts),
    lanes: stableObject(laneStats),
    entries: entriesByCategory,
    violations,
  };
}

function entriesByFile(entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const ids = grouped.get(entry.file) ?? [];
    ids.push(entry.id);
    grouped.set(entry.file, ids);
  }
  return stableObject(grouped);
}

function baselineEntryIds(entries) {
  if (Array.isArray(entries)) {
    return entries.map((entry) => typeof entry === 'string' ? entry : entry.id);
  }
  return Object.values(entries ?? {}).flat();
}

function laneFloors(report) {
  return stableObject(Object.entries(report.lanes).map(([lane, counts]) => [lane, {
    compatibilityProjection: counts['compatibility-projection'],
    legacyRead: counts['legacy-read'],
    nativeDocument: counts['native-document'],
  }]));
}

export function buildDisplayContractInversionBaseline(report, acceptedReason) {
  if (!acceptedReason?.trim()) {
    throw new Error('Display contract inversion baseline updates require a non-empty reason');
  }
  if (report.violations.length > 0) {
    throw new Error(`Cannot baseline ${report.violations.length} unclassified DisplayOutcome path(s)`);
  }
  return {
    schemaVersion: DISPLAY_CONTRACT_INVERSION_BASELINE_VERSION,
    acceptedReason: acceptedReason.trim(),
    registryDigest: report.registryDigest,
    laneFloors: laneFloors(report),
    entries: Object.fromEntries(TRACKED_CATEGORIES.map((category) => [
      category,
      entriesByFile(report.entries[category]),
    ])),
  };
}

function validateBaselineShape(baseline) {
  if (baseline?.schemaVersion !== DISPLAY_CONTRACT_INVERSION_BASELINE_VERSION) {
    throw new Error(`Unsupported display contract inversion baseline schema: ${baseline?.schemaVersion}`);
  }
  if (!baseline.acceptedReason?.trim()) {
    throw new Error('Display contract inversion baseline requires an accepted reason');
  }
  for (const category of TRACKED_CATEGORIES) {
    const entries = baseline.entries?.[category];
    if (!Array.isArray(entries) && (!entries || typeof entries !== 'object')) {
      throw new Error(`Display contract inversion baseline requires ${category} entries`);
    }
  }
}

export function validateDisplayContractInversionReport(report, baseline) {
  validateBaselineShape(baseline);
  const errors = report.violations.map((violation) =>
    `${violation.kind}: ${violation.file}:${violation.line}`);
  if (baseline.registryDigest !== report.registryDigest) {
    errors.push('Display contract inversion registry changed without an accepted baseline update.');
  }

  const changes = {};
  for (const category of TRACKED_CATEGORIES) {
    const expected = new Set(baselineEntryIds(baseline.entries[category]));
    const current = new Set(report.entries[category].map((entry) => entry.id));
    const added = [...current].filter((id) => !expected.has(id)).sort();
    const stale = [...expected].filter((id) => !current.has(id)).sort();
    changes[category] = { added, stale };
    if (added.length > 0) {
      errors.push(`${category} inventory added or changed: ${added.join(', ')}`);
    }
    if (stale.length > 0) {
      errors.push(`${category} inventory can be refreshed: ${stale.join(', ')}`);
    }
  }

  for (const [lane, counts] of Object.entries(report.lanes)) {
    const floor = baseline.laneFloors?.[lane] ?? {
      compatibilityProjection: 0,
      legacyRead: 0,
      nativeDocument: 0,
    };
    if (counts['compatibility-projection'] > floor.compatibilityProjection) {
      errors.push(`Lane ${lane} compatibility projection debt ${counts['compatibility-projection']} exceeds ${floor.compatibilityProjection}.`);
    }
    if (counts['legacy-read'] > floor.legacyRead) {
      errors.push(`Lane ${lane} legacy read debt ${counts['legacy-read']} exceeds ${floor.legacyRead}.`);
    }
    if (counts['native-document'] < floor.nativeDocument) {
      errors.push(`Lane ${lane} native document coverage ${counts['native-document']} is below ${floor.nativeDocument}.`);
    }
  }

  return { ok: errors.length === 0, errors, changes };
}

export function assertDisplayContractInversionBaselineUpdateAllowed(report, previousBaseline) {
  if (report.violations.length > 0) {
    throw new Error(`Cannot update with ${report.violations.length} unclassified DisplayOutcome path(s)`);
  }
  if (!previousBaseline) return;
  validateBaselineShape(previousBaseline);
  const lanes = new Set([
    ...Object.keys(previousBaseline.laneFloors ?? {}),
    ...Object.keys(report.lanes),
  ]);
  for (const lane of lanes) {
    const previous = previousBaseline.laneFloors?.[lane] ?? {
      compatibilityProjection: 0,
      legacyRead: 0,
      nativeDocument: 0,
    };
    const current = report.lanes[lane] ?? Object.fromEntries(
      TRACKED_CATEGORIES.map((category) => [category, 0]),
    );
    if (current['compatibility-projection'] > previous.compatibilityProjection) {
      throw new Error(`Display contract lane ${lane} compatibility projection debt cannot rise from ${previous.compatibilityProjection} to ${current['compatibility-projection']}`);
    }
    if (current['legacy-read'] > previous.legacyRead) {
      throw new Error(`Display contract lane ${lane} legacy read debt cannot rise from ${previous.legacyRead} to ${current['legacy-read']}`);
    }
    if (current['native-document'] < previous.nativeDocument) {
      throw new Error(`Display contract lane ${lane} native document coverage cannot fall from ${previous.nativeDocument} to ${current['native-document']}`);
    }
  }
}

export function formatDisplayContractInversionReport(report, validation) {
  const lines = [
    `Display contract inversion ratchet v${report.version}`,
    `Source files: ${report.summary.sourceFileCount}`,
    `Producer boundaries: ${report.summary.producerCount}`,
    `Consumer reads: ${report.summary.consumerCount}`,
    `Compatibility projections: ${report.summary.compatibilityProjectionCount}`,
    `Legacy reads: ${report.summary.legacyReadCount}`,
    `Native documents: ${report.summary.nativeDocumentCount}`,
    '',
    'Per-lane inventory:',
  ];
  for (const [lane, counts] of Object.entries(report.lanes)) {
    lines.push(
      `  ${lane}: ${counts['native-document']} native, ${counts['compatibility-projection']} compatibility, ${counts.forwarder} forwarders, ${counts['control-outcome']} control, ${counts['legacy-read']} legacy reads, ${counts['canonical-read']} canonical reads`,
    );
  }
  if (validation) {
    lines.push('', `Baseline: ${validation.ok ? 'pass' : 'fail'}`);
    for (const error of validation.errors) lines.push(`  ${error}`);
  }
  return lines.join('\n');
}

export { DEBT_CATEGORIES, TRACKED_CATEGORIES };
