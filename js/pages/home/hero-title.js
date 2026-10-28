/* ============================================================
   TITRE DU HERO — découpe lettre par lettre + lumière dorée

   Structure générée (le texte reste lisible par les lecteurs d'écran
   et les moteurs via aria-label) :
     h1.hero-title.is-split
       span.word > span.char-mask > span.char

   Le dégradé blanc → gris d'origine est recomposé lettre par lettre :
   chaque lettre porte le même fond, dimensionné au titre entier et
   décalé de sa propre position. Une lueur dorée (radial-gradient)
   suit la souris par-dessus ce dégradé.
   ============================================================ */

import { MOTION } from '../../core/config.js';
import { splitChars } from '../../core/split.js';
import { frameFactor, hasFinePointer, lerp, prefersReducedMotion } from '../../core/utils.js';

/** Découpe le titre. Renvoie la liste des lettres (.char). */
export function splitTitle(title) {
    const chars = splitChars(title);

    title.classList.add('is-split');
    layoutGradient(title, chars);

    const relayout = () => layoutGradient(title, chars);
    new ResizeObserver(relayout).observe(title);
    if (document.fonts) document.fonts.ready.then(relayout);

    return chars;
}

/** Recalcule la position de chaque lettre dans le titre (pour le dégradé continu). */
function layoutGradient(title, chars) {
    title.style.setProperty('--tw', `${title.offsetWidth}px`);
    title.style.setProperty('--th', `${title.offsetHeight}px`);
    chars.forEach((char) => {
        let x = 0;
        let y = 0;
        // Somme des offsets jusqu'au titre (positions de mise en page, hors transform).
        for (let el = char; el && el !== title; el = el.offsetParent) {
            x += el.offsetLeft;
            y += el.offsetTop;
        }
        char.style.setProperty('--cx', `${x}px`);
        char.style.setProperty('--cy', `${y}px`);
        char._center = { x: x + char.offsetWidth / 2, y: y + char.offsetHeight / 2 };
    });
}

/**
 * Réaction au curseur : lumière dorée qui suit la souris
 * et léger soulèvement des lettres proches. Desktop uniquement.
 */
export function initTitleHover(title, chars) {
    if (!hasFinePointer() || prefersReducedMotion()) return;

    const { lightRadius, lift, influence } = MOTION.heroTitle;
    title.style.setProperty('--light-r', `${lightRadius}px`);

    const mouse = { x: -9999, y: -9999 };
    const light = { x: -9999, y: -9999 };
    const lifts = chars.map(() => 0);
    let active = false;
    let last = performance.now();

    window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        // Coordonnées souris → repère de mise en page du titre (il est étiré en scaleX).
        const r = title.getBoundingClientRect();
        mouse.x = ((e.clientX - r.left) / r.width) * title.offsetWidth;
        mouse.y = ((e.clientY - r.top) / r.height) * title.offsetHeight;
        if (light.x < -9000) Object.assign(light, mouse);
        active = true;
    }, { passive: true });

    // Dernières valeurs écrites : on ne touche au DOM que si elles changent.
    // Chaque écriture de --mx/--my force à repeindre tout le titre (texte en dégradé).
    let lastLight = '';
    const lastLifts = chars.map(() => '');

    const tick = (now) => {
        const dt = now - last;
        last = now;
        // Inutile de calculer quand le hero est sorti de l'écran.
        if (active && window.scrollY < window.innerHeight) {
            const k = frameFactor(0.12, dt);
            light.x = lerp(light.x, mouse.x, k);
            light.y = lerp(light.y, mouse.y, k);
            const mx = `${light.x.toFixed(1)}px`;
            const my = `${light.y.toFixed(1)}px`;
            if (mx + my !== lastLight) {
                lastLight = mx + my;
                title.style.setProperty('--mx', mx);
                title.style.setProperty('--my', my);
            }

            const kl = frameFactor(0.1, dt);
            chars.forEach((char, i) => {
                const c = char._center;
                if (!c) return;
                const dist = Math.hypot(mouse.x - c.x, mouse.y - c.y);
                const strength = Math.max(0, 1 - dist / influence);
                const goal = -lift * strength * strength;
                lifts[i] = lerp(lifts[i], goal, kl);
                // `translate` : indépendant du transform de l'animation d'entrée.
                const value = Math.abs(lifts[i]) > 0.05 ? `0 ${lifts[i].toFixed(2)}px` : '';
                if (value !== lastLifts[i]) {
                    lastLifts[i] = value;
                    char.style.translate = value;
                }
            });
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
