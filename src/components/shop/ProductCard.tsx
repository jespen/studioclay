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
        className="relative overflow-hidden bg-gray-100 cursor-pointer"
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
      </div>
      
      {/* Product info */}
      <div className="mt-4 flex flex-col">
        <h3 className="text-sm font-medium text-center">{product.title}</h3>
        <div className="mt-1 text-center">
          {product.originalPrice ? (
            <div className="flex justify-center items-center gap-2">
              <span className="text-gray-400 line-through">{product.originalPrice} kr</span>
              <span className="font-medium">{product.price} kr</span>
            </div>
          ) : (
            <span className="font-medium">{product.price} kr</span>
          )}
        </div>
        <button 
          className={`mt-3 w-full py-2 ${
            product.inStock === false 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'btn-primary text-white hover:bg-primary-dark transition-colors'
          }`}
          onClick={product.inStock === false ? undefined : handleBuyClick}
          disabled={product.inStock === false}
        >
          {product.inStock === false ? 'SLUTSÅLD' : 'KÖP'}
        </button>
      </div>

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