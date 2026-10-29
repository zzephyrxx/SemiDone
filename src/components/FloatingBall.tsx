import React, { useState, useEffect, useRef } from 'react';
import {
  currentMonitor,
  getCurrentWindow,
  PhysicalPosition,
} from '@tauri-apps/api/window';
import { useSettingsStore } from '../store/settingsStore';
import { isDesktopRuntime } from '../api/tauri';
import { dragFloatingWindow } from '../services/floatingWindowDrag';

interface FloatingBallProps {
  onExpand: () => void;
}

export default function FloatingBall({ onExpand }: FloatingBallProps) {
  const { settings, setEdgeSnap } = useSettingsStore();

  // 应用透明效果
  useEffect(() => {
    // 保存原始设置
    const originalTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const wasTransparent = document.body.classList.contains('transparent-mode');
    const originalOpacity = document.documentElement.style.getPropertyValue('--window-opacity');
    
    // 始终应用深色主题和100%透明效果
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.setProperty('--window-opacity', '0');
    document.body.classList.add('transparent-mode');
    
    // 组件卸载时恢复原始设置
    return () => {
      document.documentElement.setAttribute('data-theme', originalTheme);
      if (wasTransparent) {
        document.documentElement.style.setProperty('--window-opacity', originalOpacity);
      } else {
        document.documentElement.style.setProperty('--window-opacity', '1');
        document.body.classList.remove('transparent-mode');
      }
    };
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const ballRef = useRef<HTMLDivElement>(null);
  const [isNearEdge, setIsNearEdge] = useState(false);
  const pressPoint = useRef({ x: 0, y: 0 });
  const nativeDragging = useRef(false);
  const suppressClick = useRef(false);

  // 检测是否接近屏幕边缘
  const checkEdgeProximity = (x: number, screenWidth: number) => {
    const threshold = 50;
    return x < threshold || x > screenWidth - threshold;
  };

  // 左键按下时只记录起点，避免原生拖窗吞掉普通点击事件。
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    pressPoint.current = { x: e.clientX, y: e.clientY };
    suppressClick.current = false;
    setIsDragging(true);
    const rect = ballRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
    e.preventDefault();
  };

  // 移动超过阈值后才启动原生窗口拖动；释放时再判断是否需要吸附。
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let boundaryTimer: number | null = null;
    let boundaryCorrectionPromise: Promise<WindowGeometry | null> | null = null;
    let unlistenMoved: (() => void) | null = null;
    let disposed = false;

    const clearBoundaryTimer = () => {
      if (boundaryTimer !== null) {
        window.clearTimeout(boundaryTimer);
        boundaryTimer = null;
      }
    };

      const moved = Math.hypot(e.clientX - pressPoint.current.x, e.clientY - pressPoint.current.y) >= 4;
      if (isDesktopRuntime) {
        if (!moved || nativeDragging.current) return;
        nativeDragging.current = true;
        suppressClick.current = true;
        void dragFloatingWindow().then(async edge => {
          if (edge && useSettingsStore.getState().settings.collapseMode === 'floating') await setEdgeSnap(true, edge);
        }).catch(error => console.warn('悬浮球拖动失败:', error)).finally(() => {
          nativeDragging.current = false;
          setIsDragging(false);
          setIsNearEdge(false);
        });
        return;
      }
      if (moved) suppressClick.current = true;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

    const correctBoundary = async () => {
      try {
        await keepVisibleOnce(() => {
          // setPosition 会再次触发 onMoved。先结束本轮原生拖动态，
          // 避免程序化位置修正被误判为第二次用户拖动。
          nativeDragStartedRef.current = false;
          dragStartRef.current = null;
          clearBoundaryTimer();
        });
      } catch (error) {
        console.error('修正悬浮球屏幕边界失败:', error);
      } finally {
        setIsDragging(false);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      const dragStart = dragStartRef.current;
      if (!dragStart || nativeDragStartedRef.current) return;

      if ((event.buttons & 1) !== 1) {
        dragStartRef.current = null;
        setIsDragging(false);
        return;
      }

      const pointerDistance = Math.hypot(
        event.screenX - dragStart.x,
        event.screenY - dragStart.y,
      );
      if (pointerDistance < DRAG_THRESHOLD) return;

      nativeDragStartedRef.current = true;
      setIsDragging(true);
      event.preventDefault();

      void appWindow.startDragging().catch((error) => {
        nativeDragStartedRef.current = false;
        dragStartRef.current = null;
        setIsDragging(false);
        console.error('悬浮球拖动失败:', error);
      });
    };

    const handleMouseUp = async () => {
      if (isDesktopRuntime) {
        if (!nativeDragging.current) setIsDragging(false);
        return;
      }
      setIsDragging(false);

      if (!wasDragging) return;

      suppressClickRef.current = true;
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
      suppressClickTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        suppressClickTimerRef.current = null;
      }, 0);

      try {
        const geometry = await keepVisibleOnce();
        if (!geometry || geometry.corrected) return;

        const edge = findHorizontalSnapEdge(
          geometry.position,
          geometry.size,
          geometry.monitor,
        );
        if (edge) {
          await setEdgeSnap(true, edge);
        } else if (settings.isEdgeSnapped) {
          await setEdgeSnap(false);
          await keepFloatingWindowVisible();
        }
      } catch (error) {
        // 悬浮球窗口太小，不在这里显示会被裁切的 Toast。
        console.error('检测屏幕边缘失败:', error);
      }
    };

    // Windows 原生拖窗可能吞掉 WebView 的 mouseup。窗口停止移动后再做一次
    // 边界校正，确保左、右、下方越界时悬浮球仍完整可见。
    void appWindow.onMoved(() => {
      if (!nativeDragStartedRef.current) return;

      clearBoundaryTimer();
      boundaryTimer = window.setTimeout(() => {
        boundaryTimer = null;
        void correctBoundary();
      }, BOUNDARY_SETTLE_DELAY);
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
      } else {
        unlistenMoved = unlisten;
      }
    }).catch((error) => {
      console.error('监听悬浮球窗口移动失败:', error);
    });

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      disposed = true;
      clearBoundaryTimer();
      unlistenMoved?.();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (suppressClickTimerRef.current !== null) {
        window.clearTimeout(suppressClickTimerRef.current);
      }
    };
  }, [setEdgeSnap, settings.isEdgeSnapped]);

  // 点击展开
  const handleClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (settings.isEdgeSnapped) {
      void setEdgeSnap(false)
        .then(() => keepFloatingWindowVisible())
        .catch((error) => {
          console.error('恢复悬浮球可视位置失败:', error);
        });
    } else {
      onExpand();
    }
  };

  const isSnapped = settings.isEdgeSnapped;

  return (
    <div
      ref={ballRef}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className={`
        fixed top-0 left-0 z-50 select-none cursor-pointer overflow-hidden
        flex items-center justify-center p-0 m-0
        ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}
      `}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        width: isSnapped ? '30px' : '55px', 
        height: isSnapped ? '30px' : '55px',
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
    >
      <img
        src="/Logo3D.png"
        alt="事半·SemiDone"
        // 核心修复：w-full h-full 铺满容器，object-cover 确保无边距填充
        className="w-full h-full object-cover block p-0 m-0"
        draggable={false}
      />
    </div>
  );
}
