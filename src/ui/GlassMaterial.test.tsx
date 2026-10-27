// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Surface } from './Surface';
import LiquidGlassRuntime from '../components/LiquidGlassRuntime';
import { useSettingsStore } from '../store/settingsStore';
import { normalizeGlassPresetSettings } from '../utils/liquidGlassSettings';

// Evaluate the active rules for the OS preference that reproduced this regression.
// jsdom does not evaluate CSS media queries or the GPU filter itself.
function activeRules(rules: CSSRuleList): string {
  return Array.from(rules).map(rule => {
    if (rule.type === CSSRule.MEDIA_RULE) {
      const media = rule as CSSMediaRule;
      return media.conditionText.includes('prefers-reduced-transparency: reduce') ? activeRules(media.cssRules) : '';
    }
    if (rule.type === CSSRule.SUPPORTS_RULE) return '';
    return rule.cssText;
  }).join('\n');
}
let styles: HTMLStyleElement;
beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('prefers-reduced-transparency'), addEventListener() {}, removeEventListener() {} }));
  useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { enabled: true, blur: 6, refraction: 42, dispersion: true } } }));
  styles = document.createElement('style');
  const legacy = readFileSync(resolve('src/index.css'), 'utf8').replace(/^\s*@(?:import|tailwind)\b[^;]*;/gm, '');
  styles.textContent = legacy + ['liquidGlassDialogs.css', 'workspace.css', 'ui.css', 'liquidGlassSurfaces.css'].map(name => readFileSync(resolve('src/styles', name), 'utf8')).join('\n');
  document.head.append(styles);
  const evaluated = activeRules(styles.sheet!.cssRules);
  styles.textContent = evaluated;
});
afterEach(() => { cleanup(); styles.remove(); delete document.documentElement.dataset.theme; document.documentElement.classList.remove('dark'); document.body.classList.remove('transparent-mode'); vi.unstubAllGlobals(); });
const filter = (node: Element) => getComputedStyle(node).getPropertyValue('backdrop-filter');
function Scene() {
  return <><LiquidGlassRuntime /><Surface role="navigation"><nav className="workspace-nav ui-selection-host">
    <span className="ui-selection-indicator ui-selection-indicator--fill" />
    <span className="ui-selection-indicator ui-selection-indicator--optics"><Surface role="selection" /></span>
    <button className="workspace-nav-link"><svg aria-label="导航图标"><path d="M2 2h12v12H2z" /></svg><span>菜单</span></button>
  </nav></Surface><div className="workspace-shell">
    <header className="titlebar">标题栏</header><div className="home-toolbar"><div className="home-search"><input aria-label="搜索待办" /></div><button className="home-add-button">新建待办</button></div><article className="task-card completed">待办</article><section className="settings-section card">设置<div className="settings-tile"><button>设置选项</button></div></section>
  </div><div className="liquid-glass-modal-surface">关键弹窗</div><Surface role="dialog">新建弹窗</Surface></>;
}
describe('shared liquid glass rendering path', () => {
  it.each(['standard', 'extreme'] as const)('keeps the %s navigation icons and text in front of every glass layer', preset => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: normalizeGlassPresetSettings({ preset }) } }));
    const view = render(<Scene />);
    const label = view.container.querySelector('.workspace-nav-link')!;
    const optics = view.container.querySelector('.ui-selection-indicator--optics')!;
    expect(Number(getComputedStyle(label).zIndex)).toBeGreaterThan(Number(getComputedStyle(optics).zIndex));
    expect(getComputedStyle(label).filter).toBe('none');
    expect(filter(label)).toBe('none');
    for (const foreground of label.querySelectorAll('svg, span')) expect(getComputedStyle(foreground).filter).toBe('none');
    const lens = view.container.querySelector<HTMLElement>('.ui-surface--selection')!;
    if (preset === 'standard') expect(lens.style.getPropertyValue('--surface-filter')).toBe('blur(2.96px)');
    else expect(lens.style.getPropertyValue('--surface-filter')).toMatch(/^blur\(1\.11px\) url\(#.+-chromatic-refraction\)$/);
  });
  it('keeps the optical layer clear and preserves every face background when dispersion toggles', () => {
    const view = render(<Scene />);
    const lens = view.container.querySelector<HTMLElement>('.ui-surface--selection')!;
    expect(getComputedStyle(lens).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(lens).boxShadow).toBe('none');
    expect(lens.style.getPropertyValue('--surface-filter')).toContain('blur(1.85px)');
    const hosts = ['.ui-surface--navigation', '.titlebar', '.home-toolbar', '.task-card', '.settings-section'];
    const backgrounds = () => hosts.map(selector => getComputedStyle(view.container.querySelector(selector)!).background);
    const before = backgrounds();
    act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, dispersion: false } } })));
    expect(backgrounds()).toEqual(before);
    expect(getComputedStyle(lens).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(lens.style.getPropertyValue('--surface-filter')).not.toContain('chromatic');
  });
  it.each(['light', 'pink', 'dark'])('keeps both fill and optics beneath crisp foreground labels in the %s theme', theme => {
    document.documentElement.dataset.theme = theme;
    const view = render(<Scene />);
    const fill = getComputedStyle(view.container.querySelector('.ui-selection-indicator--fill')!);
    const label = getComputedStyle(view.container.querySelector('.workspace-nav-link')!);
    const optics = getComputedStyle(view.container.querySelector('.ui-selection-indicator--optics')!);
    expect(fill.background).toContain('linear-gradient');
    expect(fill.background).not.toContain('--primary');
    expect(fill.boxShadow).not.toContain('--primary');
    expect(Number(fill.zIndex)).toBeLessThan(Number(label.zIndex));
    expect(Number(optics.zIndex)).toBeLessThan(Number(label.zIndex));
    expect(label.filter).toBe('none'); expect(label.getPropertyValue('backdrop-filter')).toBe('none');
    expect(document.documentElement.style.getPropertyValue('--liquid-glass-surface-filter')).not.toMatch(/contrast|brightness|saturate/);
    if (theme === 'dark') expect(getComputedStyle(document.documentElement).getPropertyValue('--glass-highlight').trim()).toBe('.09');
  });
  it('keeps the search control and sticky gap unfiltered at the existing compact font size', () => {
    const view = render(<Scene />);
    const row = getComputedStyle(view.container.querySelector('.home-toolbar')!);
    expect(row.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(row.boxShadow).toBe('none'); expect(row.getPropertyValue('backdrop-filter')).toBe('none');
    const input = view.container.querySelector('.home-search input')!;
    expect(filter(input)).toBe('none');
    expect(getComputedStyle(input).fontSize).toContain('12px');
  });
  it('keeps glass only on explicit navigation/dialog layers when reduced transparency is requested', () => {
    const view = render(<Scene />);
    const navigation = view.container.querySelector('.ui-surface--navigation')!;
    const expected = filter(navigation);
    expect(expected).toContain('--liquid-glass-surface-filter');
    for (const selector of ['.titlebar', '.home-search input', '.task-card', '.settings-section', '.settings-tile', '.settings-tile button']) expect(filter(view.container.querySelector(selector)!)).toBe('none');
    expect(filter(view.container.querySelector('.ui-surface--dialog')!)).toBe(expected);
    expect(filter(view.container.querySelector('.liquid-glass-modal-surface')!)).toContain('--liquid-glass-surface-filter');
    expect(getComputedStyle(navigation).boxShadow).toBe('none');
    expect(getComputedStyle(view.container.querySelector('.liquid-glass-modal-surface')!).boxShadow).toBe('none');
    expect(document.documentElement.style.getPropertyValue('--liquid-glass-surface-filter')).toContain('url(#semidone-dialog-chromatic-refraction)');
  });
  it.each(['light', 'pink', 'dark'])('does not change ordinary card backgrounds or add shadows in %s, including legacy transparency rules', theme => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, theme: theme as 'light' | 'pink' | 'dark' } }));
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.add('transparent-mode');
    const view = render(<Scene />);
    const selectors = ['.home-search input', '.task-card', '.settings-section', '.settings-tile', '.home-add-button'];
    const backgrounds = () => selectors.map(selector => getComputedStyle(view.container.querySelector(selector)!).background);
    const before = backgrounds();
    for (const selector of ['.task-card', '.settings-section', '.settings-tile', '.titlebar']) {
      const node = view.container.querySelector(selector)!;
      expect(filter(node)).toBe('none'); expect(getComputedStyle(node).boxShadow).toBe('none');
    }
    act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } })));
    expect(backgrounds()).toEqual(before);
  });
  it('leaves a default Surface panel solid and allocates no glass definitions for it', () => {
    const view = render(<Surface>普通面板</Surface>);
    const panel = view.container.querySelector('.ui-surface')!;
    expect(panel).toHaveAttribute('data-material', 'solid'); expect(filter(panel)).toBe('none');
    expect(document.querySelector('.liquid-glass-filter-definitions')).toBeNull();
  });

  it('keeps magnification active with zero distortion and refreshes the actual navigation sampling map', () => {
    const view = render(<Surface role="selection" settings={{ enabled: true, blur: 1, refraction: 0, dispersion: true, strength: 0, rimWidth: .55, magnify: .5 }} />);
    const host = view.container.querySelector<HTMLElement>('.ui-surface')!;
    expect(host.style.getPropertyValue('--surface-filter')).toContain('url(');
    const id = host.style.getPropertyValue('--surface-filter').match(/url\(#([^)]*)\)/)![1];
    const firstMap = document.getElementById(id)!.querySelector('feImage')!.getAttribute('href');
    const firstScale = Number(document.getElementById(id)!.querySelector('feDisplacementMap')!.getAttribute('scale'));
    view.rerender(<Surface role="selection" settings={{ enabled: true, blur: 1, refraction: 0, dispersion: true, strength: 0, rimWidth: .55, magnify: 1 }} />);
    const displacement = document.getElementById(id)!.querySelector('feDisplacementMap')!;
    expect(Number(displacement.getAttribute('scale'))).toBeGreaterThan(0);
    expect(Number(displacement.getAttribute('scale'))).toBeCloseTo(firstScale * 2);
    // Increasing a uniform zoom changes its displacement scale even if the normalized bitmap is reusable.
    expect(document.getElementById(id)!.querySelector('feImage')!.getAttribute('href')).toBe(firstMap);
    view.rerender(<Surface role="selection" settings={{ enabled: true, blur: 1, refraction: 0, dispersion: false, strength: 0, rimWidth: .55, magnify: 0 }} />);
    expect(host.style.getPropertyValue('--surface-filter')).not.toContain('url(');
    expect(document.getElementById(id)).toBeNull();
  });
  it('puts size-specific SVG definitions outside the filtered host and releases them on unmount', () => {
    const view = render(<Surface role="navigation">菜单</Surface>);
    const host = view.container.querySelector<HTMLElement>('.ui-surface')!;
    const id = host.style.getPropertyValue('--surface-filter').match(/url\(#([^)]*)\)/)![1];
    const definition = document.getElementById(id)!;
    expect(definition).not.toBeNull(); expect(host.contains(definition)).toBe(false);
    expect(definition.closest('svg')?.parentElement).toBe(document.body);
    view.unmount(); expect(document.getElementById(id)).toBeNull();
  });
  it('turns every material off explicitly and updates refraction, blur and dispersion together', () => {
    const view = render(<Scene />);
    act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { enabled: true, blur: 10, refraction: 20, dispersion: false } } })));
    const shared = document.documentElement.style.getPropertyValue('--liquid-glass-surface-filter');
    expect(shared).toContain('url(#semidone-dialog-refraction)'); expect(shared).toContain('blur(20px)'); expect(shared).not.toContain('chromatic');
    act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, refraction: 0 } } })));
    expect(document.documentElement.style.getPropertyValue('--liquid-glass-surface-filter')).not.toContain('url(');
    expect(view.container.querySelector<HTMLElement>('.ui-surface')!.style.getPropertyValue('--surface-filter')).not.toContain('url(');
    act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } })));
    for (const selector of ['.ui-surface', '.titlebar', '.home-toolbar', '.task-card', '.settings-section']) expect(filter(view.container.querySelector(selector)!)).toBe('none');
  });
});
