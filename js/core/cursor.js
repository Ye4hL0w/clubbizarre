/* ============================================================
   CURSEUR — point + halo à inertie (desktop uniquement)

   - Le halo traîne derrière le point et s'étire selon la vitesse.
   - Au survol d'un lien / bouton, il grossit.
   - data-cursor="VOIR" sur un élément affiche un label dans le halo.
   Masqué sur tactile et si l'utilisateur réduit les animations.
   ============================================================ */

import { MOTION } from './config.js';
import { hasFinePointer, prefersReducedMotion, lerp, frameFactor } from './utils.js';

const INTERACTIVE = 'a, button, [role="button"], [data-cursor], .hamburger, label, summary';

export function initCursor() {
    if (!hasFinePointer() || prefersReducedMotion()) return;

    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = `
        <div class="cursor__halo">
            <div class="cursor__ring"></div>
            <span class="cursor__label"></span>
        </div>
        <div class="cursor__dot"></div>`;
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-cursor');

    const halo = cursor.querySelector('.cursor__halo');
    const ring = cursor.querySelector('.cursor__ring');
    const dot = cursor.querySelector('.cursor__dot');
    const label = cursor.querySelector('.cursor__label');

    const { dotLerp, haloLerp, stretch, maxStretch } = MOTION.cursor;
    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    const dotPos = { ...mouse };
    const haloPos = { ...mouse };
    let current = null;
    let visible = false;

    /* ── Entrées ─────────────────────────────────────────────── */
    window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        if (!visible) {
            // Première apparition : pas de glissement depuis le centre.
            Object.assign(dotPos, mouse);
            Object.assign(haloPos, mouse);
            visible = true;
            cursor.classList.add('is-visible');
        }
    }, { passive: true });

    document.documentElement.addEventListener('mouseleave', () => {
        visible = false;
        cursor.classList.remove('is-visible');
    });

    window.addEventListener('pointerdown', () => cursor.classList.add('is-pressed'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-pressed'));

    document.addEventListener('pointerover', (e) => {
        const target = e.target.closest(INTERACTIVE);
        if (target !== current) setTarget(target);
    });

    document.addEventListener('pointerout', (e) => {
        if (!current) return;
        // On ne quitte la cible que si le pointeur sort vraiment de l'élément.
        if (e.relatedTarget && current.contains(e.relatedTarget)) return;
        if (e.target.closest(INTERACTIVE) === current) setTarget(null);
    });

    // Une page qui change (rideau) ne doit pas laisser le curseur "survolé".
    window.addEventListener('pagehide', () => setTarget(null));

    function setTarget(el) {
        current = el;
        const text = el ? (el.getAttribute('data-cursor') || '').trim() : '';
        cursor.classList.toggle('is-hover', Boolean(el));
        cursor.classList.toggle('has-label', Boolean(text));
        if (text && label.textContent !== text) {
            label.textContent = text;
            // Centrage au pixel près pour un texte net (voir cursor.css).
            label.style.setProperty('--label-x', `${-Math.round(label.offsetWidth / 2)}px`);
            label.style.setProperty('--label-y', `${-Math.round(label.offsetHeight / 2)}px`);
        }
    }

    // Positions calées sur les pixels physiques de l'écran :
    // une position fractionnaire rend le texte et l'anneau flous.
    const snap = (v) => Math.round(v * devicePixelRatio) / devicePixelRatio;

    const written = new Map();
    const setTransform = (el, value) => {
        if (written.get(el) === value) return;
        written.set(el, value);
        el.style.transform = value;
    };

    /* ── Boucle ──────────────────────────────────────────────── */
    let last = performance.now();

    const tick = (now) => {
        const dt = now - last;
        last = now;
        const kDot = frameFactor(dotLerp, dt);
        const kHalo = frameFactor(haloLerp, dt);

        dotPos.x = lerp(dotPos.x, mouse.x, kDot);
        dotPos.y = lerp(dotPos.y, mouse.y, kDot);

        const prevX = haloPos.x;
        const prevY = haloPos.y;
        haloPos.x = lerp(haloPos.x, mouse.x, kHalo);
        haloPos.y = lerp(haloPos.y, mouse.y, kHalo);

        // Déformation : étirement dans l'axe du mouvement (désactivé au survol).
        // Vitesse ramenée à "pixels par image à 60 Hz".
        const vx = haloPos.x - prevX;
        const vy = haloPos.y - prevY;
        const speed = Math.hypot(vx, vy) / Math.max(dt / (1000 / 60), 1);
        const s = current ? 0 : Math.min(speed * stretch, maxStretch);
        const angle = s ? Math.atan2(vy, vx) * (180 / Math.PI) : 0;

        // Écritures DOM seulement si quelque chose a bougé : curseur immobile = zéro travail
        // de style/rendu (le navigateur ne recompose plus la pastille à chaque image).
        setTransform(dot, `translate3d(${snap(dotPos.x)}px, ${snap(dotPos.y)}px, 0)`);
        setTransform(halo, `translate3d(${snap(haloPos.x)}px, ${snap(haloPos.y)}px, 0)`);
        setTransform(ring, s > 0.002
            ? `rotate(${angle.toFixed(1)}deg) scale(${(1 + s).toFixed(3)}, ${(1 - s * 0.6).toFixed(3)})`
            : 'none');

        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
