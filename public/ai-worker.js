/**
 * AI Computation Web Worker
 * 
 * This file is loaded as a Web Worker for AI computation.
 * It's kept simple to work across all browsers including iOS Safari.
 */

// Import statements won't work in a worker file loaded directly
// We'll use a different approach - inline the necessary code or use importScripts
// For now, this is a placeholder - we'll use the main thread fallback

self.onmessage = async function(event) {
  const { type, id, state, difficulty } = event.data;
  
  try {
    // For now, signal that worker computation is not available
    // The manager will fall back to main thread
    self.postMessage({
      type: "error",
      id,
      error: "Worker computation not yet implemented - using main thread fallback",
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
