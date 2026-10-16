/* ============================================================
   ACCUEIL — About, Team, Contact
   (les reveals génériques viennent de js/core/reveal.js)
   ============================================================ */

import { MOTION } from '../../core/config.js';
import { hasFinePointer, prefersReducedMotion } from '../../core/utils.js';

const { gsap, ScrollTrigger } = window;
const animated = Boolean(gsap && ScrollTrigger) && !prefersReducedMotion();

/* ── About : parallaxe discrète + mot-clé géant qui glisse ──── */
export function initAbout(section) {
    if (!section || !animated) return;
    const content = section.querySelector('.about-content');
    const bgWord = section.querySelector('.about-bg-word');
    const scrub = { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true };

    if (content) gsap.fromTo(content, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: scrub });
    if (bgWord) gsap.fromTo(bgWord, { xPercent: 12 }, { xPercent: -28, ease: 'none', scrollTrigger: { ...scrub } });
}

/* ── Team : entrée échelonnée des cartes (le carrousel reste celui de script.js) ── */
export function initTeam(section) {
    if (!section || !animated) return;
    const bubbles = section.querySelectorAll('.team-bubble');
    const R = MOTION.reveal;

    // Les cartes ont une transition CSS "all" : on la coupe le temps de l'entrée,
    // puis on rend tout au CSS (survol, atténuation des voisines).
    gsap.set(bubbles, { transition: 'none' });
    gsap.from(bubbles, {
        autoAlpha: 0,
        y: R.distance,
        duration: R.duration,
        ease: R.ease,
        stagger: R.stagger,
        clearProps: 'transition,transform,opacity,visibility',
        scrollTrigger: { trigger: section.querySelector('.team-marquee-container'), start: R.start, once: true },
    });
}

/* ── Contact : l'email roule lettre par lettre au survol ───── */
export function initContact(section) {
    const email = section?.querySelector('.contact-email');
    if (!email || !hasFinePointer() || prefersReducedMotion()) return;

    const text = email.textContent.trim();
    email.setAttribute('aria-label', text);
    email.textContent = '';
    [...text].forEach((letter, i) => {
        const mask = document.createElement('span');
        mask.className = 'email-char';
        mask.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.className = 'email-char__inner';
        inner.dataset.char = letter;
        inner.textContent = letter;
        inner.style.setProperty('--i', i);
        mask.appendChild(inner);
        email.appendChild(mask);
    });
    email.classList.add('is-split');
}
