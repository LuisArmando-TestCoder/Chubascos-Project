'use client';
import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  threshold?: number;
}

export function useInfiniteScroll({ onLoadMore, hasMore, threshold = 0.8 }: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect: IntersectionObserverCallback = useCallback(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore]
  );

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(handleIntersect, { threshold });
    const sentinel = sentinelRef.current;
    if (sentinel) observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [handleIntersect, threshold]);

  return sentinelRef;
}
