import { useId, type SVGProps } from 'react';

export type PinColor = 'red' | 'yellow' | 'green' | (string & {});

const PRESETS = {
  red: { light: '#F05A28', dark: '#BE1E2D' },
  yellow: { light: '#F5C518', dark: '#D4A017' },
  green: { light: '#7BCF3B', dark: '#4F9A18' },
};

type Props = SVGProps<SVGSVGElement> & {
  size?: number;
  color?: PinColor;
  darkColor?: string;
  rotate?: number;
};

/** User-supplied isometric pin, with a short embedded tip and soft shadow. */
export function IsoPushPin({ size = 20, color = 'red', darkColor, rotate = 35, className, ...rest }: Props) {
  const shadowId = `pin-shadow-${useId().replace(/:/g, '')}`;
  const preset = color === 'red' || color === 'yellow' || color === 'green' ? PRESETS[color] : undefined;
  const light = preset?.light ?? color;
  const dark = darkColor ?? preset?.dark ?? light;

  return <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true" {...rest}>
    <defs>
      <filter id={shadowId} x="-40%" y="-20%" width="180%" height="180%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0.8" dy="1.2" stdDeviation="1.1" floodColor="#000000" floodOpacity="0.35" />
        <feDropShadow dx="0" dy="0.4" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.15" />
      </filter>
    </defs>
    <g transform={`rotate(${rotate} 16 16)`} filter={`url(#${shadowId})`}>
      <path fill={light} d="M20.995,15.479c0.024-0.712-0.452-1.438-1.488-1.978v-1.321c1.201-0.619,1.548-1.395,1.488-2.054V8.606c-0.004-0.668-0.442-1.337-1.315-1.839c-1.767-1.018-4.623-1.023-6.379-0.012c-1.426,0.821-1.295,1.835-1.295,1.835v1.535c-0.045,0.645,0.3,1.414,1.488,2.033c0,0,0,1.431,0,1.321c-1.038,0.535-1.513,1.259-1.488,1.971v1.489c-0.049,0.702,0.381,1.414,1.315,1.952c1.767,1.018,4.623,1.023,6.379,0.012c0.935-0.539,1.36-1.256,1.295-1.964V15.479z" />
      <path fill={dark} d="M20.995,15.421v1.519c0.065,0.707-0.36,1.425-1.295,1.964c-1.756,1.011-4.612,1.006-6.379-0.012c-0.934-0.538-1.364-1.25-1.315-1.952v-1.535c0.004,0.665,0.432,1.331,1.315,1.839c1.767,1.018,4.623,1.023,6.379,0.012C20.578,16.75,20.998,16.086,20.995,15.421z M20.995,8.606c0.013,2.387-5.004,3.362-7.675,1.823c-0.883-0.509-1.311-1.175-1.315-1.839v1.535l0,0c-0.045,0.645,0.3,1.414,1.488,2.033v1.782h0.006c-0.015,0.456,0.275,0.916,0.881,1.265c1.178,0.679,3.082,0.682,4.253,0.008c0.607-0.35,0.891-0.813,0.866-1.273h0.009v-1.761c1.201-0.619,1.548-1.395,1.488-2.054l0,0V8.606z" />
      <path fill={dark} opacity={0.85} d="M15.55 19.58v1.65c.15.05.32.08.48.1.2-.02.4-.05.58-.1v-1.55c-.32.02-.58.03-.9-.02-.06-.01-.11-.03-.16-.08z" />
      <path fill={light} opacity={0.5} d="M15.35 21.2h1.35c.15 0 .25.08.25.18s-.1.18-.25.18h-1.35c-.15 0-.25-.08-.25-.18s.1-.18.25-.18z" />
    </g>
  </svg>;
}
