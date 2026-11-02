import { openExternalUrl } from '../../utils/openExternalUrl';
import { toast } from 'sonner';
import { RELEASE_MONTH } from '../../data/release';
import { GlassButton } from '../../ui/GlassButton';
import { Surface } from '../../ui/Surface';
import { ExternalLink, Heart, Info, QrCode, X } from '../../ui/icons';
import { useRef, useState, type ReactNode } from 'react';
import VersionUpdateBadge, { type CheckForUpdate, type OpenRelease } from './VersionUpdateBadge';
import { Overlay } from '../../ui/Overlay';
import { useDraggableDialog } from '../../ui/useDraggableDialog';

interface AboutSettingsSectionProps {
  appVersion: string;
  checkForUpdate?: CheckForUpdate;
  openRelease?: OpenRelease;
}
function AboutRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex min-h-[44px] items-center gap-3 px-1 py-2">
    <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-xs font-medium text-foreground">{children}</div>
  </div>;
}
export default function AboutSettingsSection({ appVersion, checkForUpdate, openRelease }: AboutSettingsSectionProps) {
  const [showDonation, setShowDonation] = useState(false);
  const donationButton = useRef<HTMLButtonElement>(null);
  const drag = useDraggableDialog(showDonation);
  return <>
    <Surface as="section" htmlRole="region" aria-labelledby="about-settings-title" className="card card-shadow rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2 px-1"><Info className="h-4 w-4 text-amber-600 dark:text-amber-400" /><h2 id="about-settings-title" className="text-base font-semibold text-foreground">关于</h2></div>
      <div className="divide-y divide-border/50">
        <AboutRow label="当前版本"><span className="tabular-nums">{appVersion || '读取中…'}</span><VersionUpdateBadge appVersion={appVersion} checkForUpdate={checkForUpdate} openRelease={openRelease} /></AboutRow>
        <AboutRow label="作者"><span>魚肉</span><GlassButton type="button" buttonRef={donationButton} aria-haspopup="dialog" onClick={() => setShowDonation(true)} className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />打赏</GlassButton></AboutRow>
        <AboutRow label="博客"><a onClick={event => { event.preventDefault(); void openExternalUrl('https://zzephyrxx.github.io/').catch(() => toast.error('打开博客失败，请重试')); }} href="https://zzephyrxx.github.io/" target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"><span className="truncate">zzephyrxx.github.io</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></AboutRow>
        <AboutRow label="更新日期"><time dateTime={RELEASE_MONTH.replace('.', '-')}>{RELEASE_MONTH}</time></AboutRow>
      </div>
    </Surface>
    <Surface as="section" htmlRole="region" aria-labelledby="more-content-title" className="card card-shadow rounded-2xl p-3">
      <div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><h2 id="more-content-title" className="text-sm font-semibold text-foreground">更多精彩</h2></div>
      <div className="community-accounts">
        <figure className="community-account">
          <img src="/gzh.jpg" alt="公众号二维码" className="community-qr" />
          <figcaption className="community-account-label text-xs text-foreground"><img src="/gzhLogo.png" alt="公众号" className="community-platform-logo community-platform-logo--wechat" /><span>多魚的知识</span></figcaption>
        </figure>
        <figure className="community-account">
          <img src="/xhs.jpg" alt="小红书二维码" className="community-qr" />
          <figcaption className="community-account-label text-xs text-foreground"><img src="/xhs.png" alt="小红书" className="community-platform-logo community-platform-logo--xiaohongshu" /><span>Zephyrxx</span></figcaption>
        </figure>
      </div>
    </Surface>
    <Overlay label="微信扫码打赏" open={showDonation} onClose={() => setShowDonation(false)} returnFocus={donationButton} dialogRef={drag.surface} dialogClassName="donation-dialog">
      <div className="relative px-6 pb-6 pt-5 text-center">
        <button type="button" aria-label="关闭打赏弹窗" onClick={() => setShowDonation(false)} className="dialog-close-button absolute right-3 top-3 text-muted-foreground hover:bg-accent"><X size={18} /></button>
        <div {...drag.handle} data-testid="donation-dialog-drag-handle" aria-label="拖动打赏弹窗" className="cursor-grab touch-none px-5 py-1 active:cursor-grabbing"><h2 className="text-sm font-semibold text-foreground">微信扫码打赏</h2></div>
        <img src="/wxzs.png" alt="微信打赏码" className="mx-auto mt-5 h-[166px] w-[166px] rounded-full object-cover" />
        <p className="mt-5 text-xs leading-6 text-muted-foreground">您的每一份认可都是我持续打磨与更新的动力</p>
      </div>
    </Overlay>
  </>;
}
