'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/Portfolio.module.css';

const Portfolio = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  // Gallery images from the studio
  const portfolioImages = [
    {
      id: 1,
      title: 'Ceramic Bowls',
      category: 'Functional Pottery',
      imageSrc: '/gallery/ceramic-bowls.svg',
      filter: 'pottery'
    },
    {
      id: 2,
      title: 'Clay Vases',
      category: 'Decorative Items',
      imageSrc: '/gallery/clay-vases.svg',
      filter: 'decorative'
    },
    {
      id: 3,
      title: 'Pottery Workshop',
      category: 'Events',
      imageSrc: '/gallery/pottery-workshop.svg',
      filter: 'workshops'
    },
    {
      id: 4,
      title: 'Hand Sculpting',
      category: 'Artistic Process',
      imageSrc: '/gallery/hand-sculpting.svg',
      filter: 'process'
    },
    {
      id: 5,
      title: 'Glazed Mugs',
      category: 'Functional Pottery',
      imageSrc: '/gallery/glazed-mugs.svg',
      filter: 'pottery'
    },
    {
      id: 6,
      title: 'Clay Sculptures',
      category: 'Art Pieces',
      imageSrc: '/gallery/clay-sculptures.svg',
      filter: 'artistic'
    },
    {
      id: 7,
      title: 'Studio Space',
      category: 'Facilities',
      imageSrc: '/gallery/studio-space.svg',
      filter: 'studio'
    },
    {
      id: 8,
      title: 'Children\'s Class',
      category: 'Youth Programs',
      imageSrc: '/gallery/children-class.svg',
      filter: 'workshops'
    },
    {
      id: 9,
      title: 'Handmade Plates',
      category: 'Functional Pottery',
      imageSrc: '/gallery/handmade-plates.svg',
      filter: 'pottery'
    },
    {
      id: 10,
      title: 'Artistic Sculptures',
      category: 'Art Pieces',
      imageSrc: '/gallery/artistic-sculptures.svg',
      filter: 'artistic'
    },
    {
      id: 11,
      title: 'Pottery Wheel Session',
      category: 'Artistic Process',
      imageSrc: '/gallery/pottery-wheel-session.svg',
      filter: 'process'
    },
    {
      id: 12,
      title: 'Corporate Workshop',
      category: 'Events',
      imageSrc: '/gallery/corporate-workshop.svg',
      filter: 'workshops'
    },
    {
      id: 13,
      title: 'Ceramic Teapots',
      category: 'Functional Pottery',
      imageSrc: '/gallery/ceramic-teapots.svg',
      filter: 'pottery'
    },
    {
      id: 14,
      title: 'Studio Equipment',
      category: 'Facilities',
      imageSrc: '/gallery/studio-equipment.svg',
      filter: 'studio'
    },
    {
      id: 15,
      title: 'Glaze Application',
      category: 'Artistic Process',
      imageSrc: '/gallery/glaze-application.svg',
      filter: 'process'
    },
    {
      id: 16,
      title: 'Decorative Piece',
      category: 'Decorative Items',
      imageSrc: '/gallery/decorative-piece.svg',
      filter: 'decorative'
    },
    {
      id: 17,
      title: 'Group Class',
      category: 'Events',
      imageSrc: '/gallery/group-class.svg',
      filter: 'workshops'
    },
    {
      id: 18,
      title: 'Clay Preparation',
      category: 'Artistic Process',
      imageSrc: '/gallery/clay-preparation.svg',
      filter: 'process'
    },
    {
      id: 19,
      title: 'Finished Pieces',
      category: 'Art Pieces',
      imageSrc: '/gallery/finished-pieces.svg',
      filter: 'artistic'
    },
    {
      id: 20,
      title: 'Kiln Room',
      category: 'Facilities',
      imageSrc: '/gallery/kiln-room.svg',
      filter: 'studio'
    },
  ];

  // Filter categories
  const filters = [
    { id: 'all', label: 'All Works' },
    { id: 'pottery', label: 'Pottery' },
    { id: 'artistic', label: 'Art Pieces' },
    { id: 'decorative', label: 'Decorative' },
    { id: 'workshops', label: 'Workshops' },
    { id: 'process', label: 'Process' },
    { id: 'studio', label: 'Studio' },
  ];

  // Filtered images based on active filter
  const filteredImages = activeFilter === 'all' 
    ? portfolioImages 
    : portfolioImages.filter(img => img.filter === activeFilter);

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

  return (
    <section id="works" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Our Work</h2>
          <p className={styles.description}>
            A collection of beautiful creations made at our studio by our instructors and students.
          </p>
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
          {displayedImages.map((item, index) => (
            <div key={item.id} className={styles.portfolioCard} onClick={() => openGallery(index)}>
              <div className={styles.imageContainer}>
                <Image 
                  src={item.imageSrc} 
                  alt={item.title}
                  className={styles.portfolioImage}
                  width={400}
                  height={300}
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className={styles.cardOverlay}>
                <div className={styles.cardContent}>
                  <div className={styles.cardInfo}>
                    <span className={styles.category}>{item.category}</span>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <span className={styles.viewButton}>
                      View Larger
                      <svg className={styles.viewIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className={styles.buttonContainer}>
          <Link href="/portfolio" className={styles.viewAllButton}>
            View All Work
          </Link>
        </div>

        {/* Image Gallery Modal */}
        {galleryOpen && (
          <div className={styles.galleryModal} onClick={closeGallery}>
            <div className={styles.galleryContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.closeButton} onClick={closeGallery}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div className={styles.galleryImageContainer}>
                <Image 
                  src={filteredImages[currentImage].imageSrc}
                  alt={filteredImages[currentImage].title}
                  className={styles.galleryImage}
                  width={800}
                  height={600}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              
              <div className={styles.galleryInfo}>
                <h3 className={styles.galleryTitle}>{filteredImages[currentImage].title}</h3>
                <p className={styles.galleryCategory}>{filteredImages[currentImage].category}</p>
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