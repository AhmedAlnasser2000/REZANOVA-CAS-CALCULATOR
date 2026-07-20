import type {
  GraphHitResult,
  GraphRendererCapabilities,
  GraphRendererSceneFrameV1,
  GraphRendererViewFrameV1,
  GraphScenePathRuntime,
  GraphSceneRegionRuntime,
  GraphViewportV1,
  InteractiveGraphRenderer,
} from '../../contracts';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const GRAPH_COLORS: Record<string, string> = {
  'graph-blue': '#5598ff', 'graph-green': '#59dd88', 'graph-violet': '#ae68f5',
  'graph-orange': '#ff9b4c', 'graph-cyan': '#52d4d8',
};
type Size = { width: number; height: number };
export type GraphRendererScreenPoint = { x: number; y: number };

function svgElement<K extends keyof SVGElementTagNameMap>(name: K) {
  return document.createElementNS(SVG_NAMESPACE, name);
}

function setAttribute(node: Element, name: string, value: string) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

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
    parts.push(`M${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`,
      `L${points[1]!.x.toFixed(2)} ${points[1]!.y.toFixed(2)}`,
      `L${points[2]!.x.toFixed(2)} ${points[2]!.y.toFixed(2)}Z`);
  }
  return parts.join('');
}

function syncKeyed<T extends SVGElement>(
  host: SVGGElement,
  values: readonly { id: string; update: (node: T) => void }[],
  tagName: keyof SVGElementTagNameMap,
) {
  const existing = new Map([...host.children].map((node) => [
    (node as SVGElement).dataset.graphKey ?? '', node as T,
  ]));
  const keep = new Set<string>();
  values.forEach(({ id, update }) => {
    let node = existing.get(id);
    if (!node) {
      node = svgElement(tagName) as T;
      node.dataset.graphKey = id;
      host.append(node);
    }
    update(node);
    keep.add(id);
  });
  existing.forEach((node, id) => { if (!keep.has(id)) node.remove(); });
}

export class GraphSvgReferenceRenderer implements InteractiveGraphRenderer {
  readonly capabilities: GraphRendererCapabilities = {
    rendererId: 'svg', interactive: true, hitTesting: false, regionFill: true,
    polarGrid: true, contextRecovery: false, maximumVertices: 250_000,
  };

  private size: Size = { width: 1, height: 1 };
  private svg: SVGSVGElement | null = null;
  private gridLines: SVGGElement | null = null;
  private gridCircles: SVGGElement | null = null;
  private labels: SVGGElement | null = null;
  private geometry: SVGGElement | null = null;
  private regions: SVGGElement | null = null;
  private paths: SVGGElement | null = null;
  private points: SVGGElement | null = null;
  private view: GraphRendererViewFrameV1 | null = null;
  private scene: GraphRendererSceneFrameV1 | null = null;
  private sceneProjectionSize: Size = { width: 1, height: 1 };

  mount(target: HTMLElement) {
    this.dispose();
    const svg = svgElement('svg');
    svg.classList.add('graph-svg-canvas', 'graph-svg-geometry-canvas');
    svg.setAttribute('aria-hidden', 'true');
    const grid = svgElement('g'); grid.classList.add('graph-svg-grid'); grid.dataset.testid = 'graph-scene-grid';
    const gridLines = svgElement('g'); const gridCircles = svgElement('g');
    grid.append(gridLines, gridCircles);
    const labels = svgElement('g'); labels.classList.add('graph-svg-ticks'); labels.dataset.testid = 'graph-scene-grid-labels';
    const geometry = svgElement('g'); geometry.classList.add('graph-svg-sampled-geometry');
    const regions = svgElement('g'); regions.classList.add('graph-svg-regions'); regions.dataset.testid = 'graph-scene-regions';
    const paths = svgElement('g'); paths.classList.add('graph-svg-paths'); paths.dataset.testid = 'graph-scene-paths';
    const points = svgElement('g'); points.classList.add('graph-svg-points'); points.dataset.testid = 'graph-scene-points';
    geometry.append(regions, paths, points); svg.append(grid, labels, geometry); target.replaceChildren(svg);
    Object.assign(this, { svg, gridLines, gridCircles, labels, geometry, regions, paths, points });
    this.resize(this.size.width, this.size.height, 1);
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    void devicePixelRatio;
    this.size = { width: Math.max(1, cssWidth), height: Math.max(1, cssHeight) };
    this.svg?.setAttribute('viewBox', `0 0 ${this.size.width} ${this.size.height}`);
  }

