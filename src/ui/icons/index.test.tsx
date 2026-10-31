// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Check } from './index';
import { useSettingsStore } from '../../store/settingsStore';

// Model the registry's imperative API, including its animated return to rest.
vi.mock('./vendor/check', async () => {
  const React = await import('react');
  return { CheckIcon: React.forwardRef(function CheckIcon(_, ref) {
    const [pose, setPose] = React.useState('rest');
    React.useImperativeHandle(ref, () => ({
      startAnimation: () => setPose('playing'),
      stopAnimation: () => setPose('returning'),
    }));
    return <svg data-testid="glyph" data-pose={pose} />;
  }) };
});
beforeEach(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: true } })));
afterEach(cleanup);
it('animates for pointer and keyboard interaction only while enabled', () => {
  render(<button>Complete<Check /></button>);
  const button = screen.getByRole('button');
  fireEvent.mouseEnter(button);
  expect(screen.getByTestId('glyph')).toHaveAttribute('data-pose', 'playing');
  fireEvent.mouseLeave(button);
  expect(screen.getByTestId('glyph')).toHaveAttribute('data-pose', 'returning');
  fireEvent.focusIn(button);
  expect(screen.getByTestId('glyph')).toHaveAttribute('data-pose', 'playing');
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } })));
  expect(screen.getByTestId('glyph')).toHaveAttribute('data-pose', 'rest');
  fireEvent.mouseEnter(button); fireEvent.focusIn(button); fireEvent.focusOut(button);
  expect(screen.getByTestId('glyph')).toHaveAttribute('data-pose', 'rest');
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: true } })));
  fireEvent.focusIn(button);
  expect(screen.getByTestId('glyph')).toHaveAttribute('data-pose', 'playing');
});
it('renders disabled icons in their resting pose from the first frame', () => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } }));
  render(<a href="#tasks"><Check />Tasks</a>);
  fireEvent.mouseEnter(screen.getByRole('link'));
  expect(screen.getByTestId('glyph')).toHaveAttribute('data-pose', 'rest');
});
