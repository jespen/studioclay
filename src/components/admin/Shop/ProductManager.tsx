import React, { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import AdminHeader from '../Dashboard/AdminHeader';
import SectionContainer from '../Dashboard/SectionContainer';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';
import { Product } from '@/components/shop/types';
import Image from 'next/image';

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
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showGalleryDropdown, setShowGalleryDropdown] = useState(false);

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
    setIsEditMode(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    // Set image preview and gallery image if product has an image
    if (product.image) {
      setImagePreview(product.image);
      setSelectedGalleryImage(product.image);
    } else {
      setImagePreview(null);
      setSelectedGalleryImage('');
    }
    setIsEditMode(true);
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
      setIsEditMode(false);
      setError(null);
      // Reset image states
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedGalleryImage('');
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message);
    }
  };

  // Image handling functions
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.includes('image/')) {
        alert('Endast bildfiler är tillåtna (jpg, png, etc)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Bilden är för stor. Max storlek är 5MB.');
        return;
      }
      
      setSelectedImage(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      setSelectedGalleryImage(''); // Clear gallery selection
      
      // Clean up on unmount
      return () => URL.revokeObjectURL(objectUrl);
    }
  };
  
  const handleGalleryImageSelect = (imagePath: string) => {
    console.log('Selected gallery image:', imagePath);
    setSelectedGalleryImage(imagePath);
    setImagePreview(imagePath);
    setSelectedImage(null); // Clear any uploaded image
    setShowGalleryDropdown(false); // Hide dropdown after selection
  };
  
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedGalleryImage('');
    
    // Clear the image in the selected product
    if (selectedProduct) {
      setSelectedProduct({
        ...selectedProduct,
        image: ''
      });
    }
  };
  
  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;
    
    try {
      setUploading(true);
      
      // Create form data for the file
      const formData = new FormData();
      formData.append('file', selectedImage);
      
      // Upload image to Supabase through our API
      const response = await fetch('/api/storage/pictures', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }
      
      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(err instanceof Error ? `Kunde inte ladda upp bilden: ${err.message}` : 'Ett fel uppstod vid uppladdning av bilden');
      return null;
    } finally {
      setUploading(false);
    }
  };

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
        
        {isEditMode && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium">
                  {selectedProduct.id ? 'Redigera produkt' : 'Lägg till produkt'}
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

                {/* Image section - custom gallery dropdown */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produktbild
                  </label>
                  
                  {/* Custom Gallery Image Selection */}
                  <div className="mb-3 relative">
                    <button 
                      type="button" 
                      onClick={() => setShowGalleryDropdown(!showGalleryDropdown)}
                      className="w-full p-2 border border-gray-300 rounded flex justify-between items-center bg-white"
                    >
                      <div className="flex items-center">
                        {selectedGalleryImage ? (
                          <>
                            <img 
                              src={selectedGalleryImage} 
                              alt="Selected" 
                              className="w-10 h-10 object-cover mr-2 rounded"
                            />
                            <span className="truncate max-w-xs">
                              {selectedGalleryImage.split('/').pop()}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-500">Välj bild från galleri</span>
                        )}
                      </div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown with image thumbnails */}
                    {showGalleryDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {loadingImages && (
                          <div className="p-2 text-center text-gray-500">
                            Laddar bilder...
                          </div>
                        )}
                        
                        {!loadingImages && galleryImages.length === 0 && (
                          <div className="p-2 text-center text-gray-500">
                            Inga bilder hittades
                          </div>
                        )}
                        
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGalleryImage('');
                              setImagePreview(null);
                              setShowGalleryDropdown(false);
                            }}
                            className="w-full p-2 hover:bg-gray-100 text-left flex items-center"
                          >
                            <span className="text-gray-500">Ingen bild</span>
                          </button>
                          
                          {galleryImages.map((image, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleGalleryImageSelect(image)}
                              className="w-full p-2 hover:bg-gray-100 text-left flex items-center"
                            >
                              <img 
                                src={image} 
                                alt={image.split('/').pop() || ''} 
                                className="w-10 h-10 object-cover mr-2 rounded border border-gray-200"
                              />
                              <span className="truncate max-w-xs">{image.split('/').pop()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t pt-3 mb-3">
                    <p className="text-sm font-medium mb-2">Eller ladda upp en ny bild:</p>
                    
                    <div className="flex items-center gap-2">
                      <label className="px-4 py-2 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors inline-flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Välj bild
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={handleImageChange} 
                          disabled={uploading}
                        />
                      </label>
                      
                      {imagePreview && (
                        <button 
                          onClick={clearImage} 
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          disabled={uploading}
                          type="button"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mt-2 mb-4 relative">
                      <img 
                        src={imagePreview} 
                        alt="Förhandsgranskning" 
                        className="max-w-full max-h-[200px] rounded border border-gray-200"
                      />
                      
                      {uploading && (
                        <div className="absolute bottom-0 left-0 h-1 bg-black" style={{ width: '50%' }}></div>
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    Bilden kommer att visas för produkten i webshopen. Max storlek: 5MB.
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
                    onClick={async () => {
                      if (selectedImage) {
                        // Upload the image and get the URL
                        const uploadedUrl = await uploadImage();
                        if (uploadedUrl) {
                          // Update the product with the new image URL
                          handleSaveProduct({
                            ...selectedProduct,
                            image: uploadedUrl
                          });
                        }
                      } else if (selectedGalleryImage) {
                        // Use the selected gallery image
                        handleSaveProduct({
                          ...selectedProduct,
                          image: selectedGalleryImage
                        });
                      } else {
                        // No image selected, show error
                        setError('En bild måste väljas');
                      }
                    }}
                    disabled={uploading}
                    className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
                  >
                    {uploading ? 'Laddar upp...' : 'Spara'}
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