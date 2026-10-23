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
        this.tagName = 'DIV';
        this.id = '';
        this.parentElement = null;
        this.open = false;
        this.scrollCount = 0;
        this.textContent = '';
        this.innerHTML = '';
        this.content = '';
    }

    set innerHTML(value) {
        this.html = value;
        this.onContentChange?.(value);
    }

    get innerHTML() {
        return this.html;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    getAttribute(name) {
        return this.attributes[name] ?? null;
    }

    addEventListener(type, listener) {
        (this.listeners[type] ??= []).push(listener);
    }

    dispatch(type, event = {}) {
        let result;
        for (const listener of this.listeners[type] ?? []) result = listener(event);
        return result;
    }

    click() {
        return this.dispatch('click');
    }

    closest(selector) {
        if (selector === 'details[data-publication-disclosure]' && this.tagName === 'DETAILS' && 'publicationDisclosure' in this.dataset) return this;
        if (selector === 'a[href]' && this.tagName === 'A' && this.getAttribute('href')) return this;
        return this.parentElement?.closest(selector) ?? null;
    }

    scrollIntoView() {
        this.scrollCount += 1;
        this.onScroll?.();
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
    const elementsById = new Map([['content-main', content]]);
    if (savedLanguage) storage.set('homepage-language', savedLanguage);

    global.window = Object.assign(new FakeElement(), {
        location: new URL(url),
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
        },
        history: {
            replaceState(_state, _title, nextUrl) {
                global.window.location = new URL(nextUrl, global.window.location.href);
            },
            pushState(_state, _title, nextUrl) {
                global.window.location = new URL(nextUrl, global.window.location.href);
            },
        },
    });

    global.document = Object.assign(new FakeElement(), {
        documentElement: { lang: '' },
        title: '',
        getElementById: id => elementsById.get(id) ?? null,
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
            if (selector === 'details[data-publication-disclosure]') {
                return [...elementsById.values()].filter(element => element.tagName === 'DETAILS' && 'publicationDisclosure' in element.dataset);
            }
            return [];
        },
    });

    global.requestAnimationFrame = callback => callback();

    return { content, links, buttons, storage, siteName, description, elementsById };
}

const publicationGroupIds = [
    'journal-2026', 'journal-2025', 'earlier-journals',
    'working-papers', 'conference-papers',
];

function assertOpenGroups(page, openIds) {
    for (const id of publicationGroupIds) {
        assert.equal(page.get(id).open, openIds.includes(id), `${id} disclosure state`);
    }
}

function installPublicationBrowser(url = 'https://example.com/') {
    const page = installBrowser(url);
    page.content.onContentChange = html => {
        page.elementsById.clear();
        page.elementsById.set('content-main', page.content);
        if (!html.startsWith('publication-profile-')) return;

        const journalNavigation = new FakeElement();
        journalNavigation.id = 'journal-navigation';
        journalNavigation.tagName = 'DETAILS';
        page.elementsById.set(journalNavigation.id, journalNavigation);
        const navigationSummary = new FakeElement();
        navigationSummary.tagName = 'SUMMARY';
        navigationSummary.parentElement = journalNavigation;
        page.elementsById.set('journal-navigation-summary', navigationSummary);
        const journalHeading = new FakeElement();
        journalHeading.id = 'journal-papers';
        journalHeading.tagName = 'H3';
        page.elementsById.set(journalHeading.id, journalHeading);
        for (const id of publicationGroupIds) {
            const disclosure = new FakeElement({ publicationDisclosure: '' });
            disclosure.id = id;
            disclosure.tagName = 'DETAILS';
            disclosure.open = id === 'journal-2026';
            page.elementsById.set(id, disclosure);
        }
        for (const id of ['journal-2024', 'journal-2023', 'journal-2021', 'paper:with.special-id']) {
            const heading = new FakeElement();
            heading.id = id;
            heading.parentElement = page.elementsById.get('earlier-journals');
            page.elementsById.set(id, heading);
        }
    };
    global.fetch = async url => ({
        ok: true,
        text: async () => `publication-profile-${url.includes('home-zh') ? 'zh' : 'en'}`,
    });
    page.get = id => page.elementsById.get(id);
    page.toggle = (id, open) => {
        page.get(id).open = open;
        page.get(id).dispatch('toggle');
    };
    page.navigate = hash => {
        window.location.hash = hash;
        window.dispatch('hashchange');
    };
    page.clickAnchor = (hash, options = {}) => {
        const link = new FakeElement();
        link.tagName = 'A';
        if (hash.startsWith('#journal-') || hash === '#earlier-journals') {
            link.parentElement = page.get('journal-navigation');
        }
        link.setAttribute('href', hash);
        const text = new FakeElement();
        text.parentElement = link;
        const event = {
            target: text,
            button: 0,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            ...options,
        };
        document.dispatch('click', event);
        return event;
    };
    return page;
}

