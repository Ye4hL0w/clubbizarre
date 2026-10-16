/* ============================================================
   LIGHTBOX — agrandissement des photos et vidéos
   (galeries artistes, page Media)

   - L'image part de la vignette cliquée et s'agrandit jusqu'au
     centre (technique FLIP), puis y retourne à la fermeture.
   - Clavier : ← → pour naviguer, Échap pour fermer.
   - Tactile : glisser à gauche / droite.
   - <dialog> natif : focus piégé et Échap gérés par le navigateur.
   ============================================================ */

import { prefersReducedMotion } from './utils.js';

const ICON = {
    arrow: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

export function createLightbox(items) {
    // items : [{ thumb: HTMLElement, src, w, h, alt, type?: 'image' | 'video', poster? }]
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
            <video class="lightbox__img lightbox__video" controls playsinline hidden></video>
        </figure>
        <p class="lightbox__counter" aria-live="polite"></p>
        <button class="lightbox__btn lightbox__close" type="button" aria-label="Fermer" data-cursor="FERMER">${ICON.close}</button>
        <button class="lightbox__btn lightbox__prev" type="button" aria-label="Précédent">${ICON.arrow}</button>
        <button class="lightbox__btn lightbox__next" type="button" aria-label="Suivant">${ICON.arrow}</button>`;
    document.body.appendChild(dialog);

    const photo = dialog.querySelector('img.lightbox__img');
    const video = dialog.querySelector('video.lightbox__video');
    let img = photo; // élément affiché (photo ou vidéo), animé par le FLIP
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
        const isVideo = item.type === 'video';
        video.pause();
        photo.hidden = isVideo;
        video.hidden = !isVideo;
        img = isVideo ? video : photo;
        if (isVideo) {
            video.poster = item.poster || '';
            video.src = item.src;
            video.setAttribute('aria-label', item.alt);
            if (!prefersReducedMotion()) video.play().catch(() => {});
        } else {
            photo.src = item.src;
            photo.alt = item.alt;
        }
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
            video.pause();
            dialog.close();
            gsap?.set([photo, video, backdrop, controls], { clearProps: 'transform,opacity,visibility' });
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
        gsap.to(img, {
            x: -60 * dir, autoAlpha: 0, duration: 0.3, ease: 'power2.in',
            onComplete: () => {
                gsap.set(img, { clearProps: 'transform,opacity,visibility' });
                show(index + dir); // peut passer d'une photo à une vidéo : on anime le nouvel élément
                gsap.fromTo(img, { x: 60 * dir, autoAlpha: 0 }, {
                    x: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out',
                    onComplete: () => { busy = false; },
                });
            },
        });
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
