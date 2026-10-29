// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useSettingsStore } from '../store/settingsStore';
import LiquidGlassRuntime from '../components/LiquidGlassRuntime';
import { useReducedMotion } from './motion';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Status() { const reduced = useReducedMotion(); return <output>{reduced ? 'Off' : 'On'}</output>; }
it('lets the app switch control JS and CSS motion even when Windows requests reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: true } }));
  const style = document.createElement('style'); style.textContent = ['workspace.css', 'ui.css'].map(name => readFileSync(resolve('src/styles', name), 'utf8')).join('\n'); document.head.append(style);
  // Evaluate the actual reduced-motion rules too: the explicit app flag must win.
  const rules = Array.from(style.sheet!.cssRules).map(rule => rule.type === CSSRule.MEDIA_RULE
    ? Array.from((rule as CSSMediaRule).cssRules).map(child => child.cssText).join('\n') : rule.cssText).join('\n');
  style.textContent = rules;
  const view = render(<><LiquidGlassRuntime /><Status /><div className="home-task-row is-leaving"><div className="task-card">Task</div></div></>);
  expect(screen.getByText('On')).toBeVisible(); expect(document.documentElement.dataset.uiMotion).toBe('true');
  expect(getComputedStyle(view.container.querySelector('.task-card')!).animation).toContain('210ms');
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } })));
  expect(screen.getByText('Off')).toBeVisible(); expect(document.documentElement.dataset.uiMotion).toBe('false');
  expect(getComputedStyle(view.container.querySelector('.task-card')!).animation).toBe('none');
  style.remove();
});
