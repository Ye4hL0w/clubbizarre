/* ============================================================
   TÉLÉS HOLOGRAPHIQUES — autour de THE TEAM (css/components/tv.css)

   - Les deux télés suivent très légèrement le curseur (desktop).
   - Animations en pause quand les télés sont hors écran.
   ============================================================ */

import { frameFactor, hasFinePointer, lerp, prefersReducedMotion } from '../../core/utils.js';

export function initTvs(root) {
    const tvs = root ? [...root.querySelectorAll('.tv')] : [];
    if (!tvs.length) return;

    // Pause hors écran : aucune animation CSS ne tourne pour rien.
    let visible = false;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            root.classList.toggle('tvs-paused', !visible);
        }, { rootMargin: '100px' }).observe(root);
    }

    if (!hasFinePointer() || prefersReducedMotion()) return;

    // Suivi du curseur : quelques degrés au plus, amortis.
    const target = { x: 0, y: 0 };
    const tilt = { x: 0, y: 0 };
    window.addEventListener('pointermove', (e) => {
        target.x = (e.clientY / innerHeight - 0.5) * -10;
        target.y = (e.clientX / innerWidth - 0.5) * 16;
    }, { passive: true });

    let last = performance.now();
    let written = '';
    const tick = (now) => {
        const k = frameFactor(0.06, now - last);
        last = now;
        if (visible) {
            tilt.x = lerp(tilt.x, target.x, k);
            tilt.y = lerp(tilt.y, target.y, k);
            const value = `${tilt.x.toFixed(2)}|${tilt.y.toFixed(2)}`;
            if (value !== written) {
                written = value;
                tvs.forEach((tv) => {
                    tv.style.setProperty('--tilt-x', `${tilt.x.toFixed(2)}deg`);
                    tv.style.setProperty('--tilt-y', `${tilt.y.toFixed(2)}deg`);
                });
            }
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
