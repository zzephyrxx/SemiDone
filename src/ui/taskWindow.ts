export const ROW = 104, INITIAL_EDITOR_HEIGHT = 224;
const OVERSCAN = 6;

export function taskWindow(count: number, editingIndex: number, top: number, height: number, row = ROW, editingRow = INITIAL_EDITOR_HEIGHT) {
  const extra = editingIndex >= 0 ? editingRow - row : 0;
  const at = (offset: number) => {
    if (editingIndex < 0 || offset < editingIndex * row) return Math.floor(offset / row);
    if (offset < editingIndex * row + editingRow) return editingIndex;
    return Math.floor((offset - extra) / row);
  };
  const start = Math.max(0, Math.min(count - 1, at(top)) - OVERSCAN);
  const end = Math.max(start, Math.min(count, at(top + height) + OVERSCAN + 1));
  return { start, end, offset: start * row + (editingIndex >= 0 && editingIndex < start ? extra : 0), total: count * row + extra };
}
