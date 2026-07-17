// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UpdateCheckResult } from '../../services/githubUpdateService';
import VersionUpdateBadge from './VersionUpdateBadge';

afterEach(cleanup);

const currentResult: UpdateCheckResult = {
  status: 'current',
  currentVersion: '5.0.0',
  latestVersion: '5.0.0',
  releaseName: 'SemiDone 5.0.0',
  notes: '',
  releaseUrl: 'https://github.com/zzephyrxx/SemiDone/releases/tag/SemiDone-v5.0.0',
  publishedAt: '2026-07-17T08:00:00Z',
};

describe('VersionUpdateBadge', () => {
  it('stays quiet when the installed version is current', async () => {
    const checkForUpdate = vi.fn().mockResolvedValue(currentResult);
    const { container } = render(
      <VersionUpdateBadge appVersion="5.0.0" checkForUpdate={checkForUpdate} />,
    );

    await waitFor(() => expect(checkForUpdate).toHaveBeenCalledWith('5.0.0'));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('opens GitHub from the available-update capsule', async () => {
    const availableResult = { ...currentResult, status: 'available', latestVersion: '5.1.0' } as UpdateCheckResult;
    const openRelease = vi.fn().mockResolvedValue(undefined);
    render(
      <VersionUpdateBadge
        appVersion="5.0.0"
        checkForUpdate={vi.fn().mockResolvedValue(availableResult)}
        openRelease={openRelease}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /发现新版本 5\.1\.0/ }));
    await waitFor(() => expect(openRelease).toHaveBeenCalledWith(availableResult.releaseUrl));
  });

  it('offers a compact retry action when checking fails', async () => {
    const checkForUpdate = vi.fn()
      .mockRejectedValueOnce(new Error('网络不可用'))
      .mockResolvedValueOnce(currentResult);
    render(<VersionUpdateBadge appVersion="5.0.0" checkForUpdate={checkForUpdate} />);

    fireEvent.click(await screen.findByRole('button', { name: '更新检查失败，重新检查' }));
    await waitFor(() => expect(checkForUpdate).toHaveBeenCalledTimes(2));
  });
});
