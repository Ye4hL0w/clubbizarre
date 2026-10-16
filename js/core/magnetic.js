/* ============================================================
   MAGNÉTISME — les éléments principaux suivent légèrement le curseur.

   Cible par défaut : liens de nav, logo, boutons, icônes sociales.
   Ajouter data-magnetic (ou data-magnetic="0.5" pour la force)
   sur n'importe quel autre élément.

   Utilise la propriété CSS `translate`, indépendante de `transform` :
   les effets :hover existants (translateY, scale…) restent intacts.
   ============================================================ */

import { MOTION } from './config.js';
import { hasFinePointer, prefersReducedMotion, lerp, frameFactor } from './utils.js';

const SELECTOR = '[data-magnetic], .nav-links a, .nav-logo, .btn, .socials a, .skip-btn, .buy-btn';

const items = new Map(); // élément → état
let running = false;
let last = 0;

export function initMagnetic() {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    refreshMagnetic();
}

/** À rappeler après une injection de contenu (ex. cartes d'événements). */
export function refreshMagnetic(root = document) {
    if (!hasFinePointer() || prefersReducedMotion()) return;
    root.querySelectorAll(SELECTOR).forEach(register);
}

function register(el) {
    if (items.has(el)) return;
    const attr = parseFloat(el.getAttribute('data-magnetic'));
    const state = {
        strength: Number.isFinite(attr) ? attr : MOTION.magnetic.strength,
        x: 0, y: 0, tx: 0, ty: 0,
    };
    items.set(el, state);

    el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        // Mesure sans le décalage en cours, pour éviter les oscillations.
        const r = el.getBoundingClientRect();
        const cx = r.left - state.x + r.width / 2;
        const cy = r.top - state.y + r.height / 2;
        state.tx = (e.clientX - cx) * state.strength;
        state.ty = (e.clientY - cy) * state.strength;
        start();
    });

    el.addEventListener('pointerleave', () => {
        state.tx = 0;
        state.ty = 0;
        start();
    });
}

function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
}

function loop(now) {
    const k = frameFactor(MOTION.magnetic.lerp, now - last);
    last = now;
    let moving = false;
    items.forEach((s, el) => {
        s.x = lerp(s.x, s.tx, k);
        s.y = lerp(s.y, s.ty, k);
        if (Math.abs(s.x - s.tx) < 0.05 && Math.abs(s.y - s.ty) < 0.05) {
            s.x = s.tx;
            s.y = s.ty;
        } else {
            moving = true;
        }
        el.style.translate = s.x || s.y ? `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px` : '';
    });
    // La boucle s'arrête d'elle-même quand tout est au repos.
    if (moving) requestAnimationFrame(loop);
    else running = false;
}
