'use client';

import { useEffect } from 'react';

const revealSelectors = [
  '.builder-wrap',
  '.results-head',
  '.translation-map',
  '.agent-note',
  '.route-refiner',
  '.taste-dna-card',
  '.taste-map-card',
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

    const hero = document.querySelector<HTMLElement>('.hero-grid');
    const orbit = document.querySelector<HTMLElement>('.taste-orbit');
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    let frame = 0;
    let currentX = 0;
    let currentY = 0;
    let currentStretchX = 1;
    let currentStretchY = 1;
    let targetX = 0;
    let targetY = 0;
    let targetStretchX = 1;
    let targetStretchY = 1;

    const paint = () => {
      if (!orbit) return;

      currentX += (targetX - currentX) * 0.105;
      currentY += (targetY - currentY) * 0.105;
      currentStretchX += (targetStretchX - currentStretchX) * 0.09;
      currentStretchY += (targetStretchY - currentStretchY) * 0.09;

      orbit.style.setProperty('--blob-x', `${currentX.toFixed(2)}px`);
      orbit.style.setProperty('--blob-y', `${currentY.toFixed(2)}px`);
      orbit.style.setProperty('--blob-sx', currentStretchX.toFixed(4));
      orbit.style.setProperty('--blob-sy', currentStretchY.toFixed(4));
      orbit.style.setProperty('--ring-x', `${(currentX * 0.28).toFixed(2)}px`);
      orbit.style.setProperty('--ring-y', `${(currentY * 0.28).toFixed(2)}px`);
      orbit.style.setProperty('--ring-outer-x', `${(currentX * 0.14).toFixed(2)}px`);
      orbit.style.setProperty('--ring-outer-y', `${(currentY * 0.14).toFixed(2)}px`);

      frame = requestAnimationFrame(paint);
    };

    const moveBlob = (event: PointerEvent) => {
      if (!orbit) return;
      const rect = orbit.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (event.clientX - centerX) / (rect.width * 0.72)));
      const ny = Math.max(-1, Math.min(1, (event.clientY - centerY) / (rect.height * 0.72)));
      const energy = Math.min(1, Math.hypot(nx, ny));

      targetX = nx * 18;
      targetY = ny * 15;
      targetStretchX = 1 + Math.abs(nx) * 0.075 - Math.abs(ny) * 0.018;
      targetStretchY = 1 + Math.abs(ny) * 0.075 - Math.abs(nx) * 0.018;

      orbit.style.setProperty('--blob-glow', `${(0.32 + energy * 0.13).toFixed(3)}`);
    };

    const relaxBlob = () => {
      targetX = 0;
      targetY = 0;
      targetStretchX = 1;
      targetStretchY = 1;
      orbit?.style.setProperty('--blob-glow', '0.32');
    };

    if (hero && orbit && hasFinePointer) {
      hero.addEventListener('pointermove', moveBlob);
      hero.addEventListener('pointerleave', relaxBlob);
      frame = requestAnimationFrame(paint);
    }

    return () => {
      mutationObserver.disconnect();
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      hero?.removeEventListener('pointermove', moveBlob);
      hero?.removeEventListener('pointerleave', relaxBlob);
    };
  }, []);

  return null;
}
