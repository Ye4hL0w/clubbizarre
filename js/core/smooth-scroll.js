/* ============================================================
   SMOOTH SCROLL — Lenis branché sur GSAP ScrollTrigger
   ============================================================ */

import { MOTION } from './config.js';

let lenis = null;

/**
 * Démarre Lenis et le synchronise avec ScrollTrigger.
 * Retourne l'instance, ou null si la lib est absente (CDN bloqué).
 */
export function initSmoothScroll({ gsap, ScrollTrigger }) {
    if (typeof window.Lenis !== 'function') return null;

    const { duration, easing, wheelMultiplier, syncTouch } = MOTION.scroll;
    lenis = new window.Lenis({ duration, easing, wheelMultiplier, syncTouch });

    if (gsap && ScrollTrigger) {
        // ScrollTrigger recalcule ses positions à chaque frame de Lenis…
        lenis.on('scroll', ScrollTrigger.update);
        // …et Lenis est cadencé par le ticker GSAP (une seule boucle rAF).
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    } else {
        // Sans GSAP, Lenis gère sa propre boucle.
        const raf = (time) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
    }

    pauseWhileBodyLocked(lenis);
    return lenis;
}

/**
 * L'intro vidéo verrouille le scroll avec `body.no-scroll`.
 * On met Lenis en pause tant que cette classe est présente.
 */
function pauseWhileBodyLocked(instance) {
    const sync = () => {
        if (document.body.classList.contains('no-scroll')) instance.stop();
        else instance.start();
    };
    sync();
    new MutationObserver(sync).observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
    });
}

/**
 * Défilement vers un élément ou une position.
 * Passe par Lenis s'il tourne, sinon par le scroll natif.
 */
export function scrollTo(target, { offset = MOTION.scroll.anchorOffset } = {}) {
    if (lenis) {
        lenis.scrollTo(target, { offset });
        return;
    }
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    const top = typeof target === 'number' ? target : el && el.getBoundingClientRect().top + window.scrollY + offset;
    if (top != null) window.scrollTo({ top, behavior: 'smooth' });
}

export function getLenis() {
    return lenis;
}
