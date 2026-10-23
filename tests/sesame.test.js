const test = require('node:test');
const assert = require('node:assert/strict');

const { nextAction, advancePosition, frameIndex, initializeSesame } = require('../js/sesame.js');

class Element {
    constructor(width = 0) {
        this.clientWidth = width;
        this.dataset = {};
        this.style = {
            properties: {},
            setProperty(name, value) { this.properties[name] = value; },
            getPropertyValue(name) { return this.properties[name] ?? ''; },
        };
        this.attributes = {};
        this.listeners = {};
        this.disabled = false;
        this.textContent = '';
    }

    addEventListener(name, listener) { (this.listeners[name] ??= []).push(listener); }
    dispatch(name) { for (const listener of this.listeners[name] ?? []) listener(); }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector(selector) { return selector === '.sesame-sprite' ? this.sprite : null; }
}

function fixture(options = {}) {
    const stage = new Element(options.width ?? 208);
    const cat = new Element(options.catWidth ?? 56);
    const sprite = new Element();
    const html = { lang: options.lang ?? 'en' };
    cat.sprite = sprite;
    stage.dataset.sesameImage = 'assets/sesame/sprites.png';
    const document = {
        documentElement: html,
        hidden: false,
        querySelector(selector) {
            return ({ '[data-sesame-stage]': stage })[selector] ?? null;
        },
        addEventListener(name, listener) { (this.listeners[name] ??= []).push(listener); },
        listeners: {},
        dispatch(name) { for (const listener of this.listeners[name] ?? []) listener(); },
    };
    stage.querySelector = selector => selector === '[data-sesame-cat]' ? cat : null;
    const pending = new Map();
    let nextId = 0;
    let observer;
    let resizeObserver;
    let mediaListener;
    const media = { matches: false, addEventListener(_name, fn) { mediaListener = fn; } };
    class Image {
        set src(value) { this.source = value; if (options.imageFails) this.onerror?.(); else this.onload?.(); }
    }
    const window = {
        requestAnimationFrame(fn) { const id = ++nextId; pending.set(id, fn); return id; },
        cancelAnimationFrame(id) { pending.delete(id); },
        matchMedia() { return media; },
        MutationObserver: class { constructor(fn) { observer = fn; } observe() {} },
        ResizeObserver: class { constructor(fn) { resizeObserver = fn; } observe() {} },
        Image,
    };
    return {
        stage, cat, sprite, html, document, window, pending, media,
        frame(time) { const [id, fn] = pending.entries().next().value ?? []; if (id) { pending.delete(id); fn(time); } },
        language(value) { html.lang = value; observer?.(); },
        resize(width) { stage.clientWidth = width; resizeObserver?.(); },
        reduce(value) { media.matches = value; mediaListener?.(); },
    };
}

test('cat action cycles through idle, run, wave, jump and wraps', () => {
    assert.equal(nextAction('idle'), 'run');
    assert.equal(nextAction('run'), 'wave');
    assert.equal(nextAction('wave'), 'jump');
    assert.equal(nextAction('jump'), 'idle');
});

test('movement stays in stage and reverses at both ends', () => {
    assert.deepEqual(advancePosition(0, 1, 1, 100), { x: 22, facing: 1 });
    assert.deepEqual(advancePosition(95, 1, 1, 100), { x: 83, facing: -1 });
    assert.deepEqual(advancePosition(4, -1, 1, 100), { x: 18, facing: 1 });
    assert.deepEqual(advancePosition(50, 1, 1, 0), { x: 0, facing: 1 });
});

test('sprite frames use four columns and four action rows', () => {
    assert.equal(frameIndex('idle', 0), 0);
    assert.equal(frameIndex('run', 420), 3);
    assert.equal(frameIndex('wave', 440), 2);
    assert.equal(frameIndex('jump', 540), 3);
});

test('controller cycles action and bounds movement using actual widths', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    assert.equal(f.cat.dataset.action, 'idle');
    assert.equal(f.cat.style.getPropertyValue('--sesame-x'), '0px');
    f.cat.dispatch('click');
    assert.equal(f.cat.dataset.action, 'run');
    f.frame(0);
    for (let time = 100; time <= 1000; time += 100) f.frame(time);
    assert.ok(Math.abs(Number.parseFloat(f.cat.style.getPropertyValue('--sesame-x')) - 22) < 0.001);
    f.resize(60);
    assert.equal(f.cat.style.getPropertyValue('--sesame-x'), '4px');
});

