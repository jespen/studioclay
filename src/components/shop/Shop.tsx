'use client';

import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { Product } from './types';

// Produkterna hämtas nu från API:et istället för att vara hårdkodade här
const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const response = await fetch('/api/products?inStock=true');
        
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

  return (
    <div className="container mx-auto py-16 px-4 md:px-6">
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-serif mb-2">Shop</h2>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
          Handplockade keramikföremål och tillbehör som förhöjer ditt hem med Studio Clays unika estetik.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <button className="btn btn-outline px-6 py-3 uppercase tracking-wider">
          Visa alla produkter
        </button>
      </div>
    </div>
  );
};

export default Shop; 