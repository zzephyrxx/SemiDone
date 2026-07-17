// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TaskAttachmentsSection from './TaskAttachmentsSection';

vi.mock('./AttachmentUpload', () => ({ default: () => <div>attachment editor</div> }));

afterEach(cleanup);

describe('TaskAttachmentsSection', () => {
  it('renders the empty read-only state', () => {
    render(
      <TaskAttachmentsSection
        taskId="task-1"
        taskAttachments={[]}
        editingAttachments={[]}
        imagePreviews={{}}
        isEditing={false}
        onAttachmentsChange={vi.fn()}
        onFilesAdded={vi.fn()}
      />,
    );

    expect(screen.getByText('暂无附件')).toBeVisible();
  });

  it('delegates editing to the upload component', () => {
    render(
      <TaskAttachmentsSection
        taskId="task-1"
        taskAttachments={[]}
        editingAttachments={[]}
        imagePreviews={{}}
        isEditing
        onAttachmentsChange={vi.fn()}
        onFilesAdded={vi.fn()}
      />,
    );

    expect(screen.getByText('attachment editor')).toBeVisible();
  });
});
