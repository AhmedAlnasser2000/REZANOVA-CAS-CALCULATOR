export type DisplayRenderProfilePhase =
  | 'math-static-convert'
  | 'math-static-visible';

export type DisplayRenderProfileSample = {
  phase: DisplayRenderProfilePhase;
  durationMs?: number;
  latexLength: number;
  notationMode?: string;
  block?: boolean;
  deferred?: boolean;
  className?: string;
  timestampMs: number;
};

type DisplayRenderProfilingEnv = {
  DEV?: unknown;
  VITE_DISPLAY_RENDER_PROFILING?: unknown;
};

type DisplayRenderProfilingLogger = (label: string, sample: DisplayRenderProfileSample) => void;

function currentTimestampMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function importMetaEnv(): DisplayRenderProfilingEnv | undefined {
  return (import.meta as unknown as { env?: DisplayRenderProfilingEnv }).env;
}

export function isDisplayRenderProfilingEnabled(env: DisplayRenderProfilingEnv | undefined = importMetaEnv()) {
  return env?.DEV === true && env.VITE_DISPLAY_RENDER_PROFILING === '1';
}

export function logDisplayRenderProfile(
  sample: Omit<DisplayRenderProfileSample, 'timestampMs'>,
  options: {
    env?: DisplayRenderProfilingEnv;
    logger?: DisplayRenderProfilingLogger;
  } = {},
) {
  if (!isDisplayRenderProfilingEnabled(options.env)) {
    return;
  }

  const logger = options.logger ?? console.info;
  logger('[display-render-profile]', {
    ...sample,
    timestampMs: currentTimestampMs(),
  });
}

export function profileDisplayRenderConversion<T>(
  sample: Omit<DisplayRenderProfileSample, 'phase' | 'durationMs' | 'timestampMs'>,
  render: () => T,
) {
  if (!isDisplayRenderProfilingEnabled()) {
    return render();
  }

  const startedAt = currentTimestampMs();
  try {
    return render();
  } finally {
    logDisplayRenderProfile({
      ...sample,
      phase: 'math-static-convert',
      durationMs: currentTimestampMs() - startedAt,
    });
  }
}

export function getDisplayRenderProfileStart() {
  return currentTimestampMs();
}

export function scheduleDisplayRenderVisibleProfile(
  sample: Omit<DisplayRenderProfileSample, 'phase' | 'durationMs' | 'timestampMs'>,
  startedAt: number,
) {
  if (!isDisplayRenderProfilingEnabled()) {
    return () => undefined;
  }

  let cancelled = false;
  const timeoutId = globalThis.setTimeout(() => {
    if (cancelled) {
      return;
    }

    logDisplayRenderProfile({
      ...sample,
      phase: 'math-static-visible',
      durationMs: currentTimestampMs() - startedAt,
    });
  }, 0);

  return () => {
    cancelled = true;
    globalThis.clearTimeout(timeoutId);
  };
}
