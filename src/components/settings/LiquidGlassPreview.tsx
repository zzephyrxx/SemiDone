import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createRoundedRectEdgeMap } from '../../utils/liquidGlassDisplacement';
import './LiquidGlassPreview.css';

type PreviewMethodId = 'css' | 'noise' | 'edge' | 'chromatic' | 'interactive';

interface PreviewMethod {
  id: PreviewMethodId;
  glassTitle: string;
  glassSubtitle: string;
  title: string;
  description: string;
  featured?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface DragState {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  positionX: number;
  positionY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
}

interface GlassSceneProps {
  method: PreviewMethod;
  alternateBackground: boolean;
  radius: number;
  onInteractiveBoost: (boost: number) => void;
}

const METHODS: PreviewMethod[] = [
  {
    id: 'css',
    glassTitle: 'CSS Frosted',
    glassSubtitle: '仅模糊、透明度与高光',
    title: '磨砂玻璃',
    description: '柔和模糊背景，呈现轻盈通透的玻璃质感。',
  },
  {
    id: 'noise',
    glassTitle: 'Global Noise',
    glassSubtitle: '整块区域持续波动',
    title: '液态玻璃',
    description: '背景持续产生轻微流动与折射。',
  },
  {
    id: 'edge',
    glassTitle: 'Edge Refraction',
    glassSubtitle: '中心清晰，仅边缘弯曲',
    title: '边缘折射玻璃',
    description: '中心保持清晰，边缘呈现自然弯曲。',
    featured: true,
  },
  {
    id: 'chromatic',
    glassTitle: 'Chromatic Edge',
    glassSubtitle: 'RGB 不同强度的边缘偏移',
    title: '色散玻璃',
    description: '玻璃边缘带有克制的彩色光晕。',
  },
  {
    id: 'interactive',
    glassTitle: 'Interactive Jelly',
    glassSubtitle: '拖动或移动指针试试看',
    title: '交互式液态玻璃',
    description: '拖动时会跟随速度产生柔和形变。',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function GlassScene({
  method,
  alternateBackground,
  radius,
  onInteractiveBoost,
}: GlassSceneProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [deformation, setDeformation] = useState({
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    borderRadius: `${radius}px`,
  });

  useEffect(() => {
    if (!dragStateRef.current) {
      setDeformation((current) => ({
        ...current,
        borderRadius: `${radius}px`,
      }));
    }
  }, [radius]);

  const getLimits = () => {
    const scene = sceneRef.current;
    const glass = glassRef.current;
    if (!scene || !glass) return { x: 0, y: 0 };

    const sceneRect = scene.getBoundingClientRect();
    const glassRect = glass.getBoundingClientRect();
    return {
      x: Math.max(0, (sceneRect.width - glassRect.width) / 2 - 14),
      y: Math.max(0, (sceneRect.height - glassRect.height) / 2 - 14),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      positionX: position.x,
      positionY: position.y,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const glass = glassRef.current;
    if (method.id === 'interactive' && glass) {
      const rect = glass.getBoundingClientRect();
      const nx = clamp(((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1, -1, 1);
      const ny = clamp(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1, -1, 1);
      onInteractiveBoost(Math.hypot(nx, ny) * 5);
    }

    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const limits = getLimits();
    const nextPosition = {
      x: clamp(
        dragState.positionX + event.clientX - dragState.pointerX,
        -limits.x,
        limits.x,
      ),
      y: clamp(
        dragState.positionY + event.clientY - dragState.pointerY,
        -limits.y,
        limits.y,
      ),
    };
    setPosition(nextPosition);

    if (method.id === 'interactive') {
      const now = performance.now();
      const dx = event.clientX - dragState.lastX;
      const dy = event.clientY - dragState.lastY;
      const elapsed = Math.max(8, now - dragState.lastTime);
      const speed = (Math.hypot(dx, dy) / elapsed) * 16;
      setDeformation({
        rotation: clamp(dx * 0.12, -5, 5),
        scaleX: 1 + Math.min(Math.abs(dx) * 0.0045, 0.08),
        scaleY:
          1
          - Math.min(Math.abs(dx) * 0.002, 0.035)
          + Math.min(Math.abs(dy) * 0.002, 0.035),
        borderRadius: [
          clamp(radius - dx * 0.08, 16, 80),
          clamp(radius + dx * 0.08, 16, 80),
          clamp(radius + dy * 0.08, 16, 80),
          clamp(radius - dy * 0.08, 16, 80),
        ].map((value) => `${value}px`).join(' '),
      });
      onInteractiveBoost(Math.min(speed * 0.55, 24));
      dragState.lastX = event.clientX;
      dragState.lastY = event.clientY;
      dragState.lastTime = now;
    }
  };

  const releasePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDeformation({
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      borderRadius: `${radius}px`,
    });
    if (method.id === 'interactive') onInteractiveBoost(0);
  };

  return (
    <div
      ref={sceneRef}
      data-testid={`liquid-preview-scene-${method.id}`}
      className={`lgp-scene${alternateBackground ? ' lgp-scene--alternate' : ''}`}
    >
      <i className="lgp-orb lgp-orb--one" />
      <i className="lgp-orb lgp-orb--two" />
      <i className="lgp-orb lgp-orb--three" />
      <div
        ref={glassRef}
        data-testid={`liquid-preview-glass-${method.id}`}
        aria-label={`拖动${method.title}样例`}
        className={`lgp-glass lgp-glass--${method.id}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={releasePointer}
        onPointerCancel={releasePointer}
        onPointerLeave={() => {
          if (method.id === 'interactive' && !dragStateRef.current) {
            onInteractiveBoost(0);
          }
        }}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) rotate(${deformation.rotation}deg) scale(${deformation.scaleX}, ${deformation.scaleY})`,
          borderRadius: deformation.borderRadius,
        }}
      >
        <div className="lgp-glass-content">
          <strong>{method.glassTitle}</strong>
          <span>{method.glassSubtitle}</span>
        </div>
      </div>
    </div>
  );
}

export default function LiquidGlassPreview() {
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null);
  const [blur, setBlur] = useState(12);
  const [refraction, setRefraction] = useState(1);
  const [radius, setRadius] = useState(42);
  const [alternateBackground, setAlternateBackground] = useState(false);
  const [animateNoise, setAnimateNoise] = useState(true);
  const [interactiveBoost, setInteractiveBoost] = useState(0);
  const [supportText, setSupportText] = useState('正在检测渲染能力');

  const edgeMap = useMemo(
    () =>
      createRoundedRectEdgeMap({
        width: 240,
        height: 150,
        radius,
        edgeWidth: 24,
      }),
    [radius],
  );

  useEffect(() => {
    const cssApi = globalThis.CSS;
    const backdropSupported =
      cssApi?.supports?.('backdrop-filter', 'blur(2px)')
      || cssApi?.supports?.('-webkit-backdrop-filter', 'blur(2px)');
    const chromium =
      typeof navigator !== 'undefined'
      && /Chrome|Chromium|Edg\//.test(navigator.userAgent)
      && !/OPR\//.test(navigator.userAgent);
    setSupportText(
      chromium && backdropSupported
        ? '当前环境适合完整演示'
        : backdropSupported
          ? '可显示基础玻璃，SVG 置换可能降级'
          : '当前环境将显示透明度与高光降级效果',
    );
  }, []);

  useEffect(() => {
    const turbulence = turbulenceRef.current;
    if (!animateNoise || !turbulence || typeof window.requestAnimationFrame !== 'function') {
      return;
    }

    const startedAt = performance.now();
    let frameId = 0;
    const animate = (now: number) => {
      const seconds = (now - startedAt) / 1000;
      const frequencyX = 0.011 + Math.sin(seconds * 0.45) * 0.0022;
      const frequencyY = 0.021 + Math.cos(seconds * 0.37) * 0.003;
      turbulence.setAttribute(
        'baseFrequency',
        `${frequencyX.toFixed(4)} ${frequencyY.toFixed(4)}`,
      );
      frameId = window.requestAnimationFrame(animate);
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [animateNoise]);

  const style = {
    '--lgp-global-blur': `${blur}px`,
    '--lgp-noise-blur': `${(blur * 0.38).toFixed(2)}px`,
    '--lgp-edge-blur': `${(blur * 0.06).toFixed(2)}px`,
    '--lgp-chromatic-blur': `${(blur * 0.03).toFixed(2)}px`,
    '--lgp-interactive-blur': `${(blur * 0.14).toFixed(2)}px`,
    '--lgp-radius': `${radius}px`,
  } as CSSProperties;

  return (
    <div className="lgp-root" style={style}>
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        className="lgp-filter-definitions"
        colorInterpolationFilters="sRGB"
      >
        <defs>
          <filter id="preview-global-noise-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              ref={turbulenceRef}
              type="fractalNoise"
              baseFrequency="0.012 0.022"
              numOctaves={2}
              seed={7}
              result="previewNoise"
            />
            <feGaussianBlur in="previewNoise" stdDeviation="0.35" result="previewSoftNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="previewSoftNoise"
              scale={18 * refraction}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          <filter
            id="preview-edge-filter"
            filterUnits="userSpaceOnUse"
            x="-40"
            y="-40"
            width="320"
            height="230"
          >
            <feImage
              href={edgeMap}
              x="0"
              y="0"
              width="240"
              height="150"
              preserveAspectRatio="none"
              result="previewEdgeMap"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="previewEdgeMap"
              scale={34 * refraction}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          <filter
            id="preview-chromatic-filter"
            filterUnits="userSpaceOnUse"
            x="-40"
            y="-40"
            width="320"
            height="230"
          >
            <feImage
              href={edgeMap}
              x="0"
              y="0"
              width="240"
              height="150"
              preserveAspectRatio="none"
              result="previewChromaticMap"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="previewChromaticMap"
              scale={31 * refraction}
              xChannelSelector="R"
              yChannelSelector="G"
              result="previewRedShift"
            />
            <feColorMatrix
              in="previewRedShift"
              type="matrix"
              values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="previewRedOnly"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="previewChromaticMap"
              scale={23 * refraction}
              xChannelSelector="R"
              yChannelSelector="G"
              result="previewGreenShift"
            />
            <feColorMatrix
              in="previewGreenShift"
              type="matrix"
              values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
              result="previewGreenOnly"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="previewChromaticMap"
              scale={16 * refraction}
              xChannelSelector="R"
              yChannelSelector="G"
              result="previewBlueShift"
            />
            <feColorMatrix
              in="previewBlueShift"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
              result="previewBlueOnly"
            />
            <feBlend in="previewRedOnly" in2="previewGreenOnly" mode="screen" result="previewRG" />
            <feBlend in="previewRG" in2="previewBlueOnly" mode="screen" />
          </filter>

          <filter
            id="preview-interactive-filter"
            filterUnits="userSpaceOnUse"
            x="-50"
            y="-50"
            width="340"
            height="250"
          >
            <feImage
              href={edgeMap}
              x="0"
              y="0"
              width="240"
              height="150"
              preserveAspectRatio="none"
              result="previewInteractiveMap"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="previewInteractiveMap"
              scale={38 * refraction + interactiveBoost}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <header className="lgp-header">
        <div>
          <div className="lgp-eyebrow">Next Version Preview
          </div>
          <h2>液态玻璃效果预览</h2>
        </div>
        <div className="lgp-support">
          <span className="lgp-status-dot" />
          <span>{supportText}</span>
        </div>
      </header>

      <div className="lgp-toolbar">
        <label>
          <span>全局模糊</span>
          <input
            aria-label="液态玻璃全局模糊"
            type="range"
            min="0"
            max="24"
            step="1"
            value={blur}
            onChange={(event) => setBlur(Number(event.target.value))}
          />
          <output>{blur}px</output>
        </label>
        <label>
          <span>折射强度</span>
          <input
            aria-label="液态玻璃折射强度"
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={refraction}
            onChange={(event) => setRefraction(Number(event.target.value))}
          />
          <output>{refraction.toFixed(2)}×</output>
        </label>
        <label>
          <span>圆角程度</span>
          <input
            aria-label="液态玻璃圆角程度"
            type="range"
            min="16"
            max="72"
            step="1"
            value={radius}
            onChange={(event) => setRadius(Number(event.target.value))}
          />
          <output>{radius}px</output>
        </label>
        <button type="button" onClick={() => setAlternateBackground((current) => !current)}>
          切换演示背景
        </button>
        <button type="button" onClick={() => setAnimateNoise((current) => !current)}>
          {animateNoise ? '暂停动态噪声' : '继续动态噪声'}
        </button>
      </div>

      <main className="lgp-grid">
        {METHODS.map((method) => (
          <article
            key={method.id}
            className={`lgp-method${method.featured ? ' lgp-method--featured' : ''}`}
          >
            <GlassScene
              method={method}
              alternateBackground={alternateBackground}
              radius={radius}
              onInteractiveBoost={
                method.id === 'interactive' ? setInteractiveBoost : () => undefined
              }
            />
            <div className="lgp-method-body">
              <h3>{method.title}</h3>
              <p>{method.description}</p>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
