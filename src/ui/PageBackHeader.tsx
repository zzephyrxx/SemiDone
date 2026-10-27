import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageBackHeader({ children, onBack }: { children?: ReactNode; onBack?: () => void }) {
  const content = <><ArrowLeft size={16} aria-hidden="true" /><span>返回</span></>;
  return <header className="workspace-page-header">
    {onBack
      ? <button type="button" className="workspace-back" onClick={onBack}>{content}</button>
      : <Link to="/" className="workspace-back">{content}</Link>}
    {children}
  </header>;
}
