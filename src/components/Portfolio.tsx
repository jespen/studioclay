'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CaretLeft, CaretRight, Eye, X } from '@phosphor-icons/react';
import styles from '@/styles/Portfolio.module.css';

// Definition for a local gallery item
interface GalleryItem {
  id: string;
  path: string;
  caption: string;
}

// Repeating 7-item pattern that fills a 3-column grid exactly:
// row 1: wide + single, row 2: three singles, row 3: single + wide
const LAYOUT_PATTERN = ['wide', 'single', 'single', 'single', 'single', 'single', 'wide'] as const;
const PAGE_SIZE = LAYOUT_PATTERN.length * 2;

const Portfolio = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [categorizedItems, setCategorizedItems] = useState<Record<string, GalleryItem[]>>({
    all: [],
    pottery: [],
    artistic: [],
    decorative: [],
    workshops: [],
    process: [],
    studio: [],
  });

  const applyItems = useCallback((items: GalleryItem[]) => {
    setGalleryItems(items);
    setCategorizedItems({
      all: items,
      pottery: items,
      artistic: items,
      decorative: items,
      workshops: items,
      process: items,
      studio: items,
    });
  }, []);

  const initializeGallery = useCallback(async () => {
    try {
      const response = await fetch('/api/portfolio', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load portfolio');
      }

      const data = await response.json();
      const images = Array.isArray(data.images) ? data.images : [];
      applyItems(images.map((image: { id: string; url: string; caption: string }) => ({
        id: image.id,
        path: image.url,
        caption: '',
      })));
      setError(images.length === 0 ? 'Inga bilder i portfolion ännu.' : null);
    } catch (err) {
      console.error('Error loading portfolio images:', err);
      setError('Kunde inte hämta portfoliobilder från bildarkivet.');
      applyItems([]);
    } finally {
      setLoading(false);
    }
  }, [applyItems]);

  // Initialize gallery on component mount
  useEffect(() => {
    initializeGallery();
  }, [initializeGallery]);

  // Filter categories
  const filters = [
    { id: 'all', label: 'Alla verk' },
    { id: 'pottery', label: 'Keramik' },
    { id: 'artistic', label: 'Konstverk' },
    { id: 'decorative', label: 'Dekorativt' },
    { id: 'workshops', label: 'Workshops' },
    { id: 'process', label: 'Process' },
    { id: 'studio', label: 'Studio' },
  ];

  // Filtered images based on active filter
  const filteredItems = (categorizedItems[activeFilter] || []).filter(item => !failedIds.has(item.id));

  // Display items limited by visibleCount
  const displayedItems = filteredItems.slice(0, visibleCount);

  // Load more items
  const loadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  const handleImageError = (id: string) => {
    setFailedIds(prev => new Set(prev).add(id));
  };

  // Open image in gallery modal
  const openGallery = (index: number) => {
    setCurrentImage(index);
    setGalleryOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Close gallery modal
  const closeGallery = () => {
    setGalleryOpen(false);
    document.body.style.overflow = 'auto';
  };

  // Navigate to next image
  const nextImage = () => {
    setCurrentImage((prev) => 
      prev === filteredItems.length - 1 ? 0 : prev + 1
    );
  };

  // Navigate to previous image
  const prevImage = () => {
    setCurrentImage((prev) => 
      prev === 0 ? filteredItems.length - 1 : prev - 1
    );
  };

  const isWide = (index: number) => LAYOUT_PATTERN[index % LAYOUT_PATTERN.length] === 'wide';

  return (
    <section id="works" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection} data-reveal>
          <h2 className={styles.title}>Portfolio</h2>
          <p className={styles.description}>
            En samling av vackra skapelser från vår studio och verkstad.
          </p>
          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>

        {/* Filter Buttons */}
        {/* <div className={styles.filterContainer}>
          {filters.map(filter => (
            <button
              key={filter.id}
              className={`${styles.filterButton} ${activeFilter === filter.id ? styles.activeFilter : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div> */}

        {/* Portfolio Masonry Grid */}
        <div className={styles.masonryGrid} data-reveal-stagger="zoom">
          {loading ? (
            // Display loading skeletons
            Array(PAGE_SIZE).fill(0).map((_, index) => (
              <div key={index} className={`${styles.portfolioCard} ${styles.skeleton} ${isWide(index) ? styles.wideItem : ''}`}>
                <div className={styles.skeletonImage}></div>
              </div>
            ))
          ) : displayedItems.length > 0 ? (
            displayedItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`${styles.portfolioCard} ${isWide(index) ? styles.wideItem : ''}`} 
                onClick={() => openGallery(index)}
              >
                <div className={styles.imageContainer}>
                  <Image 
                    src={item.path} 
                    alt="Portfoliobild"
                    className={styles.portfolioImage}
                    fill
                    unoptimized={item.path.startsWith('/api/')}
                    sizes={isWide(index)
                      ? '(min-width: 1024px) 66vw, 100vw'
                      : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'}
                    onError={() => handleImageError(item.id)}
                  />
                </div>
                <div className={styles.cardOverlay}>
                  <div className={styles.cardContent}>
                    <div className={styles.cardInfo}>
                      <span className={styles.viewButton}>
                        Visa större
                        <Eye className={styles.viewIcon} weight="duotone" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noResults}>
              <p>Inga objekt hittades i denna kategori. Vänligen prova ett annat filter.</p>
            </div>
          )}
        </div>

        {/* Show More Button */}
        {displayedItems.length < filteredItems.length && (
          <div className={styles.buttonContainer}>
            <button onClick={loadMore} className={styles.showMoreButton}>
              Visa fler
            </button>
          </div>
        )}

        {/* Image Gallery Modal */}
        {galleryOpen && filteredItems.length > 0 && (
          <div className={styles.galleryModal} onClick={closeGallery}>
            <div className={styles.galleryContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeButton} onClick={closeGallery}>
                <X weight="bold" />
              </button>
              
              <div className={styles.galleryImageContainer}>
                <Image 
                  src={filteredItems[currentImage].path}
                  alt="Portfoliobild"
                  className={styles.galleryImage}
                  width={800}
                  height={800}
                  unoptimized={filteredItems[currentImage].path.startsWith('/api/')}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              
              <button className={`${styles.navButton} ${styles.prevButton}`} onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                <CaretLeft weight="bold" />
              </button>
              
              <button className={`${styles.navButton} ${styles.nextButton}`} onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                <CaretRight weight="bold" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Portfolio; 