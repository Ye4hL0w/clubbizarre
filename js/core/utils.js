/* ============================================================
   UTILITAIRES PARTAGÉS
   ============================================================ */

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

/** true si l'utilisateur a demandé à réduire les animations. */
export function prefersReducedMotion() {
    return reducedMotionQuery.matches;
}

/** Appelle `callback(isReduced)` quand la préférence change. */
export function onReducedMotionChange(callback) {
    reducedMotionQuery.addEventListener('change', (e) => callback(e.matches));
}

/** true sur les appareils principalement tactiles (pas de survol fin). */
export function isTouchDevice() {
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

/** Teste la disponibilité de WebGL (pour le fallback des effets 3D). */
export function supportsWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(
            window.WebGLRenderingContext &&
            (canvas.getContext('webgl2') || canvas.getContext('webgl'))
        );
    } catch {
        return false;
    }
}
