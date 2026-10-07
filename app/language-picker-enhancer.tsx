'use client';

import { useEffect } from 'react';
import { languages, normalizeLocale, type Locale } from './i18n';

export default function LanguagePickerEnhancer() {
  useEffect(() => {
    const nativePicker = document.querySelector<HTMLElement>('.language-picker');
    const select = nativePicker?.querySelector<HTMLSelectElement>('select');
    const actions = document.querySelector<HTMLElement>('.topbar-actions');
    if (!nativePicker || !select || !actions || actions.querySelector('.language-custom')) return;

    nativePicker.classList.add('language-picker-native');

    const root = document.createElement('div');
    root.className = 'language-custom';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'language-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const menu = document.createElement('div');
    menu.className = 'language-menu';
    menu.setAttribute('role', 'listbox');

    root.append(trigger, menu);
    actions.insertBefore(root, actions.querySelector('.nav-pill'));

    const currentLocale = () => normalizeLocale(select.value || window.localStorage.getItem('tastepassport-locale'));

    const render = () => {
      const locale = currentLocale();
      const current = languages.find((language) => language.code === locale) || languages[0];

      trigger.innerHTML = `
        <span class="language-trigger-icon">◎</span>
        <span class="language-trigger-code">${current.short}</span>
        <span class="language-trigger-name">${current.label}</span>
        <span class="language-trigger-chevron">⌄</span>
      `;

      menu.innerHTML = '';
      languages.forEach((language) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = `language-menu-option${language.code === locale ? ' active' : ''}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(language.code === locale));
        option.innerHTML = `
          <span class="language-menu-code">${language.short}</span>
          <span class="language-menu-label">${language.label}</span>
          <span class="language-menu-check">${language.code === locale ? '✓' : ''}</span>
        `;
        option.addEventListener('click', () => {
          select.value = language.code;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          root.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
          render();
        });
        menu.appendChild(option);
      });
    };

    const close = () => {
      root.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', () => {
      const willOpen = !root.classList.contains('open');
      root.classList.toggle('open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });

    const onDocumentClick = (event: MouseEvent) => {
      if (!root.contains(event.target as Node)) close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    const onLanguage = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if (next && select.value !== next) select.value = next;
      render();
    };

    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('tastepassport:language', onLanguage);
    render();

    return () => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('tastepassport:language', onLanguage);
      root.remove();
      nativePicker.classList.remove('language-picker-native');
    };
  }, []);

  return null;
}
