'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/Portfolio.module.css';
import { InstagramPost } from '@/utils/instagramApi';

// Definition for a local gallery item
interface GalleryItem {
  id: string;
  path: string;
  caption: string;
  size: 'small' | 'medium' | 'large';
  hasFrame: boolean;
}

// List of image files from the pictures directory - moved outside component to prevent recreation on each render
const imageFiles = [
  '479196463_17909922606091314_2475985145275366154_n_17937954905977933.jpg',
  '472534095_17905386474091314_5180778659628596723_n_18040731992073806.jpg',
  '472015112_17905386483091314_1667763584543815880_n_18055603840987017.jpg',
  '471904659_17904629667091314_3509545999734555197_n_18299326909224234.jpg',
  '471845182_945827264184973_3382204023589194312_n_18016299236450986.png',
  '470894543_17903361150091314_121791914934822849_n_18083195089568141.jpg',
  '470254332_17902589004091314_5251138448130656723_n_17930770679978379.jpg',
  '469992877_17902344291091314_1598098624100672213_n_18047840318114509.jpg',
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
  '464551441_1509881106305430_5176567839820708758_n_18024935873395247.jpg',
  '463283258_566415742496556_3305111977129603459_n_18022942775426076.jpg',
  '459479980_425487217218760_17144699842386549_n_18275443936169728.jpg',
  '459315713_508450278802133_5476887731797649021_n_17896674200979783.jpg',
  '458375346_1239533684067572_15371129072052344_n_17938224368885128.jpg',
  '456732816_499314546141326_1737514812440101513_n_18038395945881153.jpg',
  '456483791_1009635753982827_5855498039746861389_n_18040031753310304.jpg',
  '455963068_1034238844882810_1062415385419473289_n_18053048491783905.jpg',
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
  const [visibleCount, setVisibleCount] = useState(9);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [categorizedItems, setCategorizedItems] = useState<Record<string, GalleryItem[]>>({
    all: [],
    pottery: [],
    artistic: [],
    decorative: [],
    workshops: [],
    process: [],
    studio: [],
  });

  // Randomize and initialize gallery items with varying sizes and frames
  const initializeGallery = useCallback(() => {
    // Shuffle the image array
    const shuffledImages = [...imageFiles].sort(() => Math.random() - 0.5);
    
    // Create gallery items with random sizes and frames
    const items: GalleryItem[] = shuffledImages.map((file, index) => {
      // Randomize size (with more medium than small or large)
      const sizeRandom = Math.random();
      let size: 'small' | 'medium' | 'large';
      if (sizeRandom < 0.2) {
        size = 'small';
      } else if (sizeRandom < 0.8) {
        size = 'medium';
      } else {
        size = 'large';
      }
      
      // Randomize frame (about 40% of images have frames)
      const hasFrame = Math.random() > 0.6;
      
      // Create caption based on filename (simplified)
      const caption = `Studio Clay Work ${index + 1}`;
      
      return {
        id: `gallery-${index}`,
        path: `/pictures/${file}`,
        caption,
        size,
        hasFrame
      };
    });

    setGalleryItems(items);
    
    // Create categories (simplified from the original code)
    const categories: Record<string, GalleryItem[]> = {
      all: items,
      pottery: items.slice(0, 15),
      artistic: items.slice(5, 20),
      decorative: items.slice(8, 18),
      workshops: items.slice(12, 22),
      process: items.slice(7, 17),
      studio: items.slice(10, 25),
    };
    
    setCategorizedItems(categories);
    setLoading(false);
  }, []); // Remove imageFiles from dependency array since it's now defined outside the component

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
  const filteredItems = categorizedItems[activeFilter] || [];

  // Display items limited by visibleCount
  const displayedItems = filteredItems.slice(0, visibleCount);

  // Load more items
  const loadMore = () => {
    setVisibleCount(prev => prev + 6);
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

  // Get CSS class for item size
  const getSizeClass = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return styles.smallItem;
      case 'large': return styles.largeItem;
      default: return styles.mediumItem;
    }
  };

  return (
    <section id="works" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Vårt arbete</h2>
          <p className={styles.description}>
            En samling av vackra skapelser från vår studio och verkstad.
          </p>
          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>

        {/* Filter Buttons */}
        <div className={styles.filterContainer}>
          {filters.map(filter => (
            <button
              key={filter.id}
              className={`${styles.filterButton} ${activeFilter === filter.id ? styles.activeFilter : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Portfolio Masonry Grid */}
        <div className={styles.masonryGrid}>
          {loading ? (
            // Display loading skeletons
            Array(9).fill(0).map((_, index) => (
              <div key={index} className={`${styles.portfolioCard} ${styles.skeleton} ${styles.mediumItem}`}>
                <div className={styles.skeletonImage}></div>
              </div>
            ))
          ) : displayedItems.length > 0 ? (
            displayedItems.map((item, index) => (
              <div 
                key={item.id} 
                className={`${styles.portfolioCard} ${getSizeClass(item.size)} ${item.hasFrame ? styles.withFrame : ''}`} 
                onClick={() => openGallery(index)}
              >
                <div className={styles.imageContainer}>
                  <Image 
                    src={item.path} 
                    alt={item.caption}
                    className={styles.portfolioImage}
                    width={600}
                    height={600}
                    style={{ objectFit: 'cover' }}
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
                        <svg className={styles.viewIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className={styles.galleryImageContainer}>
                <Image 
                  src={filteredItems[currentImage].path}
                  alt={filteredItems[currentImage].caption}
                  className={styles.galleryImage}
                  width={800}
                  height={800}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              
              <div className={styles.galleryInfo}>
                <h3 className={styles.galleryTitle}>
                  {filteredItems[currentImage].caption}
                </h3>
              </div>
              
              <button className={`${styles.navButton} ${styles.prevButton}`} onClick={(e) => { e.stopPropagation(); prevImage(); }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button className={`${styles.navButton} ${styles.nextButton}`} onClick={(e) => { e.stopPropagation(); nextImage(); }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Portfolio; 