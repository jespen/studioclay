'use client';

import React, { useEffect, useRef } from 'react';
import { Product } from './types';
import { saveItemDetails } from '@/utils/dataFetcher';
import { useRouter } from 'next/navigation';

type ProductDialogProps = {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onBuy?: (e: React.MouseEvent) => void;
};

const ProductDialog: React.FC<ProductDialogProps> = ({ product, isOpen, onClose, onBuy }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBuyClick = (e: React.MouseEvent) => {
    onClose();
    
    // If parent provided a buy handler, use it
    if (onBuy) {
      onBuy(e);
    } else {
      // Otherwise handle it here
      saveItemDetails(product);
      router.push(`/shop/${product.id}/personal-info`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div 
        ref={dialogRef}
        className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto flex flex-col md:flex-row"
      >
        {/* Product image */}
        <div className="md:w-1/2 bg-gray-100">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Product details */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-medium font-serif">{product.title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-black"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="mt-4">
            {product.originalPrice ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 line-through">{product.originalPrice} kr</span>
                <span className="text-xl font-medium">{product.price} kr</span>
              </div>
            ) : (
              <span className="text-xl font-medium">{product.price} kr</span>
            )}
          </div>
          
          <div className="mt-6 text-gray-600">
            <p>{product.description}</p>
          </div>
          
          <div className="mt-auto pt-8">
            <button 
              className="w-full py-3 btn-primary text-white hover:bg-primary-dark transition-colors"
              onClick={handleBuyClick}
            >
              KÖP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDialog; 