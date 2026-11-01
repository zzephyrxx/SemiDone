import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { X, User, Camera, Edit3 } from '../ui/icons';
import { useSettingsStore } from '../store/settingsStore';
import { Overlay } from '../ui/Overlay';

interface UserProfileModalProps { isOpen: boolean; onClose: () => void }

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { settings, updateSettings } = useSettingsStore();
  // Retain the existing JSON field so saved personal text survives this rename.
  const [username, setUsername] = useState(settings.username || '');
  const [avatar, setAvatar] = useState(settings.avatar || '');
  const [editing, setEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const usernameInput = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setUsername(settings.username || ''); setAvatar(settings.avatar || ''); setEditing(false);
    }
    wasOpen.current = isOpen;
  }, [isOpen, settings.username, settings.avatar]);
  useEffect(() => { if (editing) usernameInput.current?.focus(); }, [editing]);

  const close = () => { if (!isLoading) onClose(); };
  const save = async () => {
    setIsLoading(true);
    try {
      await updateSettings({ username: username.trim(), avatar });
      const saved = useSettingsStore.getState().settings;
      if (saved.username === username.trim() && saved.avatar === avatar) onClose();
    } finally { setIsLoading(false); }
  };
  const changeAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };
  return <Overlay label="我的信息" open={isOpen} onClose={close} dialogClassName="user-profile-dialog">
    <div className="p-4">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">我的信息</h2>
        <button type="button" onClick={close} disabled={isLoading} aria-label="关闭我的信息"
          className="dialog-close-button text-muted-foreground hover:bg-accent"><X size={20} /></button>
      </div>
      <div className="mb-5 flex flex-col items-center">
        <div className="relative">
          {avatar ? <img src={avatar} alt="我的头像" className="h-20 w-20 rounded-full object-cover" />
            : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"><User size={40} className="text-primary" /></div>}
          <label className="profile-avatar-change absolute -bottom-1 -right-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/80">
            <Camera size={20} /><input type="file" aria-label="更换头像" accept="image/*" onChange={changeAvatar} className="sr-only" disabled={isLoading} />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">点击相机图标更换头像</p>
      </div>
      <div className="mb-5">
        <label htmlFor="profile-username" className="mb-2 block text-center text-sm font-medium text-foreground">用户名</label>
        <div className="profile-username-row">
          <input ref={usernameInput} id="profile-username" type="text" value={username} readOnly={!editing} disabled={isLoading}
            onChange={event => setUsername(event.target.value)} maxLength={60} placeholder="请输入用户名"
            className="profile-username-input min-w-0 flex-1 border border-border bg-background px-3 py-2 text-center text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <button type="button" className="profile-edit-button text-primary hover:bg-accent" aria-label={editing ? '完成用户名编辑' : '编辑用户名'}
            aria-pressed={editing} disabled={isLoading} onClick={() => setEditing(!editing)}><Edit3 size={18} /></button>
        </div>
      </div>
      <div className="profile-actions flex gap-2">
        <button type="button" onClick={close} disabled={isLoading} className="flex-1 border border-border px-3 py-2 text-sm text-foreground hover:bg-accent">取消</button>
        <button type="button" onClick={() => void save()} disabled={isLoading} className="flex-1 bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{isLoading ? '保存中…' : '保存'}</button>
      </div>
    </div>
  </Overlay>;
}
