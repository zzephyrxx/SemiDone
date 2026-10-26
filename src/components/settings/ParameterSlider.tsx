import { useId } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export default function ParameterSlider({ label, value, min, max, suffix = '', onChange }: Props) {
  const id = useId();
  return (
    <label className="parameter-slider" htmlFor={id}>
      <span className="parameter-slider-label">{label}</span>
      <input id={id} type="range" aria-label={label} min={min} max={max} step={1}
        value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <output htmlFor={id}>{value}{suffix}</output>
    </label>
  );
}
