import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import { Product } from '@/components/shop/types';

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
  const [isEditMode, setIsEditMode] = useState(false);

  // Temporary local products for development before Supabase integration
  const localProducts: Product[] = [
    {
      id: '1',
      title: 'BASKET WITH HANDLES',
      price: 160,
      image: '/pictures/gronvas.jpg',
      isNew: true,
      description: 'A stylish basket with handles, perfect for storage or as a decorative piece.',
      discount: null,
    },
    {
      id: '2',
      title: 'FLOWER VASE',
      price: 170,
      originalPrice: 210,
      image: '/pictures/vasmedblomma.jpg',
      isNew: true,
      description: 'Elegant flower vase with detail, ideal for fresh or dried flowers.',
      discount: 19,
    },
    // More products can be added here
  ];

  // Load products from Supabase
  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        // This will be replaced with actual Supabase query once the table is set up
        // const { data, error } = await supabase.from('products').select('*');
        
        // For now, use local data
        setProducts(localProducts);
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading products:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    loadProducts();
  }, []);

  const handleAddProduct = () => {
    // Create an empty product template
    const newProduct: Product = {
      id: Date.now().toString(), // Temporary ID
      title: '',
      price: 0,
      image: '',
      isNew: false,
      description: '',
      discount: null,
    };
    
    setSelectedProduct(newProduct);
    setIsEditMode(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditMode(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Är du säker på att du vill ta bort denna produkt?')) {
      try {
        // This will be replaced with actual Supabase delete once the table is set up
        // await supabase.from('products').delete().eq('id', id);
        
        // For now, just update local state
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
      // This will be replaced with actual Supabase upsert once the table is set up
      // const { data, error } = await supabase.from('products').upsert(product);
      
      // For now, just update local state
      if (product.id && products.some(p => p.id === product.id)) {
        // Update existing product
        setProducts(products.map(p => (p.id === product.id ? product : p)));
      } else {
        // Add new product
        setProducts([...products, product]);
      }
      
      setSelectedProduct(null);
      setIsEditMode(false);
      setError(null);
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      {showHeader && (
        <AdminHeader title="Produkthantering" subtitle="Hantera produkter i webshopen" />
      )}
      
      <main className={styles.dashboardMainContent}>
        <SectionContainer title="Produkter">
          <div className="mb-6">
            <button 
              onClick={handleAddProduct}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              Lägg till produkt
            </button>
          </div>
          
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
        
        {isEditMode && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium">
                  {selectedProduct.id && products.some(p => p.id === selectedProduct.id)
                    ? 'Redigera produkt'
                    : 'Lägg till produkt'}
                </h2>
                <button 
                  onClick={() => setIsEditMode(false)}
                  className="text-gray-400 hover:text-black"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              {error && <p className="text-red-500 mb-4">{error}</p>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titel *
                  </label>
                  <input
                    type="text"
                    value={selectedProduct.title}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, title: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pris (kr) *
                  </label>
                  <input
                    type="number"
                    value={selectedProduct.price}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, price: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordinarie pris (kr)
                  </label>
                  <input
                    type="number"
                    value={selectedProduct.originalPrice || ''}
                    onChange={(e) => setSelectedProduct({ 
                      ...selectedProduct, 
                      originalPrice: e.target.value ? Number(e.target.value) : undefined 
                    })}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rabatt (%)
                  </label>
                  <input
                    type="number"
                    value={selectedProduct.discount || ''}
                    onChange={(e) => setSelectedProduct({ 
                      ...selectedProduct, 
                      discount: e.target.value ? Number(e.target.value) : null 
                    })}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bildsökväg *
                  </label>
                  <input
                    type="text"
                    value={selectedProduct.image}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, image: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exempel: /pictures/vasmedblomma.jpg
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beskrivning
                  </label>
                  <textarea
                    value={selectedProduct.description}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded h-32"
                  />
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedProduct.isNew}
                      onChange={(e) => setSelectedProduct({ ...selectedProduct, isNew: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Markera som ny produkt</span>
                  </label>
                </div>
                
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    onClick={() => handleSaveProduct(selectedProduct)}
                    className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
                  >
                    Spara
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProductManager; 