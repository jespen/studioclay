'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProductCard from './ProductCard';
import { Product } from './types';
import { SHOP_FILTERS, ProductFilterId, categoryGroup } from '@/constants/productCategories';

const PRODUCTS_PER_PAGE = 8; // Antal produkter som visas initialt

function isSoldOut(product: Product) {
  return product.inStock === false || (product.stockQuantity !== undefined && product.stockQuantity <= 0);
}

// Produkterna hämtas nu från API:et istället för att vara hårdkodade här
const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayedProducts, setDisplayedProducts] = useState(PRODUCTS_PER_PAGE);
  const [activeFilter, setActiveFilter] = useState<ProductFilterId>('all');

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const response = await fetch('/api/products?published=true');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          console.error('Invalid product data format:', data);
          setError('Kunde inte ladda produkter från servern');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (activeFilter === 'all') return true;
      return categoryGroup(product.category) === activeFilter;
    });

    return [...filtered].sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)));
  }, [products, activeFilter]);

  const handleShowMore = () => {
    setDisplayedProducts(prevCount => prevCount + PRODUCTS_PER_PAGE);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <p>Laddar produkter...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const hasMoreProducts = visibleProducts.length > displayedProducts;

  return (
    <div className="container mx-auto py-16 px-4 md:px-6 bg-white">
      <div className="mb-8 text-center" data-reveal>
        <h2 className="text-3xl md:text-4xl font-serif mb-2">Shop</h2>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
          Handplockade keramikföremål och tillbehör som förhöjer ditt hem med Studio Clays unika estetik.
        </p>
      </div>

      <div className="mb-10 flex flex-wrap justify-center gap-2" data-reveal-stagger>
        {SHOP_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => {
                setActiveFilter(filter.id);
                setDisplayedProducts(PRODUCTS_PER_PAGE);
              }}
              className={`px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary hover:bg-primary/5'
              }`}
              aria-pressed={isActive}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
      
      {visibleProducts.length === 0 ? (
        <p className="text-center text-gray-500">Inga produkter i den här kategorin just nu.</p>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10" data-reveal-stagger>
        {visibleProducts.slice(0, displayedProducts).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      )}
      
      {hasMoreProducts && (
        <div className="mt-12 text-center">
          <button 
            onClick={handleShowMore}
            className="btn btn-outline px-6 py-3 uppercase tracking-wider"
          >
            Visa fler produkter
          </button>
        </div>
      )}
    </div>
  );
};

export default Shop; 