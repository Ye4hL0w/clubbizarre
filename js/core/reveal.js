/* ============================================================
   REVEALS AU SCROLL — un seul vocabulaire pour tout le site

   Automatique :
   - .section-title          lettres qui montent de leurs masques + filet
   - .fade-in-section        (hors hero) ses blocs montent en fondu,
                             échelonnés, sauf si la section déclare
                             ses propres data-reveal
   Explicite (attribut data-reveal) :
   - "up"       bloc qui monte en fondu
   - "stagger"  enfants directs qui montent en fondu, échelonnés
   - "words"    texte révélé mot par mot au fil du scroll (scrub)

   Remplace l'ancien fondu IntersectionObserver de script.js quand
   GSAP est là (classe html.has-reveal) ; sinon l'ancien reste actif.
   ============================================================ */

import { MOTION } from './config.js';
import { prefersReducedMotion } from './utils.js';
import { splitChars, splitWords } from './split.js';
import { pageEntered } from './transitions.js';

const done = new WeakSet(); // éléments déjà pris en charge
let ready = false;

export function initReveals() {
    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger) return;
    // On attend l'ouverture du rideau : sinon les reveals visibles d'emblée
    // se joueraient cachés derrière lui.
    pageEntered.then(() => {
        document.documentElement.classList.add('has-reveal');
        ready = true;
        revealIn(document);
    });
}

/**
 * Applique les reveals au contenu de `root`. Peut être rappelé après
 * une injection de contenu (ex. pages artistes) : chaque élément n'est
 * traité qu'une fois. Sans effet tant que la page n'est pas entrée.
 */
export function revealIn(root = document) {
    const { gsap } = window;
    if (!ready || !gsap) return;
    const pick = (selector) => [...root.querySelectorAll(selector)].filter((el) => {
        if (done.has(el)) return false;
        done.add(el);
        return true;
    });

    if (prefersReducedMotion()) {
        // Tout est visible d'emblée, filets des titres compris.
        pick('.section-title').forEach((t) => t.classList.add('is-revealed'));
        return;
    }

    const R = MOTION.reveal;

    pick('.section-title').forEach((el) => revealTitle(el, gsap, R));
    pick('[data-reveal="up"]').forEach((el) => revealUp([el], el, gsap, R));
    pick('[data-reveal="stagger"]').forEach((el) => revealUp([...el.children], el, gsap, R));
    pick('[data-reveal="words"]').forEach((el) => revealWords(el, gsap, R));

    // Sections sans reveal explicite : leurs blocs montent, échelonnés.
    pick('.fade-in-section').forEach((section) => {
        if (section.id === 'hero' || section.querySelector('[data-reveal]')) return;
        const box = section.classList.contains('container')
            ? section
            : section.querySelector(':scope > .container') || section;
        const blocks = [...box.children].filter((c) => !c.classList.contains('section-title'));
        if (blocks.length) revealUp(blocks, box, gsap, R);
    });
}

/** Titre : lettres qui montent depuis leurs masques, du centre vers les bords, puis le filet. */
function revealTitle(el, gsap, R) {
    const chars = splitChars(el);
    gsap.set(chars, { yPercent: 115 });
    gsap.to(chars, {
        yPercent: 0,
        duration: R.duration,
        ease: R.ease,
        stagger: { each: R.charStagger, from: 'center' },
        scrollTrigger: {
            trigger: el,
            start: R.start,
            once: true,
            onEnter: () => el.classList.add('is-revealed'),
        },
    });
}

/** Blocs qui montent en fondu, échelonnés. */
export function revealUp(targets, trigger, gsap, R = MOTION.reveal) {
    if (!targets.length) return;
    gsap.from(targets, {
        autoAlpha: 0,
        y: R.distance,
        duration: R.duration,
        ease: R.ease,
        stagger: R.stagger,
        clearProps: 'transform,opacity,visibility',
        scrollTrigger: { trigger, start: R.start, once: true },
    });
}

/** Texte révélé mot par mot : chaque mot s'allume au fil du scroll. */
function revealWords(el, gsap, R) {
    const words = splitWords(el);
    gsap.fromTo(words,
        { opacity: R.wordDim },
        {
            opacity: 1,
            ease: 'none',
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 40%', scrub: true },
        });
}
