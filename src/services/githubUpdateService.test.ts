import { describe, expect, it, vi } from 'vitest';
import {
  checkForGithubUpdate,
  compareVersions,
  SEMIDONE_RELEASES_URL,
} from './githubUpdateService';

describe('GitHub update service', () => {
  it('compares semantic versions with an optional v prefix', () => {
    expect(compareVersions('v5.1.0', '5.0.9')).toBeGreaterThan(0);
    expect(compareVersions('SemiDone-v5.1.0', '5.0.0')).toBeGreaterThan(0);
    expect(compareVersions('5.0.0', 'v5.0.0')).toBe(0);
    expect(compareVersions('4.9.9', '5.0.0')).toBeLessThan(0);
  });

  it('reports a newer published GitHub Release', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tag_name: 'v5.1.0',
      name: 'SemiDone 5.1.0',
      body: '新增任务视图',
      html_url: 'https://github.com/zzephyrxx/SemiDone/releases/tag/v5.1.0',
      published_at: '2026-08-01T08:00:00Z',
    }), { status: 200 }));

    await expect(checkForGithubUpdate('5.0.0', fetcher)).resolves.toMatchObject({
      status: 'available',
      currentVersion: '5.0.0',
      latestVersion: '5.1.0',
      releaseName: 'SemiDone 5.1.0',
    });
  });

  it('reports the current version when the release is not newer', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tag_name: 'v5.0.0',
      name: 'SemiDone 5.0.0',
      body: '',
      html_url: 'https://github.com/zzephyrxx/SemiDone/releases/tag/v5.0.0',
      published_at: '2026-07-17T08:00:00Z',
    }), { status: 200 }));

    await expect(checkForGithubUpdate('5.0.0', fetcher)).resolves.toMatchObject({
      status: 'current',
      latestVersion: '5.0.0',
    });
  });

  it('returns a useful error when GitHub cannot be reached', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 503 }));

    await expect(checkForGithubUpdate('5.0.0', fetcher)).rejects.toThrow('GitHub 更新检查失败（503）');
  });

  it('uses the native release-page redirect when the REST API is rate limited', async () => {
    const apiFetcher = vi.fn().mockResolvedValue(new Response('', {
      status: 403,
      headers: {
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1784250000',
      },
    }));
    const releasePageFetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://github.com/zzephyrxx/SemiDone/releases/tag/SemiDone-v5.1.0',
    } as Response);

    await expect(
      checkForGithubUpdate('5.0.0', apiFetcher, releasePageFetcher),
    ).resolves.toMatchObject({
      status: 'available',
      currentVersion: '5.0.0',
      latestVersion: '5.1.0',
      releaseName: 'SemiDone 5.1.0',
      releaseUrl: 'https://github.com/zzephyrxx/SemiDone/releases/tag/SemiDone-v5.1.0',
    });
    expect(releasePageFetcher).toHaveBeenCalledWith(
      SEMIDONE_RELEASES_URL,
      expect.objectContaining({ redirect: 'follow' }),
    );
  });

  it('explains GitHub rate limiting when the native fallback also fails', async () => {
    const apiFetcher = vi.fn().mockResolvedValue(new Response('', {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0' },
    }));
    const releasePageFetcher = vi.fn().mockRejectedValue(new Error('network unavailable'));

    await expect(
      checkForGithubUpdate('5.0.0', apiFetcher, releasePageFetcher),
    ).rejects.toThrow('GitHub 请求频率受限');
  });
});
