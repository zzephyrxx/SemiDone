import zenOn from '../../assets/icons/zen-on.svg';
import zenOff from '../../assets/icons/zen-off.svg';

interface Props {
  variant?: 'on' | 'off';
  size?: number;
  className?: string;
}

export default function ZenIcon({ variant = 'on', size = 22, className = '' }: Props) {
  const image = variant === 'on' ? zenOn : zenOff;
  // Assets share a centered, tightly padded viewBox; inherit the button's theme color.
  return (
    <span aria-hidden="true" className={`block shrink-0 ${className}`} style={{
      width: size,
      height: size,
      backgroundColor: 'currentColor',
      maskImage: `url("${image}")`,
      WebkitMaskImage: `url("${image}")`,
      maskPosition: 'center',
      WebkitMaskPosition: 'center',
      maskRepeat: 'no-repeat',
      WebkitMaskRepeat: 'no-repeat',
      maskSize: 'contain',
      WebkitMaskSize: 'contain',
      pointerEvents: 'none',
    }} />
  );
}
