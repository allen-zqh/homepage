const LANGUAGE_CONFIG = {
    en: {
        documentLanguage: 'en',
        contentFile: 'home',
        title: 'Qiuhan Zhao | Tongji University',
        siteName: 'Qiuhan Zhao',
        description: 'Qiuhan Zhao is an Assistant Professor at Tongji University researching innovation, intellectual property, NLP, and economic geography.',
        navigationLabel: 'Primary navigation',
        languageLabel: 'Language',
        loadingText: 'Loading profile…',
        errorText: 'The page could not be loaded. Please refresh and try again.',
        homeLabel: 'Qiuhan Zhao — home',
        navigation: {
            news: 'News',
            education: 'Education',
            publications: 'Publications',
            employment: 'Employment',
            service: 'Service',
        },
    },
    zh: {
        documentLanguage: 'zh-CN',
        contentFile: 'home-zh',
        title: '赵秋涵｜同济大学',
        siteName: '赵秋涵',
        description: '赵秋涵，同济大学助理教授，研究方向包括创新、知识产权、自然语言处理与经济地理。',
        navigationLabel: '主导航',
        languageLabel: '语言',
        loadingText: '正在加载个人主页…',
        errorText: '页面加载失败，请刷新后重试。',
        homeLabel: '赵秋涵—返回首页',
        navigation: {
            news: '近期更新',
            education: '教育经历',
            publications: '学术成果',
            employment: '工作经历',
            service: '学术服务',
        },
    },
};

const LANGUAGE_STORAGE_KEY = 'homepage-language';
let latestLanguageRequest = 0;

function isSupportedLanguage(language) {
    return Object.prototype.hasOwnProperty.call(LANGUAGE_CONFIG, language);
}

function resolveLanguage(search, savedLanguage) {
    const urlLanguage = new URLSearchParams(search).get('lang');
    if (isSupportedLanguage(urlLanguage)) return urlLanguage;
    if (isSupportedLanguage(savedLanguage)) return savedLanguage;
    return 'en';
}

function contentFileForLanguage(language) {
    return LANGUAGE_CONFIG[isSupportedLanguage(language) ? language : 'en'].contentFile;
}

function metadataForLanguage(language) {
    return LANGUAGE_CONFIG[isSupportedLanguage(language) ? language : 'en'];
}

function readSavedLanguage() {
    try {
        return window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch (_) {
        return null;
    }
}

function saveLanguage(language) {
    try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (_) {
        // The language still works when storage is unavailable.
    }
}

function updateUrl(language) {
    const url = new URL(window.location.href);
    if (language === 'zh') {
        url.searchParams.set('lang', 'zh');
    } else {
        url.searchParams.delete('lang');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function applyLanguageToShell(language) {
    const metadata = metadataForLanguage(language);
    document.documentElement.lang = metadata.documentLanguage;
    document.title = metadata.title;

    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = metadata.description;

    const navigation = document.querySelector('.navbar');
    if (navigation) navigation.setAttribute('aria-label', metadata.navigationLabel);

    const siteMark = document.querySelector('.site-mark');
    if (siteMark) siteMark.setAttribute('aria-label', metadata.homeLabel);

    const siteName = document.querySelector('.site-name');
    if (siteName) siteName.textContent = metadata.siteName;

    document.querySelectorAll('[data-nav]').forEach(link => {
        link.textContent = metadata.navigation[link.dataset.nav];
    });

    const switcher = document.querySelector('.language-switch');
    if (switcher) switcher.setAttribute('aria-label', metadata.languageLabel);

    document.querySelectorAll('[data-language]').forEach(button => {
        const active = button.dataset.language === language;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
    });
}

async function loadLanguage(language, options = {}) {
    const requestId = ++latestLanguageRequest;
    const normalizedLanguage = isSupportedLanguage(language) ? language : 'en';
    const metadata = metadataForLanguage(normalizedLanguage);
    const content = document.getElementById('content-main');

    applyLanguageToShell(normalizedLanguage);
    content.setAttribute('aria-busy', 'true');
    content.innerHTML = `<div class="loading-state" role="status">${metadata.loadingText}</div>`;

    try {
        const response = await fetch(`html/${contentFileForLanguage(normalizedLanguage)}.html`);
        if (!response.ok) throw new Error(`Unable to load ${normalizedLanguage}`);
        const html = await response.text();
        if (requestId !== latestLanguageRequest) return;

        content.innerHTML = html;
        content.setAttribute('aria-busy', 'false');

        if (options.scrollToAnchor !== false && window.location.hash) {
            requestAnimationFrame(() => {
                document.querySelector(window.location.hash)?.scrollIntoView();
            });
        }
    } catch (_) {
        if (requestId !== latestLanguageRequest) return;

        content.setAttribute('aria-busy', 'false');
        content.innerHTML = `<p class="loading-state">${metadata.errorText}</p>`;
    }
}

function switchLanguage(language) {
    if (!isSupportedLanguage(language)) return;
    saveLanguage(language);
    updateUrl(language);
    return loadLanguage(language);
}

function initializeLanguage() {
    const language = resolveLanguage(window.location.search, readSavedLanguage());

    document.querySelectorAll('[data-language]').forEach(button => {
        button.addEventListener('click', () => switchLanguage(button.dataset.language));
    });

    return loadLanguage(language);
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initializeLanguage);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        resolveLanguage,
        contentFileForLanguage,
        metadataForLanguage,
        initializeLanguage,
        loadLanguage,
    };
}
