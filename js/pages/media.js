/* ============================================================
   PAGE MEDIA — galerie masonry (contenu : js/data/media.js)

   - Les vignettes se dévoilent au scroll par un rideau (clip-path).
   - Clic : lightbox (photos et vidéos), partagée avec les artistes.
   - Vidéos : lecture muette au survol sur ordinateur ; sur tactile,
     lecture quand la vidéo est bien visible à l'écran (pas de survol).
   - Les fichiers ne sont chargés qu'à l'approche de l'écran.
   ============================================================ */

import { MEDIA } from '../data/media.js';
import { createLightbox } from '../core/lightbox.js';
import { pageEntered } from '../core/transitions.js';
import { splitRoll } from '../core/roll.js';
import { hasFinePointer, prefersReducedMotion } from '../core/utils.js';

const ROOT = new URL('../../', import.meta.url);
const grid = document.getElementById('media-grid');
const reduced = prefersReducedMotion();

const follow = document.querySelector('.social-link-wrapper .btn');
splitRoll(follow?.querySelector('.btn__label'), follow);

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (path) => (path ? new URL(path, ROOT).href : '');

if (grid) {
    const items = MEDIA.map((m, i) => ({
        ...m,
        type: m.type === 'video' ? 'video' : 'image',
        url: url(m.src),
        posterUrl: url(m.poster),
        alt: m.caption || `Club Bizarre, media ${i + 1}`,
    }));

    grid.innerHTML = items.map(tile).join('');
    const tiles = [...grid.querySelectorAll('.media-item')];

    lazyLoad(tiles);
    videos(tiles);
    createLightbox(items.map((m, i) => ({
        thumb: tiles[i], src: m.url, w: m.width, h: m.height, alt: m.alt, type: m.type, poster: m.posterUrl,
    })));
    pageEntered.then(() => reveal(tiles));
}

function tile(m, i) {
    const ratio = m.width && m.height ? `${m.width} / ${m.height}` : '1 / 1';
    const size = m.width && m.height ? `width="${m.width}" height="${m.height}"` : '';
    const media = m.type === 'video'
        ? `<video data-src="${m.url}" ${m.posterUrl ? `poster="${m.posterUrl}"` : ''} ${size}
               muted loop playsinline preload="none" aria-hidden="true"></video>
           <span class="media-item__badge" aria-hidden="true">
               <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
           </span>`
        : `<img data-src="${m.url}" alt="" ${size} loading="lazy" decoding="async">`;

    return `
        <button class="media-item" type="button" style="aspect-ratio: ${ratio}"
            data-cursor="${m.type === 'video' ? 'PLAY' : 'VIEW'}" aria-label="Enlarge: ${esc(m.alt)}">
            ${media}
            ${m.caption ? `<span class="media-item__caption">${esc(m.caption)}</span>` : ''}
        </button>`;
}

/** Les fichiers ne partent qu'à 600 px de l'écran. */
function lazyLoad(tiles) {
    const load = (el) => {
        const media = el.querySelector('[data-src]');
        if (!media) return;
        const done = () => el.classList.add('is-loaded');
        media.addEventListener(media.tagName === 'VIDEO' ? 'loadeddata' : 'load', done, { once: true });
        media.src = media.dataset.src;
        media.removeAttribute('data-src');
        if (media.tagName === 'VIDEO') {
            media.preload = 'metadata';
            if (media.poster) done(); // l'affiche suffit à montrer la vignette
        }
    };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        load(e.target);
        io.unobserve(e.target);
    }), { rootMargin: '600px 0px' });
    tiles.forEach((t) => io.observe(t));
}

/** Vidéos : survol sur ordinateur, visibilité à l'écran sur tactile. */
function videos(tiles) {
    if (reduced) return; // animations réduites : rien ne démarre tout seul (lecture via la lightbox)
    const withVideo = tiles.filter((t) => t.querySelector('video'));
    if (!withVideo.length) return;

    const play = (v) => v.play().catch(() => {});
    if (hasFinePointer()) {
        withVideo.forEach((t) => {
            const v = t.querySelector('video');
            t.addEventListener('pointerenter', () => play(v));
            t.addEventListener('pointerleave', () => v.pause());
            t.addEventListener('focus', () => play(v));
            t.addEventListener('blur', () => v.pause());
        });
    } else {
        const io = new IntersectionObserver((entries) => entries.forEach((e) => {
            const v = e.target.querySelector('video');
            if (e.intersectionRatio > 0.6) play(v);
            else v.pause();
        }), { threshold: [0, 0.6, 1] });
        withVideo.forEach((t) => io.observe(t));
    }
}

/** Rideau qui se lève sur chaque vignette, par petits groupes, au scroll. */
function reveal(tiles) {
    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger || reduced) return;
    gsap.set(tiles, { clipPath: 'inset(100% 0% 0% 0%)' });
    ScrollTrigger.batch(tiles, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.2,
            ease: 'expo.inOut',
            stagger: 0.08,
            clearProps: 'clipPath',
        }),
    });
}
