/* ============================================================
   MAIN — point d'entrée chargé sur toutes les pages.
   Les libs (GSAP, ScrollTrigger, Lenis) arrivent en globals via
   des <script defer> placés juste avant ce module.
   ============================================================ */

import { prefersReducedMotion } from './utils.js';
import { initSmoothScroll, scrollTo, getLenis } from './smooth-scroll.js';
import { initIntro } from './intro.js';
import { initTransitions } from './transitions.js';
import { initCursor } from './cursor.js';
import { initMagnetic, refreshMagnetic } from './magnetic.js';
import { initReveals } from './reveal.js';

const { gsap, ScrollTrigger } = window;

if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
}

// Pas de smooth scroll si l'utilisateur réduit les animations.
if (!prefersReducedMotion()) {
    initSmoothScroll({ gsap, ScrollTrigger });
}

// Chaque module est isolé : si l'un échoue, les autres et le site tournent.
const safely = (name, fn) => {
    try { fn(); } catch (err) { console.error(`[CB] ${name} :`, err); }
};

safely('transitions', initTransitions);
safely('intro', initIntro);
safely('cursor', initCursor);
safely('magnetic', initMagnetic);
safely('reveal', initReveals);

// API minimale exposée aux scripts non-module (js/legacy/script.js, events.js).
window.CB = { gsap, ScrollTrigger, scrollTo, getLenis, refreshMagnetic };
