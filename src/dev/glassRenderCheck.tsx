// Local-only rendering fixture. No settings or task persistence calls.
import { createRoot } from 'react-dom/client';
import { useRef, useState } from 'react';
import { Surface } from '../ui/Surface';
import LiquidGlassRuntime from '../components/LiquidGlassRuntime';
import { useSettingsStore } from '../store/settingsStore';
import { useSelectionIndicator } from '../ui/SelectionIndicator';
import '../index.css';
import '../styles/liquidGlassDialogs.css';
import '../styles/workspace.css';
import '../styles/ui.css';
import '../styles/liquidGlassSurfaces.css';

useSettingsStore.setState(state => ({ settings: { ...state.settings, theme: 'light', collapseMode: 'expanded', liquidGlass: { enabled: true, blur: 6, refraction: 42, dispersion: true } } }));
document.documentElement.dataset.theme = 'light';
export function NavigationCheck() {
  const [active, setActive] = useState(0);
  const nav = useRef<HTMLElement>(null);
  const dispersion = useSettingsStore(state => state.settings.liquidGlass.dispersion);
  const theme = useSettingsStore(state => state.settings.theme);
  useSelectionIndicator(nav, String(active));
  return <>
    <button type="button" aria-pressed={dispersion} onClick={() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, dispersion: !dispersion } } }))}>边缘色散：{dispersion ? '开' : '关'}</button>
    {(['light', 'pink', 'dark'] as const).map((value, index) => <button key={value} type="button" aria-pressed={theme === value} style={{ marginLeft: 12 }} onClick={() => {
      document.documentElement.dataset.theme = value;
      document.documentElement.classList.toggle('dark', value === 'dark');
      useSettingsStore.setState(state => ({ settings: { ...state.settings, theme: value } }));
    }}>{['明亮', '梦粉', '深色'][index]}</button>)}
    <p style={{ margin: '12px 0' }}>依次点击导航，检查可见底板、文字清晰度及窄边缘；条纹仅为测试背景。</p>
    <Surface role="navigation"><nav ref={nav} className="workspace-nav ui-selection-host" aria-label="玻璃导航检查">
      <span className="ui-selection-indicator ui-selection-indicator--fill" aria-hidden="true" />
      <span className="ui-selection-indicator ui-selection-indicator--optics" aria-hidden="true"><Surface role="selection" /></span>
      {['待办', '日历', '统计', '设置'].map((label, index) => <button type="button" key={label} className={`workspace-nav-link${index === active ? ' is-active' : ''}`} aria-current={index === active ? 'page' : undefined} onClick={() => setActive(index)}>{label}</button>)}
    </nav></Surface>
  </>;
}
createRoot(document.getElementById('root')!).render(<>
  <LiquidGlassRuntime />
  <div className="workspace-shell" style={{ padding: 20, height: '100%', overflow: 'auto', backgroundImage: 'repeating-linear-gradient(120deg, hsl(var(--muted)) 0 18px, hsl(var(--background)) 18px 36px)' }}>
    <header className="titlebar" style={{ marginBottom: 20 }}>顶部菜单栏</header>
    <NavigationCheck />
    <div className="home-toolbar" style={{ display: 'flex', gap: 8, marginTop: 24 }}><div className="home-search" style={{ flex: 1 }}><input aria-label="搜索待办" placeholder="搜索待办…" style={{ width: '100%', borderRadius: 12, paddingLeft: 12 }} /></div><button type="button" className="home-add-button btn-primary" style={{ paddingInline: 12, borderRadius: 12 }}>新建待办</button></div>
    <section className="settings-section card" style={{ marginTop: 24, padding: 20 }}><h2>设置卡片</h2><div className="settings-tile" style={{ padding: 16 }}>设置条目</div></section>
    <article className="task-card" style={{ marginTop: 24, padding: 20 }}>待办卡片</article>
    <section className="home-overview" style={{ marginTop: 24, padding: 20 }}>概览面板</section>
    <div className="liquid-glass-modal-surface" style={{ marginTop: 24, padding: 20 }}>现有弹窗材质参照</div>
  </div>
</>);
