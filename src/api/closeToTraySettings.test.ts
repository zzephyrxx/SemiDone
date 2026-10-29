// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { settingsApi } from './localStorage';

beforeEach(() => localStorage.clear());

describe('close-to-tray settings compatibility', () => {
  it('enables the option for a new profile and an older saved profile', async () => {
    expect((await settingsApi.getSettings()).data?.closeToTray).toBe(true);
    localStorage.setItem('windows-todo-settings', JSON.stringify({ theme: 'pink', username: '保留用户资料' }));
    const { data } = await settingsApi.getSettings();
    expect(data?.closeToTray).toBe(true);
    expect(data?.theme).toBe('pink');
    expect(data?.username).toBe('保留用户资料');
  });

  it('retains an explicit disabled setting across saves and reloads', async () => {
    const { data } = await settingsApi.getSettings();
    await settingsApi.updateSettings({ ...data!, closeToTray: false });
    expect((await settingsApi.getSettings()).data?.closeToTray).toBe(false);
    await settingsApi.updateSettings({ ...data!, closeToTray: true });
    expect((await settingsApi.getSettings()).data?.closeToTray).toBe(true);
  });
});
