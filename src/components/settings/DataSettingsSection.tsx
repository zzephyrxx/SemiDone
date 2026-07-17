import { Database, ExternalLink, FileDown, Folder, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface DataSettingsSectionProps {
  dataDir: string;
  onOpenDirectory: () => void;
  onChangeDirectory: () => void;
  onExport: () => void;
  onClear: () => void;
}

interface DataRowProps {
  icon: ReactNode;
  iconClass: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
}

function DataRow({ icon, iconClass, title, description, actions }: DataRowProps) {
  return (
    <div className="flex min-h-[76px] items-center gap-3 px-3 py-2.5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}

const baseButtonClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export default function DataSettingsSection({
  dataDir,
  onOpenDirectory,
  onChangeDirectory,
  onExport,
  onClear,
}: DataSettingsSectionProps) {
  return (
    <section
      aria-labelledby="data-settings-title"
      className="card card-shadow slide-up rounded-2xl p-3"
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <Database className="h-4 w-4 text-blue-500" />
        <h2 id="data-settings-title" className="text-base font-semibold text-foreground">
          数据与记录
        </h2>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border/80 bg-background/35">
        <DataRow
          icon={<FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconClass="bg-blue-500/10"
          title="记录导出"
          description="导出待办记录为 Markdown 格式"
          actions={(
            <button
              type="button"
              onClick={onExport}
              className={`${baseButtonClass} bg-blue-600 text-white hover:bg-blue-700`}
            >
              <FileDown className="h-3.5 w-3.5" />
              导出
            </button>
          )}
        />

        <DataRow
          icon={<Folder className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          iconClass="bg-orange-500/10"
          title="数据目录"
          description={<span title={dataDir}>{dataDir || '正在读取数据目录…'}</span>}
          actions={(
            <>
              <button
                type="button"
                onClick={onOpenDirectory}
                className={`${baseButtonClass} border border-orange-500/60 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400`}
                title="在文件管理器中打开"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                打开
              </button>
              <button
                type="button"
                onClick={onChangeDirectory}
                className={`${baseButtonClass} bg-muted text-foreground hover:bg-accent`}
                title="更改数据目录"
              >
                更改
              </button>
            </>
          )}
        />

        <DataRow
          icon={<Database className="h-5 w-5 text-red-600 dark:text-red-400" />}
          iconClass="bg-red-500/10"
          title="数据管理"
          description="清除应用数据和缓存"
          actions={(
            <button
              type="button"
              onClick={onClear}
              className={`${baseButtonClass} border border-red-500/60 text-red-600 hover:bg-red-500/10 dark:text-red-400`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              清除数据
            </button>
          )}
        />
      </div>
    </section>
  );
}
