/* ============================================================
   TRANSITIONS DE PAGES — rideau "liquid gold", sans framework.

   Sortie  : une nappe or puis une nappe noire montent du bas,
             bord incurvé comme un liquide, puis on navigue.
   Entrée  : la page arrive couverte (classe .pt-enter posée par le
             script inline du <head>), les nappes se retirent vers le haut.
   Retour navigateur : vraies navigations, donc l'historique fonctionne ;
             une page restaurée depuis le bfcache est découverte direct.
   ============================================================ */

import { MOTION } from './config.js';
import { prefersReducedMotion, session, STORAGE_KEYS } from './utils.js';
import { scrollTo } from './smooth-scroll.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Formes du rideau (viewBox 0 0 100 100, étirée plein écran).
// Chaque groupe garde la même structure de commandes pour que GSAP les interpole.
const PATHS = {
    // Montée depuis le bas : le centre mène, les bords suivent.
    leave: {
        start: 'M0,100 C30,100 70,100 100,100 L100,100 L0,100 Z',
        mid: 'M0,55 C30,15 70,15 100,55 L100,100 L0,100 Z',
        end: 'M0,0 C30,0 70,0 100,0 L100,100 L0,100 Z',
    },
    // Retrait vers le haut : le bas coule comme une goutte qui se détache.
    enter: {
        start: 'M0,0 L100,0 L100,100 C70,100 30,100 0,100 Z',
        mid: 'M0,0 L100,0 L100,35 C70,80 30,80 0,35 Z',
        end: 'M0,0 L100,0 L100,0 C70,0 30,0 0,0 Z',
    },
};

let resolveEntered;
/** Résolue quand le rideau d'entrée est suffisamment ouvert. */
export const pageEntered = new Promise((resolve) => { resolveEntered = resolve; });

let overlay;
let layers;
let mark;
let isLeaving = false;

export function initTransitions() {
    const { gsap } = window;
    const animated = Boolean(gsap) && !prefersReducedMotion();
    const cameFromLink = document.documentElement.classList.contains('pt-enter');
    session.remove(STORAGE_KEYS.pageTransition);

    if (animated) {
        buildOverlay();
        if (cameFromLink) playEnter(gsap);
        else resolveEntered();
    } else {
        resolveEntered();
    }
    document.documentElement.classList.remove('pt-enter');

    document.addEventListener('click', (e) => onClick(e, animated, gsap));
    prefetchOnIntent();

    // Retour/avance navigateur depuis le bfcache : la page revient telle
    // qu'on l'a quittée (rideau fermé). On la découvre immédiatement.
    window.addEventListener('pageshow', (e) => {
        if (!e.persisted) return;
        isLeaving = false;
        document.documentElement.classList.remove('pt-enter');
        if (overlay && gsap) {
            gsap.killTweensOf([...layers, mark]);
            hideOverlay(gsap);
        }
    });
}

/* ── Interception des liens ─────────────────────────────────── */

function onClick(e, animated, gsap) {
    const link = e.target.closest('a[href]');
    if (!link || !isInternalNavigation(e, link)) return;

    const url = new URL(link.href, location.href);

    // Même page avec ancre (ex. "/" → "/index.html#team") : simple scroll doux.
    if (samePage(url)) {
        if (url.hash.length > 1) {
            const target = document.querySelector(decodeURIComponent(url.hash));
            if (target) {
                e.preventDefault();
                scrollTo(target);
                history.replaceState(null, '', url.hash);
            }
        }
        return;
    }

    e.preventDefault();
    if (isLeaving) return;
    isLeaving = true;
    closeMobileMenu();

    if (!animated) {
        location.href = url.href;
        return;
    }

    session.set(STORAGE_KEYS.pageTransition, '1');
    playLeave(gsap).then(() => { location.href = url.href; });
}

