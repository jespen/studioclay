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
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row"
      >
        <div className="relative flex shrink-0 items-center justify-center bg-[#f3f4f2] md:w-[48%]">
          <img
            src={product.image}
            alt={product.title}
            className="max-h-[46vh] w-full object-contain md:max-h-[92vh]"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-gray-700 backdrop-blur-sm transition-colors hover:bg-white"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-1 items-start justify-between gap-6 overflow-y-auto px-6 py-6">
            <div className="min-w-0">
              <h2 id="product-dialog-title" className="font-serif text-2xl font-medium text-gray-900">
                {product.title}
              </h2>
              {product.description && (
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  {product.description}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              {product.originalPrice ? (
                <div className="flex items-baseline justify-end gap-2">
                  <span className="text-sm text-gray-500 line-through">{product.originalPrice} kr</span>
                  <span className="text-xl font-medium text-gray-900">{product.price} kr</span>
                </div>
              ) : (
                <span className="text-xl font-medium text-gray-900">{product.price} kr</span>
              )}
              {product.stockQuantity !== undefined && (
                <p className={`mt-1 text-xs ${product.inStock === false ? 'text-red-600' : 'text-gray-600'}`}>
                  {product.inStock === false ? 'Slutsåld' : `${product.stockQuantity} i lager`}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 pt-0">
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
      </div>
    </div>,
    document.body
  );
};

export default ProductDialog; 