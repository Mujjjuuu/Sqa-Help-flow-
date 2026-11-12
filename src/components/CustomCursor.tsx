import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

export const CustomCursor: React.FC = () => {
  const { cursorMode, effectiveTheme } = useTheme();
  const [dotPos, setDotPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);
  const [isPointer, setIsPointer] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);

  const requestRef = useRef<number | null>(null);
  const targetPos = useRef<{ x: number; y: number }>({ x: -100, y: -100 });

  useEffect(() => {
    // Only enable custom cursor on non-touch devices with fine pointers
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
    if (cursorMode === 'system' || !isFinePointer) return;

    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = { x: e.clientX, y: e.clientY };
      setDotPos({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);

      // Detect if hovering over clickable / interactive elements
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

    // Smooth physics loop for the trailing magnetic ring
    let currentX = targetPos.current.x;
    let currentY = targetPos.current.y;

    const updateRingPosition = () => {
      // Smooth interpolation for trailing ring
      currentX += (targetPos.current.x - currentX) * 0.28;
      currentY += (targetPos.current.y - currentY) * 0.28;

      setRingPos({ x: currentX, y: currentY });
      requestRef.current = requestAnimationFrame(updateRingPosition);
    };

    requestRef.current = requestAnimationFrame(updateRingPosition);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [cursorMode, isFinePointer, isVisible]);

  if (cursorMode === 'system' || !isFinePointer || !isVisible) {
    return null;
  }

  const isDark = effectiveTheme === 'dark';

  // --- ROUND CURSOR MODE ---
  if (cursorMode === 'round') {
    return (
      <div className="pointer-events-none fixed inset-0 z-[999999] overflow-hidden">
        {/* Trailing Fluid Magnetic Ring */}
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 pointer-events-none will-change-transform"
          style={{
            transform: `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`,
          }}
        >
          <div
            className={`-translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-150 ease-out flex items-center justify-center ${
              isClicking
                ? 'w-6 h-6 border-indigo-600 bg-indigo-600/30 scale-75'
                : isPointer
                ? 'w-11 h-11 border-indigo-500/90 dark:border-indigo-400 bg-indigo-500/15 backdrop-blur-[1px] shadow-sm'
                : 'w-7 h-7 border-indigo-500/50 dark:border-indigo-400/60 bg-indigo-500/5'
            }`}
          />
        </div>

        {/* Precision Central Target Dot */}
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 pointer-events-none will-change-transform"
          style={{
            transform: `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`,
          }}
        >
          <div
            className={`-translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-75 ${
              isClicking
                ? 'w-1.5 h-1.5 bg-indigo-700 dark:bg-indigo-300 scale-125'
                : isPointer
                ? 'w-2 h-2 bg-indigo-600 dark:bg-indigo-300 shadow-xs ring-2 ring-indigo-400/40'
                : 'w-1.5 h-1.5 bg-slate-900 dark:bg-white shadow-xs'
            }`}
          />
        </div>
      </div>
    );
  }

  // --- ARROW CURSOR MODE ---
  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform"
      style={{
        transform: `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`,
        transition: 'transform 0.04s cubic-bezier(0.1, 1, 0.1, 1)',
      }}
    >
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
          {isPointer && (
            <path
              d="M3 2L11 23L14.5 14.5L23 11L3 2Z"
              fill={isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.25)'}
              className="blur-xs"
            />
          )}

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
