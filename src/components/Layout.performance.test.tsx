// @vitest-environment jsdom
import { Profiler } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';
import { useSettingsStore } from '../store/settingsStore';
import { useUsageStore } from '../store/usageStore';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false, invoke: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./UserProfileModal', () => ({ default: () => null }));
vi.mock('./CloseConfirmDialog', () => ({ default: () => null }));
vi.mock('./FloatingBall', () => ({ default: () => null }));
vi.mock('./ZenMode', () => ({ default: () => null }));
afterEach(cleanup);
function LegacySubscription() { useUsageStore(); return null; }
it('isolates 60 clock ticks from the expanded shell while keeping the bar clock live', () => {
  useSettingsStore.setState({ settings: { ...useSettingsStore.getState().settings, collapseMode: 'expanded', zenMode: undefined } });
  const commits = { legacy: 0, shell: 0 };
  render(<><Profiler id="legacy" onRender={() => commits.legacy++}><LegacySubscription /></Profiler>
    <Profiler id="shell" onRender={() => commits.shell++}><MemoryRouter><Layout /></MemoryRouter></Profiler></>);
  commits.legacy = 0; commits.shell = 0;
  for (let i = 0; i < 60; i++) act(() => useUsageStore.setState(state => ({ pomodoro: { ...state.pomodoro, timeLeft: 1500 - i } })));
  expect(commits).toEqual({ legacy: 60, shell: 0 });
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'bar' } })));
  commits.shell = 0;
  for (let i = 0; i < 3; i++) act(() => useUsageStore.setState(state => ({ pomodoro: { ...state.pomodoro, timeLeft: 100 - i } })));
  expect(commits.shell).toBe(3);
});
