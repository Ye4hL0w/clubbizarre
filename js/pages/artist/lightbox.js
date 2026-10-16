/* ============================================================
   LIGHTBOX — agrandissement des photos de galerie

   - L'image part de la vignette cliquée et s'agrandit jusqu'au
     centre (technique FLIP), puis y retourne à la fermeture.
   - Clavier : ← → pour naviguer, Échap pour fermer.
   - Tactile : glisser à gauche / droite.
   - <dialog> natif : focus piégé et Échap gérés par le navigateur.
   ============================================================ */

import { ICONS } from './icons.js';
import { prefersReducedMotion } from '../../core/utils.js';

export function createLightbox(items) {
    // items : [{ thumb: HTMLElement, src, w, h, alt }]
    const { gsap } = window;
    const animated = Boolean(gsap) && !prefersReducedMotion();

    const dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Photo agrandie');
    dialog.setAttribute('data-lenis-prevent', '');
    dialog.innerHTML = `
        <div class="lightbox__backdrop"></div>
        <figure class="lightbox__figure">
            <img class="lightbox__img" alt="">
        </figure>
        <p class="lightbox__counter" aria-live="polite"></p>
        <button class="lightbox__btn lightbox__close" type="button" aria-label="Fermer" data-cursor="FERMER">${ICONS.close}</button>
        <button class="lightbox__btn lightbox__prev" type="button" aria-label="Photo précédente">${ICONS.arrow}</button>
        <button class="lightbox__btn lightbox__next" type="button" aria-label="Photo suivante">${ICONS.arrow}</button>`;
    document.body.appendChild(dialog);

    const img = dialog.querySelector('.lightbox__img');
    const backdrop = dialog.querySelector('.lightbox__backdrop');
    const counter = dialog.querySelector('.lightbox__counter');
    const controls = dialog.querySelectorAll('.lightbox__btn, .lightbox__counter');
    let index = 0;
    let busy = false;

    if (items.length < 2) {
        dialog.querySelector('.lightbox__prev').hidden = true;
        dialog.querySelector('.lightbox__next').hidden = true;
    }

    const show = (i) => {
        index = (i + items.length) % items.length;
        const item = items[index];
        img.src = item.src;
        img.alt = item.alt;
        if (item.w && item.h) {
            img.width = item.w;
            img.height = item.h;
        }
        counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    };

    /** Transformation qui superpose l'image agrandie à la vignette. */
    const flipFrom = (thumb) => {
        const a = thumb.getBoundingClientRect();
        const b = img.getBoundingClientRect();
        return {
            x: a.left + a.width / 2 - (b.left + b.width / 2),
            y: a.top + a.height / 2 - (b.top + b.height / 2),
            scale: Math.min(a.width / b.width, a.height / b.height),
        };
    };

    const open = (i) => {
        if (busy) return;
        show(i);
        dialog.showModal();
        window.CB?.getLenis?.()?.stop();
        if (!animated) return;

        busy = true;
        const from = flipFrom(items[index].thumb);
        gsap.timeline({ onComplete: () => { busy = false; } })
            .fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
            .fromTo(img, { ...from }, { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'expo.out' }, 0)
            .fromTo(controls, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, stagger: 0.05 }, 0.3);
    };

    const close = () => {
        if (busy || !dialog.open) return;
        const finish = () => {
            dialog.close();
            gsap?.set([img, backdrop, controls], { clearProps: 'all' });
            busy = false;
            if (!document.body.classList.contains('no-scroll')) window.CB?.getLenis?.()?.start();
        };
        if (!animated) return finish();

        busy = true;
        const to = flipFrom(items[index].thumb);
        gsap.timeline({ onComplete: finish })
            .to(controls, { autoAlpha: 0, duration: 0.25 }, 0)
            .to(img, { ...to, duration: 0.7, ease: 'expo.inOut' }, 0)
            .to(backdrop, { opacity: 0, duration: 0.6, ease: 'power2.in' }, 0.1);
    };

    const step = (dir) => {
        if (busy || items.length < 2) return;
        if (!animated) return show(index + dir);
        busy = true;
        gsap.timeline({ onComplete: () => { busy = false; } })
            .to(img, { x: -60 * dir, autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
            .add(() => show(index + dir))
            .fromTo(img, { x: 60 * dir }, { x: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' });
    };

    /* ── Interactions ──────────────────────────────────────── */
    items.forEach((item, i) => item.thumb.addEventListener('click', () => open(i)));
    dialog.querySelector('.lightbox__close').addEventListener('click', close);
    dialog.querySelector('.lightbox__prev').addEventListener('click', () => step(-1));
    dialog.querySelector('.lightbox__next').addEventListener('click', () => step(1));
    backdrop.addEventListener('click', close);

    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Échap animé
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
    });

    // Glisser sur tactile
    let startX = null;
    dialog.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') startX = e.clientX; });
    dialog.addEventListener('pointerup', (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    });

    return { open, close };
}
