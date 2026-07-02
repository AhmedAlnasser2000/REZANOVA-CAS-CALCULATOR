import { useEffect, useState } from 'react';

export function usePendingElapsedNow(active: boolean) {
  const [elapsedNowMs, setElapsedNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    setElapsedNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setElapsedNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [active]);

  return elapsedNowMs;
}
