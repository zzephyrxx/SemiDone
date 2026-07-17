// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { taskApi } from './localStorage';

beforeEach(() => localStorage.clear());

describe('browser task pinning persistence', () => {
  it('persists pin and unpin changes', async () => {
    const created = await taskApi.createTask({ title: '长期关注事项' });
    const taskId = created.data!.id;

    await taskApi.updateTask(taskId, { isPinned: true });
    expect((await taskApi.getTasks()).data![0].isPinned).toBe(true);

    await taskApi.updateTask(taskId, { isPinned: false });
    expect((await taskApi.getTasks()).data![0].isPinned).toBe(false);
  });
});
