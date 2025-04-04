import { FlowType, GenericStep } from '@/components/common/BookingStepper';

// Cache for storing prefetched data
const dataCache: { [key: string]: { data: any; timestamp: number } } = {};
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Track failed requests for retry
const failedRequests: { [key: string]: { retries: number; lastAttempt: number } } = {};
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Performance monitoring
const performanceMetrics: {
  [key: string]: { loadTime: number; timestamp: number; success: boolean }[]
} = {};

/**
 * Prefetch data for a specific route
 */
async function prefetchRouteData(route: string): Promise<void> {
  const cacheKey = `prefetch:${route}`;
  
  try {
    const response = await fetch(route);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    // Cache the successful response
    dataCache[cacheKey] = {
      data,
      timestamp: Date.now()
    };
    
    // Record successful performance metric
    recordPerformanceMetric(route, Date.now() - performance.now(), true);
    
    // Clear any failed request tracking
    delete failedRequests[cacheKey];
  } catch (error) {
    console.error(`Error prefetching ${route}:`, error);
    handleFailedRequest(cacheKey);
  }
}

/**
 * Handle failed requests with retry mechanism
 */
function handleFailedRequest(key: string): void {
  if (!failedRequests[key]) {
    failedRequests[key] = { retries: 0, lastAttempt: Date.now() };
  }
  
  const request = failedRequests[key];
  if (request.retries < MAX_RETRIES) {
    request.retries++;
    request.lastAttempt = Date.now();
    
    // Schedule retry
    setTimeout(() => {
      const [_, route] = key.split(':');
      prefetchRouteData(route);
    }, RETRY_DELAY * request.retries);
  }
}

/**
 * Record performance metrics for monitoring
 */
function recordPerformanceMetric(route: string, loadTime: number, success: boolean): void {
  if (!performanceMetrics[route]) {
    performanceMetrics[route] = [];
  }
  
  performanceMetrics[route].push({
    loadTime,
    timestamp: Date.now(),
    success
  });
  
  // Keep only last 100 metrics per route
  if (performanceMetrics[route].length > 100) {
    performanceMetrics[route].shift();
  }
  
  // Log slow loads
  if (loadTime > 3000) { // 3 seconds threshold
    console.warn(`Slow load detected for ${route}: ${loadTime}ms`);
  }
}

/**
 * Get cached data if available and not expired
 */
export function getCachedData(route: string): any | null {
  const cacheKey = `prefetch:${route}`;
  const cached = dataCache[cacheKey];
  
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return cached.data;
  }
  
  return null;
}

/**
 * Start background optimization tasks
 */
export function startBackgroundOptimization(): void {
  // Common routes to prefetch
  const commonRoutes = [
    '/api/courses',
    '/api/products',
    '/api/categories'
  ];
  
  // Initial prefetch
  commonRoutes.forEach(route => prefetchRouteData(route));
  
  // Set up periodic prefetch
  setInterval(() => {
    commonRoutes.forEach(route => {
      const cached = getCachedData(route);
      if (!cached) {
        prefetchRouteData(route);
      }
    });
  }, CACHE_EXPIRY / 2); // Refresh halfway before expiry
  
  // Monitor and clean up failed requests
  setInterval(() => {
    Object.keys(failedRequests).forEach(key => {
      const request = failedRequests[key];
      if (Date.now() - request.lastAttempt > CACHE_EXPIRY) {
        delete failedRequests[key];
      }
    });
  }, 60000); // Clean up every minute
}

/**
 * Get performance metrics for monitoring
 */
export function getPerformanceMetrics(): typeof performanceMetrics {
  return performanceMetrics;
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics(): void {
  Object.keys(performanceMetrics).forEach(key => {
    delete performanceMetrics[key];
  });
} 