  clientToScreen(clientX: number, clientY: number): GraphRendererScreenPoint | null {
    const bounds = this.svg?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: (clientX - bounds.left) * this.size.width / bounds.width,
      y: (clientY - bounds.top) * this.size.height / bounds.height,
    };
  }

  setView(frame: GraphRendererViewFrameV1) {
    this.view = frame;
    if (!this.gridLines || !this.gridCircles || !this.labels) return;
    const { grid, viewport } = frame;
    const lineRoles = ['minor', 'major', 'axis', 'spoke'] as const;
    syncKeyed<SVGPathElement>(this.gridLines, lineRoles.map((role) => ({
      id: `grid-lines:${role}`,
      update: (node) => {
        const data = grid.lines.filter((line) => line.role === role).map((line) => {
          const start = project(line.x1, line.y1, viewport, this.size);
          const end = project(line.x2, line.y2, viewport, this.size);
          return `M${start.x.toFixed(2)} ${start.y.toFixed(2)}L${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
        }).join('');
        setAttribute(node, 'd', data);
        node.dataset.gridLine = role;
      },
    })), 'path');
    syncKeyed<SVGEllipseElement>(this.gridCircles, grid.circles.map((circle) => ({
      id: circle.circleId,
      update: (node) => {
        const center = project(circle.center.x, circle.center.y, viewport, this.size);
        const edgeX = project(circle.center.x + circle.radius, circle.center.y, viewport, this.size);
        const edgeY = project(circle.center.x, circle.center.y + circle.radius, viewport, this.size);
        setAttribute(node, 'cx', String(center.x)); setAttribute(node, 'cy', String(center.y));
        setAttribute(node, 'rx', String(Math.abs(edgeX.x - center.x)));
        setAttribute(node, 'ry', String(Math.abs(edgeY.y - center.y)));
        setAttribute(node, 'fill', 'none');
        node.dataset.gridLine = circle.role;
      },
    })), 'ellipse');
    syncKeyed<SVGTextElement>(this.labels, grid.labels.filter((label) => label.plainText).map((label) => ({
      id: label.labelId,
      update: (node) => {
        const anchor = project(label.anchor.x, label.anchor.y, viewport, this.size);
        setAttribute(node, 'x', String(anchor.x)); setAttribute(node, 'y', String(anchor.y));
        const text = label.plainText ?? ''; if (node.textContent !== text) node.textContent = text;
        setAttribute(node, 'dy', label.labelId.startsWith('grid:x:') ? '18' : '4');
        if (label.labelId.startsWith('grid:y:')) { setAttribute(node, 'dx', '-8'); setAttribute(node, 'text-anchor', 'end'); }
      },
    })), 'text');
    this.updateGeometryTransform();
  }

  setScene(frame: GraphRendererSceneFrameV1 | null) {
    this.scene = frame;
    if (!this.regions || !this.paths || !this.points) return;
    if (!frame) { this.regions.replaceChildren(); this.paths.replaceChildren(); this.points.replaceChildren(); return; }
    this.sceneProjectionSize = { ...this.size };
    const { scene, sourceViewport, policy } = frame;
    syncKeyed<SVGPathElement>(this.regions, scene.regions.map((region) => ({ id: region.regionId, update: (node) => {
      node.dataset.regionId = region.regionId; node.setAttribute('d', regionData(region, sourceViewport, this.size));
      node.setAttribute('fill', GRAPH_COLORS[region.style.colorToken] ?? '#5598ff');
      node.setAttribute('fill-opacity', String(region.style.fillOpacity));
    } })), 'path');
    syncKeyed<SVGPathElement>(this.paths, scene.paths.map((path) => ({ id: path.pathId, update: (node) => {
      node.dataset.pathId = path.pathId; node.setAttribute('d', pathData(path, sourceViewport, this.size));
      node.setAttribute('fill', 'none'); node.setAttribute('stroke', GRAPH_COLORS[path.style.colorToken] ?? '#5598ff');
      node.setAttribute('stroke-width', path.style.strokeWidth === 'thin' ? '1.5' : path.style.strokeWidth === 'strong' ? '3' : '2.25');
      node.setAttribute('vector-effect', 'non-scaling-stroke');
      if (path.style.stroke === 'dashed') node.setAttribute('stroke-dasharray', '8 6'); else node.removeAttribute('stroke-dasharray');
    } })), 'path');
    const pointValues = scene.pointBatches.flatMap((batch) => Array.from({ length: batch.coordinates.length / 2 }, (_, index) => ({
      id: `${batch.pointBatchId}:${index}`,
      update: (node: SVGCircleElement) => {
        const point = project(batch.coordinates[index * 2]!, batch.coordinates[index * 2 + 1]!, sourceViewport, this.size);
        node.dataset.pointBatchId = batch.pointBatchId; node.dataset.pointIndex = String(index);
        node.setAttribute('cx', String(point.x)); node.setAttribute('cy', String(point.y)); node.setAttribute('r', '5');
        const color = GRAPH_COLORS[batch.style.colorToken] ?? '#5598ff';
        node.setAttribute('fill', batch.marker === 'open' ? '#071517' : color); node.setAttribute('stroke', color); node.setAttribute('stroke-width', '2');
      },
    })));
    syncKeyed<SVGCircleElement>(this.points, pointValues, 'circle');
    this.svg?.setAttribute('data-scene-quality', policy.quality);
    this.updateGeometryTransform();
  }

  private updateGeometryTransform() {
    if (!this.geometry || !this.view || !this.scene) return;
    const source = this.scene.sourceViewport; const live = this.view.viewport;
    const sx = (source.xMax - source.xMin) / (live.xMax - live.xMin)
      * this.size.width / this.sceneProjectionSize.width;
    const sy = (source.yMax - source.yMin) / (live.yMax - live.yMin)
      * this.size.height / this.sceneProjectionSize.height;
    const tx = (source.xMin - live.xMin) / (live.xMax - live.xMin) * this.size.width;
    const ty = (live.yMax - source.yMax) / (live.yMax - live.yMin) * this.size.height;
    this.geometry.setAttribute('transform', `matrix(${sx} 0 0 ${sy} ${tx} ${ty})`);
  }

  hitTest(clientX: number, clientY: number): GraphHitResult | null { void clientX; void clientY; return null; }
  handleContextRestored() {}
  clear() { this.setScene(null); }
  dispose() {
    this.svg?.remove();
    this.svg = this.gridLines = this.gridCircles = this.labels = this.geometry = this.regions = this.paths = this.points = null;
    this.view = null; this.scene = null;
  }
}
