import { GlassButton } from '../../ui/GlassButton';
import { Surface } from '../../ui/Surface';
import { Database, FileDown, Folder, FolderLock, ExternalLink } from '../../ui/icons';
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
    <div className="settings-data-row min-h-[76px] items-center px-3 py-2.5">
      <div className={`settings-row-icon flex h-5 w-5 shrink-0 items-center justify-center ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="settings-data-actions flex items-center gap-2">{actions}</div>
    </div>
  );
}

const baseButtonClass =
  'inline-flex items-center justify-center gap-1 font-medium';

export default function DataSettingsSection({
  dataDir,
  onOpenDirectory,
  onChangeDirectory,
  onExport,
  onClear,
}: DataSettingsSectionProps) {
  return (
    <Surface as="section" htmlRole="region"
      aria-labelledby="data-settings-title"
      className="card card-shadow slide-up rounded-2xl p-3"
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <Database className="h-4 w-4 text-blue-500" />
        <h2 id="data-settings-title" className="text-base font-semibold text-foreground">
          数据与记录
        </h2>
      </div>

      <div className="divide-y divide-border/40">
        <DataRow
          icon={<FileDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
          iconClass="bg-blue-500/10"
          title="记录导出"
          description="导出待办记录为 Markdown 格式"
          actions={(
            <GlassButton
              type="button"
              onClick={onExport}
              className={`${baseButtonClass} text-primary hover:text-primary/80`}
            >
              导出
            </GlassButton>
          )}
        />

        <DataRow
          icon={<Folder className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
          iconClass="bg-orange-500/10"
          title="数据目录"
          description={<span title={dataDir}>{dataDir || '正在读取数据目录…'}</span>}
          actions={(
            <>
              <GlassButton
                type="button"
                onClick={onOpenDirectory}
                className={`${baseButtonClass} text-primary hover:text-primary/80`}
                aria-label="打开数据目录"
                title="在文件管理器中打开"
              >
                <ExternalLink className="h-4 w-4" />
              </GlassButton>
              <GlassButton
                type="button"
                onClick={onChangeDirectory}
                className={`${baseButtonClass} text-primary hover:text-primary/80`}
                title="更改数据目录"
              >
                更改
              </GlassButton>
            </>
          )}
        />

        <DataRow
          icon={<FolderLock className="h-5 w-5 text-red-600 dark:text-red-400" />}
          iconClass="bg-red-500/10"
          title="数据管理"
          description="清除应用数据和缓存"
          actions={(
            <GlassButton
              type="button"
              onClick={onClear}
              className={`${baseButtonClass} text-destructive hover:text-destructive/80`}
            >
              清除数据
            </GlassButton>
          )}
        />
      </div>
    </Surface>
  );
}
