'use client';

import React, { useState } from 'react';
import { Product } from './types';
import ProductDialog from './ProductDialog';
import { useRouter } from 'next/navigation';
import { saveItemDetails } from '@/utils/dataFetcher';

type ProductCardProps = {
  product: Product;
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dialog from opening
    
    // Save product details to flow storage first
    saveItemDetails(product);
    
    // Send user to the details step in accordance with the flow
    router.push(`/shop/${product.id}/details`);
  };

  return (
    <div className="group">
      <div 
        className="relative overflow-hidden rounded-xl bg-gray-100 cursor-pointer"
        onClick={handleOpenDialog}
      >
        {/* New tag */}
        {product.isNew && (
          <div className="absolute top-3 left-3 bg-white px-2 py-1 text-xs font-medium">
            NY
          </div>
        )}
        
        {/* Discount tag */}
        {product.discount && (
          <div className="absolute top-3 right-3 bg-white px-2 py-1 text-xs font-medium">
            -{product.discount}%
          </div>
        )}
        
        {/* Sold out overlay */}
        {product.inStock === false && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <span className="bg-white px-3 py-1 text-sm font-medium">SLUTSÅLD</span>
          </div>
        )}
        
        {/* Product image */}
        <div className="aspect-[3/4] relative">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 bg-white/45 px-3 py-2.5 backdrop-blur-md">
          <div className="flex items-end justify-between gap-3">
            <h3 className="min-w-0 text-sm font-medium leading-snug text-gray-900 line-clamp-2">
              {product.title}
            </h3>
            <div className="shrink-0 text-right text-sm font-medium text-gray-900">
              {product.originalPrice ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-normal text-gray-500 line-through">{product.originalPrice} kr</span>
                  <span>{product.price} kr</span>
                </div>
              ) : (
                <span>{product.price} kr</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button 
        className={`mt-2 w-full py-2.5 px-4 text-sm font-medium rounded-md transition-colors ${
          product.inStock === false 
            ? 'bg-gray-400 text-white cursor-not-allowed' 
            : 'bg-primary text-white hover:bg-primary-dark'
        }`}
        onClick={product.inStock === false ? undefined : handleBuyClick}
        disabled={product.inStock === false}
      >
        {product.inStock === false ? 'Slutsåld' : 'Köp'}
      </button>

      {/* Product dialog */}
      {isDialogOpen && (
        <ProductDialog 
          product={product} 
          isOpen={isDialogOpen} 
          onClose={handleCloseDialog}
          onBuy={handleBuyClick}
        />
      )}
    </div>
  );
};

export default ProductCard; 