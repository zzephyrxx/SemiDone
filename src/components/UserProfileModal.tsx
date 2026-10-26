import React, { useState, useEffect } from 'react';
import { X, User, Camera, Save } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { settings, updateSettings } = useSettingsStore();
  const [username, setUsername] = useState(settings.username || '用户');
  const [avatar, setAvatar] = useState(settings.avatar || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(settings.username || '用户');
      setAvatar(settings.avatar || '');
    }
  }, [isOpen, settings]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateSettings({ username, avatar });
      onClose();
    } catch (error) {
      console.error('Failed to save user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getAvatarDisplay = () => {
    if (avatar) {
      return (
        <img 
          src={avatar} 
          alt="Avatar" 
          className="w-20 h-20 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="w-10 h-10 text-primary" />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="liquid-glass-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-title"
        className="liquid-glass-modal-surface bg-background border border-border rounded-lg shadow-lg w-80 p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="user-profile-title" className="text-lg font-semibold text-foreground">用户资料</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative">
            {getAvatarDisplay()}
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/80 transition-colors">
              <Camera className="w-3 h-3 text-primary-foreground" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-1">点击相机图标更换头像</p>
        </div>

        {/* Username Section */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-foreground mb-1">
            用户名
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="请输入用户名"
            maxLength={20}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md text-foreground hover:bg-accent transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {isLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="w-3 h-3" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
