/* ============================================================
   TEXTE QUI ROULE AU SURVOL — chaque lettre monte et laisse
   place à sa copie dorée (email du contact, liens artistes…).
   Desktop uniquement ; sur tactile le texte reste tel quel.
   ============================================================ */

import { hasFinePointer, prefersReducedMotion } from './utils.js';

/**
 * Découpe `el` en lettres roulantes. Le survol de `host`
 * (par défaut l'élément lui-même) déclenche l'effet.
 */
export function splitRoll(el, host = el) {
    if (!el || !hasFinePointer() || prefersReducedMotion()) return;

    const text = el.textContent.trim();
    if (!host.hasAttribute('aria-label')) host.setAttribute('aria-label', host.textContent.trim().replace(/\s+/g, ' '));
    el.textContent = '';
    [...text].forEach((letter, i) => {
        const mask = document.createElement('span');
        mask.className = 'roll-char';
        mask.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span');
        inner.className = 'roll-char__inner';
        inner.dataset.char = letter === ' ' ? ' ' : letter;
        inner.textContent = letter === ' ' ? ' ' : letter;
        inner.style.setProperty('--i', i);
        mask.appendChild(inner);
        el.appendChild(mask);
    });
    el.classList.add('roll');
    host.classList.add('roll-host');
}
