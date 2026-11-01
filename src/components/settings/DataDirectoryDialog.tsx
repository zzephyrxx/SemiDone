import { Overlay } from '../../ui/Overlay';

interface DataDirectoryDialogProps {
  isOpen: boolean;
  currentDataDir: string;
  newDataDir: string;
  isMigrating: boolean;
  onPickDirectory: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DataDirectoryDialog({
  isOpen,
  currentDataDir,
  newDataDir,
  isMigrating,
  onPickDirectory,
  onConfirm,
  onCancel,
}: DataDirectoryDialogProps) {

  return (
    <Overlay label="更改数据目录" open={isOpen} onClose={() => { if (!isMigrating) onCancel(); }} dialogClassName="data-directory-dialog">
      <div className="p-5">
        <h3 id="data-directory-title" className="text-lg font-semibold text-foreground mb-4">更改数据目录</h3>
        <p className="text-sm text-muted-foreground mb-4 break-all">当前目录：{currentDataDir}</p>
        <div className="mb-4">
          <label htmlFor="data-directory-target" className="block text-sm font-medium text-foreground mb-2">目标目录</label>
          <div className="flex gap-2">
            <input
              id="data-directory-target"
              type="text"
              value={newDataDir}
              readOnly
              placeholder="请选择新的目录根路径"
              className="min-w-0 flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm font-mono"
            />
            <button
              onClick={onPickDirectory}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              disabled={isMigrating}
            >
              选择
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            先选择根目录，会自动补全为 SemiDone/SemiDoneData；若不存在则自动创建，当前数据会复制到新目录。更改后请重启应用
          </p>
          <p className="text-xs text-destructive mt-2">⚠️ 此为危险操作，请提前备份数据，以免丢失</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" disabled={isMigrating}>
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isMigrating || !newDataDir.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isMigrating ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                迁移中...
              </>
            ) : '确认更改'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
