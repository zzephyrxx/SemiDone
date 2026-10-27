import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types';
import { useTaskStore } from './taskStore';
const api = vi.hoisted(() => ({ updateTask: vi.fn(), createTask: vi.fn() }));
vi.mock('../api/tauri', () => ({ api: { tasks: api } }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const task: Task = { id: 'a', title: 'Task', completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
beforeEach(() => {
  vi.clearAllMocks();
  useTaskStore.setState({ tasks: [task], filteredTasks: [task], celebration: { show: false, message: '', isAllComplete: false } });
});
describe('task completion transaction feedback', () => {
  it('does not celebrate or create a recurring child if the completion could not be saved', async () => {
    useTaskStore.setState({ tasks: [{ ...task, recurrence: { type: 'day', interval: 1 } }] });
    api.updateTask.mockResolvedValue({ success: false, error: 'disk unavailable' });
    await useTaskStore.getState().toggleTaskComplete('a');
    expect(useTaskStore.getState().tasks[0].completed).toBe(false);
    expect(useTaskStore.getState().celebration.show).toBe(false); expect(api.createTask).not.toHaveBeenCalled();
  });
  it('deduplicates rapid completion calls and releases the guard after a failure', async () => {
    let resolve!: (value: { success: boolean }) => void;
    api.updateTask.mockReturnValue(new Promise(done => { resolve = done; }));
    const first = useTaskStore.getState().toggleTaskComplete('a');
    await useTaskStore.getState().toggleTaskComplete('a');
    expect(api.updateTask).toHaveBeenCalledTimes(1);
    resolve({ success: false }); await first;
    api.updateTask.mockResolvedValue({ success: true, data: { ...task, completed: true } });
    await useTaskStore.getState().toggleTaskComplete('a');
    expect(api.updateTask).toHaveBeenCalledTimes(2); expect(useTaskStore.getState().celebration.isAllComplete).toBe(true);
  });
  it('allows different tasks to save concurrently', async () => {
    const other = { ...task, id: 'b' }; useTaskStore.setState({ tasks: [task, other] });
    api.updateTask.mockImplementation(async (id: string) => ({ success: true, data: { ...task, id, completed: true } }));
    await Promise.all(['a', 'b'].map(id => useTaskStore.getState().toggleTaskComplete(id)));
    expect(api.updateTask).toHaveBeenCalledTimes(2); expect(useTaskStore.getState().tasks.every(item => item.completed)).toBe(true);
  });
});
