// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('../../platform/distribution', () => ({ isAppStore: true, privacyPolicyUrl: '' }));
import AboutSettingsSection from './AboutSettingsSection';
import DataSettingsSection from './DataSettingsSection';
import AppearanceSettingsSection from './AppearanceSettingsSection';
import { useSettingsStore } from '../../store/settingsStore';

afterEach(cleanup);

describe('App Store settings', () => {
  it('never starts a GitHub update request or offers external tipping', () => {
    const check = vi.fn();
    render(<AboutSettingsSection appVersion="7.0.0" checkForUpdate={check} />);
    expect(check).not.toHaveBeenCalled();
    expect(screen.getByText('7.0.0')).toBeVisible();
    expect(screen.queryByText('作者')).not.toBeInTheDocument();
    expect(screen.queryByText('博客')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打赏' })).not.toBeInTheDocument();
    expect(screen.queryByAltText('微信打赏码')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '隐私政策' }));
    expect(screen.getByRole('dialog', { name: '隐私政策' })).toBeVisible();
    expect(screen.getByText(/不发送给开发者/)).toBeVisible();
  });

  it('keeps export and container access, without offering directory migration', () => {
    const open = vi.fn();
    const change = vi.fn();
    const exportData = vi.fn();
    render(<DataSettingsSection dataDir="/container/data" onOpenDirectory={open}
      onChangeDirectory={change} onExport={exportData} onClear={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '更改' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '打开数据目录' }));
    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(open).toHaveBeenCalledOnce();
    expect(exportData).toHaveBeenCalledOnce();
    expect(change).not.toHaveBeenCalled();
  });

  it('keeps glass controls and floating mode without a transparent window switch', () => {
    render(<AppearanceSettingsSection settings={useSettingsStore.getState().settings}
      onThemeChange={vi.fn()} onLiquidGlassChange={vi.fn()} onToggleAutoStart={vi.fn()}
      onTransparencyToggle={vi.fn()} onTransparencyLevelChange={vi.fn()} onToggleCapsuleMode={vi.fn()} />);
    expect(screen.queryByRole('switch', { name: '透明模式' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '液态玻璃' })).toBeVisible();
    expect(screen.getByRole('switch', { name: '悬浮球模式' })).toBeVisible();
  });

  it('places the separate animation control before the floating mode switch', () => {
    const change = vi.fn();
    const settings = { ...useSettingsStore.getState().settings, useCapsuleMode: true, animationsEnabled: true, floatingBallAnimationEnabled: true };
    const { rerender } = render(<AppearanceSettingsSection settings={settings}
      onThemeChange={vi.fn()} onLiquidGlassChange={vi.fn()} onToggleAutoStart={vi.fn()}
      onTransparencyToggle={vi.fn()} onTransparencyLevelChange={vi.fn()} onToggleCapsuleMode={vi.fn()}
      onFloatingBallAnimationChange={change} />);
    const animation = screen.getByRole('button', { name: '悬浮球动效' });
    expect(animation.compareDocumentPosition(screen.getByRole('switch', { name: '悬浮球模式' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(animation);
    expect(change).toHaveBeenCalledWith(false);
    rerender(<AppearanceSettingsSection settings={{ ...settings, animationsEnabled: false }}
      onThemeChange={vi.fn()} onLiquidGlassChange={vi.fn()} onToggleAutoStart={vi.fn()}
      onTransparencyToggle={vi.fn()} onTransparencyLevelChange={vi.fn()} onToggleCapsuleMode={vi.fn()} />);
    expect(screen.getByRole('button', { name: '悬浮球动效' })).toBeDisabled();
    rerender(<AppearanceSettingsSection settings={{ ...settings, useCapsuleMode: false }}
      onThemeChange={vi.fn()} onLiquidGlassChange={vi.fn()} onToggleAutoStart={vi.fn()}
      onTransparencyToggle={vi.fn()} onTransparencyLevelChange={vi.fn()} onToggleCapsuleMode={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '悬浮球动效' })).not.toBeInTheDocument();
  });
});
