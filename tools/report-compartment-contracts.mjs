#!/usr/bin/env node
import {
  loadCompartmentManifestContract,
  validateCompartmentBoundaries,
} from './compartment-boundaries-core.mjs';

function summarize(values, emptyLabel = 'none') {
  if (!values || values.length === 0) {
    return emptyLabel;
  }
  return values.join(', ');
}

function validatorSummary(rootDir, sourceFiles) {
  try {
    const result = validateCompartmentBoundaries({
      rootDir,
      ...(sourceFiles ? { sourceFiles } : {}),
    });
    return {
      status: 'pass',
      sourceFiles: result.sourceFiles,
      ooeTypeScriptFiles: result.ooe.tsFiles,
      ooeRustFiles: result.ooe.rustFiles,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildCompartmentContractsReport({
  rootDir = process.cwd(),
  sourceFiles,
} = {}) {
  const entries = loadCompartmentManifestContract(rootDir);
  const validation = validatorSummary(rootDir, sourceFiles);
  const lines = [
    'Compartment Contracts Report',
    `validator: ${validation.status}`,
  ];

  if (validation.status === 'pass') {
    lines.push(`validated source files: ${validation.sourceFiles}`);
    lines.push(`validated OOE files: ${validation.ooeTypeScriptFiles} TypeScript, ${validation.ooeRustFiles} Rust`);
  } else {
    lines.push(`validator failure: ${validation.message}`);
  }

  lines.push('');
  for (const entry of entries) {
    lines.push(`## ${entry.label} (${entry.id})`);
    lines.push(`diagnostics label: ${entry.diagnosticsLabel}`);
    lines.push(`state surface: ${entry.stateSurface}`);
    lines.push(`surface exposure: ${entry.surfaceExposureCandidate}`);
    lines.push(`owned paths: ${summarize(entry.ownedPaths)}`);
    lines.push(`public seams: ${summarize(entry.publicSeams)}`);
    lines.push(`private paths: ${summarize(entry.privatePaths)}`);
    lines.push(`dependency policies: ${summarize(entry.dependencyPolicies)}`);
    lines.push(`OOE facts: ${entry.hasOoeFacts ? 'declared' : 'none'}`);
    lines.push('');
  }

  return {
    entries,
    validation,
    text: lines.join('\n').trimEnd(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = buildCompartmentContractsReport();
  console.log(report.text);
  if (report.validation.status !== 'pass') {
    process.exitCode = 1;
  }
}
