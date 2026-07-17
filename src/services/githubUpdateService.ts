import { isTauri } from '@tauri-apps/api/core';

const LATEST_RELEASE_API = 'https://api.github.com/repos/zzephyrxx/SemiDone/releases/latest';
export const SEMIDONE_RELEASES_URL = 'https://github.com/zzephyrxx/SemiDone/releases/latest';
const RELEASE_TAG_PATH = '/zzephyrxx/SemiDone/releases/tag/';

type UpdateFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface GithubReleaseResponse {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
}

export interface UpdateCheckResult {
  status: 'available' | 'current';
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  notes: string;
  releaseUrl: string;
  publishedAt: string | null;
}

export function normalizeVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.match(/\d+(?:\.\d+){1,2}/)?.[0]
    ?? trimmed.replace(/^v/i, '').split('-')[0];
}

function numericVersion(version: string): number[] {
  return normalizeVersion(version)
    .split('.')
    .slice(0, 3)
    .map(part => Number.parseInt(part, 10) || 0);
}

export function compareVersions(left: string, right: string): number {
  const leftParts = numericVersion(left);
  const rightParts = numericVersion(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function resultFromRelease(
  currentVersion: string,
  release: GithubReleaseResponse,
): UpdateCheckResult {
  const normalizedCurrent = normalizeVersion(currentVersion);
  const latestVersion = normalizeVersion(release.tag_name);
  return {
    status: compareVersions(latestVersion, normalizedCurrent) > 0 ? 'available' : 'current',
    currentVersion: normalizedCurrent,
    latestVersion,
    releaseName: release.name || `SemiDone ${latestVersion}`,
    notes: release.body || '',
    releaseUrl: release.html_url || SEMIDONE_RELEASES_URL,
    publishedAt: release.published_at,
  };
}

async function nativeReleasePageFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!isTauri()) return fetch(input, init);

  const { fetch: nativeFetch } = await import('@tauri-apps/plugin-http');
  return nativeFetch(input, { ...init, maxRedirections: 5 });
}

function releaseFromRedirectUrl(url: string): GithubReleaseResponse {
  const parsedUrl = new URL(url);
  if (parsedUrl.origin !== 'https://github.com' || !parsedUrl.pathname.startsWith(RELEASE_TAG_PATH)) {
    throw new Error('GitHub Release 重定向地址无效');
  }

  const tagName = decodeURIComponent(parsedUrl.pathname.slice(RELEASE_TAG_PATH.length));
  if (!tagName || tagName.includes('/')) {
    throw new Error('GitHub Release 版本标签无效');
  }

  return {
    tag_name: tagName,
    name: null,
    body: null,
    html_url: parsedUrl.toString(),
    published_at: null,
  };
}

async function checkReleasePageRedirect(
  currentVersion: string,
  fetcher: UpdateFetcher,
): Promise<UpdateCheckResult> {
  const response = await fetcher(SEMIDONE_RELEASES_URL, {
    method: 'HEAD',
    redirect: 'follow',
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`GitHub Release 页面访问失败（${response.status}）`);
  }

  return resultFromRelease(currentVersion, releaseFromRedirectUrl(response.url));
}

function rateLimitError(response: Response): Error {
  const resetAt = Number.parseInt(response.headers.get('x-ratelimit-reset') || '', 10);
  const retryMessage = Number.isFinite(resetAt)
    ? `，请在 ${new Date(resetAt * 1000).toLocaleString('zh-CN', { hour12: false })} 后重试`
    : '，请稍后重试';
  return new Error(`GitHub 请求频率受限${retryMessage}`);
}

export async function checkForGithubUpdate(
  currentVersion: string,
  fetcher?: UpdateFetcher,
  releasePageFetcher: UpdateFetcher = nativeReleasePageFetch,
): Promise<UpdateCheckResult> {
  if (!fetcher && isTauri()) {
    return checkReleasePageRedirect(currentVersion, releasePageFetcher);
  }

  const response = await (fetcher ?? fetch)(LATEST_RELEASE_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      try {
        return await checkReleasePageRedirect(currentVersion, releasePageFetcher);
      } catch {
        throw rateLimitError(response);
      }
    }
    throw new Error(`GitHub 更新检查失败（${response.status}）`);
  }

  const release = await response.json() as GithubReleaseResponse;
  return resultFromRelease(currentVersion, release);
}
