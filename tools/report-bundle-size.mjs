import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import process from 'node:process';

const DIST_DIR = new URL('../dist/', import.meta.url);
const MANIFEST_PATH = new URL('../dist/.vite/manifest.json', import.meta.url);
const REPORT_PATH = new URL('../dist/bundle-report.json', import.meta.url);

const MAX_EAGER_JS_BYTES = 2_200_000;
const MAX_EAGER_GZIP_BYTES = 750_000;
const MAX_APP_CHUNK_BYTES = 900_000;

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

function readManifest() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error('dist/.vite/manifest.json was not found. Run npm run build first.');
  }

  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function fileStats(file) {
  const path = join(DIST_DIR.pathname, file);
  const raw = statSync(path).size;
  const gzip = gzipSync(readFileSync(path)).byteLength;
  return { file, raw, gzip };
}

function collectStaticImports(manifest, chunkKey, seen = new Set()) {
  if (seen.has(chunkKey)) {
    return seen;
  }

  seen.add(chunkKey);
  const chunk = manifest[chunkKey];
  for (const imported of chunk?.imports ?? []) {
    collectStaticImports(manifest, imported, seen);
  }

  return seen;
}

function jsChunks(manifest) {
  return Object.values(manifest)
    .filter((entry) => typeof entry.file === 'string' && entry.file.endsWith('.js'))
    .map((entry) => fileStats(entry.file))
    .sort((a, b) => b.raw - a.raw);
}

function buildReport() {
  const manifest = readManifest();
  const entries = Object.entries(manifest).filter(([, entry]) => entry.isEntry);
  const eagerKeys = new Set();

  for (const [key] of entries) {
    collectStaticImports(manifest, key, eagerKeys);
  }

  const eager = [...eagerKeys]
    .map((key) => manifest[key])
    .filter((entry) => typeof entry?.file === 'string' && entry.file.endsWith('.js'))
    .map((entry) => fileStats(entry.file))
    .sort((a, b) => b.raw - a.raw);

  const chunks = jsChunks(manifest);
  const eagerRaw = eager.reduce((sum, chunk) => sum + chunk.raw, 0);
  const eagerGzip = eager.reduce((sum, chunk) => sum + chunk.gzip, 0);
  const largestChunk = chunks[0] ?? { file: '', raw: 0, gzip: 0 };
  const appChunks = chunks.filter((chunk) => !basename(chunk.file).startsWith('vendor-'));
  const largestAppChunk = appChunks[0] ?? { file: '', raw: 0, gzip: 0 };

  return {
    generatedAt: new Date().toISOString(),
    thresholds: {
      maxEagerJsBytes: MAX_EAGER_JS_BYTES,
      maxEagerGzipBytes: MAX_EAGER_GZIP_BYTES,
      maxAppChunkBytes: MAX_APP_CHUNK_BYTES,
    },
    summary: {
      jsChunkCount: chunks.length,
      eagerRawBytes: eagerRaw,
      eagerGzipBytes: eagerGzip,
      largestChunk,
      largestAppChunk,
    },
    eager,
    chunks,
  };
}

function printReport(report) {
  console.log('Bundle size report');
  console.log(`- JS chunks: ${report.summary.jsChunkCount}`);
  console.log(
    `- Eager JS: ${formatBytes(report.summary.eagerRawBytes)} raw, ${formatBytes(report.summary.eagerGzipBytes)} gzip`,
  );
  console.log(
    `- Largest chunk: ${report.summary.largestChunk.file} (${formatBytes(report.summary.largestChunk.raw)} raw, ${formatBytes(report.summary.largestChunk.gzip)} gzip)`,
  );
  console.log(
    `- Largest app chunk: ${report.summary.largestAppChunk.file} (${formatBytes(report.summary.largestAppChunk.raw)} raw, ${formatBytes(report.summary.largestAppChunk.gzip)} gzip)`,
  );
  console.log('\nTop JS chunks:');
  for (const chunk of report.chunks.slice(0, 10)) {
    console.log(`- ${chunk.file}: ${formatBytes(chunk.raw)} raw, ${formatBytes(chunk.gzip)} gzip`);
  }
}

function checkReport(report) {
  const failures = [];

  if (report.summary.jsChunkCount < 2) {
    failures.push('Expected at least 2 JavaScript chunks after BUNDLE-SPLIT1.');
  }

  if (report.summary.eagerRawBytes > MAX_EAGER_JS_BYTES) {
    failures.push(
      `Eager JS ${formatBytes(report.summary.eagerRawBytes)} exceeds ${formatBytes(MAX_EAGER_JS_BYTES)}.`,
    );
  }

  if (report.summary.eagerGzipBytes > MAX_EAGER_GZIP_BYTES) {
    failures.push(
      `Eager JS gzip ${formatBytes(report.summary.eagerGzipBytes)} exceeds ${formatBytes(MAX_EAGER_GZIP_BYTES)}.`,
    );
  }

  if (report.summary.largestAppChunk.raw > MAX_APP_CHUNK_BYTES) {
    failures.push(
      `Largest app chunk ${report.summary.largestAppChunk.file} is ${formatBytes(report.summary.largestAppChunk.raw)}, above ${formatBytes(MAX_APP_CHUNK_BYTES)}.`,
    );
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`bundle-size check failed: ${failure}`);
    }
    process.exitCode = 1;
  }
}

const args = new Set(process.argv.slice(2));
const report = buildReport();
printReport(report);

if (args.has('--write-report')) {
  mkdirSync(dirname(REPORT_PATH.pathname), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nWrote ${REPORT_PATH.pathname}`);
}

if (args.has('--check')) {
  checkReport(report);
}
