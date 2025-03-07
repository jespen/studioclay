'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/Portfolio.module.css';
import { fetchInstagramPosts, categorizeInstagramPosts, InstagramPost } from '@/utils/instagramApi';

const Portfolio = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [categorizedPosts, setCategorizedPosts] = useState<Record<string, InstagramPost[]>>({
    all: [],
    pottery: [],
    artistic: [],
    decorative: [],
    workshops: [],
    process: [],
    studio: [],
  });

  // Fallback images to use when Instagram API fails or is not yet set up
  const fallbackImages = [
    {
      id: '1',
      caption: 'Ceramic Bowls - Beautiful handcrafted pottery for your home',
      media_type: 'IMAGE' as const,
      media_url: '/gallery/ceramic-bowls.svg',
      permalink: '#',
      timestamp: new Date().toISOString(),
      username: 'studioclay',
    },
    {
      id: '2',
      caption: 'Clay Vases - Decorative items for any space',
      media_type: 'IMAGE' as const,
      media_url: '/gallery/clay-vases.svg',
      permalink: '#',
      timestamp: new Date().toISOString(),
      username: 'studioclay',
    },
    {
      id: '3',
      caption: 'Pottery Workshop - Learn the art of clay with our experienced instructors',
      media_type: 'IMAGE' as const,
      media_url: '/gallery/pottery-workshop.svg',
      permalink: '#',
      timestamp: new Date().toISOString(),
      username: 'studioclay',
    },
    {
      id: '4',
      caption: 'Hand Sculpting - The process of creating unique art pieces',
      media_type: 'IMAGE' as const,
      media_url: '/gallery/hand-sculpting.svg',
      permalink: '#',
      timestamp: new Date().toISOString(),
      username: 'studioclay',
    },
    {
      id: '5',
      caption: 'Glazed Mugs - Functional pottery for your morning coffee',
      media_type: 'IMAGE' as const,
      media_url: '/gallery/glazed-mugs.svg',
      permalink: '#',
      timestamp: new Date().toISOString(),
      username: 'studioclay',
    },
    {
      id: '6',
      caption: 'Clay Sculptures - Artistic creations that inspire',
      media_type: 'IMAGE' as const,
      media_url: '/gallery/clay-sculptures.svg',
      permalink: '#',
      timestamp: new Date().toISOString(),
      username: 'studioclay',
    },
  ];

  // Fetch Instagram posts on component mount
  useEffect(() => {
    const getInstagramPosts = async () => {
      setLoading(true);
      try {
        const posts = await fetchInstagramPosts();
        
        if (posts.length > 0) {
          setInstagramPosts(posts);
          const categories = categorizeInstagramPosts(posts);
          setCategorizedPosts(categories);
        } else {
          // Use fallback images if no Instagram posts are available
          setInstagramPosts(fallbackImages);
          setCategorizedPosts(categorizeInstagramPosts(fallbackImages));
          setError('Using fallback images. Connect your Instagram account for live content.');
        }
      } catch (err) {
        console.error('Failed to fetch Instagram posts:', err);
        setError('Failed to load images from Instagram. Using fallback images.');
        setInstagramPosts(fallbackImages);
        setCategorizedPosts(categorizeInstagramPosts(fallbackImages));
      } finally {
        setLoading(false);
      }
    };

    getInstagramPosts();
  }, []);

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
  const filteredImages = categorizedPosts[activeFilter] || [];

  // Show only 6 images on homepage
  const displayedImages = filteredImages.slice(0, 6);

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
      prev === filteredImages.length - 1 ? 0 : prev + 1
    );
  };

  // Navigate to previous image
  const prevImage = () => {
    setCurrentImage((prev) => 
      prev === 0 ? filteredImages.length - 1 : prev - 1
    );
  };

  // Format date from Instagram timestamp
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <section id="works" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Vårt arbete</h2>
          <p className={styles.description}>
            En samling av vackra skapelser från vår studio, direkt från vårt Instagram-flöde.
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

        {/* Portfolio Grid */}
        <div className={styles.portfolioGrid}>
          {loading ? (
            // Display loading skeletons
            Array(6).fill(0).map((_, index) => (
              <div key={index} className={`${styles.portfolioCard} ${styles.skeleton}`}>
                <div className={styles.skeletonImage}></div>
              </div>
            ))
          ) : displayedImages.length > 0 ? (
            displayedImages.map((item, index) => (
              <div key={item.id} className={styles.portfolioCard} onClick={() => openGallery(index)}>
                <div className={styles.imageContainer}>
                  <Image 
                    src={item.media_url} 
                    alt={item.caption || 'Studio Clay Instagram Post'}
                    className={styles.portfolioImage}
                    width={400}
                    height={300}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className={styles.cardOverlay}>
                  <div className={styles.cardContent}>
                    <div className={styles.cardInfo}>
                      <span className={styles.category}>
                        {formatDate(item.timestamp)}
                      </span>
                      <h3 className={styles.cardTitle}>
                        {item.caption?.split('\n')[0]?.substring(0, 30) || 'Studio Clay Skapelse'}
                        {(item.caption?.split('\n')[0]?.length || 0) > 30 ? '...' : ''}
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

        {/* View All Button */}
        <div className={styles.buttonContainer}>
          <Link href="/portfolio" className={styles.viewAllButton}>
            Visa allt arbete
          </Link>
        </div>

        {/* Image Gallery Modal */}
        {galleryOpen && filteredImages.length > 0 && (
          <div className={styles.galleryModal} onClick={closeGallery}>
            <div className={styles.galleryContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeButton} onClick={closeGallery}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className={styles.galleryImageContainer}>
                <Image 
                  src={filteredImages[currentImage].media_url}
                  alt={filteredImages[currentImage].caption || 'Studio Clay Instagram Post'}
                  className={styles.galleryImage}
                  width={800}
                  height={600}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              
              <div className={styles.galleryInfo}>
                <h3 className={styles.galleryTitle}>
                  {filteredImages[currentImage].caption?.split('\n')[0] || 'Studio Clay Skapelse'}
                </h3>
                <p className={styles.galleryCategory}>
                  Publicerad den {formatDate(filteredImages[currentImage].timestamp)}
                </p>
                <a 
                  href={filteredImages[currentImage].permalink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.instagramLink}
                  onClick={(e) => e.stopPropagation()}
                >
                  Visa på Instagram
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
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