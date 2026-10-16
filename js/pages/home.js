/* ============================================================
   ACCUEIL — entrée du hero, une fois l'intro terminée.
   ============================================================ */

import { introDone } from '../core/intro.js';
import { pageEntered } from '../core/transitions.js';
import { prefersReducedMotion } from '../core/utils.js';

const root = document.documentElement;
const { gsap } = window;

const reveal = () => {
    const logo = document.querySelector('.hero-logo-container');
    const title = document.querySelector('.hero-title');
    const subtitle = document.querySelector('.hero-subtitle');
    const indicator = document.querySelector('.scroll-indicator');

    if (!gsap || prefersReducedMotion()) {
        root.classList.remove('hero-pending');
        return;
    }

    // Les états de départ sont posés avant de lever .hero-pending : pas de flash.
    gsap.set([logo, title, subtitle], { autoAlpha: 0 });
    gsap.set(indicator, { autoAlpha: 0 });
    root.classList.remove('hero-pending');

    gsap.timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(logo,
            { y: 40, scale: 0.92, filter: 'blur(12px)' },
            { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 2 })
        .fromTo(title,
            { y: 30, filter: 'blur(10px)' },
            { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.8 }, 0.25)
        .fromTo(subtitle,
            { y: 16 },
            { autoAlpha: 1, y: 0, duration: 1.6 }, 0.55)
        .to(indicator, { autoAlpha: 1, duration: 1.2, ease: 'power2.out' }, 1.1)
        // Nettoie les styles inline pour rendre la main au CSS (responsive, :hover).
        .add(() => gsap.set([logo, title, subtitle], { clearProps: 'filter,transform' }));
};

// Le hero attend la fin de l'intro ET la fin du rideau d'entrée.
Promise.all([introDone, pageEntered]).then(reveal);
