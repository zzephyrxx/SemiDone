// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../types';
import type { UpdateCheckResult } from '../../services/githubUpdateService';
import AboutSettingsSection from './AboutSettingsSection';
import AppearanceSettingsSection from './AppearanceSettingsSection';
import DataSettingsSection from './DataSettingsSection';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const settings: Settings = {
  theme: 'light',
  liquidGlass: {
    enabled: true,
    blur: 6,
    refraction: 42,
    dispersion: true,
  },
  notifications: true,
  autoSave: true,
  isPinned: false,
  isCollapsed: false,
  collapseMode: 'expanded',
  useCapsuleMode: false,
  transparentEnabled: false,
  transparentLevel: 100,
  autoStart: false,
};

const currentResult: UpdateCheckResult = {
  status: 'current',
  currentVersion: '5.0.0',
  latestVersion: '5.0.0',
  releaseName: 'SemiDone 5.0.0',
  notes: '',
  releaseUrl: 'https://github.com/zzephyrxx/SemiDone/releases/tag/SemiDone-v5.0.0',
  publishedAt: '2026-07-17T08:00:00Z',
};

describe('settings page sections', () => {
  it('shows close-to-tray enabled for old settings and allows disabling it', () => {
    const onCloseToTrayChange = vi.fn();
    render(<AppearanceSettingsSection settings={settings}
      onThemeChange={vi.fn()} onLiquidGlassChange={vi.fn()} onToggleAutoStart={vi.fn()}
      onTransparencyToggle={vi.fn()} onTransparencyLevelChange={vi.fn()} onToggleCapsuleMode={vi.fn()}
      onCloseToTrayChange={onCloseToTrayChange} />);
    const toggle = screen.getByRole('switch', { name: '关闭到托盘' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(onCloseToTrayChange).toHaveBeenCalledWith(false);
  });

  it('keeps appearance actions controlled by the page', () => {
    const onThemeChange = vi.fn();
    const onToggleAutoStart = vi.fn();
    const onLiquidGlassChange = vi.fn();
    render(
      <AppearanceSettingsSection
        settings={settings}
        onThemeChange={onThemeChange}
        onLiquidGlassChange={onLiquidGlassChange}
        onToggleAutoStart={onToggleAutoStart}
        onTransparencyToggle={vi.fn()}
        onTransparencyLevelChange={vi.fn()}
        onToggleCapsuleMode={vi.fn()}
      />,
    );

    const section = screen.getByRole('region', { name: '外观与交互' });
    expect(within(section).getByRole('button', { name: /深色/ })).toBeVisible();
    expect(within(section).getByRole('switch', { name: /开机自启动/ })).toBeVisible();

    const glassSwitch = within(section).getByRole('switch', { name: '液态玻璃' });
    expect(glassSwitch).toBeChecked();
    expect(glassSwitch).toHaveClass('bg-cyan-600', 'dark:bg-cyan-500');

    expect(within(section).getByRole('group', { name: '液态玻璃预设' })).toBeVisible();
    expect(within(section).queryByRole('slider', { name: '模糊程度' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /深色/ }));
    fireEvent.click(screen.getByRole('switch', { name: /开机自启动/ }));
    fireEvent.click(screen.getByRole('button', { name: /极致/ }));
    fireEvent.click(glassSwitch);
    expect(onThemeChange).toHaveBeenCalledWith('dark');
    expect(onToggleAutoStart).toHaveBeenCalledOnce();
    expect(onLiquidGlassChange).toHaveBeenCalledWith({ enabled: true, preset: 'extreme', blur: 4, refraction: 0, strength: 0, rimWidth: .5, magnify: .07, dispersion: true });
    expect(onLiquidGlassChange).toHaveBeenCalledWith({ enabled: false });
  });

  it('hides liquid-glass parameters until the feature is enabled', () => {
    render(
      <AppearanceSettingsSection
        settings={{
          ...settings,
          liquidGlass: {
            ...settings.liquidGlass,
            enabled: false,
          },
        }}
        onThemeChange={vi.fn()}
        onLiquidGlassChange={vi.fn()}
        onToggleAutoStart={vi.fn()}
        onTransparencyToggle={vi.fn()}
        onTransparencyLevelChange={vi.fn()}
        onToggleCapsuleMode={vi.fn()}
      />,
    );

    const section = screen.getByRole('region', { name: '外观与交互' });
    expect(within(section).getByRole('switch', { name: '液态玻璃' })).not.toBeChecked();
    expect(within(section).queryByText('液态玻璃配置')).not.toBeInTheDocument();
    expect(within(section).queryByTestId('liquid-glass-controls')).not.toBeInTheDocument();
    expect(within(section).queryByRole('slider', { name: '模糊程度' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('slider', { name: '扭曲强度' })).not.toBeInTheDocument();
    expect(within(section).queryByRole('switch', { name: '色散效果' })).not.toBeInTheDocument();
  });

  it('keeps data actions and the current directory visible', () => {
    const onOpenDirectory = vi.fn();
    const onChangeDirectory = vi.fn();
    const onExport = vi.fn();
    const onClear = vi.fn();
    render(
      <DataSettingsSection
        dataDir="C:/SemiDone/SemiDoneData"
        onOpenDirectory={onOpenDirectory}
        onChangeDirectory={onChangeDirectory}
        onExport={onExport}
        onClear={onClear}
      />,
    );

    const section = screen.getByRole('region', { name: '数据与记录' });
    expect(within(section).getByText('C:/SemiDone/SemiDoneData')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '打开数据目录' }));
    fireEvent.click(screen.getByRole('button', { name: '更改' }));
    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    fireEvent.click(screen.getByRole('button', { name: '清除数据' }));

    expect(onOpenDirectory).toHaveBeenCalledOnce();
    expect(onChangeDirectory).toHaveBeenCalledOnce();
    expect(onExport).toHaveBeenCalledOnce();
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('shows the available update as a clickable capsule in the current-version row', async () => {
    const availableResult: UpdateCheckResult = {
      status: 'available',
      currentVersion: '5.0.0',
      latestVersion: '5.1.0',
      releaseName: 'SemiDone 5.1.0',
      notes: '',
      releaseUrl: 'https://github.com/zzephyrxx/SemiDone/releases/tag/SemiDone-v5.1.0',
      publishedAt: '2026-07-17T08:00:00Z',
    };
    const openRelease = vi.fn().mockResolvedValue(undefined);
    render(
      <AboutSettingsSection
        appVersion="5.0.0"
        checkForUpdate={vi.fn().mockResolvedValue(availableResult)}
        openRelease={openRelease}
      />,
    );

    expect(screen.getByText('5.0.0')).toBeVisible();
    const updateCapsule = await screen.findByRole('button', { name: /发现新版本 5\.1\.0/ });
    fireEvent.click(updateCapsule);
    await waitFor(() => expect(openRelease).toHaveBeenCalledWith(availableResult.releaseUrl));
    expect(screen.queryByRole('heading', { name: '软件更新' })).not.toBeInTheDocument();
  });

  it('shows the current-version status when no update is available', async () => {
    render(
      <AboutSettingsSection
        appVersion="5.0.0"
        checkForUpdate={vi.fn().mockResolvedValue(currentResult)}
      />,
    );

    expect(await screen.findByText('已是最新')).toBeVisible();
  });

  it('always shows the public-account QR code without a disclosure', () => {
    render(
      <AboutSettingsSection
        appVersion="5.0.0"
        checkForUpdate={vi.fn().mockResolvedValue(currentResult)}
      />,
    );

    expect(screen.queryByRole('button', { name: '公众号' })).not.toBeInTheDocument();
    expect(screen.getByAltText('公众号二维码')).toBeVisible();
  });

  it('opens the donation QR code from the author row and closes it accessibly', () => {
    render(
      <AboutSettingsSection
        appVersion="5.0.0"
        checkForUpdate={vi.fn().mockResolvedValue(currentResult)}
      />,
    );

    const donationButton = screen.getByRole('button', { name: '打赏' });
    expect(donationButton).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(donationButton);

    const dialog = screen.getByRole('dialog', { name: '微信扫码打赏' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).not.toHaveClass('bg-[#061421]/25');
    expect(screen.getByAltText('微信打赏码')).toHaveAttribute('src', '/wxzs.png');
    const donationQr = screen.getByAltText('微信打赏码');
    expect(donationQr).toHaveClass(
      'h-[166px]',
      'w-[166px]',
      'rounded-full',
      'object-cover',
    );
    expect(donationQr).not.toHaveClass('liquid-glass-donation-trigger');
    expect(donationQr.closest('.donation-qr-shell')).toBeNull();
    expect(donationQr).not.toHaveAttribute('style');
    expect(
      screen.getByText('您的每一份认可，都是对我的肯定。'),
    ).toBeVisible();
    expect(dialog.querySelector('.ui-surface--dialog')).toHaveAttribute('data-glass-renderer', 'rdev');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '微信扫码打赏' })).not.toBeInTheDocument();
  });

  it('shows the current update date and removes the easter egg', () => {
    render(<AboutSettingsSection appVersion="7.0.0" checkForUpdate={vi.fn().mockResolvedValue(currentResult)} />);
    expect(screen.getByText('2026.11')).toBeVisible();
    expect(screen.queryByRole('button', { name: '打开彩蛋' })).not.toBeInTheDocument();
  });
  it('drags the donation dialog by its title and keeps it inside the app viewport', async () => {
    render(
      <AboutSettingsSection
        appVersion="5.0.0"
        checkForUpdate={vi.fn().mockResolvedValue(currentResult)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '打赏' }));
    const dialog = screen.getByRole('dialog', { name: '微信扫码打赏' });
    const dragHandle = screen.getByTestId('donation-dialog-drag-handle');
    Object.defineProperty(dialog, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 352,
        y: 184,
        width: 320,
        height: 400,
        top: 184,
        right: 672,
        bottom: 584,
        left: 352,
        toJSON: () => ({}),
      }),
    });

    fireEvent.pointerDown(dragHandle, {
      button: 0,
      pointerId: 7,
      clientX: 200,
      clientY: 200,
    });
    fireEvent.pointerMove(dragHandle, {
      pointerId: 7,
      clientX: 260,
      clientY: 240,
    });
    await waitFor(() => expect(dialog.style.translate).toBe('60px 40px'));

    fireEvent.pointerMove(dragHandle, {
      pointerId: 7,
      clientX: 2000,
      clientY: 2000,
    });
    await waitFor(() => expect(dialog.style.translate).toBe('344px 176px'));
    fireEvent.pointerUp(dragHandle, { pointerId: 7 });
  });
});
