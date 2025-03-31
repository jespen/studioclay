import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import ProductForm from './ProductForm';
import { Product } from '@/components/shop/types';
import { fetchProductsWithCache, invalidateCache } from '@/utils/apiCache';
import Image from 'next/image';

interface ProductManagerProps {
  /**
   * Whether to show the admin header, defaults to true
   */
  showHeader?: boolean;
}

const ProductManager: React.FC<ProductManagerProps> = ({ showHeader = true }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [updatingProductIds, setUpdatingProductIds] = useState<string[]>([]);

  // Memoize fetch functions to prevent unnecessary rerenders
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProductsWithCache({
        useCache: true,
        expiry: 2 * 60 * 1000 // 2 minutes cache
      });
      
      if (data && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        throw new Error('Unexpected data format received');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGalleryImages = useCallback(async () => {
    setLoadingImages(true);
    try {
      const response = await fetch('/api/storage/pictures');
      if (!response.ok) {
        throw new Error('Failed to fetch gallery images');
      }
      const data = await response.json();
      setGalleryImages(Array.isArray(data.images) ? data.images : []);
    } catch (err) {
      console.error('Error fetching gallery images:', err);
      // Don't set error state here to avoid blocking the product form
    } finally {
      setLoadingImages(false);
    }
  }, []);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch gallery images when needed
  useEffect(() => {
    if (showForm) {
      fetchGalleryImages();
    }
  }, [showForm, fetchGalleryImages]);

  const handleAddProduct = () => {
    // Create an empty product template
    const newProduct: Product = {
      id: '', // Will be set by the server
      title: '',
      price: 0,
      image: '',
      isNew: false,
      description: '',
      discount: null,
      inStock: true,
      stockQuantity: 1,
      published: true
    };
    
    setSelectedProduct(newProduct);
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Är du säker på att du vill ta bort denna produkt?')) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to delete product: ${response.status}`);
        }
        
        // Update local state
        setProducts(products.filter(product => product.id !== id));
        
        // After successful deletion, invalidate the products cache
        invalidateCache('products');
      } catch (err: any) {
        console.error('Error deleting product:', err);
        setError(err.message);
      }
    }
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      const isNew = !product.id;
      const url = isNew ? '/api/products' : `/api/products/${product.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save product');
      }
      
      // Invalidate products cache to ensure fresh data on next fetch
      invalidateCache('products');
      
      // Refresh the products list
      await fetchProducts();
      
      // Reset form state
      setShowForm(false);
      setSelectedProduct(null);
      
      alert(`Product ${isNew ? 'added' : 'updated'} successfully!`);
    } catch (err) {
      console.error('Error saving product:', err);
      alert(err instanceof Error ? err.message : 'An error occurred while saving the product');
    }
  };

  // Dedicated function to handle publish toggle
  const togglePublished = async (productId: string, newValue: boolean) => {
    // Mark this product as updating
    setUpdatingProductIds(prev => [...prev, productId]);
    
    try {
      // First immediately update the UI for better perceived performance
      setProducts(currentProducts => 
        currentProducts.map(p => 
          p.id === productId ? { ...p, published: newValue } : p
        )
      );
      
      // Then make the API call
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ published: newValue }),
      });
      
      if (!response.ok) {
        // If the API call fails, revert the UI change
        setProducts(currentProducts => 
          currentProducts.map(p => 
            p.id === productId ? { ...p, published: !newValue } : p
          )
        );
        throw new Error('Failed to update product');
      }
      
      // Get the updated product from the response
      const result = await response.json();
      
      // Ensure we have the latest data from the server
      if (result.product) {
        setProducts(currentProducts => 
          currentProducts.map(p => 
            p.id === productId ? result.product : p
          )
        );
      }
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Kunde inte uppdatera produkten');
    } finally {
      // Remove this product from the updating list
      setUpdatingProductIds(prev => prev.filter(id => id !== productId));
    }
  };

  // Render product form if in form mode
  if (showForm) {
    return (
      <div className={styles.pageContainer}>
        <main className={styles.mainContent}>
          <ProductForm 
            product={selectedProduct} 
            galleryImages={galleryImages}
            loadingImages={loadingImages}
            onSave={handleSaveProduct}
            onCancel={() => setShowForm(false)}
          />
        </main>
      </div>
    );
  }

  // Render product list
  return (
    <div className={styles.pageContainer}>
      {showHeader && (
        <AdminHeader title="Produkthantering" subtitle="Hantera produkter i webshopen"  />
      )}
      
      <main className={styles.dashboardMainContent}>
        <div className={styles.navButtons} style={{ marginBottom: '1rem' }}>
          <button 
            onClick={handleAddProduct}
            className={styles.addButton}
          >
            Lägg till produkt
          </button>
        </div>

        <SectionContainer title="Produkter">
          {loading ? (
            <p>Laddar produkter...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bild</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titel</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pris</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rabatt</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ny</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lagerstatus</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lagersaldo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publicerad</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-12 w-12 bg-gray-100">
                          {product.image && (
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{product.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{product.price} kr</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.discount ? `-${product.discount}%` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.isNew ? 'Ja' : 'Nej'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={product.inStock === false ? 'text-red-500' : 'text-green-600'}>
                          {product.inStock === false ? 'Såld' : 'Till Salu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.stockQuantity !== undefined ? product.stockQuantity : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={product.published !== false}
                            disabled={updatingProductIds.includes(product.id)}
                            onChange={(e) => togglePublished(product.id, e.target.checked)}
                            className="mr-2 h-4 w-4 rounded border-gray-300 cursor-pointer"
                          />
                          <span 
                            className={`text-sm ${
                              updatingProductIds.includes(product.id)
                                ? 'text-gray-400 italic'
                                : product.published !== false
                                  ? 'text-green-600'
                                  : 'text-gray-500'
                            }`}
                            onClick={() => {
                              if (!updatingProductIds.includes(product.id)) {
                                togglePublished(product.id, !(product.published !== false));
                              }
                            }}
                          >
                            {updatingProductIds.includes(product.id)
                              ? 'Sparar...'
                              : product.published !== false
                                ? 'Ja'
                                : 'Nej'
                            }
                          </span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Redigera
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionContainer>
      </main>
    </div>
  );
};

export default ProductManager; 