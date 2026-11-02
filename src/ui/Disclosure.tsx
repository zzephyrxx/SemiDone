import { useId, type ReactNode } from 'react';
import { ChevronDown } from './icons';

export function AnimatedCollapse({ open, children, id }: { open: boolean; children: ReactNode; id?: string }) {
  if (!open) return null;
  return <div id={id} className="ui-collapse" data-open="true"><div className="ui-collapse-clip">{children}</div></div>;
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
