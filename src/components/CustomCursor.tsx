import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export const CustomCursor: React.FC = () => {
  const { customCursor, effectiveTheme } = useTheme();
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const requestRef = useRef<number | null>(null);
  const targetPos = useRef<{ x: number; y: number }>({ x: -100, y: -100 });

  useEffect(() => {
    // Only enable hardware custom cursor on non-touch devices with fine pointers
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(pointer: fine)');
    setIsFinePointer(media.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsFinePointer(e.matches);
    };
    media.addEventListener('change', handleMediaChange);

    return () => media.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!customCursor || !isFinePointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);

      // Detect if hovering over clickable elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          'a, button, input, select, textarea, [role="button"], [role="link"], [data-clickable="true"], label, .cursor-pointer'
        );
        setIsPointer(!!interactive);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Smooth animation frame loop for micro-damping
    let currentX = -100;
    let currentY = -100;

    const updatePosition = () => {
      currentX += (targetPos.current.x - currentX) * 0.85;
      currentY += (targetPos.current.y - currentY) * 0.85;

      setPos({ x: currentX, y: currentY });
      requestRef.current = requestAnimationFrame(updatePosition);
    };

    requestRef.current = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [customCursor, isFinePointer, isVisible]);

  if (!customCursor || !isFinePointer || !isVisible) {
    return null;
  }

  const isDark = effectiveTheme === 'dark';

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none z-[9999] will-change-transform"
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: 'transform 0.04s cubic-bezier(0.1, 1, 0.1, 1)',
      }}
    >
      {/* Precision Arrow Silhouette */}
      <div
        className={`relative transition-all duration-150 origin-top-left ${
          isClicking ? 'scale-90 rotate-[-4deg]' : isPointer ? 'scale-110' : 'scale-100'
        }`}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-md"
        >
          {/* Subtle Ambient Glow on Pointer / Hover */}
          {isPointer && (
            <path
              d="M3 2L11 23L14.5 14.5L23 11L3 2Z"
              fill={isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.25)'}
              className="blur-xs"
            />
          )}

          {/* Main Arrow Body */}
          <path
            d="M3 2L11 23L14.5 14.5L23 11L3 2Z"
            fill={
              isPointer
                ? isDark
                  ? '#818cf8'
                  : '#4f46e5'
                : isDark
                ? '#f8fafc'
                : '#0f172a'
            }
            stroke={
              isDark
                ? isPointer
                  ? '#ffffff'
                  : '#090d16'
                : isPointer
                ? '#ffffff'
                : '#ffffff'
            }
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {/* Precision Accent Center Core */}
          <circle
            cx="12"
            cy="12"
            r={isPointer ? '2' : '1.5'}
            fill={
              isPointer
                ? isDark
                  ? '#38bdf8'
                  : '#06b6d4'
                : isDark
                ? '#6366f1'
                : '#818cf8'
            }
          />
        </svg>

        {/* Small subtle mode indicator when hovering clickable elements */}
        {isPointer && (
          <span
            className={`absolute top-5 left-5 text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded shadow-xs uppercase select-none transition-opacity duration-150 ${
              isDark
                ? 'bg-indigo-600/90 text-white border border-indigo-400/40'
                : 'bg-slate-900/90 text-white border border-slate-700/40'
            }`}
          >
            KRUM
          </span>
        )}
      </div>
    </div>
  );
};
