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

/** sessionStorage protégé (navigation privée, stockage bloqué…). */
export const session = {
    get(key) {
        try { return window.sessionStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
        try { window.sessionStorage.setItem(key, value); } catch { /* ignoré */ }
    },
    remove(key) {
        try { window.sessionStorage.removeItem(key); } catch { /* ignoré */ }
    },
};

/** Clés de session partagées avec le script inline du <head>. */
export const STORAGE_KEYS = {
    introSeen: 'cb:intro-seen',
    pageTransition: 'cb:page-transition',
};

/** Interpolation linéaire. */
export const lerp = (a, b, t) => a + (b - a) * t;

/** Pointeur fin + survol disponibles (souris / trackpad). */
export function hasFinePointer() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Convertit un facteur de lissage "par image à 60 Hz" en facteur réel
 * pour un intervalle `dtMs` : même ressenti à 60, 120 Hz ou en cas de saccade.
 */
export function frameFactor(t, dtMs) {
    const frames = Math.min(dtMs / (1000 / 60), 60);
    return 1 - Math.pow(1 - t, frames);
}

/**
 * Appareil à ménager : tactile, petit écran, peu de cœurs ou de mémoire.
 * Sert à choisir une version simplifiée des effets WebGL.
 */
export function isLowPowerDevice() {
    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8;
    return isTouchDevice() || window.innerWidth < 768 || cores <= 4 || memory <= 4;
}

/** Lit une couleur hexadécimale des tokens CSS et la renvoie en [r, g, b] (0–1, sRGB). */
export function cssColor(name, fallback = '#000000') {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    const hex = raw.replace('#', '');
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    const n = parseInt(full, 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
