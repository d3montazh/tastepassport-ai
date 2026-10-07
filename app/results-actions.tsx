'use client';

import { useEffect } from 'react';
import { normalizeLocale, type Locale } from './i18n';

const restartCopy: Record<Locale, { kicker: string; title: string; button: string }> = {
  en: { kicker: 'Ready for another translation?', title: 'Build another TastePassport.', button: 'Build another passport' },
  ru: { kicker: 'Готов к новому переводу вкуса?', title: 'Создай ещё один TastePassport.', button: 'Создать новый паспорт' },
  uk: { kicker: 'Готовий до нового перекладу смаку?', title: 'Створи ще один TastePassport.', button: 'Створити новий паспорт' },
  es: { kicker: '¿Listo para otra traducción?', title: 'Crea otro TastePassport.', button: 'Crear otro pasaporte' },
  zh: { kicker: '准备好进行下一次品味翻译了吗？', title: '创建另一个 TastePassport。', button: '创建新护照' },
};

export default function ResultsActions() {
  useEffect(() => {
    const getLocale = () => normalizeLocale(window.localStorage.getItem('tastepassport-locale') || navigator.language);

    const updateCopy = (wrap: HTMLElement) => {
      const copy = restartCopy[getLocale()];
      const kicker = wrap.querySelector<HTMLElement>('.results-restart-copy span');
      const title = wrap.querySelector<HTMLElement>('.results-restart-copy strong');
      const button = wrap.querySelector<HTMLButtonElement>('.results-restart-button');
      if (kicker) kicker.textContent = copy.kicker;
      if (title) title.textContent = copy.title;
      if (button) button.innerHTML = `${copy.button} <span>↑</span>`;
    };

    const installAction = () => {
      const results = document.querySelector<HTMLElement>('.results');
      const routeLine = results?.querySelector<HTMLElement>('.route-line');
      if (!results || !routeLine) return;

      const existing = results.querySelector<HTMLElement>('.results-restart');
      if (existing) {
        updateCopy(existing);
        return;
      }

      const wrap = document.createElement('div');
      wrap.className = 'results-restart';

      const copy = document.createElement('div');
      copy.className = 'results-restart-copy';
      copy.innerHTML = '<span></span><strong></strong>';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'results-restart-button';
      button.addEventListener('click', () => {
        document.querySelector<HTMLElement>('.builder-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('#likes')?.focus({ preventScroll: true }), 650);
      });

      wrap.append(copy, button);
      updateCopy(wrap);
      routeLine.insertAdjacentElement('afterend', wrap);
    };

    installAction();
    const observer = new MutationObserver(installAction);
    observer.observe(document.body, { childList: true, subtree: true });

    const onLanguage = () => {
      const wrap = document.querySelector<HTMLElement>('.results-restart');
      if (wrap) updateCopy(wrap);
    };
    window.addEventListener('tastepassport:language', onLanguage);

    return () => {
      observer.disconnect();
      window.removeEventListener('tastepassport:language', onLanguage);
    };
  }, []);

  return null;
}
