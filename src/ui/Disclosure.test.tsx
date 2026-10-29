// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedCollapse } from './Disclosure';
import { useSettingsStore } from '../store/settingsStore';

beforeEach(() => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: true } }));
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('disclosure interruption', () => {
  it('makes closing controls inert and cancels removal when reopened quickly', () => {
    const view = render(<AnimatedCollapse open><button>Control</button></AnimatedCollapse>);
    view.rerender(<AnimatedCollapse open={false}><button>Control</button></AnimatedCollapse>);
    expect(screen.getByText('Control').closest<HTMLElement>('.ui-collapse')?.inert).toBe(true);
    view.rerender(<AnimatedCollapse open><button>Control</button></AnimatedCollapse>);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText('Control')).toBeVisible();
    expect(screen.getByText('Control').closest<HTMLElement>('.ui-collapse')?.inert).toBe(false);
  });
  it('removes closed content immediately when interface animations are disabled', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } }));
    const view = render(<AnimatedCollapse open><button>Control</button></AnimatedCollapse>);
    view.rerender(<AnimatedCollapse open={false}><button>Control</button></AnimatedCollapse>);
    expect(screen.queryByText('Control')).not.toBeInTheDocument(); expect(vi.getTimerCount()).toBe(0);
  });
});
