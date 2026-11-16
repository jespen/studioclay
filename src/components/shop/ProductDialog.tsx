'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
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
      router.push(`/shop/${product.id}/details`);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="relative min-h-0 bg-[#f3f4f2]">
          <img
            src={product.image}
            alt={product.title}
            className="max-h-[calc(90vh-5.5rem)] w-full object-contain"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-gray-700 backdrop-blur-sm transition-colors hover:bg-white"
          >
            <X size={18} weight="bold" />
          </button>

          <div className="absolute inset-x-0 bottom-0 bg-white/45 px-4 py-3 backdrop-blur-md">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h2 id="product-dialog-title" className="truncate font-serif text-lg font-medium text-gray-900">
                  {product.title}
                </h2>
                {product.description && (
                  <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-gray-700">
                    {product.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                {product.originalPrice ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-500 line-through">{product.originalPrice} kr</span>
                    <span className="text-lg font-medium text-gray-900">{product.price} kr</span>
                  </div>
                ) : (
                  <span className="text-lg font-medium text-gray-900">{product.price} kr</span>
                )}
                {product.stockQuantity !== undefined && (
                  <p className={`mt-0.5 text-xs ${product.inStock === false ? 'text-red-600' : 'text-gray-600'}`}>
                    {product.inStock === false ? 'Slutsåld' : `${product.stockQuantity} i lager`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-3">
          <button
            type="button"
            className={`w-full rounded-md px-4 py-3 text-sm font-medium transition-colors ${
              product.inStock === false
                ? 'cursor-not-allowed bg-gray-400 text-white'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
            onClick={product.inStock === false ? undefined : handleBuyClick}
            disabled={product.inStock === false}
          >
            {product.inStock === false ? 'Slutsåld' : 'Köp'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductDialog; 