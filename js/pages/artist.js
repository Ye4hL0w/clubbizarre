/* ============================================================
   PAGE ARTISTE — template commun aux pages pages/<slug>.html

   La page déclare son artiste :  <body data-artist="jerem_wav">
   Le nom et le rôle sont écrits en dur dans le HTML (référencement,
   affichage sans JS) ; tout le reste est construit ici à partir de :
   - js/data/artists.js        nom, rôle, bio, liens, sets
   - js/data/artist-photos.js  photos (générées par scripts/artist-photos.mjs)

   Sections : hero → portrait + bio → galerie → sets → liens → navigation.
   ============================================================ */

import { ARTISTS, COLLECTIVE } from '../data/artists.js';
import { PHOTOS } from '../data/artist-photos.js';
import { ICONS } from './artist/icons.js';
import { createLightbox } from './artist/lightbox.js';
import { pageEntered } from '../core/transitions.js';
import { introDone } from '../core/intro.js';
import { revealIn } from '../core/reveal.js';
import { mountScene } from '../scenes/loader.js';
import { splitChars } from '../core/split.js';
import { splitRoll } from '../core/roll.js';
import { frameFactor, hasFinePointer, lerp, prefersReducedMotion } from '../core/utils.js';

const PHOTO_BASE = new URL('../../assets/artistes/', import.meta.url);
const { gsap, ScrollTrigger } = window;
const animated = Boolean(gsap && ScrollTrigger) && !prefersReducedMotion();

const root = document.documentElement;
const slug = document.body.dataset.artist;
const index = ARTISTS.findIndex((a) => a.slug === slug);
const artist = ARTISTS[index];
const main = document.querySelector('.artist');

if (!artist || !main) {
    root.classList.remove('hero-pending');
    console.warn(`[CB] Artiste "${slug}" absent de js/data/artists.js`);
} else {
    const photos = (PHOTOS[slug] || []).map((p, i) => ({
        ...p,
        url: new URL(`${slug}/${p.src}`, PHOTO_BASE).href,
        alt: i === 0 ? `Portrait de ${artist.name}` : `${artist.name}, photo ${i}`,
    }));
    const [portrait, ...gallery] = photos;

    fitName();
    main.insertAdjacentHTML('beforeend', [
        introSection(portrait),
        gallerySection(gallery),
        setsSection(),
        linksSection(),
        navSection(),
    ].join(''));

    enhance(gallery);
    Promise.all([introDone, pageEntered]).then(() => {
        // Scène WebGL propre à l'artiste (si elle existe), derrière le nom.
        mountScene(main.querySelector('.artist-hero__scene'), slug);
        revealHero();
        revealIn(main);
        revealPortrait();
    });
}

/* ── Rendu ───────────────────────────────────────────────────── */

