import { useLayoutEffect, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { MOTION, useReducedMotion } from './motion';

/** Animate the new route without retaining an interactive copy of the old page. */
export function PageTransition() {
  const outlet = useOutlet();
  const location = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced) return;
    const animation = root.current?.animate?.([
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: MOTION.page, easing: 'cubic-bezier(.2,.8,.2,1)' });
    return () => animation?.cancel();
  }, [location.pathname, reduced]);
  return <div ref={root} className="workspace-page-transition" data-page-path={location.pathname}>{outlet}</div>;
}
