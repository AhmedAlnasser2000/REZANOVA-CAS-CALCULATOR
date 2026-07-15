import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type {
  StatisticsHistogramBinCount,
  StatisticsVisualizationViewV1,
} from '../../../types/calculator';
import { statisticsChartOption, STATISTICS_DATA_ZOOM_ID } from './statistics-chart-options';
import { initStatisticsEChart } from './statistics-echarts';

type ZoomRange = { start: number; end: number };

const FULL_ZOOM_RANGE: ZoomRange = { start: 0, end: 100 };
const MINIMUM_ZOOM_SPAN = 5;

function zoomedRange(range: ZoomRange, scale: number): ZoomRange {
  const center = (range.start + range.end) / 2;
  const span = Math.min(100, Math.max(MINIMUM_ZOOM_SPAN, (range.end - range.start) * scale));
  const start = Math.min(100 - span, Math.max(0, center - (span / 2)));
  return { start, end: start + span };
}

function pannedRange(range: ZoomRange, direction: -1 | 1): ZoomRange {
  const span = range.end - range.start;
  const delta = Math.max(1, span * 0.12) * direction;
  const start = Math.min(100 - span, Math.max(0, range.start + delta));
  return { start, end: start + span };
}

function rangeFromDataZoomEvent(event: unknown): ZoomRange | null {
  if (!event || typeof event !== 'object') return null;
  const value = event as {
    start?: unknown;
    end?: unknown;
    batch?: readonly { start?: unknown; end?: unknown }[];
  };
  const candidate = value.batch?.[0] ?? value;
  return typeof candidate.start === 'number' && typeof candidate.end === 'number'
    ? { start: candidate.start, end: candidate.end }
    : null;
}

type StatisticsEChartProps = {
  view: StatisticsVisualizationViewV1;
  histogramBinCount: StatisticsHistogramBinCount;
  approxDigits: number;
};

export function StatisticsEChart({ view, histogramBinCount, approxDigits }: StatisticsEChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof initStatisticsEChart> | null>(null);
  const zoomRangeRef = useRef<ZoomRange>(FULL_ZOOM_RANGE);
  const [zoomRange, setZoomRange] = useState<ZoomRange>(FULL_ZOOM_RANGE);

  function applyZoomRange(nextRange: ZoomRange) {
    zoomRangeRef.current = nextRange;
    setZoomRange(nextRange);
    chartRef.current?.dispatchAction({
      type: 'dataZoom',
      dataZoomId: STATISTICS_DATA_ZOOM_ID,
      start: nextRange.start,
      end: nextRange.end,
    });
  }

  function handleChartKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      applyZoomRange(zoomedRange(zoomRangeRef.current, 0.8));
    } else if (event.key === '-') {
      event.preventDefault();
      applyZoomRange(zoomedRange(zoomRangeRef.current, 1.25));
    } else if (event.key === '0') {
      event.preventDefault();
      applyZoomRange(FULL_ZOOM_RANGE);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      applyZoomRange(pannedRange(zoomRangeRef.current, event.key === 'ArrowLeft' ? -1 : 1));
    }
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const chart = initStatisticsEChart(host);
    chartRef.current = chart;
    zoomRangeRef.current = FULL_ZOOM_RANGE;
    const resetStatusTimer = window.setTimeout(() => setZoomRange(FULL_ZOOM_RANGE), 0);
    chart.setOption(statisticsChartOption(view, histogramBinCount, approxDigits), { notMerge: true });
    const handleDataZoom = (event: unknown) => {
      const nextRange = rangeFromDataZoomEvent(event);
      if (!nextRange) return;
      zoomRangeRef.current = nextRange;
      setZoomRange(nextRange);
    };
    chart.on('datazoom', handleDataZoom);
    const observer = typeof ResizeObserver === 'undefined'
      ? undefined
      : new ResizeObserver(() => chart.resize());
    observer?.observe(host);
    return () => {
      observer?.disconnect();
      window.clearTimeout(resetStatusTimer);
      chart.off('datazoom', handleDataZoom);
      chart.dispose();
      chartRef.current = null;
    };
  }, [approxDigits, histogramBinCount, view]);

  return (
    <div className="statistics-chart-frame">
      <div className="statistics-chart-toolbar" role="toolbar" aria-label="Chart controls">
        <button
          type="button"
          className="statistics-visualization-icon-button"
          aria-label="Zoom in"
          title="Zoom in"
          disabled={(zoomRange.end - zoomRange.start) <= MINIMUM_ZOOM_SPAN}
          onClick={() => applyZoomRange(zoomedRange(zoomRangeRef.current, 0.8))}
        >
          <ZoomIn aria-hidden="true" size={17} />
        </button>
        <button
          type="button"
          className="statistics-visualization-icon-button"
          aria-label="Zoom out"
          title="Zoom out"
          disabled={(zoomRange.end - zoomRange.start) >= 100}
          onClick={() => applyZoomRange(zoomedRange(zoomRangeRef.current, 1.25))}
        >
          <ZoomOut aria-hidden="true" size={17} />
        </button>
        <button
          type="button"
          className="statistics-visualization-icon-button"
          aria-label="Reset chart zoom"
          title="Reset chart zoom"
          disabled={(zoomRange.end - zoomRange.start) >= 100}
          onClick={() => applyZoomRange(FULL_ZOOM_RANGE)}
        >
          <RotateCcw aria-hidden="true" size={17} />
        </button>
        <output aria-label="Chart zoom" aria-live="polite">
          {Math.round(zoomRange.end - zoomRange.start)}%
        </output>
      </div>
      <div
        ref={hostRef}
        className="statistics-echart"
        data-testid="statistics-visualization-chart"
        data-zoom-start={zoomRange.start.toFixed(2)}
        data-zoom-end={zoomRange.end.toFixed(2)}
        role="img"
        tabIndex={0}
        aria-keyshortcuts="+ - 0 ArrowLeft ArrowRight"
        aria-label={`${view.ariaDescription} Interactive chart.`}
        onKeyDown={handleChartKeyDown}
      />
    </div>
  );
}
