import { useCallback, useEffect, useRef, useState } from 'react';
import { scheduleFrame } from './motion';

/** Preview locally; commit only at an interaction boundary, not on every input. */
export function useCommittedDraft<T extends object>(value: T, onCommit: (updates: Partial<T>) => void) {
  const [draft, setDraft] = useState(value);
  const latest = useRef(value);
  const saved = useRef(value);
  const commitCallback = useRef(onCommit); commitCallback.current = onCommit;
  const cancelFrame = useRef<() => void>(() => {});
  const publish = useCallback((updates: Partial<T>) => {
    latest.current = { ...latest.current, ...updates };
    cancelFrame.current();
    cancelFrame.current = scheduleFrame(() => setDraft(latest.current));
  }, []);
  const commit = useCallback(() => {
    const updates: Partial<T> = {};
    for (const key of Object.keys(latest.current) as (keyof T)[]) {
      if (latest.current[key] !== saved.current[key]) updates[key] = latest.current[key];
    }
    if (!Object.keys(updates).length) return;
    saved.current = latest.current;
    commitCallback.current(updates);
  }, []);
  useEffect(() => {
    const merged = { ...value };
    for (const key of Object.keys(value) as (keyof T)[]) {
      if (latest.current[key] !== saved.current[key] && value[key] === saved.current[key]) merged[key] = latest.current[key];
    }
    saved.current = value;
    latest.current = merged;
    cancelFrame.current();
    setDraft(merged);
  }, [value]);
  useEffect(() => () => { cancelFrame.current(); commit(); }, [commit]);
  return { draft, preview: publish, commit };
}
