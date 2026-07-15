import {
  init,
  use as registerEChartsModules,
  type ECharts,
  type EChartsCoreOption,
} from 'echarts/core';
import { BarChart, BoxplotChart, LineChart, ScatterChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

registerEChartsModules([
  BarChart,
  BoxplotChart,
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
  SVGRenderer,
]);

export type StatisticsEChartOption = EChartsCoreOption;

export function initStatisticsEChart(element: HTMLElement): ECharts {
  return init(element, undefined, { renderer: 'svg' });
}
