import zenOn from '../../assets/icons/zen-on.svg?raw';
import zenOff from '../../assets/icons/zen-off.svg?raw';

interface Props {
  variant?: 'on' | 'off';
  size?: number;
  className?: string;
}

export default function ZenIcon({ variant = 'on', size = 22, className = '' }: Props) {
  const image = variant === 'on' ? zenOn : zenOff;
  // Inline the bundled SVG so currentColor follows the theme without a CSS mask.
  return (
    <span aria-hidden="true" className={`block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`} style={{
      width: size,
      height: size,
      pointerEvents: 'none',
    }} dangerouslySetInnerHTML={{ __html: image }} />
  );
}
