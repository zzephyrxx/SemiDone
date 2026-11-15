import type { Task } from '../types';

/** Zen includes every pending task, including future recurring occurrences. */
export function isZenTaskAvailable(task: Task): boolean {
  return !task.completed;
}
