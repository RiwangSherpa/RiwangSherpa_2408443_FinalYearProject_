import { useEffect, useRef, useCallback } from 'react';
import { progressApi } from '../lib/api';

export function useTimeTracker(isAuthenticated: boolean) {
  const startTimeRef = useRef<number>(Date.now());
  const lastSyncRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);

  const syncTime = useCallback(async () => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - lastSyncRef.current) / 60000);
    
    if (elapsedMinutes > 0) {
      try {
        await progressApi.trackTime(elapsedMinutes);
        lastSyncRef.current = now;
        accumulatedTimeRef.current += elapsedMinutes;
      } catch (error) {
        console.error('Failed to track time:', error);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      startTimeRef.current = Date.now();
      lastSyncRef.current = Date.now();
      accumulatedTimeRef.current = 0;
      return;
    }

    progressApi.recordSession(0).catch(console.error);

    const intervalId = setInterval(() => {
      syncTime();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTimeRef.current = Date.now();
      } else {
        syncTime();
      }
    };

    const handleBeforeUnload = () => {
      syncTime();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      syncTime();
    };
  }, [isAuthenticated, syncTime]);

  return {
    getAccumulatedTime: () => accumulatedTimeRef.current,
    syncTime,
  };
}
