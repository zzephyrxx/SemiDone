// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateCheckResult } from '../services/githubUpdateService';
import UpdateNotifier from './UpdateNotifier';

const availableResult: UpdateCheckResult = {
  status: 'available',
  currentVersion: '5.0.0',
  latestVersion: '5.1.0',
  releaseName: 'SemiDone 5.1.0',
  notes: '优化任务视图',
  releaseUrl: 'https://github.com/zzephyrxx/SemiDone/releases/tag/v5.1.0',
  publishedAt: '2026-08-01T08:00:00Z',
};

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

describe('UpdateNotifier', () => {
  it('notifies once at startup when GitHub has a newer release', async () => {
    const notify = vi.fn();
    const checkForUpdate = vi.fn().mockResolvedValue(availableResult);
    const props = {
      enabled: true,
      getCurrentVersion: vi.fn().mockResolvedValue('5.0.0'),
      checkForUpdate,
      notify,
    };

    const { unmount } = render(<UpdateNotifier {...props} />);
    await waitFor(() => expect(notify).toHaveBeenCalledWith(availableResult));
    unmount();
    render(<UpdateNotifier {...props} />);

    await waitFor(() => expect(checkForUpdate).toHaveBeenCalledTimes(1));
  });

  it('stays quiet when the installed version is current', async () => {
    const notify = vi.fn();
    render(
      <UpdateNotifier
        enabled
        getCurrentVersion={vi.fn().mockResolvedValue('5.0.0')}
        checkForUpdate={vi.fn().mockResolvedValue({ ...availableResult, status: 'current', latestVersion: '5.0.0' })}
        notify={notify}
      />,
    );

    await waitFor(() => expect(sessionStorage.getItem('semidone:update-check-started')).toBe('done'));
    expect(notify).not.toHaveBeenCalled();
  });
});