test('sidebar summary clicks and native sidebar toggles leave right disclosures and scroll unchanged', async () => {
    const page = installPublicationBrowser('https://example.com/#publications');
    await initializeLanguage();
    assert.equal(page.get('journal-navigation').open, false);
    page.toggle('journal-2026', false);
    page.toggle('working-papers', true);
    const originalUrl = window.location.href;
    for (const open of [true, false]) {
        const event = {
            target: page.get('journal-navigation-summary'), button: 0, defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
        };
        document.dispatch('click', event);
        assert.equal(event.defaultPrevented, false);
        // The browser's native summary action changes only this unmarked details.
        page.toggle('journal-navigation', open);
        assertOpenGroups(page, ['working-papers']);
        assert.equal(window.location.href, originalUrl);
        publicationGroupIds.forEach(id => assert.equal(page.get(id).scrollCount, 0));
    }
});

test('year links reveal right targets without managing sidebar openness', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    page.toggle('journal-navigation', true);
    page.clickAnchor('#journal-2025');
    assertOpenGroups(page, ['journal-2026', 'journal-2025']);
    assert.equal(page.get('journal-2025').scrollCount, 1);
    assert.equal(page.get('journal-navigation').open, true);
    page.toggle('journal-navigation', false);
    page.navigate('#journal-2024');
    assertOpenGroups(page, ['journal-2026', 'journal-2025', 'earlier-journals']);
    assert.equal(page.get('journal-navigation').open, false);
});

test('publication print and language state management exclude the independent sidebar details', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    window.dispatch('beforeprint');
    assertOpenGroups(page, publicationGroupIds);
    assert.equal(page.get('journal-navigation').open, false);
    window.dispatch('afterprint');
    assertOpenGroups(page, ['journal-2026']);
    page.toggle('journal-navigation', true);
    window.dispatch('beforeprint');
    window.dispatch('afterprint');
    assert.equal(page.get('journal-navigation').open, true);
    page.toggle('journal-2026', false);
    await page.buttons[1].click();
    assertOpenGroups(page, []);
    assert.equal(page.get('journal-navigation').open, false);
});

test('journal category anchor scrolls without changing any year disclosure state', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    assertOpenGroups(page, ['journal-2026']);
    page.clickAnchor('#journal-papers');
    assertOpenGroups(page, ['journal-2026']);
    page.toggle('journal-2026', false);
    page.toggle('earlier-journals', true);
    page.clickAnchor('#journal-papers');
    assertOpenGroups(page, ['earlier-journals']);
    assert.equal(page.get('journal-papers').scrollCount, 2);
});

test('manually closing default-open 2026 survives languages and detached toggle events', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    const detachedJournal = page.get('journal-2026');
    assertOpenGroups(page, ['journal-2026']);
    page.toggle('journal-2026', false);
    await page.buttons[1].click();
    assertOpenGroups(page, []);
    detachedJournal.open = true;
    detachedJournal.dispatch('toggle');
    assertOpenGroups(page, []);
    await page.buttons[0].click();
    assertOpenGroups(page, []);
});

test('initialization applies URL language to content, navigation, and active state', async () => {
    const page = installBrowser('https://example.com/?lang=zh#news', 'en');
    global.fetch = async url => ({ ok: true, text: async () => url.includes('home-zh') ? '中文内容' : 'English' });

    await initializeLanguage();

    assert.equal(document.documentElement.lang, 'zh-CN');
    assert.equal(page.siteName.textContent, '赵秋涵');
    assert.equal(page.links[0].textContent, '近期动态');
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

test('only 2026 starts open and independent states restore across languages', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();

    assertOpenGroups(page, ['journal-2026']);
    page.toggle('journal-2026', true);
    page.toggle('earlier-journals', true);
    page.toggle('working-papers', true);
    await page.buttons[1].click();
    assertOpenGroups(page, ['journal-2026', 'earlier-journals', 'working-papers']);

    page.toggle('earlier-journals', false);
    page.toggle('journal-2025', true);
    page.toggle('working-papers', false);
    await page.buttons[0].click();
    assertOpenGroups(page, ['journal-2026', 'journal-2025']);
});

test('a deep link reveals its ancestor before scrolling and decoded IDs do not use CSS selectors', async () => {
    const page = installPublicationBrowser('https://example.com/#paper%3Awith.special-id');
    await initializeLanguage();

    assertOpenGroups(page, ['journal-2026', 'earlier-journals']);
    assert.equal(page.get('paper:with.special-id').scrollCount, 1);
    assert.equal(page.get('conference-papers').open, false);
    assert.equal(page.content.attributes['aria-busy'], 'false');
});

test('category clicks reveal their destination even when the hash is unchanged', async () => {
    const page = installPublicationBrowser('https://example.com/#conference-papers');
    await initializeLanguage();
    const conference = page.get('conference-papers');
    assert.equal(conference.open, true);
    page.toggle('conference-papers', false);
    conference.onScroll = () => assert.equal(conference.open, true);

    assert.equal(page.clickAnchor('#conference-papers').defaultPrevented, true);
    assert.equal(conference.open, true);
    assert.equal(conference.scrollCount, 2);

    page.toggle('conference-papers', false);
    page.clickAnchor('#conference-papers', { ctrlKey: true });
    assert.equal(conference.open, false);
});

for (const id of publicationGroupIds) {
    test(`clicking #${id} reveals its target and required ancestors before scrolling`, async () => {
        const page = installPublicationBrowser();
        await initializeLanguage();
        const expected = id === 'journal-2026' ? ['journal-2026'] : ['journal-2026', id];
        page.get(id).onScroll = () => assertOpenGroups(page, expected);

        const event = page.clickAnchor(`#${id}`);

        assert.equal(event.defaultPrevented, true);
        assert.equal(window.location.hash, `#${id}`);
        assert.equal(page.get(id).scrollCount, 1);
        assertOpenGroups(page, expected);
        page.clickAnchor(`#${id}`);
        assertOpenGroups(page, expected);
        assert.equal(page.get(id).scrollCount, 2);
    });
}

test('opening another year leaves previously opened peers unchanged', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    page.clickAnchor('#journal-2026');
    page.clickAnchor('#journal-2025');
    assertOpenGroups(page, ['journal-2026', 'journal-2025']);
});

