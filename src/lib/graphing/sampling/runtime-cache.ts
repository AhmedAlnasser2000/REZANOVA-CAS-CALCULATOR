import type {
  GraphClassifiedItemSnapshotV1,
  GraphSamplingItemEvidenceV1,
  GraphSamplingQualityV3,
  GraphViewportV1,
} from '../contracts';
import type {
  GraphPointBatchSceneInput,
  GraphRegionSceneInput,
  GraphSampledPathSceneInput,
} from '../scene';
import { GRAPH_SAMPLING_CACHE_MAX_BYTES, graphViewportReuseKind } from './adaptive-policy';

type CachedGeometry = {
  key: string;
  viewport: GraphViewportV1;
  quality: GraphSamplingQualityV3;
  paths: GraphSampledPathSceneInput[];
  regions: GraphRegionSceneInput[];
  pointBatches: GraphPointBatchSceneInput[];
  evidence: GraphSamplingItemEvidenceV1;
  bytes: number;
};

const qualityRank = { preview: 0, settled: 1, polish: 2 } as const;

function clonePath(path: GraphSampledPathSceneInput): GraphSampledPathSceneInput {
  return {
    ...path,
    sample: {
      ...path.sample,
      coordinates: path.sample.coordinates.slice(),
      independentValues: path.sample.independentValues?.slice(),
      segmentOffsets: path.sample.segmentOffsets.slice(),
    },
  };
}

function cloneRegion(region: GraphRegionSceneInput): GraphRegionSceneInput {
  return {
    ...region,
    vertices: region.vertices.slice(),
    triangleIndices: region.triangleIndices.slice(),
    boundaryPathIds: [...region.boundaryPathIds],
  };
}

function clonePointBatch(batch: GraphPointBatchSceneInput): GraphPointBatchSceneInput {
  return { ...batch, coordinates: batch.coordinates.slice() };
}

function geometryBytes(input: Pick<CachedGeometry, 'paths' | 'regions' | 'pointBatches'>) {
  return input.paths.reduce((sum, path) => sum
    + path.sample.coordinates.byteLength
    + path.sample.segmentOffsets.byteLength
    + (path.sample.independentValues?.byteLength ?? 0), 0)
    + input.regions.reduce((sum, region) => sum
      + region.vertices.byteLength + region.triangleIndices.byteLength, 0)
    + input.pointBatches.reduce((sum, batch) => sum + batch.coordinates.byteLength, 0);
}

function parameterFingerprint(environment: Readonly<Record<string, number>>) {
  return Object.entries(environment).sort(([left], [right]) => left.localeCompare(right))
    .map(([symbol, value]) => `${symbol}:${value}`).join('|');
}

export class GraphSamplingRuntimeCache {
  readonly #entries = new Map<string, CachedGeometry>();
  readonly #maximumBytes: number;
  #bytes = 0;

  constructor(maximumBytes = GRAPH_SAMPLING_CACHE_MAX_BYTES) {
    this.#maximumBytes = Math.max(1, maximumBytes);
  }

  get bytes() {
    return this.#bytes;
  }

  key(input: {
    workspaceInstanceId: string;
    item: GraphClassifiedItemSnapshotV1;
    parameterEnvironment: Readonly<Record<string, number>>;
  }) {
    return `${input.workspaceInstanceId}:${input.item.itemId}@${input.item.source.sourceRevision}:${parameterFingerprint(input.parameterEnvironment)}`;
  }

  read(input: {
    key: string;
    viewport: GraphViewportV1;
    quality: GraphSamplingQualityV3;
  }) {
    const entry = this.#entries.get(input.key);
    if (!entry || qualityRank[entry.quality] < qualityRank[input.quality]) return null;
    if (graphViewportReuseKind(entry.viewport, input.viewport) !== 'reused') return null;
    this.#entries.delete(input.key);
    this.#entries.set(input.key, entry);
    return {
      paths: entry.paths.map(clonePath),
      regions: entry.regions.map(cloneRegion),
      pointBatches: entry.pointBatches.map(clonePointBatch),
      evidence: { ...entry.evidence, cache: 'reused' as const },
    };
  }

  write(input: Omit<CachedGeometry, 'bytes'>) {
    const stored: CachedGeometry = {
      ...input,
      paths: input.paths.map(clonePath),
      regions: input.regions.map(cloneRegion),
      pointBatches: input.pointBatches.map(clonePointBatch),
      evidence: { ...input.evidence },
      bytes: 0,
    };
    stored.bytes = geometryBytes(stored);
    const previous = this.#entries.get(input.key);
    if (previous) this.#bytes -= previous.bytes;
    this.#entries.delete(input.key);
    if (stored.bytes <= this.#maximumBytes) {
      this.#entries.set(input.key, stored);
      this.#bytes += stored.bytes;
    }
    while (this.#bytes > this.#maximumBytes) {
      const oldestKey = this.#entries.keys().next().value as string | undefined;
      if (!oldestKey) break;
      const oldest = this.#entries.get(oldestKey);
      this.#entries.delete(oldestKey);
      this.#bytes -= oldest?.bytes ?? 0;
    }
  }

  clear() {
    this.#entries.clear();
    this.#bytes = 0;
  }

  clearWorkspace(workspaceInstanceId: string) {
    const prefix = `${workspaceInstanceId}:`;
    for (const [key, entry] of this.#entries) {
      if (!key.startsWith(prefix)) continue;
      this.#entries.delete(key);
      this.#bytes -= entry.bytes;
    }
  }
}
