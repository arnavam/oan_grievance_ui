'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type CarouselScrollRef = React.RefCallback<HTMLDivElement>;

export interface UseCarouselScrollOptions {
  enableWheelScroll?: boolean;
}

export interface UseCarouselScrollReturn {
  scrollRef: CarouselScrollRef;
  activeIndex: number;
  scrollProgress: number;
  scrollTo: (index: number) => void;
  scrollToProgress: (progress: number) => void;
  handleScroll: () => void;
}

export function useCarouselScroll(options?: UseCarouselScrollOptions): UseCarouselScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setContainer((prev) => (prev === node ? prev : node));
  }, []);

  const calculateActiveIndex = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(1, Math.max(0, el.scrollLeft / maxScroll)));
    } else {
      setScrollProgress(0);
    }

    const containerRect = el.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;

    let closestIndex = 0;
    let minDistance = Infinity;

    Array.from(el.children).forEach((child, index) => {
      const childRect = child.getBoundingClientRect();
      const childCenter = childRect.left + childRect.width / 2;
      const distance = Math.abs(containerCenter - childCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  const tickingRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (!tickingRef.current) {
      tickingRef.current = true;
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          try {
            calculateActiveIndex();
          } finally {
            tickingRef.current = false;
          }
        });
      } else {
        try {
          calculateActiveIndex();
        } finally {
          tickingRef.current = false;
        }
      }
    }
  }, [calculateActiveIndex]);

  useEffect(() => {
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleScroll();
      });
      resizeObserver.observe(container);
    }

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    if (options?.enableWheelScroll) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    // Initial calculation immediately
    calculateActiveIndex();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (options?.enableWheelScroll) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [container, options?.enableWheelScroll, handleScroll, calculateActiveIndex]);

  const scrollTo = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (child && typeof child.scrollIntoView === 'function') {
      child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, []);

  const scrollToProgress = useCallback((progress: number) => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    el.scrollTo({
      left: Math.max(0, Math.min(maxScroll, progress * maxScroll)),
      behavior: 'smooth',
    });
  }, []);

  return {
    scrollRef,
    activeIndex,
    scrollProgress,
    scrollTo,
    scrollToProgress,
    handleScroll,
  };
}
