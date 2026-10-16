/* ============================================================
   INTRO — préloader + vidéo "liquid gold", une fois par session.

   Déroulé :
   1. Compteur 000 → 100 pendant le chargement (images, polices, vidéo).
   2. Le compteur s'efface, la vidéo démarre.
   3. Fin de vidéo (ou PASSER) : fondu lent vers le hero.

   Exporte `introDone`, une promesse résolue quand le hero peut
   apparaître (immédiatement s'il n'y a pas d'intro).
   ============================================================ */

import { MOTION } from './config.js';
import { prefersReducedMotion, session, STORAGE_KEYS, lerp, frameFactor } from './utils.js';

let resolveIntro;
export const introDone = new Promise((resolve) => { resolveIntro = resolve; });

export function initIntro() {
    const overlay = document.getElementById('intro-overlay');
    const video = document.getElementById('intro-video');

    // Pas d'intro sur cette page, déjà vue, ou animations réduites.
    if (!overlay || !video || session.get(STORAGE_KEYS.introSeen) || prefersReducedMotion()) {
        removeOverlay(overlay, video);
        resolveIntro();
        return;
    }

    session.set(STORAGE_KEYS.introSeen, '1');
    video.pause();

    const loader = createLoader(overlay);
    const skipBtn = document.getElementById('skip-intro');
    let finished = false;

    const finish = () => {
        if (finished) return;
        finished = true;
        loader.destroy();
        playOutro(overlay, video);
    };

    skipBtn?.addEventListener('click', finish);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    video.querySelector('source')?.addEventListener('error', finish);

    trackLoading(video, (progress) => loader.setTarget(progress)).then(() => {
        loader.complete().then(() => {
            if (finished) return;
            overlay.classList.add('is-playing');
            const play = video.play();
            // Autoplay bloqué (mode économie d'énergie iOS…) : on passe directement au hero.
            if (play && play.catch) play.catch(finish);
        });
    });
}

/* ── Chargement ─────────────────────────────────────────────── */

/**
 * Suit le chargement des images, des polices et de la vidéo.
 * `onProgress(0..1)` à chaque étape ; résout quand tout est prêt
 * (ou après maxLoaderTime pour ne jamais bloquer).
 */
function trackLoading(video, onProgress) {
    const tasks = [];

    document.querySelectorAll('img').forEach((img) => {
        if (img.complete) return;
        tasks.push(new Promise((res) => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
        }));
    });

    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready);

    tasks.push(new Promise((res) => {
        if (video.readyState >= 4) return res();
        video.addEventListener('canplaythrough', res, { once: true });
        video.addEventListener('error', res, { once: true });
        // iOS ignore preload="auto" : un play/pause muet amorce le téléchargement.
        const prime = video.play();
        if (prime && prime.then) {
            prime.then(() => { video.pause(); video.currentTime = 0; }).catch(() => {});
        }
    }));

    let done = 0;
    const total = tasks.length;
    onProgress(0);
    const all = Promise.all(tasks.map((t) => t.then(() => onProgress(++done / total))));
    const timeout = new Promise((res) => setTimeout(res, MOTION.intro.maxLoaderTime * 1000));
    return Promise.race([all, timeout]).then(() => onProgress(1));
}

/** Compteur 000–100 + filet doré, lissés pour un rendu posé. */
function createLoader(overlay) {
    const el = document.createElement('div');
    el.className = 'intro-loader';
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-label', 'Chargement');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.innerHTML = `
        <span class="intro-loader__count">000</span>
        <span class="intro-loader__bar"><span class="intro-loader__fill"></span></span>`;
    overlay.appendChild(el);

    const count = el.querySelector('.intro-loader__count');
    const fill = el.querySelector('.intro-loader__fill');
    const start = performance.now();
    const minTime = MOTION.intro.minLoaderTime * 1000;
    let target = 0;
    let shown = 0;
    let raf = 0;
    let onFull = null;

    let last = start;

    const tick = (now) => {
        // Lissage indépendant de la cadence d'images (60, 120 Hz ou onglet ralenti).
        const k = frameFactor(MOTION.intro.counterLerp, now - last);
        last = now;
        // Le compteur ne dépasse jamais le temps minimum écoulé : pas de flash à 100.
        const timeCap = Math.min(1, (now - start) / minTime);
        shown = lerp(shown, Math.min(target, timeCap), k);
        if (target >= 1 && timeCap >= 1 && shown > 0.995) shown = 1;

        const pct = Math.round(shown * 100);
        count.textContent = String(pct).padStart(3, '0');
        fill.style.transform = `scaleX(${shown})`;
        el.setAttribute('aria-valuenow', String(pct));

        if (shown === 1 && onFull) {
            onFull();
            onFull = null;
        }
        raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return {
        setTarget(value) { target = Math.max(target, value); },
        complete() {
            return new Promise((resolve) => {
                onFull = () => {
                    el.classList.add('is-done');
                    setTimeout(resolve, 500); // le temps du fondu du compteur
                };
            });
        },
        destroy() {
            cancelAnimationFrame(raf);
            el.classList.add('is-done');
        },
    };
}

/* ── Sortie ─────────────────────────────────────────────────── */

/** Fondu lent de l'intro vers le hero (zoom léger de la vidéo). */
function playOutro(overlay, video) {
    const duration = MOTION.intro.outroDuration;
    overlay.style.setProperty('--intro-outro', `${duration}s`);
    overlay.classList.add('is-leaving');
    document.body.classList.remove('no-scroll');

    // Le hero commence à apparaître pendant le fondu, pas après.
    setTimeout(resolveIntro, duration * 350);
    setTimeout(() => removeOverlay(overlay, video), duration * 1000 + 100);
}

function removeOverlay(overlay, video) {
    document.body.classList.remove('no-scroll');
    if (!overlay) return;
    if (video) {
        video.pause();
        video.removeAttribute('src');
        video.querySelectorAll('source').forEach((s) => s.remove());
        video.load(); // libère le téléchargement en cours
    }
    overlay.remove();
}
