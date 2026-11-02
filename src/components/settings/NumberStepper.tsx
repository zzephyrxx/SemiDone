import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from '../../ui/icons';

interface Props {
  label: string;
  min: number;
  max: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}

export default function NumberStepper({ label, min, max, value, suffix = '', onChange }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const draftRef = useRef(String(value));
  const current = useRef(value);
  const change = useRef(onChange);
  change.current = onChange;
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);
  const skipPointerClick = useRef(false);
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next)));
  const readDraft = () => draftRef.current.trim() !== '' && Number.isFinite(Number(draftRef.current))
    ? clamp(Number(draftRef.current)) : current.current;
  const show = (next: number) => {
    draftRef.current = String(next);
    setDraft(String(next));
  };
  const select = (next: number) => {
    const selected = clamp(next);
    show(selected);
    if (selected === current.current) return;
    current.current = selected;
    change.current(selected);
  };
  const stopHold = useCallback(() => {
    holding.current = false;
    if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }, []);

  useEffect(() => {
    current.current = value;
    draftRef.current = String(value);
    setDraft(String(value));
  }, [value]);
  useEffect(() => {
    const stopWhenHidden = () => { if (document.hidden) stopHold(); };
    window.addEventListener('blur', stopHold);
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      stopHold();
      window.removeEventListener('blur', stopHold);
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, [stopHold]);

  const stepBy = (direction: number) => {
    const next = clamp(readDraft() + direction);
    select(next);
    return direction > 0 ? next < max : next > min;
  };
  const startHold = (direction: number) => {
    stopHold();
    skipPointerClick.current = true;
    if (!stepBy(direction)) return;
    holding.current = true;
    const repeat = () => {
      if (!holding.current) return;
      if (stepBy(direction)) holdTimer.current = setTimeout(repeat, 65);
      else stopHold();
    };
    holdTimer.current = setTimeout(repeat, 350);
  };
  const displayedNumber = draft.trim() !== '' && Number.isFinite(Number(draft)) ? clamp(Number(draft)) : value;

  return <div className="zen-number-stepper">
    <label htmlFor={id} className="zen-stepper-label">{label}</label>
    <div className="zen-stepper-control">
      <div className="zen-stepper-value">
        <input id={id} className="zen-stepper-input" type="text" inputMode="numeric" role="spinbutton"
          autoComplete="off" spellCheck={false} aria-valuemin={min} aria-valuemax={max}
          aria-valuenow={displayedNumber} aria-valuetext={`${displayedNumber}${suffix}`}
          value={draft} onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => { draftRef.current = event.target.value; setDraft(event.target.value); }}
          onBlur={() => select(readDraft())}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              select(readDraft());
              event.currentTarget.select();
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              show(current.current);
              return;
            }
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            const next = { ArrowUp: readDraft() + 1, ArrowDown: readDraft() - 1, PageUp: readDraft() + 10, PageDown: readDraft() - 10, Home: min, End: max }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            select(next);
          }} />
        <span aria-hidden="true">{suffix}</span>
      </div>
      <div className="zen-stepper-buttons">
        {[1, -1].map((direction) => <button key={direction} type="button"
          aria-label={`${direction > 0 ? '增加' : '减少'}${label}`}
          disabled={direction > 0 ? displayedNumber >= max : displayedNumber <= min}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            startHold(direction);
          }}
          onPointerUp={stopHold} onPointerCancel={stopHold} onLostPointerCapture={stopHold} onBlur={stopHold}
          onClick={(event) => {
            // Pointer-down already applies the first step; keyboard/assistive clicks still work.
            if (event.detail === 0 || !skipPointerClick.current) stepBy(direction);
            skipPointerClick.current = false;
          }}>
          {direction > 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>)}
      </div>
    </div>
  </div>;
}