test('reduced motion and hidden tab cancel frames and resume without drift', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    f.cat.dispatch('click');
    f.frame(0);
    f.reduce(true);
    assert.equal(f.pending.size, 0);
    assert.equal(f.stage.dataset.paused, 'true');
    f.reduce(false);
    f.frame(200000);
    assert.equal(f.cat.style.getPropertyValue('--sesame-x'), '0px');
    f.document.hidden = true;
    f.document.dispatch('visibilitychange');
    assert.equal(f.pending.size, 0);
    f.document.hidden = false;
    f.document.dispatch('visibilitychange');
    f.frame(400000);
    assert.equal(f.cat.style.getPropertyValue('--sesame-x'), '0px');
});

test('controller initializes without a pause button', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    assert.equal(f.cat.dataset.action, 'idle');
    assert.equal(f.pending.size, 1);
});

test('mouse click plays the selected action and run resumes travel after pointer leaves', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    f.cat.dispatch('pointerenter');
    f.cat.dispatch('pointerdown');
    f.cat.dispatch('focus');
    f.cat.dispatch('click');
    f.frame(0);
    f.frame(100);
    f.frame(200);
    assert.equal(f.cat.dataset.action, 'run');
    assert.deepEqual(f.sprite.style.backgroundPosition.split(' ').map(Number.parseFloat).map(Math.round), [33, 33]);
    assert.equal(f.cat.style.getPropertyValue('--sesame-x'), '0px');
    f.cat.dispatch('pointerleave');
    assert.equal(f.stage.dataset.paused, 'false');
    f.frame(300);
    assert.ok(Number.parseFloat(f.cat.style.getPropertyValue('--sesame-x')) > 0);
});

test('keyboard focus holds travel while action frames keep playing', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    f.cat.dispatch('focus');
    f.cat.dispatch('click');
    f.frame(0);
    f.frame(100);
    f.frame(200);
    assert.equal(f.cat.style.getPropertyValue('--sesame-x'), '0px');
    assert.deepEqual(f.sprite.style.backgroundPosition.split(' ').map(Number.parseFloat).map(Math.round), [33, 33]);
    assert.equal(f.stage.dataset.paused, 'false');
    f.cat.dispatch('blur');
    f.frame(300);
    assert.ok(Number.parseFloat(f.cat.style.getPropertyValue('--sesame-x')) > 0);
});

test('a pointer press that did not focus the cat does not misclassify later keyboard focus', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    f.cat.dispatch('pointerdown');
    f.cat.dispatch('pointerup');
    f.cat.dispatch('focus');
    f.cat.dispatch('click');
    f.frame(0);
    f.frame(100);
    assert.equal(f.cat.style.getPropertyValue('--sesame-x'), '0px');
});

test('language labels update without resetting current action', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    assert.equal(f.cat.attributes.title, 'Sesame');
    f.cat.dispatch('click');
    const english = f.cat.attributes['aria-label'];
    f.language('zh-CN');
    assert.equal(f.cat.dataset.action, 'run');
    assert.notEqual(f.cat.attributes['aria-label'], english);
    assert.match(f.cat.attributes['aria-label'], /芝麻/);
    assert.equal(f.cat.attributes.title, '芝麻');
    f.cat.dispatch('click');
    assert.equal(f.cat.attributes.title, '芝麻');
});

test('initializing twice does not duplicate handlers or frame loops', () => {
    const f = fixture();
    initializeSesame(f.document, f.window);
    initializeSesame(f.document, f.window);
    f.cat.dispatch('click');
    assert.equal(f.cat.dataset.action, 'run');
    assert.equal(f.pending.size, 1);
});

test('failed image disables cat with localized accessible fallback', () => {
    const f = fixture({ imageFails: true, lang: 'zh-CN' });
    initializeSesame(f.document, f.window);
    assert.equal(f.cat.disabled, true);
    assert.equal(f.stage.dataset.unavailable, 'true');
    assert.match(f.cat.attributes['aria-label'], /^芝麻.*暂不可用$/);
    assert.equal(f.cat.attributes.title, '芝麻');
});
