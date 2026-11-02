import type { RefObject } from 'react';
import { Overlay } from '../ui/Overlay';
import InlineDueDatePicker from './InlineDueDatePicker';

export default function DueDateDialog({ open, id, value, onConfirm, onCancel, onClear, returnFocus }: {
  open: boolean; id: string; value: string; onConfirm: (value: string) => void; onCancel: () => void; onClear: () => void; returnFocus: RefObject<HTMLElement>;
}) {
  return <Overlay label="选择截止日期" open={open} onClose={onCancel} returnFocus={returnFocus} dialogClassName="ui-overlay-dialog--date">
    <InlineDueDatePicker id={id} value={value} inDialog onConfirm={onConfirm} onCancel={onCancel} onClear={onClear} />
  </Overlay>;
}
