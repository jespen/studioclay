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

// Define image files outside the component to prevent recreating on each render
const imageFiles = [
  '479196463_17909922606091314_2475985145275366154_n_17937954905977933.jpg',
  '472534095_17905386474091314_5180778659628596723_n_18040731992073806.jpg',
  '472015112_17905386483091314_1667763584543815880_n_18055603840987017.jpg',
  '471904659_17904629667091314_3509545999734555197_n_18299326909224234.jpg',
  '470894543_17903361150091314_121791914934822849_n_18083195089568141.jpg',
  '470254332_17902589004091314_5251138448130656723_n_17930770679978379.jpg',
  '469141938_17901030048091314_1303809784674571365_n_18060364156879062.jpg',
  '468885647_17900149299091314_255867906902689819_n_18019751183633878.jpg',
  '468107889_17899915569091314_3135608034117058432_n_17926178438979340.jpg',
  '467572101_17899344162091314_8241020874149259753_n_18341122867182971.jpg',
  '467355630_17899259901091314_282152466393476000_n_18255275791262115.jpg',
  '466397634_17898105156091314_5886890904108567108_n_18036261662258556.jpg',
  '464810118_17896204890091314_5858516082568137867_n_18006787301655390.jpg',
  '464764467_17896204881091314_4628023559806562100_n_18288859000225559.jpg',
  '464760332_17896204899091314_1571225143271110851_n_18020122406305287.jpg',
  '464566559_1721016112026695_8021310915203851498_n_17912572281011200.jpg',
  '463283258_566415742496556_3305111977129603459_n_18022942775426076.jpg',
  '459479980_425487217218760_17144699842386549_n_18275443936169728.jpg',
  '459315713_508450278802133_5476887731797649021_n_17896674200979783.jpg',
  '458375346_1239533684067572_15371129072052344_n_17938224368885128.jpg',
  '456732816_499314546141326_1737514812440101513_n_18038395945881153.jpg',
  '456483791_1009635753982827_5855498039746861389_n_18040031753310304.jpg',
  '454171456_935760078362407_7324085940875201455_n_17947768835828146.jpg',
  '453208954_449873624698976_6858309524759709008_n_18078554251513004.jpg',
  '449177627_457777966891953_378524233922065480_n_18260931058244475.jpg',
  '449151818_401676142880360_388203461566028602_n_18035177458975635.jpg'
];

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

  const initializeFallback = useCallback(() => {
    const items: GalleryItem[] = imageFiles.map((file, index) => ({
      id: `gallery-${index}`,
      path: `/pictures/${file}`,
      caption: `Studio Clay Work ${index + 1}`,
    }));
    applyItems(items);
  }, [applyItems]);

  const initializeGallery = useCallback(async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (!response.ok) {
        throw new Error('Failed to load portfolio');
      }

      const data = await response.json();
      if (!Array.isArray(data.images) || data.images.length === 0) {
        initializeFallback();
        return;
      }

      applyItems(data.images.map((image: { id: string; url: string; caption: string }) => ({
        id: image.id,
        path: image.url,
        caption: image.caption || 'Studio Clay',
      })));
    } catch (err) {
      console.error('Error loading portfolio images:', err);
      setError('Kunde inte hämta portfoliobilder från bildarkivet.');
      initializeFallback();
    } finally {
      setLoading(false);
    }
  }, [applyItems, initializeFallback]);

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
                    alt={item.caption}
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
                      <h3 className={styles.cardTitle}>
                        {item.caption}
                      </h3>
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
                  alt={filteredItems[currentImage].caption}
                  className={styles.galleryImage}
                  width={800}
                  height={800}
                  unoptimized={filteredItems[currentImage].path.startsWith('/api/')}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              
              <div className={styles.galleryInfo}>
                <h3 className={styles.galleryTitle}>
                  {filteredItems[currentImage].caption}
                </h3>
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