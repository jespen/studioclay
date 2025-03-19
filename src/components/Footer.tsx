'use client';

import Link from 'next/link';
import styles from '@/styles/Footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          {/* Brand Column */}
          <div className={styles.brandColumn}>
            <h3>Studio Clay</h3>
            <p className={styles.brandDesc}>
              En dedikerad keramikstudio som erbjuder krukmakerikurser och kreativa upplevelser för individer och företag.
            </p>
          </div>

          {/* Quick Links */}
          {/* <div>
            <h4 className={styles.columnTitle}>Snabblänkar</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/" className={styles.footerLink}>
                  Hem
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className={styles.footerLink}>
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/book-course" className={styles.footerLink}>
                  Boka Kurs
                </Link>
              </li>
              <li>
                <Link href="/gift-card" className={styles.footerLink}>
                  Presentkort
                </Link>
              </li>
              <li>
                <Link href="/contact" className={styles.footerLink}>
                  Kontakt
                </Link>
              </li>
            </ul>
          </div> */}

          {/* Services */}
          <div>
            <h4 className={styles.columnTitle}>Övrigt</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/villkor" className={styles.footerLink}>
                  Allmäna villkor
                </Link>
              </li>
              <li>
                <Link href="/angerratt" className={styles.footerLink}>
                  Ångerrätt och reklamation
                </Link>
              </li>
              <li>
                <Link href="/personuppgifter" className={styles.footerLink}>
                  Behandling av personuppgifter
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className={styles.columnTitle}>Kontakt</h4>
            <address className={styles.contactInfo}>
            <p className={styles.contactLine}>
                <a 
                  href="https://www.google.com/maps/place/Studio+Clay/@59.349283,18.0445593,17z/data=!3m1!4b1!4m6!3m5!1s0x465f9d9bcb207385:0xfe54feb571cfa39a!8m2!3d59.349283!4d18.0445593!16s%2Fg%2F11vkpp7_7b?entry=ttu"
                  className={styles.footerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hitta hit
                </a>
              </p>
              <p className={styles.contactLine}>Norrtullsgatan 65</p>
              <p className={styles.contactLine}>Stockholm, Sverige</p>
              <div className={styles.contactSpacer}></div>
              <p className={styles.contactLine}>
                <a href="mailto:eva@studioclay.se" className={styles.footerLink}>
                  eva@studioclay.se
                </a>
              </p>
              <p className={styles.contactLine}>
                <a href="tel:+46793120605" className={styles.footerLink}>
                  079-312 06 05
                </a>
              </p>
          
            </address>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            &copy; {currentYear} Studio Clay. Alla rättigheter förbehållna.
          </p>
          <div className={styles.socialLinks}>
            <a href="https://www.facebook.com/profile.php?id=61567950235604" className={styles.socialLink} aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://www.instagram.com/studioclay.se/" className={styles.socialLink} aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/eva-björk-207a6498/" className={styles.socialLink} aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
              <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a href="https://se.pinterest.com/studioclaystockholm/?invite_code=8c3d1d464bdd4d4196df060f8aa2f2e5&sender=1112600420351710038" className={styles.socialLink} aria-label="Pinterest" target="_blank" rel="noopener noreferrer">
              <svg className={styles.socialIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 