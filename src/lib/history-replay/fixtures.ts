import calculate from './fixtures/v1/calculate.json';
import calculus from './fixtures/v1/calculus.json';
import equation from './fixtures/v1/equation.json';
import geometry from './fixtures/v1/geometry.json';
import matrix from './fixtures/v1/matrix.json';
import statistics from './fixtures/v1/statistics.json';
import table from './fixtures/v1/table.json';
import trigonometry from './fixtures/v1/trigonometry.json';
import vector from './fixtures/v1/vector.json';
import type { HistoryReplayFixtureFile } from './fixture-contract';

export const HISTORY_REPLAY_FIXTURE_FILES = [
  calculate,
  equation,
  calculus,
  matrix,
  vector,
  table,
  trigonometry,
  statistics,
  geometry,
] as unknown as readonly HistoryReplayFixtureFile[];

export const HISTORY_REPLAY_FIXTURES = HISTORY_REPLAY_FIXTURE_FILES.flatMap(
  (file) => file.fixtures,
);
