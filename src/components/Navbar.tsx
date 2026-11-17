'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { List, X } from '@phosphor-icons/react';
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
    { id: 'services', label: 'Anpassade event', isAnchor: true },
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
            <span className={styles.logoText}>
              <span>Studio</span>
              <span>CLAY</span>
            </span>
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
              <X size={24} weight="bold" />
            ) : (
              <List size={24} weight="bold" />
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