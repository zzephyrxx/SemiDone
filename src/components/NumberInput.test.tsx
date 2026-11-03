// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import NumberInput from './NumberInput';

afterEach(cleanup);

it('steps through buttons and arrow keys without submitting the surrounding form', () => {
  const submit = vi.fn();
  function Example() {
    const [value, setValue] = useState('2');
    return <form onSubmit={submit}><NumberInput label="间隔" min={1} max={3} value={value} onValueChange={setValue} /></form>;
  }
  render(<Example />);
  const input = screen.getByRole('spinbutton', { name: '间隔' });
  fireEvent.click(screen.getByRole('button', { name: '增加间隔' }));
  expect(input).toHaveValue('3');
  expect(screen.getByRole('button', { name: '增加间隔' })).toBeDisabled();
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.click(screen.getByRole('button', { name: '减少间隔' }));
  expect(input).toHaveValue('1');
  expect(screen.getByRole('button', { name: '减少间隔' })).toBeDisabled();
  expect(submit).not.toHaveBeenCalled();
});

it('keeps empty and zero-padded time drafts editable, rejecting nonnumeric text', () => {
  const change = vi.fn();
  const { rerender } = render(<NumberInput label="分钟" value="05" min={0} max={59} onValueChange={change} />);
  const input = screen.getByRole('spinbutton', { name: '分钟' });
  expect(input).toHaveValue('05');
  fireEvent.change(input, { target: { value: '' } });
  expect(change).toHaveBeenLastCalledWith('');
  rerender(<NumberInput label="分钟" value="" min={0} max={59} onValueChange={change} />);
  expect(input).not.toHaveAttribute('aria-valuenow');
  fireEvent.click(screen.getByRole('button', { name: '增加分钟' }));
  expect(change).toHaveBeenLastCalledWith('1');
  change.mockClear();
  fireEvent.change(input, { target: { value: 'text' } });
  expect(change).not.toHaveBeenCalled();
});
