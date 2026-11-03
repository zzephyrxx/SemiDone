import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, ListTodo, Minimize2, Timer, Palette } from '../ui/icons';
import { APP_VERSION, RELEASE_FEATURES, RELEASE_MONTH } from '../data/release';
import { useDialogMotion } from '../ui/useDialogMotion';
import { Surface } from '../ui/Surface';
import { useDraggableDialog } from '../ui/useDraggableDialog';
import { useSettingsStore } from '../store/settingsStore';

const WELCOME_STORAGE_KEY = `welcome_shown_${APP_VERSION}`;
const FEATURE_ICONS = [ListTodo, Minimize2, Timer, Palette];

export default function StartupTip() {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const zenWindow = useSettingsStore(state => state.settings.zenMode?.enabled === true
    && state.settings.zenMode.active && state.settings.collapseMode === 'expanded');
  const { root, present } = useDialogMotion(show, !zenWindow);
  const drag = useDraggableDialog(present);

  useEffect(() => {
    if (localStorage.getItem(WELCOME_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setShow(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!show || !present) return;
    primaryActionRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShow(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, present]);

  const handleClose = () => {
    if (dontShowAgain) localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShow(false);
  };
  if (!present) return null;

  return (
    <div ref={root} data-no-overlay className="welcome-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-3">
      <Surface role="dialog" elementRef={drag.surface} htmlRole="dialog"
        aria-modal="true" aria-labelledby="welcome-dialog-title" aria-describedby="welcome-dialog-intro"
        data-glass-layout="unified"
        className="welcome-dialog liquid-glass-modal-surface release-dialog"
      >
        <button type="button" onClick={() => setShow(false)} aria-label="关闭欢迎弹窗" className="welcome-dialog-dismiss release-dismiss">
          <X size={17} />
        </button>
        <header {...drag.handle} aria-label="拖动公告弹窗" className="dialog-drag-handle welcome-dialog-header release-header">
          <div className="welcome-dialog-icon release-mark"><Sparkles size={22} /></div>
          <div>
            <h2 id="welcome-dialog-title">欢迎使用 SemiDone</h2>
            <p>V{APP_VERSION} · {RELEASE_MONTH}</p>
          </div>
        </header>
        <main className="welcome-dialog-body release-body">
          <section className="release-intro" aria-labelledby="welcome-release-highlights">
            <span className="release-eyebrow">V{APP_VERSION} 更新内容</span>
            <h3 id="welcome-release-highlights">少一点忙乱，多一点从容。</h3>
            <p id="welcome-dialog-intro">从记下一件小事，到安排一天的节奏，事半陪你把注意力留给重要的事。</p>
            <div className="release-orbit" aria-hidden="true"><span /><span /><span /></div>
          </section>
          <ul className="release-features" aria-label="版本亮点">
            {RELEASE_FEATURES.map((feature, index) => {
              const Icon = FEATURE_ICONS[index];
              return <li key={feature.title}>
                <span className="release-feature-icon" aria-hidden="true"><Icon size={19} /></span>
                <div><h4>{feature.title}</h4><p>{feature.description}</p></div>
              </li>;
            })}
          </ul>
          <aside className="release-note" aria-label="数据与使用提示">
            <strong>安心记录，定期留存</strong>
            <p>待办保存在本机，重要记录可在「设置 → 数据」中导出留存。关闭窗口默认收起到托盘，需要时随时唤回。</p>
          </aside>
        </main>
        <footer className="welcome-dialog-footer release-footer">
          <label>
            <input type="checkbox" checked={dontShowAgain} onChange={event => setDontShowAgain(event.target.checked)} />
            <span>本版本不再显示</span>
          </label>
          <button ref={primaryActionRef} type="button" onClick={handleClose}>开始体验</button>
        </footer>
      </Surface>
    </div>
  );
}
