// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import GlassControls from './GlassControls';

const legacy = { enabled: true, blur: 6, refraction: 42, dispersion: true };
afterEach(cleanup);
it('shows exactly two presets and no manual controls for migrated custom settings', () => {
  render(<GlassControls settings={legacy} onCommit={vi.fn()} />);
  const group = screen.getByRole('group', { name: '液态玻璃预设' });
  expect(group.querySelectorAll('button')).toHaveLength(2);
  expect(screen.getByRole('button', { name: /标准/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  expect(screen.queryByRole('figure', { name: '液态玻璃实时预览' })).not.toBeInTheDocument();
});
it('commits the exact requested profiles in one action and responds to saved or rolled-back selection', () => {
  const save = vi.fn(); const view = render(<GlassControls settings={legacy} onCommit={save} />);
  fireEvent.click(screen.getByRole('button', { name: /极致/ }));
  const extreme = { enabled: true, preset: 'extreme' as const, blur: 4, refraction: 0, strength: 0, rimWidth: .5, magnify: .07, dispersion: true };
  expect(save).toHaveBeenCalledExactlyOnceWith(extreme);
  view.rerender(<GlassControls settings={extreme} onCommit={save} />);
  expect(screen.getByRole('button', { name: /极致/ })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: /极致/ })); expect(save).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /标准/ }));
  expect(save).toHaveBeenLastCalledWith({ enabled: true, preset: 'standard', blur: 9, refraction: 0, strength: 0, rimWidth: .1, magnify: 0, dispersion: false });
  view.rerender(<GlassControls settings={legacy} onCommit={save} />);
  expect(screen.getByRole('button', { name: /标准/ })).toHaveAttribute('aria-pressed', 'true');
});
