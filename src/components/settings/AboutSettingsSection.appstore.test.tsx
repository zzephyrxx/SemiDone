// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('../../platform/distribution', () => ({ isAppStore: true, privacyPolicyUrl: '' }));
import AboutSettingsSection from './AboutSettingsSection';

afterEach(cleanup);

it('keeps the Store about section free of the blog and community links', () => {
  render(<AboutSettingsSection appVersion="7.0.0" />);
  expect(screen.getByRole('region', { name: '关于' })).toBeVisible();
  expect(screen.getByText('7.0.0')).toBeVisible();
  expect(screen.queryByText('通过 App Store 更新')).not.toBeInTheDocument();
  expect(screen.queryByText('作者')).not.toBeInTheDocument();
  expect(screen.queryByText('博客')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: '更多精彩' })).not.toBeInTheDocument();
});
