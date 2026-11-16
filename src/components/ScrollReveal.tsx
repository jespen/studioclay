'use client';

import { useEffect } from 'react';

const SELECTOR = '[data-reveal], [data-reveal-stagger]';

const ScrollReveal = () => {
  useEffect(() => {
    const root = document.documentElement;

    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0 }
    );

    const observeWithin = (node: ParentNode) => {
      node.querySelectorAll(`${SELECTOR}`).forEach((el) => {
        if (!el.classList.contains('is-visible')) observer.observe(el);
      });
    };

    observeWithin(document);
    root.classList.add('reveal-ready');

    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR) && !node.classList.contains('is-visible')) {
            observer.observe(node);
          }
          observeWithin(node);
        });
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove('reveal-ready');
    };
  }, []);

  return null;
};

export default ScrollReveal;