function isInternalNavigation(e, link) {
    if (e.defaultPrevented || e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (link.target && link.target !== '_self') return false;
    if (link.hasAttribute('download') || link.hasAttribute('data-no-transition')) return false;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') && href.length === 1) return false;

    const url = new URL(link.href, location.href);
    return /^https?:$/.test(url.protocol) && url.origin === location.origin;
}

/** "/", "/index.html" et "/pages/" désignent la même page que leur index. */
function normalizePath(pathname) {
    return pathname.replace(/index\.html$/, '').replace(/\.html$/, '');
}

function samePage(url) {
    return normalizePath(url.pathname) === normalizePath(location.pathname) && url.search === location.search;
}

function closeMobileMenu() {
    document.querySelector('.nav-links.active')?.classList.remove('active');
    document.querySelector('.hamburger.active')?.classList.remove('active');
}

/* ── Rideau ─────────────────────────────────────────────────── */

function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'page-transition';
    overlay.setAttribute('aria-hidden', 'true');

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    layers = ['gold', 'dark'].map((name) => {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('class', `page-transition__layer page-transition__layer--${name}`);
        path.setAttribute('d', PATHS.leave.start);
        svg.appendChild(path);
        return path;
    });

    mark = document.createElement('span');
    mark.className = 'page-transition__mark';
    mark.textContent = 'CLUB BIZARRE';

    overlay.append(svg, mark);
    document.body.appendChild(overlay);
}

function playLeave(gsap) {
    const { leaveDuration: d, layerDelay } = MOTION.transition;
    overlay.classList.add('is-active');

    return new Promise((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve });
        layers.forEach((path, i) => {
            const at = i * layerDelay;
            tl.set(path, { attr: { d: PATHS.leave.start } }, 0)
                .to(path, { attr: { d: PATHS.leave.mid }, duration: d * 0.55, ease: 'power3.in' }, at)
                .to(path, { attr: { d: PATHS.leave.end }, duration: d * 0.45, ease: 'power2.out' }, at + d * 0.55);
        });
        tl.fromTo(mark,
            { autoAlpha: 0, y: 12, letterSpacing: '0.6em' },
            { autoAlpha: 1, y: 0, letterSpacing: '0.35em', duration: d * 0.6, ease: 'expo.out' },
            d * 0.6);
    });
}

function playEnter(gsap) {
    const { enterDuration: d, layerDelay } = MOTION.transition;
    overlay.classList.add('is-active');
    gsap.set(layers, { attr: { d: PATHS.enter.start } });
    gsap.set(mark, { autoAlpha: 1, letterSpacing: '0.35em' });

    const tl = gsap.timeline({ onComplete: () => overlay.classList.remove('is-active') });
    tl.to(mark, { autoAlpha: 0, y: -10, duration: d * 0.35, ease: 'power2.in' }, 0);
    // La nappe noire part d'abord et dévoile l'or, qui part ensuite.
    [...layers].reverse().forEach((path, i) => {
        const at = d * 0.15 + i * layerDelay;
        tl.to(path, { attr: { d: PATHS.enter.mid }, duration: d * 0.45, ease: 'power3.in' }, at)
            .to(path, { attr: { d: PATHS.enter.end }, duration: d * 0.45, ease: 'power2.out' }, at + d * 0.45);
    });
    // Le contenu de la page peut commencer à entrer pendant l'ouverture.
    tl.call(resolveEntered, null, d * 0.55);
}

function hideOverlay(gsap) {
    gsap.set(layers, { attr: { d: PATHS.leave.start } });
    gsap.set(mark, { autoAlpha: 0 });
    overlay.classList.remove('is-active');
}

/* ── Préchargement ──────────────────────────────────────────── */

/** Précharge une page interne dès qu'on la survole / touche : navigation plus vive. */
function prefetchOnIntent() {
    const done = new Set();
    const onIntent = (e) => {
        const link = e.target.closest && e.target.closest('a[href]');
        if (!link || link.target === '_blank') return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || samePage(url)) return;
        const key = url.pathname;
        if (done.has(key)) return;
        done.add(key);
        const hint = document.createElement('link');
        hint.rel = 'prefetch';
        hint.href = key;
        document.head.appendChild(hint);
    };
    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('touchstart', onIntent, { passive: true });
}
