import { isAppStore, privacyPolicyUrl } from '../../platform/distribution';
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
  const [showPrivacy, setShowPrivacy] = useState(false);
  const privacyButton = useRef<HTMLButtonElement>(null);
  const [showDonation, setShowDonation] = useState(false);
  const donationButton = useRef<HTMLButtonElement>(null);
  const drag = useDraggableDialog(showDonation);
  return <>
    <Surface as="section" htmlRole="region" aria-labelledby="about-settings-title" className="card card-shadow rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-2 px-1"><Info className="h-4 w-4 text-amber-600 dark:text-amber-400" /><h2 id="about-settings-title" className="text-base font-semibold text-foreground">关于</h2></div>
      <div className="divide-y divide-border/50">
        <AboutRow label="当前版本"><span className="tabular-nums">{appVersion || '读取中…'}</span>{isAppStore ? <span className="text-muted-foreground">通过 App Store 更新</span> : <VersionUpdateBadge appVersion={appVersion} checkForUpdate={checkForUpdate} openRelease={openRelease} />}</AboutRow>
        <AboutRow label="作者"><span>魚肉</span>{!isAppStore && <GlassButton type="button" buttonRef={donationButton} aria-haspopup="dialog" onClick={() => setShowDonation(true)} className="inline-flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" />打赏</GlassButton>}</AboutRow>
        <AboutRow label="博客"><a onClick={event => { event.preventDefault(); void openExternalUrl('https://zzephyrxx.github.io/').catch(() => toast.error('打开博客失败，请重试')); }} href="https://zzephyrxx.github.io/" target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 text-primary hover:underline"><span className="truncate">zzephyrxx.github.io</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></AboutRow>
        <AboutRow label="隐私"><GlassButton type="button" buttonRef={privacyButton} onClick={() => setShowPrivacy(true)} aria-haspopup="dialog">隐私政策</GlassButton></AboutRow>
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
    {!isAppStore && <Overlay label="微信扫码打赏" open={showDonation} onClose={() => setShowDonation(false)} returnFocus={donationButton} dialogRef={drag.surface} dialogClassName="donation-dialog">
      <div className="relative px-6 pb-6 pt-5 text-center">
        <button type="button" aria-label="关闭打赏弹窗" onClick={() => setShowDonation(false)} className="dialog-close-button absolute right-3 top-3 text-muted-foreground hover:bg-accent"><X size={18} /></button>
        <div {...drag.handle} data-testid="donation-dialog-drag-handle" aria-label="拖动打赏弹窗" className="cursor-grab touch-none px-5 py-1 active:cursor-grabbing"><h2 className="text-sm font-semibold text-foreground">微信扫码打赏</h2></div>
        <img src="/wxzs.png" alt="微信打赏码" className="mx-auto mt-5 h-[166px] w-[166px] rounded-full object-cover" />
        <p className="mt-5 text-xs leading-6 text-muted-foreground">您的每一份认可都是我持续打磨与更新的动力</p>
      </div>
    </Overlay>}
    <Overlay label="隐私政策" open={showPrivacy} onClose={() => setShowPrivacy(false)} returnFocus={privacyButton}>
      <div className="space-y-3 p-5 text-sm leading-6">
        <div className="flex items-center justify-between"><h2 className="font-semibold">SemiDone 隐私政策</h2><button type="button" aria-label="关闭隐私政策" onClick={() => setShowPrivacy(false)}><X size={18} /></button></div>
        <p>待办、备注、附件、个人资料、设置和使用记录保存在本机。使用统计用于在设备上显示使用时长及专注记录，不发送给开发者。</p>
        <p>本应用不提供账号登录、云同步、广告或跨应用跟踪。选择文件时读取您授权的内容；导出时向您选择的位置写入文件。</p>
        <p>{isAppStore ? '此版本通过 App Store 更新。' : '独立下载版会连接 GitHub 检查新版本。'}主动打开作者博客或其他外部页面后，适用对应网站的隐私政策，网站可能接收 IP 地址等访问数据。</p>
        <p>数据会保留在本机，直至您在“数据与记录”中清除。已导出的副本和备份需由您自行删除。删除前请自行备份需要保留的内容。</p>
        <p>如需联系开发者，可通过关于页的作者博客获取联系渠道。</p>
        {privacyPolicyUrl && <button type="button" className="text-primary" onClick={() => void openExternalUrl(privacyPolicyUrl).catch(() => toast.error('打开隐私政策失败'))}>查看网页版隐私政策</button>}
      </div>
    </Overlay>
  </>;
}
