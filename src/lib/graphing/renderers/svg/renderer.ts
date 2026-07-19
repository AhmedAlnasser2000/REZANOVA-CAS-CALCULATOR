import type {
  GraphHitResult,
  GraphRenderFrameV1,
  GraphRendererCapabilities,
  GraphScenePathRuntime,
  GraphSceneRegionRuntime,
  GraphViewportV1,
  InteractiveGraphRenderer,
} from '../../contracts';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const GRAPH_COLORS: Record<string, string> = {
  'graph-blue': '#5598ff',
  'graph-green': '#59dd88',
  'graph-violet': '#ae68f5',
  'graph-orange': '#ff9b4c',
  'graph-cyan': '#52d4d8',
};

type Size = { width: number; height: number };

function project(x: number, y: number, viewport: GraphViewportV1, size: Size) {
  return {
    x: (x - viewport.xMin) / (viewport.xMax - viewport.xMin) * size.width,
    y: (viewport.yMax - y) / (viewport.yMax - viewport.yMin) * size.height,
  };
}

function pathData(path: GraphScenePathRuntime, viewport: GraphViewportV1, size: Size) {
  const starts = new Set(path.segmentOffsets);
  const parts: string[] = [];
  for (let vertex = 0; vertex * 2 + 1 < path.coordinates.length; vertex += 1) {
    const point = project(path.coordinates[vertex * 2]!, path.coordinates[vertex * 2 + 1]!, viewport, size);
    parts.push(`${starts.has(vertex) ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }
  return parts.join('');
}

function regionData(region: GraphSceneRegionRuntime, viewport: GraphViewportV1, size: Size) {
  const parts: string[] = [];
  for (let index = 0; index + 2 < region.triangleIndices.length; index += 3) {
    const points = [0, 1, 2].map((offset) => {
      const vertex = region.triangleIndices[index + offset]!;
      return project(region.vertices[vertex * 2]!, region.vertices[vertex * 2 + 1]!, viewport, size);
    });
    parts.push(
      `M${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`,
      `L${points[1]!.x.toFixed(2)} ${points[1]!.y.toFixed(2)}`,
      `L${points[2]!.x.toFixed(2)} ${points[2]!.y.toFixed(2)}Z`,
    );
  }
  return parts.join('');
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K) {
  return document.createElementNS(SVG_NAMESPACE, name);
}

export class GraphSvgReferenceRenderer implements InteractiveGraphRenderer {
  readonly capabilities: GraphRendererCapabilities = {
    rendererId: 'svg', interactive: true, hitTesting: false, regionFill: true,
    polarGrid: true, contextRecovery: false, maximumVertices: 250_000,
  };

  private size: Size = { width: 1, height: 1 };
  private svg: SVGSVGElement | null = null;
  private grid: SVGGElement | null = null;
  private gridLabels: SVGGElement | null = null;
  private regions: SVGGElement | null = null;
  private paths: SVGGElement | null = null;
  private points: SVGGElement | null = null;

  mount(target: HTMLElement) {
    this.dispose();
    const svg = svgElement('svg');
    svg.classList.add('graph-svg-canvas', 'graph-svg-geometry-canvas');
    svg.setAttribute('aria-hidden', 'true');
    const grid = svgElement('g');
    grid.classList.add('graph-svg-grid');
    grid.dataset.testid = 'graph-scene-grid';
    const gridLabels = svgElement('g');
    gridLabels.classList.add('graph-svg-ticks');
    gridLabels.dataset.testid = 'graph-scene-grid-labels';
    const regions = svgElement('g');
    regions.classList.add('graph-svg-regions');
    regions.dataset.testid = 'graph-scene-regions';
    const paths = svgElement('g');
    paths.classList.add('graph-svg-paths');
    paths.dataset.testid = 'graph-scene-paths';
    const points = svgElement('g');
    points.classList.add('graph-svg-points');
    points.dataset.testid = 'graph-scene-points';
    svg.append(grid, gridLabels, regions, paths, points);
    target.replaceChildren(svg);
    this.svg = svg;
    this.grid = grid;
    this.gridLabels = gridLabels;
    this.regions = regions;
    this.paths = paths;
    this.points = points;
    this.resize(this.size.width, this.size.height, 1);
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    void devicePixelRatio;
    this.size = { width: Math.max(1, cssWidth), height: Math.max(1, cssHeight) };
    this.svg?.setAttribute('viewBox', `0 0 ${this.size.width} ${this.size.height}`);
  }

  render({ scene, viewport }: GraphRenderFrameV1) {
    if (!this.grid || !this.gridLabels || !this.regions || !this.paths || !this.points) return;
    const gridFragment = document.createDocumentFragment();
    const appendLines = (values: readonly number[], kind: 'major' | 'minor') => {
      for (let index = 0; index + 3 < values.length; index += 4) {
        const start = project(values[index]!, values[index + 1]!, viewport, this.size);
        const end = project(values[index + 2]!, values[index + 3]!, viewport, this.size);
        const element = svgElement('line');
        element.setAttribute('x1', String(start.x));
        element.setAttribute('y1', String(start.y));
        element.setAttribute('x2', String(end.x));
        element.setAttribute('y2', String(end.y));
        element.dataset.gridLine = kind;
        if (scene.grid.kind === 'cartesian'
          && ((values[index] === 0 && values[index + 2] === 0)
            || (values[index + 1] === 0 && values[index + 3] === 0))) {
          element.dataset.axis = 'true';
        }
        gridFragment.append(element);
      }
    };
    appendLines(scene.grid.minorLines, 'minor');
    appendLines(scene.grid.majorLines, 'major');
    const labelFragment = document.createDocumentFragment();
    for (const label of scene.grid.labels) {
      if (!label.plainText) continue;
      const anchor = project(label.anchor.x, label.anchor.y, viewport, this.size);
      const element = svgElement('text');
      element.dataset.labelId = label.labelId;
      element.setAttribute('x', String(anchor.x));
      element.setAttribute('y', String(anchor.y));
      if (label.labelId.startsWith('grid:x:')) element.setAttribute('dy', '18');
      if (label.labelId.startsWith('grid:y:')) {
        element.setAttribute('dx', '-8');
        element.setAttribute('dy', '4');
        element.setAttribute('text-anchor', 'end');
      }
      if (label.labelId.startsWith('grid:r:')) {
        element.setAttribute('dx', '5');
        element.setAttribute('dy', '-5');
      }
      element.textContent = label.plainText;
      labelFragment.append(element);
    }
    const regionFragment = document.createDocumentFragment();
    for (const region of scene.regions) {
      const element = svgElement('path');
      element.dataset.regionId = region.regionId;
      element.setAttribute('d', regionData(region, viewport, this.size));
      element.setAttribute('fill', GRAPH_COLORS[region.style.colorToken] ?? '#5598ff');
      element.setAttribute('fill-opacity', String(region.style.fillOpacity));
      regionFragment.append(element);
    }
    const pathFragment = document.createDocumentFragment();
    for (const path of scene.paths) {
      const element = svgElement('path');
      element.dataset.pathId = path.pathId;
      element.setAttribute('d', pathData(path, viewport, this.size));
      element.setAttribute('fill', 'none');
      element.setAttribute('stroke', GRAPH_COLORS[path.style.colorToken] ?? '#5598ff');
      element.setAttribute('stroke-width', path.style.strokeWidth === 'thin' ? '1.5' : path.style.strokeWidth === 'strong' ? '3' : '2.25');
      element.setAttribute('vector-effect', 'non-scaling-stroke');
      if (path.style.stroke === 'dashed') element.setAttribute('stroke-dasharray', '8 6');
      pathFragment.append(element);
    }
    const pointFragment = document.createDocumentFragment();
    for (const batch of scene.pointBatches) {
      for (let index = 0; index * 2 + 1 < batch.coordinates.length; index += 1) {
        const point = project(batch.coordinates[index * 2]!, batch.coordinates[index * 2 + 1]!, viewport, this.size);
        const element = svgElement('circle');
        element.dataset.pointBatchId = batch.pointBatchId;
        element.dataset.pointIndex = String(index);
        element.setAttribute('cx', String(point.x));
        element.setAttribute('cy', String(point.y));
        element.setAttribute('r', '5');
        const color = GRAPH_COLORS[batch.style.colorToken] ?? '#5598ff';
        element.setAttribute('fill', batch.marker === 'open' ? '#071517' : color);
        element.setAttribute('stroke', color);
        element.setAttribute('stroke-width', '2');
        pointFragment.append(element);
      }
    }
    this.grid.replaceChildren(gridFragment);
    this.gridLabels.replaceChildren(labelFragment);
    this.regions.replaceChildren(regionFragment);
    this.paths.replaceChildren(pathFragment);
    this.points.replaceChildren(pointFragment);
  }

  hitTest(clientX: number, clientY: number): GraphHitResult | null {
    void clientX;
    void clientY;
    return null;
  }
  handleContextRestored() {}

  clear() {
    this.grid?.replaceChildren();
    this.gridLabels?.replaceChildren();
    this.regions?.replaceChildren();
    this.paths?.replaceChildren();
    this.points?.replaceChildren();
  }

  dispose() {
    this.svg?.remove();
    this.svg = null;
    this.grid = null;
    this.gridLabels = null;
    this.regions = null;
    this.paths = null;
    this.points = null;
  }
}
