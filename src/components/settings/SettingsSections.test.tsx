// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../types';
import type { UpdateCheckResult } from '../../services/githubUpdateService';
import AboutSettingsSection from './AboutSettingsSection';
import AppearanceSettingsSection from './AppearanceSettingsSection';
import DataSettingsSection from './DataSettingsSection';

afterEach(cleanup);

const settings: Settings = {
  theme: 'light',
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
  it('keeps appearance actions controlled by the page', () => {
    const onThemeChange = vi.fn();
    const onToggleAutoStart = vi.fn();
    render(
      <AppearanceSettingsSection
        settings={settings}
        onThemeChange={onThemeChange}
        onToggleAutoStart={onToggleAutoStart}
        onTransparencyToggle={vi.fn()}
        onTransparencyLevelChange={vi.fn()}
        onToggleCapsuleMode={vi.fn()}
      />,
    );

    const section = screen.getByRole('region', { name: '外观与交互' });
    expect(within(section).getByRole('button', { name: /深色/ })).toBeVisible();
    expect(within(section).getByRole('switch', { name: /开机自启动/ })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /深色/ }));
    fireEvent.click(screen.getByRole('switch', { name: /开机自启动/ }));

    expect(onThemeChange).toHaveBeenCalledWith('dark');
    expect(onToggleAutoStart).toHaveBeenCalledOnce();
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
    fireEvent.click(screen.getByRole('button', { name: '打开' }));
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

  it('keeps the public-account QR code collapsed until requested', () => {
    render(
      <AboutSettingsSection
        appVersion="5.0.0"
        checkForUpdate={vi.fn().mockResolvedValue(currentResult)}
      />,
    );

    expect(screen.queryByAltText('公众号二维码')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '公众号' }));
    expect(screen.getByAltText('公众号二维码')).toBeVisible();
    expect(screen.queryByText('打赏开发者')).not.toBeInTheDocument();
    expect(screen.queryByAltText('微信打赏')).not.toBeInTheDocument();
    expect(screen.queryByAltText('支付宝打赏')).not.toBeInTheDocument();
  });
});
