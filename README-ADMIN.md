# Admin Components API Optimization

This document describes the API caching improvements implemented to optimize Admin components.

## API Caching System

We've introduced a new caching utility (`apiCache.ts`) that provides a robust solution for reducing redundant API calls. Key features include:

- Memory-based cache with configurable expiration time
- Type-safe API for fetching and caching data
- Automatic cache invalidation when data changes
- Specialized helper functions for common data types

## Key Components

### 1. Core Utilities

- `fetchWithCache`: General-purpose function for fetching and caching API responses
- `invalidateCache`: Removes specific data from cache when it's modified
- `clearCache`: Utility to clear all cached data
- `invalidateCacheByPrefix`: Utility to invalidate groups of related cached items

### 2. Specialized Helpers

- `fetchCourseWithCache`: Fetch course details with caching
- `fetchCoursesWithCache`: Fetch list of courses with caching
- `fetchProductsWithCache`: Fetch shop products with caching
- `fetchOrdersWithCache`: Fetch shop orders with caching
- `fetchOrderWithCache`: Fetch a specific order with caching

## Implementation Guidelines

When using these utilities:

1. **Memoize fetch functions** with `useCallback` to prevent unnecessary re-renders
2. **Provide proper dependency arrays** to `useEffect` hooks
3. **Invalidate cache** after mutations (create, update, delete operations)
4. **Type API responses** correctly for better type safety

## Example Usage

```tsx
// Fetch data with caching
const fetchData = useCallback(async () => {
  try {
    const data = await fetchProductsWithCache({
      useCache: true,
      expiry: 5 * 60 * 1000  // 5 minutes
    });
    setProducts(data.products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}, []);

// Use in effect with proper dependencies
useEffect(() => {
  fetchData();
}, [fetchData]);

// Invalidate cache after mutations
const handleSave = async (product) => {
  await saveProduct(product);
  invalidateCache('products');  // Clear cached products
  await fetchData();  // Refresh data
};
```

## Benefits

- Reduced network traffic and server load
- Improved perceived performance
- Better user experience with faster UI responses
- More efficient use of browser resources
- Proper dependency management in React hooks 