for (const year of [2024, 2023, 2021]) {
    test(`legacy journal-${year} deep link reveals Earlier Years before scrolling`, async () => {
        const page = installPublicationBrowser(`https://example.com/#journal-${year}`);
        await initializeLanguage();
        assertOpenGroups(page, ['journal-2026', 'earlier-journals']);
        assert.equal(page.get(`journal-${year}`).tagName, 'DIV');
        assert.equal(page.get(`journal-${year}`).scrollCount, 1);
    });
}

test('hash changes reveal groups for history navigation and tolerate malformed hashes', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    page.navigate('#journal-2024');
    assertOpenGroups(page, ['journal-2026', 'earlier-journals']);
    assert.equal(page.get('journal-2024').scrollCount, 1);

    page.navigate('#conference-papers');
    assert.equal(page.get('conference-papers').open, true);
    assert.equal(page.get('conference-papers').scrollCount, 1);
    assert.doesNotThrow(() => page.navigate('#%E0%A4%A'));
});

test('language switching preserves an explicitly closed group even at its current hash', async () => {
    const page = installPublicationBrowser('https://example.com/#journal-2024');
    await initializeLanguage();
    page.toggle('earlier-journals', false);
    await page.buttons[1].click();

    assertOpenGroups(page, ['journal-2026']);
    assert.equal(page.get('earlier-journals').scrollCount, 1);
    assert.equal(page.get('journal-2024').scrollCount, 0);
    page.clickAnchor('#journal-2024');
    assertOpenGroups(page, ['journal-2026', 'earlier-journals']);
});

test('rapid language switching preserves state and ignores stale page events and responses', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    const detachedConference = page.get('conference-papers');
    // Native toggle events may still be queued when the language button is clicked.
    detachedConference.open = true;
    const pending = {};
    global.fetch = url => new Promise(resolve => { pending[url] = resolve; });
    const chinese = page.buttons[1].click();
    const english = page.buttons[0].click();

    pending['html/home.html']({ ok: true, text: async () => 'publication-profile-en' });
    await english;
    detachedConference.open = false;
    detachedConference.dispatch('toggle');
    pending['html/home-zh.html']({ ok: true, text: async () => 'publication-profile-zh' });
    await chinese;

    assert.equal(document.documentElement.lang, 'en');
    assertOpenGroups(page, ['journal-2026', 'conference-papers']);
});

test('print expands all groups temporarily without changing saved language-switch state', async () => {
    const page = installPublicationBrowser();
    await initializeLanguage();
    page.toggle('journal-2026', true);
    page.toggle('earlier-journals', true);
    page.toggle('working-papers', true);
    window.dispatch('beforeprint');
    window.dispatch('beforeprint');
    assertOpenGroups(page, publicationGroupIds);
    publicationGroupIds.forEach(id => page.get(id).dispatch('toggle'));
    await page.buttons[1].click();
    assertOpenGroups(page, publicationGroupIds);

    window.dispatch('afterprint');
    assertOpenGroups(page, ['journal-2026', 'earlier-journals', 'working-papers']);
    publicationGroupIds.forEach(id => page.get(id).dispatch('toggle'));
    await page.buttons[0].click();
    assertOpenGroups(page, ['journal-2026', 'earlier-journals', 'working-papers']);
});

test('a stale animation callback cannot reopen or scroll the next language page', async () => {
    const page = installPublicationBrowser('https://example.com/#conference-papers');
    const frames = [];
    global.requestAnimationFrame = callback => frames.push(callback);
    await initializeLanguage();
    await page.buttons[1].click();
    frames[0]();
    assert.equal(page.get('conference-papers').scrollCount, 0);
    assert.equal(page.get('conference-papers').open, true);
    frames[1]();
    assert.equal(page.get('conference-papers').scrollCount, 1);
});
