'use client';

import { useEffect } from 'react';

const revealSelectors = [
  '.builder-wrap',
  '.results-head',
  '.translation-map',
  '.agent-note',
  '.route-refiner',
  '.taste-dna-card',
  '.route-card',
  '.how-it-works .section-kicker',
  '.feature-card',
  'footer',
].join(',');

export default function ScrollEffects() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const registered = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    const register = () => {
      const elements = Array.from(document.querySelectorAll(revealSelectors));

      elements.forEach((element) => {
        if (registered.has(element)) return;
        registered.add(element);
        element.classList.add('scroll-reveal');
        observer.observe(element);
      });

      Array.from(document.querySelectorAll('.route-card')).forEach((element, index) => {
        (element as HTMLElement).style.setProperty('--reveal-delay', `${Math.min(index * 70, 350)}ms`);
      });

      Array.from(document.querySelectorAll('.feature-card')).forEach((element, index) => {
        (element as HTMLElement).style.setProperty('--reveal-delay', `${index * 90}ms`);
      });
    };

    register();

    const mutationObserver = new MutationObserver(register);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
