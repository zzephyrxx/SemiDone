import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import type { LiquidGlassSettings } from '../types';
import { glassOpticalMaps, type GlassGeometry } from '../ui/glassGeometry';
import { normalizeFontScale } from '../utils/interfaceSettings';
import { useReducedMotion } from '../ui/motion';
import {
  liquidGlassBlurLevelToPixels,
  normalizeLiquidGlassSettings,
  liquidGlassBackdrop,
} from '../utils/liquidGlassSettings';

const RED_MATRIX =
  '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1';
const GREEN_MATRIX =
  '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1';
const BLUE_MATRIX =
  '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1';

function VectorField({ href, result, geometry }: { href: string; result: string; geometry: GlassGeometry }) {
  return <>
    {/* Match the surface in CSS pixels; filter padding must not stretch the map. */}
    <feImage href={href} x="0" y="0" width={geometry.width} height={geometry.height} preserveAspectRatio="none" result={`${result}Bytes`} />
    {/* The byte value 128 must become exactly .5, including on flat/transparent backdrops. */}
    <feComponentTransfer in={`${result}Bytes`} result={result}>
      <feFuncR type="linear" slope={255 / 254} intercept={-1 / 254} />
      <feFuncG type="linear" slope={255 / 254} intercept={-1 / 254} />
    </feComponentTransfer>
  </>;
}

export default function LiquidGlassRuntime() {
  const fontScale = useSettingsStore(state => normalizeFontScale(state.settings.fontScale));
  const shape = useSettingsStore(state => state.settings.collapseMode);
  const reduced = useReducedMotion();
  const settings = useSettingsStore((state) => state.settings.liquidGlass);
  const liquidGlass = normalizeLiquidGlassSettings(settings);
  const blurPixels = liquidGlassBlurLevelToPixels(liquidGlass.blur);
  const surfaceFilter = liquidGlassBackdrop(liquidGlass);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ui-font-scale', String(fontScale / 100));
    root.dataset.uiMotion = String(!reduced);
    root.dataset.windowShape = shape;
    return () => { root.style.removeProperty('--ui-font-scale'); delete root.dataset.uiMotion; delete root.dataset.windowShape; };
  }, [fontScale, reduced, shape]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.liquidGlassDialogs = String(liquidGlass.enabled);
    root.dataset.liquidGlassDispersion = String(
      liquidGlass.enabled && liquidGlass.dispersion,
    );
    root.style.setProperty('--liquid-glass-dialog-blur', `${blurPixels}px`);
    root.style.setProperty('--liquid-glass-surface-filter', surfaceFilter);

    return () => {
      delete root.dataset.liquidGlassDialogs;
      delete root.dataset.liquidGlassDispersion;
      root.style.removeProperty('--liquid-glass-dialog-blur');
      root.style.removeProperty('--liquid-glass-surface-filter');
    };
  }, [blurPixels, liquidGlass.dispersion, liquidGlass.enabled, surfaceFilter]);

  return liquidGlass.enabled && (liquidGlass.strength > 0 || liquidGlass.magnify > 0 || liquidGlass.dispersion)
    ? <LiquidGlassFilters settings={liquidGlass} /> : null;
}

export function LiquidGlassFilters({ settings, idPrefix = 'semidone-dialog', geometry = { width: 320, height: 240, radius: 20 } }: {
  settings: LiquidGlassSettings;
  idPrefix?: string;
  geometry?: GlassGeometry;
}) {
  const liquidGlass = normalizeLiquidGlassSettings(settings);
  const maps = glassOpticalMaps(geometry.width, geometry.height, geometry.radius, liquidGlass.refraction, geometry.profile, liquidGlass);
  return (
    <svg aria-hidden="true" className="liquid-glass-filter-definitions" focusable="false" width="0" height="0">
      <defs>
        <filter id={`${idPrefix}-refraction`} primitiveUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <VectorField href={maps.base} result="baseField" geometry={geometry} />
          <feDisplacementMap in="SourceGraphic" in2="baseField" scale={maps.refractionScale * maps.unitScale} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`${idPrefix}-chromatic-refraction`} primitiveUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <VectorField href={maps.base} result="baseField" geometry={geometry} />
          <feDisplacementMap in="SourceGraphic" in2="baseField" scale={maps.refractionScale * maps.unitScale} xChannelSelector="R" yChannelSelector="G" result="face" />
          <VectorField href={maps.red} result="redField" geometry={geometry} />
          <feDisplacementMap in="SourceGraphic" in2="redField" scale={maps.channelScale * maps.unitScale} xChannelSelector="R" yChannelSelector="G" result="redSample" />
          <VectorField href={maps.blue} result="blueField" geometry={geometry} />
          <feDisplacementMap in="SourceGraphic" in2="blueField" scale={maps.channelScale * maps.unitScale} xChannelSelector="R" yChannelSelector="G" result="blueSample" />
          {/* Join straight RGB first, then restore the base alpha once. No dark fill or screen blend. */}
          <feColorMatrix in="redSample" type="matrix" values={RED_MATRIX} result="red" />
          <feColorMatrix in="face" type="matrix" values={GREEN_MATRIX} result="green" />
          <feColorMatrix in="blueSample" type="matrix" values={BLUE_MATRIX} result="blue" />
          <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="redGreen" />
          <feComposite in="redGreen" in2="blue" operator="arithmetic" k2="1" k3="1" result="rgb" />
          <feComposite in="rgb" in2="face" operator="in" result="chromatic" />
          <feImage href={maps.edgeMask} x="0" y="0" width={geometry.width} height={geometry.height} preserveAspectRatio="none" result="rimBytes" />
          <feColorMatrix in="rimBytes" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0" result="rimMask" />
          <feComposite in="chromatic" in2="rimMask" operator="in" result="coloredRim" />
          <feComposite in="face" in2="rimMask" operator="out" result="clearFace" />
          <feComposite in="coloredRim" in2="clearFace" operator="arithmetic" k2="1" k3="1" />
        </filter>
      </defs>
    </svg>
  );
}
