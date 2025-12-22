/**
 * Platform Detection and iOS-Specific Optimizations
 * 
 * Provides utilities for detecting iOS devices and applying
 * platform-specific performance optimizations.
 */

/**
 * Detect if the current device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detect if running in Safari (including iOS Safari)
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Check if scheduler.postTask is available (better than setTimeout for iOS)
 */
export function hasSchedulerPostTask(): boolean {
  return typeof globalThis !== 'undefined' && 
         'scheduler' in globalThis && 
         'postTask' in (globalThis as any).scheduler;
}

/**
 * Check if requestIdleCallback is available
 */
export function hasRequestIdleCallback(): boolean {
  return typeof requestIdleCallback !== 'undefined';
}

/**
 * Schedule a task with platform-optimized scheduling
 * Prefers scheduler.postTask on iOS, falls back to requestIdleCallback or setTimeout
 */
export function scheduleTask(
  callback: () => void,
  options?: { priority?: 'user-blocking' | 'user-visible' | 'background'; delay?: number }
): () => void {
  const { priority = 'background', delay = 0 } = options || {};
  
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let idleId: number | null = null;
  let taskController: TaskController | null = null;
  
  const execute = () => {
    if (!cancelled) {
      callback();
    }
  };
  
  // Use scheduler.postTask if available (best for iOS)
  if (hasSchedulerPostTask()) {
    try {
      const scheduler = (globalThis as any).scheduler;
      const signal = new AbortController();
      taskController = signal as any;
      
      scheduler.postTask(execute, {
        priority,
        delay,
        signal: signal.signal,
      });
      
      return () => {
        cancelled = true;
        signal.abort();
      };
    } catch (e) {
      // Fall through to fallback
    }
  }
  
  // Fallback to requestIdleCallback (good for background tasks)
  if (hasRequestIdleCallback() && priority === 'background' && delay === 0) {
    idleId = requestIdleCallback(execute, { timeout: 100 });
    return () => {
      cancelled = true;
      if (idleId !== null) {
        cancelIdleCallback(idleId);
      }
    };
  }
  
  // Final fallback to setTimeout
  timeoutId = setTimeout(execute, delay);
  return () => {
    cancelled = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Yield control to the browser to prevent blocking
 * Uses platform-optimized methods
 */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    if (hasSchedulerPostTask()) {
      try {
        const scheduler = (globalThis as any).scheduler;
        scheduler.postTask(() => resolve(), { priority: 'background' });
        return;
      } catch (e) {
        // Fall through
      }
    }
    
    if (hasRequestIdleCallback()) {
      requestIdleCallback(() => resolve(), { timeout: 0 });
      return;
    }
    
    // Fallback to setTimeout(0)
    setTimeout(() => resolve(), 0);
  });
}

/**
 * Get optimal chunk size for progressive computation based on platform
 */
export function getOptimalChunkSize(): number {
  if (isIOS()) {
    // iOS devices benefit from smaller chunks to maintain responsiveness
    return 1000;
  }
  // Desktop can handle larger chunks
  return 5000;
}

/**
 * Get optimal yield interval for progressive computation
 */
export function getOptimalYieldInterval(): number {
  if (isIOS()) {
    // Yield more frequently on iOS to prevent jank
    return 5; // milliseconds
  }
  return 10; // milliseconds
}
