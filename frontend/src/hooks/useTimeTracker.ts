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

    // Record session start on login
    progressApi.recordSession(0).catch(console.error);

    // Sync time every minute
    const intervalId = setInterval(() => {
      syncTime();
    }, 60000);

    // Sync on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startTimeRef.current = Date.now();
      } else {
        syncTime();
      }
    };

    // Sync before page unload
    const handleBeforeUnload = () => {
      syncTime();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      syncTime(); // Final sync on cleanup
    };
  }, [isAuthenticated, syncTime]);

  return {
    getAccumulatedTime: () => accumulatedTimeRef.current,
    syncTime,
  };
}
