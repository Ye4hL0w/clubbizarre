/* ============================================================
   RÉGLAGES MOTION — tout ce qui se règle à la main est ici.
   ============================================================ */

export const MOTION = {
    // Smooth scroll (Lenis)
    scroll: {
        // Durée d'inertie en secondes : plus haut = plus lent et "glissant".
        // Ignoré si lerp est défini.
        duration: 1.2,
        // easeOutExpo : départ franc, arrivée très douce.
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        // Multiplicateur de la molette (1 = natif).
        wheelMultiplier: 1,
        // Sur tactile on garde le scroll natif (meilleur ressenti iOS/Android).
        syncTouch: false,
        // Décalage appliqué aux liens d'ancre (hauteur de la navbar).
        anchorOffset: -80,
    },
};
