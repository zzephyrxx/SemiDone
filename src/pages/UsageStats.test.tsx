// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import UsageStats from './UsageStats';
import { useUsageStore } from '../store/usageStore';
import { useSettingsStore } from '../store/settingsStore';
const original = useUsageStore.getState();
afterEach(() => { cleanup(); useUsageStore.setState(original); });
it('shows four hour-based metric cards and removes all optical layers when glass is disabled', () => {
  useUsageStore.setState({ ...original, usageRecords: [], weeklyUsage: {}, monthlyUsage: {},
    stats: { ...original.stats, today: 45, averageDaily: 90, thisWeek: 120, thisMonth: 605 },
    loadUsageData: vi.fn().mockResolvedValue(undefined), calculateStats: vi.fn() });
  useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: true } } }));
  render(<UsageStats />);
  const overview = screen.getByLabelText('使用概览');
  expect(Array.from(overview.querySelectorAll('strong')).map(el => el.textContent)).toEqual(['0.8 小时', '1.5 小时', '2.0 小时', '10.1 小时']);
  expect(overview.querySelectorAll('[data-material="glass"]')).toHaveLength(4);
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } })));
  expect(document.querySelector('.rdev-glass-layer')).toBeNull();
  expect(overview.querySelectorAll('[data-material="solid"]')).toHaveLength(4);
});
