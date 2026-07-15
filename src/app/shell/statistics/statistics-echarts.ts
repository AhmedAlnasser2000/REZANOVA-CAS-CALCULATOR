import {
  init,
  use as registerEChartsModules,
  type ECharts,
} from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

registerEChartsModules([SVGRenderer]);

export function initStatisticsEChart(element: HTMLElement): ECharts {
  return init(element, undefined, { renderer: 'svg' });
}
