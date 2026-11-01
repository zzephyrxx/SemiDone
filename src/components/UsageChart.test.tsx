// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import UsageChart from './UsageChart';
vi.mock('../ui/Surface', () => ({ Surface: ({ children, className }: any) => <div className={className}>{children}</div> }));
afterEach(cleanup);
it('provides keyboard inspection without a redundant daily data table', () => {
  render(<UsageChart data={[{ date: '2026/10/31', minutes: 15 }, { date: '2026/11/1', minutes: 30 }]} period="week" formatMinutes={m => `${m} 分钟`} />);
  fireEvent.focus(screen.getByRole('button', { name: '2026/10/31，15 分钟' }));
  expect(document.querySelector('.usage-chart-readout')).toHaveTextContent('15 分钟2026/10/31');
  expect(screen.queryByText('查看每日数据')).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
it('handles empty data without invalid SVG paths', () => {
  const view = render(<UsageChart data={[]} period="month" formatMinutes={String} />);
  expect(screen.getByText('还没有使用记录，接下来每一天都从这里开始。')).toBeVisible();
  expect(view.container.innerHTML).not.toMatch(/NaN|Infinity/);
});
