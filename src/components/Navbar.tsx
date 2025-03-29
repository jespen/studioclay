'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '@/styles/Navbar.module.css';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const scrollToSection = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const section = document.getElementById(sectionId);
    
    if (section) {
      closeMenu();
      
      window.scrollTo({
        top: section.offsetTop - 80, // Account for navbar height
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'services', 'presentkort', 'shop', 'works', 'courses', 'kontakt'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;

          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationLinks = [
    // { id: 'home', label: 'Hem', isAnchor: true },   
    { id: 'courses', label: 'Kurser', isAnchor: true },
    { id: 'services', label: 'Övriga kurser', isAnchor: true },
    { id: 'presentkort', label: 'Presentkort', isAnchor: true },
    { id: 'shop', label: 'Shop', isAnchor: true },
    { id: 'works', label: 'Portfolio', isAnchor: true },
    { id: 'kontakt', label: 'Kontakt', href: '/contact', isAnchor: false },
  ];

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.wrapper}>
          {/* Logo */}
          <a 
            href="#home" 
            className={styles.logo} 
            onClick={(e) => scrollToSection('home', e)}
          >
            <Image 
              src="/gallery/logo3.png"
              alt="Studio Clay Logo"
              width={40}
              height={40}
              className={styles.logoImage}
            />
            <span className={styles.logoText}>Studio Clay</span>
          </a>

          {/* Desktop Navigation */}
          <div className={styles.navigation}>
            <div className={styles.navList}>
              {navigationLinks.map((link) => (
                link.isAnchor ? (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className={`${styles.navLink} ${activeSection === link.id ? styles.activeLink : ''}`}
                    onClick={(e) => scrollToSection(link.id, e)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.id}
                    href={link.href || '/'}
                    className={`${styles.navLink} ${styles.contactButton} ${activeSection === link.id ? styles.activeLink : ''}`}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={styles.menuButton}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <div className={styles.container}>
            <div className={styles.mobileNavList}>
              {navigationLinks.map((link) => (
                link.isAnchor ? (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className={`${styles.mobileNavLink} ${activeSection === link.id ? styles.activeLink : ''}`}
                    onClick={(e) => scrollToSection(link.id, e)}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.id}
                    href={link.href || '/'}
                    className={`${styles.mobileNavLink} ${styles.mobileContactButton} ${activeSection === link.id ? styles.activeLink : ''}`}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 