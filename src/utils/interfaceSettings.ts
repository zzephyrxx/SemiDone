export function normalizeFontScale(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(90, Math.min(130, Math.round(value / 5) * 5)) : 100;
}