function esc(s = '') {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function imgAttrs(photo, { lazy = true } = {}) {
    const size = photo.w && photo.h ? `width="${photo.w}" height="${photo.h}"` : '';
    return `${size} alt="${esc(photo.alt)}" decoding="async" ${lazy ? 'loading="lazy"' : ''}`;
}

function introSection(portrait) {
    const ratio = portrait?.w && portrait?.h ? `${portrait.w} / ${portrait.h}` : '4 / 5';
    const media = portrait
        ? `<img class="artist-portrait__img" src="${portrait.url}" ${imgAttrs(portrait, { lazy: false })}>`
        : `<div class="artist-placeholder"><span>${esc(initials(artist.name))}</span><small>Portrait à venir</small></div>`;

    const bio = artist.bio?.length
        ? artist.bio.map((p) => `<p>${esc(p)}</p>`).join('')
        : '<p class="artist-bio__empty">Biographie à venir.</p>';

    return `
    <section class="artist-intro">
        <div class="container artist-intro__grid">
            <figure class="artist-portrait" style="aspect-ratio: ${ratio}">
                <div class="artist-portrait__inner">${media}</div>
            </figure>
            <div class="artist-bio">
                <p class="artist-label" data-reveal="up">Bio</p>
                <div class="artist-bio__text" data-reveal="up">${bio}</div>
            </div>
        </div>
    </section>`;
}

function gallerySection(gallery) {
    const items = gallery.length
        ? gallery.map((p, i) => `
            <button class="gallery-item" type="button" data-index="${i}" data-cursor="VOIR"
                aria-label="Agrandir : ${esc(p.alt)}" style="aspect-ratio: ${p.w && p.h ? `${p.w} / ${p.h}` : '4 / 5'}">
                <img data-src="${p.url}" ${imgAttrs(p)}>
            </button>`).join('')
        : ['4 / 5', '1 / 1', '3 / 4'].map((r) => `
            <div class="gallery-item gallery-item--placeholder" style="aspect-ratio: ${r}" aria-hidden="true">
                <span>Photos à venir</span>
            </div>`).join('');

    return `
    <section class="artist-section artist-gallery">
        <div class="container">
            <h2 class="section-title">Galerie</h2>
            <div class="gallery-grid" data-reveal="stagger">${items}</div>
        </div>
    </section>`;
}

function setsSection() {
    const sets = artist.sets || [];
    const content = sets.length
        ? sets.map((s) => isSoundCloud(s.url)
            ? `<div class="set-player">
                   <iframe title="${esc(s.title || `Set de ${artist.name}`)}" loading="lazy" allow="autoplay"
                       src="https://w.soundcloud.com/player/?url=${encodeURIComponent(s.url)}&color=%23d4af37&auto_play=false&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false&visual=false"></iframe>
               </div>`
            : `<a class="artist-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" data-cursor="ÉCOUTER">
                   <span class="artist-link__label">${esc(s.title || s.url)}</span>${ICONS.link}
               </a>`).join('')
        : `<div class="sets-empty">
               <p>Sets à venir.</p>
               <a class="artist-link" href="${COLLECTIVE.soundcloud}" target="_blank" rel="noopener noreferrer" data-cursor="ÉCOUTER">
                   <span class="artist-link__label">SoundCloud du collectif</span>${ICONS.link}
               </a>
           </div>`;

    return `
    <section class="artist-section artist-sets">
        <div class="container">
            <h2 class="section-title">Sets &amp; Mixes</h2>
            <div class="sets-list" data-reveal="stagger">${content}</div>
        </div>
    </section>`;
}

function linksSection() {
    if (!artist.links?.length) return '';
    const links = artist.links.map((l) => `
        <a class="artist-link artist-link--big" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" data-cursor="OUVRIR">
            <span class="artist-link__icon">${ICONS[l.icon] || ICONS.link}</span>
            <span class="artist-link__label">${esc(l.label)}</span>
            <span class="artist-link__arrow">${ICONS.link}</span>
        </a>`).join('');

    return `
    <section class="artist-section artist-links">
        <div class="container">
            <h2 class="section-title">Suivre</h2>
            <div class="artist-links__list" data-reveal="stagger">${links}</div>
        </div>
    </section>`;
}

function navSection() {
    const prev = ARTISTS[(index - 1 + ARTISTS.length) % ARTISTS.length];
    const next = ARTISTS[(index + 1) % ARTISTS.length];
    return `
    <nav class="artist-nav" aria-label="Autres artistes">
        <div class="container artist-nav__grid" data-reveal="stagger">
            <a class="artist-nav__link artist-nav__link--prev" href="${prev.slug}.html" data-cursor="PRÉCÉDENT">
                <span class="artist-nav__hint">${ICONS.arrow} Artiste précédent</span>
                <span class="artist-nav__name">${esc(prev.name)}</span>
            </a>
            <a class="artist-nav__back" href="../index.html#team" data-cursor="RETOUR">Toute l'équipe</a>
            <a class="artist-nav__link artist-nav__link--next" href="${next.slug}.html" data-cursor="SUIVANT">
                <span class="artist-nav__hint">Artiste suivant ${ICONS.arrow}</span>
                <span class="artist-nav__name">${esc(next.name)}</span>
            </a>
        </div>
    </nav>`;
}

function isSoundCloud(url) {
    return /^https?:\/\/(www\.|m\.)?soundcloud\.com\//.test(url || '');
}
function initials(name) {
    return name.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Comportements ──────────────────────────────────────────── */

function enhance(gallery) {
    lazyGallery();
    if (gallery.length) {
        const thumbs = [...main.querySelectorAll('.gallery-item[data-index]')];
        createLightbox(gallery.map((p, i) => ({ thumb: thumbs[i], src: p.url, w: p.w, h: p.h, alt: p.alt })));
    }
    portraitHover();
    main.querySelectorAll('.artist-link__label, .artist-nav__name').forEach((label) => splitRoll(label, label.closest('a')));
    window.CB?.refreshMagnetic?.(main);
}

/** Galerie : l'image n'est demandée qu'à l'approche de l'écran (600 px avant). */
function lazyGallery() {
    const imgs = main.querySelectorAll('.gallery-item img[data-src]');
    const load = (img) => {
        img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
    };
    if (!('IntersectionObserver' in window)) return imgs.forEach(load);
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        load(e.target);
        io.unobserve(e.target);
    }), { rootMargin: '600px 0px' });
    imgs.forEach((img) => io.observe(img));
}

/**
 * Le nom est très grand : on réduit sa taille si son mot le plus long
 * (étirement horizontal compris) dépasse la largeur disponible.
 * Les noms en plusieurs mots passent à la ligne entre les mots.
 */
