import { useEffect, useState } from 'react';

export function usePendingElapsedNow(active: boolean) {
  const [elapsedNowMs, setElapsedNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const refreshTimeoutId = window.setTimeout(() => {
      setElapsedNowMs(Date.now());
    }, 0);
    const intervalId = window.setInterval(() => {
      setElapsedNowMs(Date.now());
    }, 250);

    return () => {
      window.clearTimeout(refreshTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [active]);

  return elapsedNowMs;
}
