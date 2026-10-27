// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import LiquidGlassRuntime from '../components/LiquidGlassRuntime';
import { useSettingsStore } from '../store/settingsStore';

let style: HTMLStyleElement;
afterEach(() => { cleanup(); style?.remove(); });
function install(width = 550, height = 900) {
  style = document.createElement('style');
  style.textContent = ['workspace.css', 'ui.css'].map(name => readFileSync(resolve('src/styles', name), 'utf8')).join('\n');
  document.head.append(style);
  // jsdom does not evaluate viewport queries; select the real responsive rules here.
  const flatten = (rules: CSSRuleList): string => Array.from(rules).map(rule => {
    if (rule.type !== CSSRule.MEDIA_RULE) return rule.cssText;
    const media = rule as CSSMediaRule;
    const matches = /\((min|max)-(width|height):\s*(\d+)px\)/.exec(media.conditionText);
    if (!matches) return '';
    const value = matches[2] === 'width' ? width : height;
    return (matches[1] === 'min' ? value >= Number(matches[3]) : value <= Number(matches[3])) ? flatten(media.cssRules) : '';
  }).join('\n');
  style.textContent = flatten(style.sheet!.cssRules);
}
function Pages() {
  return <div className="workspace-shell">{['home-page-content', 'settings-page', 'usage-page', 'calendar-page'].map((name, index) => <section key={name} className={`workspace-page ${name}`}>
    <h2 className={index % 2 ? 'text-base' : 'text-lg'}>Section</h2>
    <p className="text-sm">Body</p><p className="text-xs">Caption</p>
    <div className="task-card"><h3>Task</h3><input className="task-title-input" /></div>
  </section>)}</div>;
}
it.each([100, 130])('uses the same text roles on every page at %s percent without enlarging the editor', scale => {
  install(); useSettingsStore.setState(state => ({ settings: { ...state.settings, fontScale: scale } }));
  const view = render(<><LiquidGlassRuntime /><Pages /></>);
  expect(document.documentElement.style.getPropertyValue('--ui-font-scale')).toBe(String(scale / 100));
  for (const page of view.container.querySelectorAll('.workspace-page')) {
    expect(getComputedStyle(page.querySelector('h2')!).fontSize).toBe('var(--type-section)');
    expect(getComputedStyle(page.querySelector('p.text-sm')!).fontSize).toBe('var(--type-body)');
    expect(getComputedStyle(page.querySelector('p.text-xs')!).fontSize).toBe('var(--type-caption)');
    expect(getComputedStyle(page.querySelector('h3')!).fontSize).toBe(getComputedStyle(page.querySelector('input')!).fontSize);
  }
});
it.each([[550, 900, '8px', '68px'], [400, 700, '6px', '68px'], [1040, 900, '16px', '0px']] as const)('shares page spacing at %s x %s', (width, height, top, offset) => {
  install(width, height);
  const view = render(<div className="workspace-shell"><main className="workspace-content"><Pages /></main><main className="workspace-content workspace-content--home" /></div>);
  expect(getComputedStyle(view.container.querySelector('.workspace-shell')!).getPropertyValue('--page-inset-top').trim()).toBe(top);
  const parents = view.container.querySelectorAll('.workspace-content');
  expect(getComputedStyle(parents[0]).paddingTop).toBe(offset); expect(getComputedStyle(parents[1]).paddingTop).toBe(offset);
  const paddings = Array.from(view.container.querySelectorAll('.workspace-page'), page => getComputedStyle(page).paddingTop);
  expect(new Set(paddings).size).toBe(1);
});