function fitName() {
    const name = main.querySelector('.artist-hero__name');
    if (!name) return;
    const words = name.getAttribute('aria-label')?.split(' ') || name.textContent.trim().split(/\s+/);

    const fit = () => {
        name.style.fontSize = '';
        const cs = getComputedStyle(name);
        const box = name.parentElement;
        const pad = parseFloat(getComputedStyle(box).paddingLeft) + parseFloat(getComputedStyle(box).paddingRight);
        const available = box.clientWidth - pad;
        const stretch = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform).a || 1;

        // Mesure de chaque mot avec exactement la typo du titre.
        const probe = document.createElement('span');
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};text-transform:${cs.textTransform}`;
        document.body.appendChild(probe);
        const widest = Math.max(...words.map((w) => { probe.textContent = w; return probe.getBoundingClientRect().width; }));
        probe.remove();

        const needed = widest * stretch;
        if (needed > available) name.style.fontSize = `${parseFloat(cs.fontSize) * (available / needed) * 0.97}px`;
    };

    fit();
    if (document.fonts) document.fonts.ready.then(fit);
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); });
}

/** Nom en lettres masquées, puis rôle et filet. */
function revealHero() {
    const name = main.querySelector('.artist-hero__name');
    const others = main.querySelectorAll('.artist-hero__role, .artist-hero__line');
    if (!animated || !name) {
        root.classList.remove('hero-pending');
        return;
    }
    const chars = splitChars(name);
    name.classList.add('is-split');
    gsap.set(chars, { yPercent: 115 });
    gsap.set(others, { autoAlpha: 0 });
    root.classList.remove('hero-pending');

    gsap.timeline({ defaults: { ease: 'expo.out' } })
        .to(chars, { yPercent: 0, duration: 1.4, stagger: { each: 0.045, from: 'start' } }, 0)
        .fromTo(others, { y: 20 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.5);

    // Le nom s'éloigne doucement quand on descend.
    gsap.to('.artist-hero__inner', {
        yPercent: -18, autoAlpha: 0.2, ease: 'none',
        scrollTrigger: { trigger: '.artist-hero', start: 'top top', end: 'bottom top', scrub: true },
    });
}

/** Portrait : rideau qui se lève (clip-path) + léger dézoom, dès qu'il est à l'écran et chargé. */
function revealPortrait() {
    const fig = main.querySelector('.artist-portrait');
    const inner = fig?.querySelector('.artist-portrait__inner');
    if (!fig || !animated) return;

    const img = fig.querySelector('img');
    const ready = !img || img.complete
        ? Promise.resolve()
        : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });

    gsap.set(inner, { clipPath: 'inset(100% 0% 0% 0%)' });
    ready.then(() => {
        gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%', once: true } })
            .to(inner, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
            .from(inner.firstElementChild, { scale: 1.3, duration: 2, ease: 'expo.out' }, 0.2);
    });
}

/** Portrait : l'image glisse à l'opposé du curseur, le cadre s'incline à peine. */
function portraitHover() {
    const fig = main.querySelector('.artist-portrait');
    const img = fig?.querySelector('.artist-portrait__img');
    if (!img || !hasFinePointer() || prefersReducedMotion()) return;

    const target = { x: 0, y: 0, s: 1 };
    const cur = { x: 0, y: 0, s: 1 };
    let raf = 0;
    let last = 0;

    const tick = (now) => {
        const k = frameFactor(0.08, now - last);
        last = now;
        cur.x = lerp(cur.x, target.x, k);
        cur.y = lerp(cur.y, target.y, k);
        cur.s = lerp(cur.s, target.s, k);
        img.style.translate = `${cur.x.toFixed(2)}px ${cur.y.toFixed(2)}px`;
        img.style.scale = cur.s.toFixed(4);
        fig.style.rotate = `${(cur.x * -0.12).toFixed(3)}deg`;
        const still = Math.abs(cur.x - target.x) + Math.abs(cur.y - target.y) + Math.abs(cur.s - target.s) < 0.01;
        raf = still ? 0 : requestAnimationFrame(tick);
    };
    const start = () => {
        if (raf) return;
        last = performance.now();
        raf = requestAnimationFrame(tick);
    };

    fig.addEventListener('pointermove', (e) => {
        const r = fig.getBoundingClientRect();
        target.x = -((e.clientX - r.left) / r.width - 0.5) * 24;
        target.y = -((e.clientY - r.top) / r.height - 0.5) * 24;
        target.s = 1.08;
        start();
    });
    fig.addEventListener('pointerleave', () => {
        Object.assign(target, { x: 0, y: 0, s: 1 });
        start();
    });
}
