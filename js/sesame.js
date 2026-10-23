/* A small, self-contained controller for the navbar's Sesame sprite. */
const SESAME_ACTIONS = ['idle', 'run', 'wave', 'jump'];
const SESAME_FRAME_MS = { idle: 450, run: 140, wave: 220, jump: 180 };
const SESAME_LABELS = {
    en: {
        cat: 'Sesame',
        actions: { idle: 'idle', run: 'run', wave: 'wave', jump: 'jump' },
        next: 'Click for the next action',
        fallback: 'animation unavailable',
    },
    zh: {
        cat: '芝麻',
        actions: { idle: '休息', run: '跑步', wave: '挥手', jump: '跳跃' },
        next: '点击切换动作',
        fallback: '动画暂不可用',
    },
};

function nextAction(action) {
    const index = SESAME_ACTIONS.indexOf(action);
    return SESAME_ACTIONS[(index + 1) % SESAME_ACTIONS.length];
}

function advancePosition(x, facing, seconds, maxX, speed = 22) {
    const limit = Math.max(0, maxX);
    if (!limit) return { x: 0, facing: facing < 0 ? -1 : 1 };
    let position = Math.min(limit, Math.max(0, x));
    let direction = facing < 0 ? -1 : 1;
    let remaining = Math.max(0, seconds) * speed;
    while (remaining > 0) {
        const room = direction > 0 ? limit - position : position;
        if (remaining <= room) {
            position += direction * remaining;
            break;
        }
        position = direction > 0 ? limit : 0;
        remaining -= room;
        direction *= -1;
    }
    return { x: position, facing: direction };
}

function frameIndex(action, elapsedMs) {
    const duration = SESAME_FRAME_MS[action] ?? SESAME_FRAME_MS.idle;
    return Math.floor(Math.max(0, elapsedMs) / duration) % 4;
}

const initializedDocuments = new WeakSet();

function initializeSesame(doc, win) {
    if (!doc || !win || initializedDocuments.has(doc)) return;
    const stage = doc.querySelector('[data-sesame-stage]');
    const cat = stage?.querySelector('[data-sesame-cat]');
    const sprite = cat?.querySelector('.sesame-sprite');
    if (!stage || !cat || !sprite) return;
    initializedDocuments.add(doc);

    const reducedMotion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
    let action = 'idle';
    let x = 0;
    let facing = 1;
    let elapsed = 0;
    let previousTime = null;
    let frameRequest = null;
    let pointerOver = false;
    let pointerActivatedFocus = false;
    let keyboardFocused = false;
    let unavailable = false;

    function maxX() {
        return Math.max(0, stage.clientWidth - cat.clientWidth);
    }

    function isPaused() {
        return !!doc.hidden || !!reducedMotion?.matches || unavailable;
    }

    function travelPaused() {
        return pointerOver || keyboardFocused;
    }

    function labels() {
        return SESAME_LABELS[doc.documentElement?.lang?.toLowerCase().startsWith('zh') ? 'zh' : 'en'];
    }

    function updateLabels() {
        const words = labels();
        cat.setAttribute('aria-label', unavailable
            ? `${words.cat}: ${words.fallback}`
            : `${words.cat}: ${words.actions[action]}. ${words.next}`);
        cat.setAttribute('title', words.cat);
        if (unavailable) {
            stage.setAttribute('aria-label', `${words.cat}: ${words.fallback}`);
            cat.textContent = `${words.cat}: ${words.fallback}`;
        }
    }

    function render() {
        cat.dataset.action = action;
        cat.style.setProperty('--sesame-x', `${x}px`);
        cat.style.setProperty('--sesame-facing', String(facing));
        const row = SESAME_ACTIONS.indexOf(action);
        const column = frameIndex(action, elapsed);
        sprite.style.backgroundPosition = `${column * 100 / 3}% ${row * 100 / 3}%`;
        stage.dataset.paused = String(isPaused());
    }

    function tick(time) {
        frameRequest = null;
        if (isPaused()) return;
        const delta = previousTime === null ? 0 : Math.max(0, Math.min(100, time - previousTime));
        previousTime = time;
        elapsed += delta;
        if (action === 'run' && !travelPaused()) {
            ({ x, facing } = advancePosition(x, facing, delta / 1000, maxX()));
        }
        render();
        schedule();
    }

    function schedule() {
        if (frameRequest === null && !isPaused() && win.requestAnimationFrame) {
            frameRequest = win.requestAnimationFrame(tick);
        }
    }

    function synchronize() {
        if (isPaused()) {
            if (frameRequest !== null) win.cancelAnimationFrame?.(frameRequest);
            frameRequest = null;
            previousTime = null;
        }
        render();
        schedule();
    }

    cat.addEventListener('click', () => {
        if (unavailable) return;
        action = nextAction(action);
        elapsed = 0;
        previousTime = null;
        updateLabels();
        synchronize();
    });
    cat.addEventListener('pointerenter', () => { pointerOver = true; synchronize(); });
    cat.addEventListener('pointerleave', () => { pointerOver = false; synchronize(); });
    cat.addEventListener('pointerdown', () => { pointerActivatedFocus = true; keyboardFocused = false; synchronize(); });
    cat.addEventListener('pointerup', () => { pointerActivatedFocus = false; });
    cat.addEventListener('pointercancel', () => { pointerActivatedFocus = false; });
    cat.addEventListener('focus', () => {
        keyboardFocused = cat.matches?.(':focus-visible') ?? !pointerActivatedFocus;
        synchronize();
    });
    cat.addEventListener('keydown', () => { keyboardFocused = true; synchronize(); });
    cat.addEventListener('blur', () => {
        pointerActivatedFocus = false;
        keyboardFocused = false;
        synchronize();
    });
    doc.addEventListener('visibilitychange', synchronize);
    if (reducedMotion?.addEventListener) reducedMotion.addEventListener('change', synchronize);
    else reducedMotion?.addListener?.(synchronize);
    if (win.MutationObserver && doc.documentElement) {
        new win.MutationObserver(updateLabels).observe(doc.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    if (win.ResizeObserver) {
        new win.ResizeObserver(() => {
            x = Math.min(x, maxX());
            render();
        }).observe(stage);
    } else {
        win.addEventListener?.('resize', () => {
            x = Math.min(x, maxX());
            render();
        });
    }
    updateLabels();
    render();
    schedule();

    if (stage.dataset.sesameImage && win.Image) {
        const image = new win.Image();
        image.onerror = () => {
            unavailable = true;
            stage.dataset.unavailable = 'true';
            cat.disabled = true;
            updateLabels();
            synchronize();
        };
        image.src = stage.dataset.sesameImage;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { nextAction, advancePosition, frameIndex, initializeSesame };
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initializeSesame(document, window), { once: true });
    } else {
        initializeSesame(document, window);
    }
}
