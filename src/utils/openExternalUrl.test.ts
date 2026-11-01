// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ isTauri: vi.fn(), openUrl: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: mocks.isTauri }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: mocks.openUrl }));
import { openExternalUrl } from './openExternalUrl';
it('opens the blog through the system opener on desktop', async () => {
  mocks.isTauri.mockReturnValue(true);
  await openExternalUrl('https://zzephyrxx.github.io/');
  expect(mocks.openUrl).toHaveBeenCalledWith('https://zzephyrxx.github.io/');
});
it('uses normal browser navigation in preview', async () => {
  mocks.isTauri.mockReturnValue(false);
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  await openExternalUrl('https://zzephyrxx.github.io/');
  expect(open).toHaveBeenCalledWith('https://zzephyrxx.github.io/', '_blank', 'noopener,noreferrer');
  open.mockRestore();
});
