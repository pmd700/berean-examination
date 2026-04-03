import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for infinite scrolling with accessibility
 * @param {Array} allItems - Full array of items to paginate
 * @param {number} itemsPerPage - Number of items to load per page
 */
export function useInfiniteScroll(allItems = [], itemsPerPage = 20) {
  const [displayedItems, setDisplayedItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
  const loadingRef = useRef(false);

  // Reset when allItems changes
  useEffect(() => {
    const initialItems = allItems.slice(0, itemsPerPage);
    setDisplayedItems(initialItems);
    setPage(1);
    setHasMore(allItems.length > itemsPerPage);
    loadingRef.current = false;
  }, [allItems, itemsPerPage]);

  // Load more items
  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    
    loadingRef.current = true;
    
    // Simulate async loading for smooth UX
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = page * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const newItems = allItems.slice(startIndex, endIndex);
      
      if (newItems.length > 0) {
        setDisplayedItems(prev => [...prev, ...newItems]);
        setPage(nextPage);
        setHasMore(endIndex < allItems.length);
      } else {
        setHasMore(false);
      }
      
      loadingRef.current = false;
    }, 100);
  }, [allItems, page, itemsPerPage, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore]);

  return {
    displayedItems,
    hasMore,
    isLoading: loadingRef.current,
    observerTarget,
    loadMore
  };
}