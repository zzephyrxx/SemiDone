import { useId, useRef } from 'react';
import { ChevronDown, ChevronUp } from '../ui/icons';

interface Props {
  label: string;
  value: number | string;
  min: number;
  max: number;
  onValueChange: (value: string) => void;
  className?: string;
}

/** Explicit themed arrows: WebKit's native number spinner can remain black. */
export default function NumberInput({ label, value, min, max, onValueChange, className = '' }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const number = value !== '' && Number.isFinite(Number(value)) ? Number(value) : min;
  const step = (delta: number) => {
    onValueChange(String(Math.max(min, Math.min(max, number + delta))));
    input.current?.focus();
  };
  return <div className={`number-input ${className}`}>
    <input ref={input} id={id} type="text" role="spinbutton" inputMode="numeric"
      autoComplete="off" aria-label={label} aria-valuemin={min} aria-valuemax={max}
      aria-valuenow={value === '' ? undefined : number} value={value}
      onChange={event => {
        if (/^\d*$/.test(event.target.value)) onValueChange(event.target.value);
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault(); step(event.key === 'ArrowUp' ? 1 : -1);
        }
      }} />
    <div className="number-input-buttons">
      <button type="button" aria-label={`增加${label}`} disabled={number >= max}
        onMouseDown={event => event.preventDefault()} onClick={() => step(1)}><ChevronUp size={12} /></button>
      <button type="button" aria-label={`减少${label}`} disabled={number <= min}
        onMouseDown={event => event.preventDefault()} onClick={() => step(-1)}><ChevronDown size={12} /></button>
    </div>
  </div>;
}
