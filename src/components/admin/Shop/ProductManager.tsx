import React, { useState, useEffect, useCallback } from 'react';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import ProductForm from './ProductForm';
import { Product } from '@/components/shop/types';
import { categoryLabel, PRODUCT_CATEGORIES } from '@/constants/productCategories';
import StandardTable from '../common/StandardTable';
import RowActions from '../common/RowActions';
import ConfirmDialog from '../common/ConfirmDialog';
import { fetchProductsWithCache, invalidateCache } from '@/utils/apiCache';

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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

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
      published: true,
      category: 'other'
    };
    
    setSelectedProduct(newProduct);
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
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
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      const isNew = !product.id;
      const url = isNew ? '/api/products' : `/api/products/${product.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      
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

        <SectionContainer title="Produkter" count={products.filter((product) => categoryFilter === 'all' || product.category === categoryFilter).length}>
          <div className={styles.filterContainer} style={{ margin: '1rem' }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={styles.statusSelect}
              aria-label="Filtrera på kategori"
            >
              <option value="all">Alla kategorier</option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>{category.label}</option>
              ))}
            </select>
          </div>
          {loading ? (
            <p>Laddar produkter...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <StandardTable
              headers={['Bild', 'Titel', 'Kategori', 'Pris', 'Lager', 'Publicerad', 'Åtgärder']}
              emptyMessage="Inga produkter i den här kategorin."
            >
              {products
                .filter((product) => categoryFilter === 'all' || product.category === categoryFilter)
                .map((product) => (
                  <tr key={product.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                        {product.image && (
                          <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    </td>
                    <td className={styles.tableCell}>{product.title}</td>
                    <td className={styles.tableCell}>{categoryLabel(product.category)}</td>
                    <td className={styles.tableCell}>
                      {product.price} kr{product.discount ? ` (−${product.discount}%)` : ''}
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${product.inStock === false ? styles.draftBadge : styles.publishedBadge}`}>
                        {product.inStock === false ? 'Såld' : 'Till salu'}
                      </span>
                    </td>
                    <td className={styles.tableCell}>
                      <button
                        type="button"
                        className={`${styles.statusBadge} ${product.published !== false ? styles.publishedBadge : styles.draftBadge}`}
                        disabled={updatingProductIds.includes(product.id)}
                        onClick={() => togglePublished(product.id, !(product.published !== false))}
                      >
                        {updatingProductIds.includes(product.id) ? 'Sparar...' : product.published !== false ? 'Ja' : 'Nej'}
                      </button>
                    </td>
                    <td className={styles.tableCell}>
                      <RowActions
                        onEdit={() => handleEditProduct(product)}
                        items={[{ label: 'Ta bort', danger: true, onClick: () => setProductToDelete(product) }]}
                      />
                    </td>
                  </tr>
                ))}
            </StandardTable>
          )}
        </SectionContainer>
        <ConfirmDialog
          open={Boolean(productToDelete)}
          title="Ta bort produkt"
          message={`Vill du ta bort "${productToDelete?.title || 'produkten'}"?`}
          onConfirm={() => {
            if (productToDelete) handleDeleteProduct(productToDelete.id);
            setProductToDelete(null);
          }}
          onCancel={() => setProductToDelete(null)}
        />
      </main>
    </div>
  );
};

export default ProductManager; 