'use client';

import { useEffect } from 'react';
import { normalizeLocale, type Locale } from './i18n';

const copy: Record<Locale, { title: string; text: string; badge: string }> = {
  en: {
    title: 'Demo preview',
    text: 'Exact venues, addresses and map directions will appear when live Qloo data is connected.',
    badge: 'Live data pending',
  },
  ru: {
    title: 'Демо-превью',
    text: 'Точные заведения, адреса и маршруты на карте появятся после подключения живых данных Qloo.',
    badge: 'Ожидаем live data',
  },
  uk: {
    title: 'Демо-прев’ю',
    text: 'Точні заклади, адреси та маршрути на карті з’являться після підключення живих даних Qloo.',
    badge: 'Очікуємо live data',
  },
  es: {
    title: 'Vista previa de demo',
    text: 'Los lugares exactos, las direcciones y las rutas en el mapa aparecerán cuando se conecten los datos en vivo de Qloo.',
    badge: 'Datos en vivo pendientes',
  },
  zh: {
    title: '演示预览',
    text: '连接实时 Qloo 数据后，将显示具体地点、地址和地图导航。',
    badge: '等待实时数据',
  },
};

export default function DemoPreview() {
  useEffect(() => {
    const getLocale = () =>
      normalizeLocale(window.localStorage.getItem('tastepassport-locale') || navigator.language);

    const update = () => {
      const results = document.querySelector<HTMLElement>('.results');
      const resultsHead = results?.querySelector<HTMLElement>('.results-head');
      const source = results?.querySelector<HTMLElement>('.result-meta span');
      if (!results || !resultsHead || !source) return;

      const isLiveQloo = source.textContent?.trim() === 'Qloo Insights API';
      const existing = results.querySelector<HTMLElement>('.demo-preview-note');

      if (isLiveQloo) {
        existing?.remove();
        return;
      }

      const locale = getLocale();
      const current = copy[locale];
      const note = existing || document.createElement('div');

      if (!existing) {
        note.className = 'demo-preview-note';
        note.innerHTML = `
          <div class="demo-preview-icon">i</div>
          <div class="demo-preview-copy">
            <div class="demo-preview-title"></div>
            <div class="demo-preview-text"></div>
          </div>
          <div class="demo-preview-badge"></div>
        `;
        resultsHead.insertAdjacentElement('afterend', note);
      }

      const title = note.querySelector<HTMLElement>('.demo-preview-title');
      const text = note.querySelector<HTMLElement>('.demo-preview-text');
      const badge = note.querySelector<HTMLElement>('.demo-preview-badge');

      if (title && title.textContent !== current.title) title.textContent = current.title;
      if (text && text.textContent !== current.text) text.textContent = current.text;
      if (badge && badge.textContent !== current.badge) badge.textContent = current.badge;
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });

    const onLanguage = () => update();
    window.addEventListener('tastepassport:language', onLanguage);

    return () => {
      observer.disconnect();
      window.removeEventListener('tastepassport:language', onLanguage);
    };
  }, []);

  return null;
}
