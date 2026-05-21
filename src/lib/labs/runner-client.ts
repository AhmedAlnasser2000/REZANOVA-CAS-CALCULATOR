import type { LabRunRequest, LabRunResult, LabRunnerSummary } from './runner-types';

const LAB_RUNNER_BASE_PATH = '/__calcwiz_labs';

type FetchLike = typeof fetch;

async function readJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error === 'string'
      ? payload.error
      : `Labs runner request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function labsRunnerUiEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_ENABLE_LAB_RUNNERS === '1';
}

export async function fetchLabRunners(fetchImpl: FetchLike = fetch) {
  const response = await fetchImpl(`${LAB_RUNNER_BASE_PATH}/runners`);
  return readJsonResponse<LabRunnerSummary[]>(response);
}

export async function runLabExperiment(
  request: LabRunRequest,
  fetchImpl: FetchLike = fetch,
) {
  const response = await fetchImpl(`${LAB_RUNNER_BASE_PATH}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  return readJsonResponse<LabRunResult>(response);
}
