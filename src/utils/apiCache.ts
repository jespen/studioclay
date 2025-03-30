/**
 * API caching utility
 * 
 * This file provides functions to cache API responses and reduce unnecessary network requests
 * with configurable cache expiration time and cache invalidation.
 */

// Type for cache entries
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number; // Expiry time in milliseconds
}

// Default cache expiration time (5 minutes)
const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000;

// Cache storage
const cacheStore: Record<string, CacheEntry<any>> = {};

/**
 * Get item from cache if it exists and is still valid
 * @param key The cache key
 * @returns The cached data or null if not found or expired
 */
export function getCachedData<T>(key: string): T | null {
  const cached = cacheStore[key];
  
  // If no cache entry exists, return null
  if (!cached) {
    return null;
  }
  
  // Check if the cache has expired
  const now = Date.now();
  if (now - cached.timestamp > cached.expiry) {
    // Cache expired, remove it
    delete cacheStore[key];
    return null;
  }
  
  // Cache is valid, return the data
  return cached.data as T;
}

/**
 * Store data in cache
 * @param key The cache key
 * @param data The data to cache
 * @param expiry Optional expiration time in milliseconds (default: 5 minutes)
 */
export function setCachedData<T>(key: string, data: T, expiry = DEFAULT_CACHE_EXPIRY): void {
  cacheStore[key] = {
    data,
    timestamp: Date.now(),
    expiry
  };
}

/**
 * Remove item from cache
 * @param key The cache key
 */
export function invalidateCache(key: string): void {
  delete cacheStore[key];
}

/**
 * Remove all items from cache
 */
export function clearCache(): void {
  Object.keys(cacheStore).forEach(key => {
    delete cacheStore[key];
  });
}

/**
 * Invalidate all cache entries that match a prefix
 * @param prefix The prefix to match
 */
export function invalidateCacheByPrefix(prefix: string): void {
  Object.keys(cacheStore).forEach(key => {
    if (key.startsWith(prefix)) {
      delete cacheStore[key];
    }
  });
}

/**
 * Fetch API wrapper that uses cache for GET requests
 * @param url The URL to fetch
 * @param options Fetch options
 * @param cacheOptions Cache options
 * @returns Promise with the response data
 */
export async function fetchWithCache<T>(
  url: string, 
  options: RequestInit = {}, 
  cacheOptions: {
    useCache?: boolean;
    expiry?: number;
    cacheKey?: string;
  } = {}
): Promise<T> {
  const {
    useCache = true,
    expiry = DEFAULT_CACHE_EXPIRY,
    cacheKey = url
  } = cacheOptions;
  
  // Only use cache for GET requests
  const isGetRequest = !options.method || options.method === 'GET';
  
  // Check cache first if enabled and this is a GET request
  if (useCache && isGetRequest) {
    const cachedData = getCachedData<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  // Not in cache or cache disabled, make the actual request
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Cache the response if it's a GET request and caching is enabled
  if (useCache && isGetRequest) {
    setCachedData<T>(cacheKey, data, expiry);
  }
  
  return data;
}

/**
 * Hook-friendly wrapper to fetch course details with caching
 * @param courseId The course ID to fetch
 * @param options Cache options
 * @returns Promise with the course data
 */
export async function fetchCourseWithCache(
  courseId: string, 
  options: {
    useCache?: boolean;
    expiry?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<any> {
  const { 
    useCache = true, 
    expiry = DEFAULT_CACHE_EXPIRY,
    forceRefresh = false
  } = options;
  
  const cacheKey = `course:${courseId}`;
  
  // If forceRefresh is true, invalidate cache first
  if (forceRefresh) {
    invalidateCache(cacheKey);
  }
  
  // Use the generic fetchWithCache utility
  return fetchWithCache(
    `/api/courses/${courseId}`,
    {},
    {
      useCache,
      expiry,
      cacheKey
    }
  );
}

/**
 * Hook-friendly wrapper to fetch all courses with caching
 * @param published Whether to fetch only published courses
 * @param options Cache options
 * @returns Promise with the courses data
 */
export async function fetchCoursesWithCache(
  published: boolean = true,
  options: {
    useCache?: boolean;
    expiry?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<any> {
  const { 
    useCache = true, 
    expiry = DEFAULT_CACHE_EXPIRY,
    forceRefresh = false
  } = options;
  
  const cacheKey = `courses:${published ? 'published' : 'all'}`;
  
  // If forceRefresh is true, invalidate cache first
  if (forceRefresh) {
    invalidateCache(cacheKey);
  }
  
  // Use the generic fetchWithCache utility
  return fetchWithCache(
    `/api/courses?published=${published}`,
    {},
    {
      useCache,
      expiry,
      cacheKey
    }
  );
}

/**
 * Hook-friendly wrapper to fetch products with caching
 * @param options Cache options
 * @returns Promise with the products data
 */
export async function fetchProductsWithCache(
  options: {
    useCache?: boolean;
    expiry?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<any> {
  const { 
    useCache = true, 
    expiry = DEFAULT_CACHE_EXPIRY,
    forceRefresh = false
  } = options;
  
  const cacheKey = 'products';
  
  // If forceRefresh is true, invalidate cache first
  if (forceRefresh) {
    invalidateCache(cacheKey);
  }
  
  // Use the generic fetchWithCache utility
  return fetchWithCache(
    '/api/products',
    {},
    {
      useCache,
      expiry,
      cacheKey
    }
  );
}

/**
 * Hook-friendly wrapper to fetch shop orders with caching
 * @param options Cache options
 * @returns Promise with the orders data
 */
export async function fetchOrdersWithCache(
  options: {
    useCache?: boolean;
    expiry?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<any> {
  const { 
    useCache = true, 
    expiry = 2 * 60 * 1000, // 2 minutes by default
    forceRefresh = false
  } = options;
  
  const cacheKey = 'shop-orders';
  
  // If forceRefresh is true, invalidate cache first
  if (forceRefresh) {
    invalidateCache(cacheKey);
  }
  
  // Use the generic fetchWithCache utility
  return fetchWithCache(
    '/api/art-orders',
    {},
    {
      useCache,
      expiry,
      cacheKey
    }
  );
}

/**
 * Hook-friendly wrapper to fetch a specific order with caching
 * @param orderId The order ID to fetch
 * @param options Cache options
 * @returns Promise with the order data
 */
export async function fetchOrderWithCache(
  orderId: string,
  options: {
    useCache?: boolean;
    expiry?: number;
    forceRefresh?: boolean;
  } = {}
): Promise<any> {
  const { 
    useCache = true, 
    expiry = 2 * 60 * 1000, // 2 minutes by default
    forceRefresh = false
  } = options;
  
  const cacheKey = `shop-order:${orderId}`;
  
  // If forceRefresh is true, invalidate cache first
  if (forceRefresh) {
    invalidateCache(cacheKey);
  }
  
  // Use the generic fetchWithCache utility
  return fetchWithCache(
    `/api/art-orders/${orderId}`,
    {},
    {
      useCache,
      expiry,
      cacheKey
    }
  );
} 