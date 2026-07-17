import { ChevronDown, ChevronRight, ExternalLink, Info, QrCode } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import VersionUpdateBadge, {
  type CheckForUpdate,
  type OpenRelease,
} from './VersionUpdateBadge';

interface AboutSettingsSectionProps {
  appVersion: string;
  checkForUpdate?: CheckForUpdate;
  openRelease?: OpenRelease;
}

interface AboutRowProps {
  label: string;
  children: ReactNode;
}

function AboutRow({ label, children }: AboutRowProps) {
  return (
    <div className="flex min-h-[52px] items-center gap-3 px-3 py-2">
      <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm font-medium text-foreground">
        {children}
      </div>
    </div>
  );
}

export default function AboutSettingsSection({
  appVersion,
  checkForUpdate,
  openRelease,
}: AboutSettingsSectionProps) {
  const [showPublicAccount, setShowPublicAccount] = useState(false);

  return (
    <>
      <section aria-labelledby="about-settings-title" className="card card-shadow slide-up rounded-2xl p-3">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h2 id="about-settings-title" className="text-base font-semibold text-foreground">
            关于
          </h2>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border/80 bg-background/35">
          <AboutRow label="当前版本">
            <span className="tabular-nums">{appVersion || '读取中…'}</span>
            <VersionUpdateBadge
              appVersion={appVersion}
              checkForUpdate={checkForUpdate}
              openRelease={openRelease}
            />
          </AboutRow>
          <AboutRow label="作者">
            <span>魚肉</span>
          </AboutRow>
          <AboutRow label="博客">
            <a
              href="https://zzephyrxx.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
            >
              <span className="truncate">zzephyrxx.github.io</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </AboutRow>
          <AboutRow label="更新日期">
            <span className="tabular-nums">2026.07</span>
          </AboutRow>
        </div>
      </section>

      <section className="card card-shadow slide-up overflow-hidden rounded-2xl">
        <button
          type="button"
          aria-label="公众号"
          aria-expanded={showPublicAccount}
          aria-controls="public-account-content"
          onClick={() => setShowPublicAccount((visible) => !visible)}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <QrCode className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">公众号</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">关注获取最新版本</p>
          </div>
          {showPublicAccount ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showPublicAccount && (
          <div
            id="public-account-content"
            className="border-t border-border px-3 pb-4 pt-3 text-center"
          >
            <div className="mx-auto w-fit rounded-xl border border-border bg-white p-2 shadow-sm">
              <img src="/gzh.jpg" alt="公众号二维码" className="h-32 w-32 object-contain" />
            </div>
            <p className="mt-2 text-xs font-medium text-foreground">扫码关注「事半」公众号</p>
          </div>
        )}
      </section>
    </>
  );
}
