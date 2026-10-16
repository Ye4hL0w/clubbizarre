/* ============================================================
   BANDEAU GÉANT — "BIZARRE IS THE NEW STANDARD"

   Défile en continu ; la vitesse de scroll l'accélère, et son sens
   suit le sens du scroll (vers le bas → vers la gauche). Les
   changements de sens sont amortis, avec une légère inclinaison
   proportionnelle à la vitesse.
   ============================================================ */

import { MOTION } from '../../core/config.js';
import { frameFactor, lerp, prefersReducedMotion } from '../../core/utils.js';

export function initMarquee(section) {
    const track = section?.querySelector('.marquee-band__track');
    if (!track || prefersReducedMotion()) return;

    const cfg = MOTION.marquee;

    // Contenu dupliqué : quand on a défilé d'une moitié, on revient à 0 sans saut visible.
    track.innerHTML += track.innerHTML;
    let half = track.scrollWidth / 2;
    new ResizeObserver(() => { half = track.scrollWidth / 2; }).observe(track);

    let x = 0;
    let velocity = -cfg.speed;   // px/s, signée
    let direction = -1;          // -1 : vers la gauche
    let skew = 0;
    let lastY = window.scrollY;
    let last = performance.now();
    let visible = false;
    let raf = 0;

    const tick = (now) => {
        const dt = Math.min(now - last, 100);
        last = now;

        // Vitesse de scroll (px/ms), positive vers le bas.
        const scrollV = dt > 0 ? (window.scrollY - lastY) / dt : 0;
        lastY = window.scrollY;
        if (Math.abs(scrollV) > 0.02) direction = scrollV > 0 ? -1 : 1;

        const boost = Math.min(Math.abs(scrollV) * cfg.velocityFactor, cfg.maxBoost);
        const target = direction * (cfg.speed + boost);
        // Montée rapide quand on scrolle, retour en douceur à la croisière.
        velocity = lerp(velocity, target, frameFactor(boost > 0 ? 0.12 : 0.04, dt));

        x += (velocity * dt) / 1000;
        if (half > 0) {
            if (x <= -half) x += half;
            else if (x > 0) x -= half;
        }

        const skewTarget = Math.max(-cfg.maxSkew, Math.min(cfg.maxSkew, (velocity / cfg.maxBoost) * cfg.maxSkew));
        skew = lerp(skew, skewTarget, frameFactor(0.1, dt));

        track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
        raf = requestAnimationFrame(tick);
    };

    // Rendu uniquement quand le bandeau est à l'écran.
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) {
            last = performance.now();
            lastY = window.scrollY;
            raf = requestAnimationFrame(tick);
        }
    }).observe(section);
}
