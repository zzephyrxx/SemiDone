import { useLocation, useOutlet } from 'react-router-dom';

/** Keep route layout stable; pages appear immediately. */
export function PageTransition() {
  const outlet = useOutlet();
  const location = useLocation();
  return <div className="workspace-page-transition" data-page-path={location.pathname}>{outlet}</div>;
}
