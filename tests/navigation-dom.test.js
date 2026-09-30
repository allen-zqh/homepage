const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const {
    initializeLanguage,
    loadLanguage,
} = require('../js/navigation.js');

const navigationSource = fs.readFileSync(
    path.join(__dirname, '../js/navigation.js'),
    'utf8',
);

test('the deferred browser script registers its own DOM-ready initializer', () => {
    let domReadyHandler = null;

    vm.runInNewContext(navigationSource, {
        URL,
        URLSearchParams,
        document: {
            addEventListener(eventName, handler) {
                if (eventName === 'DOMContentLoaded') domReadyHandler = handler;
            },
        },
    });

    assert.equal(typeof domReadyHandler, 'function');
});

test('index does not call the initializer before the deferred script executes', () => {
    const index = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    const inlineScripts = [...index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
        .map(match => match[1]);

    assert.equal(inlineScripts.some(script => script.includes('initializeLanguage')), false);
});

class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
    }

    contains(name) {
        return this.values.has(name);
    }
}

class FakeElement {
    constructor(dataset = {}) {
        this.dataset = dataset;
        this.attributes = {};
        this.classList = new FakeClassList();
        this.listeners = {};
        this.textContent = '';
        this.innerHTML = '';
        this.content = '';
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    addEventListener(type, listener) {
        this.listeners[type] = listener;
    }

    click() {
        return this.listeners.click();
    }
}

function installBrowser(url, savedLanguage = null) {
    const navigation = new FakeElement();
    const siteMark = new FakeElement();
    const siteName = new FakeElement();
    const switcher = new FakeElement();
    const description = new FakeElement();
    const content = new FakeElement();
    const links = ['news', 'education', 'publications', 'employment', 'service']
        .map(key => new FakeElement({ nav: key }));
    const buttons = [new FakeElement({ language: 'en' }), new FakeElement({ language: 'zh' })];
    const storage = new Map();
    if (savedLanguage) storage.set('homepage-language', savedLanguage);

    global.window = {
        location: new URL(url),
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
        },
        history: {
            replaceState(_state, _title, nextUrl) {
                global.window.location = new URL(nextUrl, global.window.location.href);
            },
        },
    };

    global.document = {
        documentElement: { lang: '' },
        title: '',
        getElementById: id => id === 'content-main' ? content : null,
        querySelector(selector) {
            const elements = {
                'meta[name="description"]': description,
                '.navbar': navigation,
                '.site-mark': siteMark,
                '.site-name': siteName,
                '.language-switch': switcher,
            };
            return elements[selector] ?? null;
        },
        querySelectorAll(selector) {
            if (selector === '[data-nav]') return links;
            if (selector === '[data-language]') return buttons;
            return [];
        },
    };

    global.requestAnimationFrame = callback => callback();

    return { content, links, buttons, storage, siteName };
}

test('initialization applies URL language to content, navigation, and active state', async () => {
    const page = installBrowser('https://example.com/?lang=zh#news', 'en');
    global.fetch = async url => ({ ok: true, text: async () => url.includes('home-zh') ? '中文内容' : 'English' });

    await initializeLanguage();

    assert.equal(document.documentElement.lang, 'zh-CN');
    assert.equal(page.siteName.textContent, '赵秋涵');
    assert.equal(page.links[0].textContent, '近期更新');
    assert.equal(page.buttons[1].attributes['aria-pressed'], 'true');
    assert.equal(page.buttons[1].classList.contains('is-active'), true);
    assert.equal(page.content.innerHTML, '中文内容');
});

test('clicking a language saves it and preserves the current hash', async () => {
    const page = installBrowser('https://example.com/#working-papers');
    global.fetch = async url => ({ ok: true, text: async () => url.includes('home-zh') ? '中文内容' : 'English' });
    await initializeLanguage();

    await page.buttons[1].click();

    assert.equal(page.storage.get('homepage-language'), 'zh');
    assert.equal(window.location.search, '?lang=zh');
    assert.equal(window.location.hash, '#working-papers');
    assert.equal(page.content.innerHTML, '中文内容');
});

test('a slower stale request cannot overwrite the latest language', async () => {
    const page = installBrowser('https://example.com/');
    const pending = {};
    global.fetch = url => new Promise(resolve => {
        pending[url] = resolve;
    });

    const chineseRequest = loadLanguage('zh');
    const englishRequest = loadLanguage('en');

    pending['html/home.html']({ ok: true, text: async () => 'English latest' });
    await englishRequest;
    pending['html/home-zh.html']({ ok: true, text: async () => '中文 stale' });
    await chineseRequest;

    assert.equal(document.documentElement.lang, 'en');
    assert.equal(page.content.innerHTML, 'English latest');
});
