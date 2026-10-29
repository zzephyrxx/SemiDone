import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { MOTION, scheduleFrame, useReducedMotion } from './motion';

export function AnimatedCollapse({ open, children, id }: { open: boolean; children: ReactNode; id?: string }) {
  const reduced = useReducedMotion();
  const [present, setPresent] = useState(open);
  const [expanded, setExpanded] = useState(open);
  const region = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (region.current) region.current.inert = !open;
    if (reduced) { setPresent(open); setExpanded(open); return; }
    if (open) {
      setPresent(true);
      region.current?.getBoundingClientRect();
      return scheduleFrame(() => setExpanded(true));
    }
    setExpanded(false);
    const timer = window.setTimeout(() => setPresent(false), MOTION.disclosure + 40);
    return () => window.clearTimeout(timer);
  }, [open, reduced]);
  if (!open && (!present || reduced)) return null;
  return <div ref={region} id={id} className="ui-collapse" data-open={open && (expanded || reduced)}
    aria-hidden={!open} onTransitionEnd={(event) => {
      if (event.target === event.currentTarget && !open) setPresent(false);
    }}><div className="ui-collapse-clip">{children}</div></div>;
}

export function Disclosure({ label, open, onOpenChange, children }: {
  label: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode;
}) {
  const id = useId();
  return <div className="ui-disclosure">
    <button type="button" className="ui-disclosure-trigger" aria-expanded={open} aria-controls={id}
      onClick={() => onOpenChange(!open)}><span>{label}</span><ChevronDown size={14} /></button>
    <AnimatedCollapse open={open} id={id}>{children}</AnimatedCollapse>
  </div>;
}
