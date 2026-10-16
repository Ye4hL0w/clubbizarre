/* ============================================================
   MAIN — point d'entrée chargé sur toutes les pages.
   Les libs (GSAP, ScrollTrigger, Lenis) arrivent en globals via
   des <script defer> placés juste avant ce module.
   ============================================================ */

import { prefersReducedMotion } from './utils.js';
import { initSmoothScroll, scrollTo, getLenis } from './smooth-scroll.js';

const { gsap, ScrollTrigger } = window;

if (gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
}

// Pas de smooth scroll si l'utilisateur réduit les animations.
if (!prefersReducedMotion()) {
    initSmoothScroll({ gsap, ScrollTrigger });
}

// API minimale exposée aux scripts non-module (js/legacy/script.js).
window.CB = { gsap, ScrollTrigger, scrollTo, getLenis };
