import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';

import { NotebookMathField } from '../math-field';

type NotebookViewportMathFieldProps = ComponentProps<typeof NotebookMathField> & {
  selected: boolean;
};

export function NotebookViewportMathField({
  selected,
  ...props
}: NotebookViewportMathFieldProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [hydrated, setHydrated] = useState(
    () => typeof globalThis.IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const host = hostRef.current;
    if (hydrated || selected || !host || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const root = host.closest('.notebook-rich-scroll-region');
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setHydrated(true);
        observer.disconnect();
      }
    }, {
      root,
      rootMargin: '1200px 0px',
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, [hydrated, selected]);

  return (
    <span ref={hostRef} className="notebook-math-field-viewport">
      {hydrated || selected ? <NotebookMathField {...props} /> : (
        <span
          aria-hidden="true"
          className="notebook-deferred-math-placeholder"
          data-notebook-deferred-math="true"
        >
          {props.value || props.placeholder || 'Math'}
        </span>
      )}
    </span>
  );
}
