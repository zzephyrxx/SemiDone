import { Moon } from '../../ui/icons';
export default function ZenIcon({ size = 22, className = '' }: { variant?: 'on' | 'off'; size?: number; className?: string }) {
  return <Moon size={size} className={className} />;
}
