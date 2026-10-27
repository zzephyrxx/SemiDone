import { useId, type CSSProperties } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  step?: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}

export default function ParameterSlider({ label, value, min, max, suffix = '', step = 1, onChange, onCommit }: Props) {
  const id = useId();
  return (
    <div className="parameter-slider">
      <div className="parameter-slider-heading"><label htmlFor={id}>{label}</label><output htmlFor={id}>{value}{suffix}</output></div>
      <input id={id} type="range" aria-label={label} aria-valuetext={`${value}${suffix}`} min={min} max={max} step={step}
        style={{ '--range-percent': `${(value - min) / (max - min) * 100}%` } as CSSProperties}
        value={value} onChange={(event) => onChange(Number(event.target.value))}
        onPointerUp={(event) => onCommit?.(Number(event.currentTarget.value))}
        onPointerCancel={(event) => onCommit?.(Number(event.currentTarget.value))}
        onBlur={(event) => onCommit?.(Number(event.currentTarget.value))}
        onKeyUp={(event) => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) onCommit?.(Number(event.currentTarget.value));
        }} />
    </div>
  );
}
