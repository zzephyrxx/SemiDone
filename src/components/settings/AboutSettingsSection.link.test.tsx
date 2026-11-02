// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const open = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../../utils/openExternalUrl', () => ({ openExternalUrl: open }));
import AboutSettingsSection from './AboutSettingsSection';
afterEach(cleanup);
it('connects the visible blog link to external navigation', () => {
  render(<AboutSettingsSection appVersion="7.0.0" checkForUpdate={vi.fn().mockResolvedValue({ status: 'current' })} />);
  fireEvent.click(screen.getByRole('link', { name: /zzephyrxx.github.io/ }));
  expect(open).toHaveBeenCalledWith('https://zzephyrxx.github.io/');
});
