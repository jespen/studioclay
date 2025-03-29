import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import { Product } from '@/components/shop/types';
import Image from 'next/image';
import ProductForm from './ProductForm';

interface ProductManagerProps {
  /**
   * Whether to show the admin header, defaults to true
   */
  showHeader?: boolean;
}

const ProductManager: React.FC<ProductManagerProps> = ({ showHeader = true }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Load products from API
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const response = await fetch('/api/products');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch products: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          throw new Error('Invalid response format');
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading products:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    loadProducts();
  }, []);

  // Load images from Supabase storage
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoadingImages(true);
        // First try to get images from Supabase storage
        const response = await fetch('/api/storage/pictures');
        
        if (!response.ok) {
          console.error(`Failed to fetch images from storage: ${response.status} ${response.statusText}`);
          // Fallback to local public images
          const localResponse = await fetch('/api/images');
          if (!localResponse.ok) {
            console.error(`Failed to fetch local images: ${localResponse.status} ${localResponse.statusText}`);
            return;
          }
          const data = await localResponse.json();
          setGalleryImages(data.images || []);
          return;
        }
        
        const data = await response.json();
        console.log('Images data received from storage:', data);
        
        if (Array.isArray(data.images)) {
          setGalleryImages(data.images);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoadingImages(false);
      }
    };
    
    fetchImages();
  }, []);

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
      } catch (err: any) {
        console.error('Error deleting product:', err);
        setError(err.message);
      }
    }
  };

  const handleSaveProduct = async (product: Product) => {
    // Validate required fields
    if (!product.title || !product.price || !product.image) {
      setError('Vänligen fyll i alla obligatoriska fält (titel, pris, bild)');
      return;
    }

    try {
      // Determine if this is a create or update operation
      const isUpdate = product.id && products.some(p => p.id === product.id);
      
      // API endpoint and method
      const endpoint = isUpdate ? `/api/products/${product.id}` : '/api/products';
      const method = isUpdate ? 'PATCH' : 'POST';
      
      // Make API request
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local state
      if (isUpdate) {
        setProducts(products.map(p => p.id === product.id ? result.product : p));
      } else {
        setProducts([...products, result.product]);
      }
      
      setSelectedProduct(null);
      setShowForm(false);
      setError(null);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message);
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
        <AdminHeader title="Produkthantering" subtitle="Hantera produkter i webshopen" />
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