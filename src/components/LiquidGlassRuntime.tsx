import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import {
  liquidGlassBlurLevelToPixels,
  normalizeLiquidGlassSettings,
} from '../utils/liquidGlassSettings';

const RED_MATRIX =
  '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0';
const GREEN_MATRIX =
  '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0';
const BLUE_MATRIX =
  '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0';
const DISPERSION_RANGE_MULTIPLIER = 1.4;

export default function LiquidGlassRuntime() {
  const settings = useSettingsStore((state) => state.settings.liquidGlass);
  const liquidGlass = normalizeLiquidGlassSettings(settings);
  const blurPixels = liquidGlassBlurLevelToPixels(liquidGlass.blur);
  const refractionScale = liquidGlass.refraction * 0.34;
  const dispersionScale = refractionScale * DISPERSION_RANGE_MULTIPLIER;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.liquidGlassDialogs = String(liquidGlass.enabled);
    root.dataset.liquidGlassDispersion = String(
      liquidGlass.enabled && liquidGlass.dispersion,
    );
    root.style.setProperty('--liquid-glass-dialog-blur', `${blurPixels}px`);

    return () => {
      delete root.dataset.liquidGlassDialogs;
      delete root.dataset.liquidGlassDispersion;
      root.style.removeProperty('--liquid-glass-dialog-blur');
    };
  }, [blurPixels, liquidGlass.dispersion, liquidGlass.enabled]);

  return (
    <svg
      aria-hidden="true"
      className="liquid-glass-filter-definitions"
      focusable="false"
      width="0"
      height="0"
    >
      <defs>
        <filter
          id="semidone-dialog-refraction"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.014"
            numOctaves={2}
            seed={17}
            result="dialogNoise"
          />
          <feGaussianBlur
            in="dialogNoise"
            stdDeviation="0.65"
            result="dialogSoftNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="dialogSoftNoise"
            scale={refractionScale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        <filter
          id="semidone-dialog-chromatic-refraction"
          x="-34%"
          y="-34%"
          width="168%"
          height="168%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.014"
            numOctaves={2}
            seed={17}
            result="dialogChromaticNoise"
          />
          <feGaussianBlur
            in="dialogChromaticNoise"
            stdDeviation="0.65"
            result="dialogChromaticSoftNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="dialogChromaticSoftNoise"
            scale={dispersionScale * 1.18}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dialogRedShift"
          />
          <feColorMatrix in="dialogRedShift" type="matrix" values={RED_MATRIX} result="dialogRed" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="dialogChromaticSoftNoise"
            scale={dispersionScale * 0.86}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dialogGreenShift"
          />
          <feColorMatrix in="dialogGreenShift" type="matrix" values={GREEN_MATRIX} result="dialogGreen" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="dialogChromaticSoftNoise"
            scale={dispersionScale * 0.56}
            xChannelSelector="R"
            yChannelSelector="G"
            result="dialogBlueShift"
          />
          <feColorMatrix in="dialogBlueShift" type="matrix" values={BLUE_MATRIX} result="dialogBlue" />
          <feBlend in="dialogRed" in2="dialogGreen" mode="screen" result="dialogRedGreen" />
          <feBlend in="dialogRedGreen" in2="dialogBlue" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
}
