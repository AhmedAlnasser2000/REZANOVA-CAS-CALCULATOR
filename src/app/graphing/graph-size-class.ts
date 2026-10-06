import { useEffect, useState } from 'react';

// Window size classes for the Graph layout (GRAPHING-UI1), Material 3's widths
// in CSS pixels. UI scale is native zoom, so a larger scale simply gives fewer
// CSS pixels and moves the window down a class (1440 px at 150 % is expanded).

export type GraphSizeClass = 'compact' | 'medium' | 'expanded' | 'large' | 'extra-large';

export function graphSizeClass(width: number): GraphSizeClass {
  if (width < 600) return 'compact';
  if (width < 840) return 'medium';
  if (width < 1200) return 'expanded';
  if (width < 1600) return 'large';
  return 'extra-large';
}

export function useWindowSizeClass(): GraphSizeClass {
  const [sizeClass, setSizeClass] = useState(() => graphSizeClass(typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    const update = () => setSizeClass(graphSizeClass(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return sizeClass;
}
