import React, { useState, useEffect, useCallback } from 'react';
import { Product } from '@/components/shop/types';
import styles from '../../../app/admin/dashboard/courses/courses.module.css';

interface ProductFormProps {
  product: Product | null;
  galleryImages: string[];
  loadingImages: boolean;
  onSave: (product: Product) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  galleryImages,
  loadingImages,
  onSave,
  onCancel
}) => {
  const [currentProduct, setCurrentProduct] = useState<Product>({
    id: '',
    title: '',
    price: 0,
    image: '',
    isNew: false,
    description: '',
    discount: null,
    published: true,
    inStock: true,
    stockQuantity: 1
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [showGalleryDropdown, setShowGalleryDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the useCallback hook for the submit handler to prevent recreating on every render
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentProduct.title || !currentProduct.price) {
      setError('Vänligen fyll i alla obligatoriska fält (titel, pris)');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      if (selectedImage) {
        // Upload the image and get the URL
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          // Update the product with the new image URL
          onSave({
            ...currentProduct,
            image: uploadedUrl
          });
        }
      } else if (selectedGalleryImage) {
        // Use the selected gallery image
        onSave({
          ...currentProduct,
          image: selectedGalleryImage
        });
      } else {
        // No image selected, show error
        setError('En bild måste väljas');
      }
    } catch (err) {
      console.error('Error handling submit:', err);
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setUploading(false);
    }
  }, [currentProduct, selectedImage, selectedGalleryImage, onSave]);

  // Add proper dependency array for loading product data
  useEffect(() => {
    if (product) {
      setCurrentProduct(product);
      
      // Set image preview if product has an image
      if (product.image) {
        setImagePreview(product.image);
        setSelectedGalleryImage(product.image);
      }
    }
  }, [product]);

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
    
    // Clear the image in the product
    setCurrentProduct({
      ...currentProduct,
      image: ''
    });
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
    <div className={styles.formContainer}>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium">
            {currentProduct.id ? 'Redigera produkt' : 'Lägg till produkt'}
          </h2>
          <button 
            onClick={onCancel}
            type="button"
            className="text-gray-400 hover:text-black"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={currentProduct.title}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, title: e.target.value })}
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
                  value={currentProduct.price}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
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
                  value={currentProduct.originalPrice || ''}
                  onChange={(e) => setCurrentProduct({ 
                    ...currentProduct, 
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
                  value={currentProduct.discount || ''}
                  onChange={(e) => setCurrentProduct({ 
                    ...currentProduct, 
                    discount: e.target.value ? Number(e.target.value) : null 
                  })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beskrivning
                </label>
                <textarea
                  value={currentProduct.description}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded h-32"
                />
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentProduct.isNew}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, isNew: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Markera som ny produkt</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentProduct.published !== false}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, published: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Publicerad (synlig på sidan)</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentProduct.inStock !== false}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, inStock: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">Till Salu (finns i lager)</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lagersaldo
                </label>
                <input
                  type="number"
                  min="0"
                  value={currentProduct.stockQuantity || 0}
                  onChange={(e) => setCurrentProduct({ 
                    ...currentProduct, 
                    stockQuantity: e.target.value ? Number(e.target.value) : 0 
                  })}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            </div>
            
            <div className="space-y-4">
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
            </div>
          </div>
          
          <div className="flex justify-end gap-4 pt-4 mt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              {uploading ? 'Laddar upp...' : 'Spara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm; 