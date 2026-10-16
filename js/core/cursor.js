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
        if (text) label.textContent = text;
    }

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
        const angle = Math.atan2(vy, vx) * (180 / Math.PI);

        dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;
        halo.style.transform = `translate3d(${haloPos.x}px, ${haloPos.y}px, 0)`;
        ring.style.setProperty('--stretch-angle', `${angle}deg`);
        ring.style.setProperty('--stretch-x', 1 + s);
        ring.style.setProperty('--stretch-y', 1 - s * 0.6);

        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
