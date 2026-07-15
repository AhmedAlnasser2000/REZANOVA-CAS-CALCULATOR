import type {
  StatisticsVisualizationPayloadV1,
  StatisticsVisualizationTableV1,
  StatisticsVisualizationViewV1,
} from '../../types/calculator';

export const STATISTICS_VISUALIZATION_MAX_VIEWS = 4;
export const STATISTICS_VISUALIZATION_MAX_POINTS = 2_000;
export const STATISTICS_VISUALIZATION_MAX_TABLE_ROWS = 500;

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validTable(table: StatisticsVisualizationTableV1) {
  return Array.isArray(table.columns)
    && table.columns.length > 0
    && table.columns.every((column) => typeof column === 'string')
    && Array.isArray(table.rows)
    && table.rows.length <= STATISTICS_VISUALIZATION_MAX_TABLE_ROWS
    && table.rows.every((row) => Array.isArray(row)
      && row.length === table.columns.length
      && row.every((cell) => typeof cell === 'string' || finite(cell)))
    && Number.isInteger(table.totalRows)
    && table.totalRows >= table.rows.length;
}

function validBase(view: StatisticsVisualizationViewV1) {
  return typeof view.title === 'string'
    && typeof view.xLabel === 'string'
    && typeof view.yLabel === 'string'
    && typeof view.ariaDescription === 'string'
    && validTable(view.table);
}

function validPoints(points: readonly unknown[], predicate: (point: unknown) => boolean) {
  return points.length <= STATISTICS_VISUALIZATION_MAX_POINTS && points.every(predicate);
}

function validView(view: StatisticsVisualizationViewV1) {
  if (!validBase(view)) return false;
  switch (view.kind) {
    case 'histogram':
    case 'boxPlot':
    case 'frequencyBars':
      return validPoints(view.weightedValues, (point) => {
        const value = point as { value?: unknown; weight?: unknown };
        return finite(value.value) && finite(value.weight) && value.weight > 0;
      });
    case 'probabilityBars':
      return finite(view.omittedMass)
        && view.omittedMass >= 0
        && validPoints(view.points, (point) => {
          const value = point as { x?: unknown; probability?: unknown; selected?: unknown };
          return finite(value.x)
            && finite(value.probability)
            && typeof value.selected === 'boolean';
        });
    case 'normalCurve':
      return validPoints(view.points, (point) => {
        const value = point as { x?: unknown; density?: unknown; selected?: unknown };
        return finite(value.x) && finite(value.density) && typeof value.selected === 'boolean';
      });
    case 'scatterFit':
    case 'correlationScatter':
      return validPoints(view.points, (point) => {
        const value = point as { x?: unknown; y?: unknown };
        return finite(value.x) && finite(value.y);
      });
    case 'residuals':
      return validPoints(view.points, (point) => {
        const value = point as { x?: unknown; residual?: unknown };
        return finite(value.x) && finite(value.residual);
      });
    case 'confidenceInterval':
      return finite(view.estimate)
        && finite(view.lower)
        && finite(view.upper)
        && finite(view.confidenceLevel);
    case 'testDistribution':
      return finite(view.statistic)
        && finite(view.pValue)
        && view.criticalValues.every(finite)
        && validPoints(view.points, (point) => {
          const value = point as { t?: unknown; density?: unknown; pValueRegion?: unknown };
          return finite(value.t)
            && finite(value.density)
            && typeof value.pValueRegion === 'boolean';
        });
  }
}

export function isStatisticsVisualizationPayloadV1(
  value: unknown,
): value is StatisticsVisualizationPayloadV1 {
  if (!value || typeof value !== 'object') return false;
  const payload = value as StatisticsVisualizationPayloadV1;
  return payload.version === 1
    && typeof payload.defaultKind === 'string'
    && Array.isArray(payload.views)
    && payload.views.length > 0
    && payload.views.length <= STATISTICS_VISUALIZATION_MAX_VIEWS
    && payload.views.some((view) => view.kind === payload.defaultKind)
    && payload.views.every(validView);
}

export function cloneStatisticsVisualizationPayloadV1(
  payload: StatisticsVisualizationPayloadV1,
) {
  if (!isStatisticsVisualizationPayloadV1(payload)) {
    throw new Error('Invalid Statistics visualization payload.');
  }
  return structuredClone(payload);
}

