import { type ButtonHTMLAttributes, type RefObject } from 'react';
import { Surface } from './Surface';

/** Keep a real button and its focus/input state independent of the material. */
export function GlassButton({ children, className = '', buttonRef, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  return <div className="glass-action">
    <Surface role="control" aria-hidden="true" className="glass-action-material" />
    <button {...props} ref={buttonRef} className={`glass-action-button ${className}`}>{children}</button>
  </div>;
}
