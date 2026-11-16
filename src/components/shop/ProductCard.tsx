'use client';

import React, { useState } from 'react';
import { Product } from './types';
import ProductDialog from './ProductDialog';
import { useRouter } from 'next/navigation';
import { saveItemDetails } from '@/utils/dataFetcher';
import styles from '@/styles/Courses.module.css';
import { CourseStatusBadge } from '@/components/Courses';

type ProductCardProps = {
  product: Product;
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();
  const isSoldOut = product.inStock === false;

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
    <div className={`${styles.courseCard} group cursor-pointer`} onClick={handleOpenDialog}>
      <div className={styles.courseImageContainer}>
        <img
          src={product.image}
          alt={product.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {(product.isNew || product.discount) && (
          <div className="absolute left-3 top-3 z-[2] flex gap-1.5">
            {product.isNew && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold tracking-wider text-gray-900 shadow-sm">
                NY
              </span>
            )}
            {product.discount && (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold tracking-wider text-[#c24141] shadow-sm">
                -{product.discount}%
              </span>
            )}
          </div>
        )}

        {isSoldOut && (
          <CourseStatusBadge
            courseId={`product-${product.id}`}
            isFullyBooked
            availableSpots={null}
            toneClass=""
          />
        )}
      </div>

      <div className={styles.courseInfo}>
        <div className={styles.courseHeading}>
          <h3 className={`${styles.courseName} line-clamp-2`}>{product.title}</h3>
          <div className={styles.coursePrice}>
            {product.originalPrice && (
              <span className="mr-1.5 text-sm font-normal text-gray-500 line-through">
                {product.originalPrice}
              </span>
            )}
            <span className={styles.priceValue}>{product.price}</span>
            <span className={styles.priceFrequency}>kr</span>
          </div>
        </div>

        <div className={styles.cardFooter}>
          <button
            className={styles.actionButton}
            onClick={isSoldOut ? (e) => e.stopPropagation() : handleBuyClick}
            disabled={isSoldOut}
          >
            {isSoldOut ? 'Slutsåld' : 'Köp'}
          </button>
        </div>
      </div>

      {/* Product dialog */}
      {isDialogOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <ProductDialog 
            product={product} 
            isOpen={isDialogOpen} 
            onClose={handleCloseDialog}
            onBuy={handleBuyClick}
          />
        </div>
      )}
    </div>
  );
};

export default ProductCard; 
