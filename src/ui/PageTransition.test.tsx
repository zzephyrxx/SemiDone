// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { PageTransition } from './PageTransition';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); Reflect.deleteProperty(HTMLElement.prototype, 'animate'); });
function Home() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count {count}</button>;
}
it('animates route entry once, avoids replaying it on state updates, and keeps no interactive old route', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: true } }));
  const cancel = vi.fn(), animate = vi.fn(() => ({ cancel } as unknown as Animation));
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
  render(<MemoryRouter><Link to="/settings">Settings</Link><Link to="/">Home</Link><Routes><Route element={<PageTransition />}>
    <Route index element={<Home />} /><Route path="settings" element={<p>Settings content</p>} />
  </Route></Routes></MemoryRouter>);
  expect(animate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Count 0')); expect(animate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText('Settings')); expect(animate).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Count 1')).not.toBeInTheDocument();
  expect(screen.getByText('Settings content')).toBeVisible();
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } })));
  expect(cancel).toHaveBeenCalled();
  fireEvent.click(screen.getByText('Home')); expect(animate).toHaveBeenCalledTimes(2);
});
