import React, { ComponentType, LazyExoticComponent } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page once if a chunk load error occurs.
 * This handles cases where a new deployment invalidates old chunks cached by the browser.
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> => {
  return React.lazy(() => {
    return factory().catch((error) => {
      // Check for chunk load error
      // Chrome/Edge: "Failed to fetch dynamically imported module"
      // Firefox: "Importing a module script failed"
      // Safari: "Load failed" or similar network errors
      const isChunkLoadError = 
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Importing a module script failed') ||
        error.name === 'ChunkLoadError';

      if (isChunkLoadError) {
        // Use sessionStorage to prevent infinite reload loops
        // If the error persists after reload, we let it bubble up to ErrorBoundary
        const storageKey = `retry-lazy-refreshed-${window.location.pathname}`;
        const hasRefreshed = window.sessionStorage.getItem(storageKey);

        if (!hasRefreshed) {
          window.sessionStorage.setItem(storageKey, 'true');
          // Force a reload from server to get fresh index.html
          window.location.reload();
          // Return a never-resolving promise to pause rendering until reload happens
          return new Promise(() => {});
        }
      }

      // If not a chunk error or already retried, re-throw
      throw error;
    });
  });
};
