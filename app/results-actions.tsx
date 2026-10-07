'use client';

import { useEffect } from 'react';

export default function ResultsActions() {
  useEffect(() => {
    const installAction = () => {
      const results = document.querySelector<HTMLElement>('.results');
      const routeLine = results?.querySelector<HTMLElement>('.route-line');
      if (!results || !routeLine || results.querySelector('.results-restart')) return;

      const wrap = document.createElement('div');
      wrap.className = 'results-restart';

      const copy = document.createElement('div');
      copy.className = 'results-restart-copy';
      copy.innerHTML = '<span>Ready for another translation?</span><strong>Build another TastePassport.</strong>';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'results-restart-button';
      button.innerHTML = 'Build another passport <span>↑</span>';
      button.addEventListener('click', () => {
        document.querySelector<HTMLElement>('.builder-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('#likes')?.focus({ preventScroll: true }), 650);
      });

      wrap.append(copy, button);
      routeLine.insertAdjacentElement('afterend', wrap);
    };

    installAction();
    const observer = new MutationObserver(installAction);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
