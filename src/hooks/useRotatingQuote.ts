import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../types';
import { getQuotesByTheme } from '../data/quotes';

function readIndex() {
  try {
    const value = Number.parseInt(localStorage.getItem('quoteIndex') ?? '0', 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch { return 0; }
}

export function useRotatingQuote(theme: Theme, active = true) {
  const quotes = getQuotesByTheme(theme);
  const [index, setIndex] = useState(readIndex);
  const latest = useRef(index);
  useEffect(() => {
    if (!active || !quotes.length) return;
    latest.current = readIndex() % quotes.length;
    setIndex(latest.current);
    const timer = setInterval(() => {
      latest.current = (latest.current + 1) % quotes.length;
      setIndex(latest.current);
      try { localStorage.setItem('quoteIndex', String(latest.current)); } catch { /* Keep rotating if browser storage is unavailable. */ }
    }, 5000);
    return () => clearInterval(timer);
  }, [active, quotes.length, theme]);
  return quotes[index % quotes.length] ?? '';
}
