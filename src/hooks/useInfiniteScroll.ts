import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollProps<T> {
  fetchData: (page: number, pageSize: number) => Promise<T[]>;
  pageSize?: number;
}

export function useInfiniteScroll<T>({ fetchData, pageSize = 10 }: UseInfiniteScrollProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore();
    }
  }, [inView]);

  const loadMore = async () => {
    try {
      setLoading(true);
      const newData = await fetchData(page, pageSize);
      if (newData.length < pageSize) {
        setHasMore(false);
      }
      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData([]);
    setPage(1);
    setHasMore(true);
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const newData = await fetchData(1, (page - 1) * pageSize);
      setData(newData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reset,
    refresh,
    ref
  };
}