'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/Navbar.module.css';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isMobile?: boolean;
}

const NavLink = ({ href, children, className, onClick, isMobile = false }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  
  const linkClassName = isMobile 
    ? styles.mobileNavLink
    : `${styles.navLink} ${isActive ? styles.activeLink : ''}`;

  return (
    <Link 
      href={href} 
      className={`${linkClassName} ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
};

export default NavLink; 