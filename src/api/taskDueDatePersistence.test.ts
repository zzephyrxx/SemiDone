// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { taskApi } from './localStorage';

beforeEach(() => localStorage.clear());

it('retains omitted deadlines, saves changes, and persists explicit clearing', async () => {
  const created = await taskApi.createTask({ title: '截止日期', dueDate: '2099-01-15T09:00' });
  const id = created.data!.id;
  await taskApi.updateTask(id, { title: '仅修改标题' });
  expect((await taskApi.getTasks()).data![0].dueDate).toBe('2099-01-15T09:00');
  await taskApi.updateTask(id, { dueDate: '2099-01-16T17:25' });
  expect((await taskApi.getTasks()).data![0].dueDate).toBe('2099-01-16T17:25');
  await taskApi.updateTask(id, { clearDueDate: true });
  const task = (await taskApi.getTasks()).data![0];
  expect(task.dueDate).toBeUndefined();
  expect(task.title).toBe('仅修改标题');
  expect(task).not.toHaveProperty('clearDueDate');
});
