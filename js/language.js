(() => {
  const fallback = {};
  let dict = { ...fallback };
  let loadPromise = null;
  let applyToken = 0;
  let currentLanguage = null;

  const SELECTOR = '[data-language-select], #languageSelect, #footerLanguageSelect';
  const supported = ['id', 'en', 'zh'];

  const normalize = (lang) => supported.includes(lang) ? lang : 'id';

  const getLanguage = () => normalize(currentLanguage || localStorage.getItem('praba-language') || 'id');

  const valueFor = (key, lang = getLanguage()) => {
    const item = dict[key];
    return item ? (item[lang] ?? item.id ?? '') : '';
  };

  const syncSelectors = (lang) => {
    document.querySelectorAll(SELECTOR).forEach((select) => {
      if (select.value !== lang) select.value = lang;
      select.setAttribute('data-active-language', lang);
    });
  };

  const setText = (el, lang) => {
    const key = el.dataset.i18n;
    if (key) {
      const value = valueFor(key, lang);
      if (value !== '') el.textContent = value;
    }

    const placeholderKey = el.dataset.i18nPlaceholder;
    if (placeholderKey) {
      const value = valueFor(placeholderKey, lang);
      if (value !== '') el.placeholder = value;
    }
  };

  function load() {
    if (loadPromise) return loadPromise;

    loadPromise = fetch('data/translations.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Translation HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        dict = { ...dict, ...(j.translations || {}) };

        Object.entries(j).forEach(([key, value]) => {
          if (
            key !== 'translations' &&
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            ('id' in value || 'en' in value || 'zh' in value)
          ) {
            dict[key] = value;
          }
        });

        return dict;
      })
      .catch((e) => {
        console.warn('Translation data unavailable', e);
        return dict;
      });

    return loadPromise;
  }

  async function apply(lang) {
    const requestedLang = normalize(lang);
    const token = ++applyToken;

    currentLanguage = requestedLang;
    localStorage.setItem('praba-language', requestedLang);
    document.documentElement.lang = requestedLang === 'zh' ? 'zh-CN' : requestedLang;
    document.documentElement.dataset.siteLanguage = requestedLang;

    // Update every visible selector immediately.
    syncSelectors(requestedLang);

    await load();

    // Ignore stale async applications.
    if (token !== applyToken) return;

    document.querySelectorAll('[data-i18n]').forEach((el) => setText(el, requestedLang));

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const value = valueFor(el.dataset.i18nHtml, requestedLang);
      if (value !== '') el.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const value = valueFor(el.dataset.i18nTitle, requestedLang);
      if (value !== '') {
        el.setAttribute('title', value);
        el.setAttribute('aria-label', value);
      }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const value = valueFor(el.dataset.i18nAria, requestedLang);
      if (value !== '') el.setAttribute('aria-label', value);
    });

    document.querySelectorAll('[data-i18n-content]').forEach((el) => {
      const value = valueFor(el.dataset.i18nContent, requestedLang);
      if (value !== '') el.setAttribute('content', value);
    });

    const page = location.pathname.split('/').pop().replace('.html', '') || 'index';
    const title = valueFor(`meta.${page}.title`, requestedLang);
    if (title) document.title = title;

    // Rendered components can finish after language changes, so sync again.
    syncSelectors(requestedLang);

    window.dispatchEvent(new CustomEvent('praba-language-changed', {
      detail: { lang: requestedLang }
    }));
  }

  function closeMobileMenu() {
    const nav = document.querySelector('.nav-menu');
    const menuButton = document.querySelector('.menu-toggle');
    if (nav?.classList.contains('open')) {
      nav.classList.remove('open');
      menuButton?.setAttribute('aria-expanded', 'false');
      menuButton?.setAttribute('aria-label', 'Buka menu');
    }
  }

  function bindLanguageControls() {
    // Event delegation keeps both navbar and footer selectors synchronized,
    // even if another script replaces or re-renders nearby DOM content.
    document.addEventListener('change', (event) => {
      const select = event.target.closest?.(SELECTOR);
      if (!select) return;
      apply(select.value);
      closeMobileMenu();
    });

    // Keep newly inserted selectors synchronized automatically.
    const observer = new MutationObserver(() => syncSelectors(getLanguage()));
    observer.observe(document.body, { childList: true, subtree: true });

    syncSelectors(getLanguage());
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindLanguageControls();
    apply(getLanguage());
  });

  window.PrabaI18n = {
    getLanguage,
    apply,
    t: (key) => valueFor(key, getLanguage())
  };
})();
