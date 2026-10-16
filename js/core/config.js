/* ============================================================
   RÉGLAGES MOTION — tout ce qui se règle à la main est ici.
   ============================================================ */

export const MOTION = {
    // Smooth scroll (Lenis)
    scroll: {
        // Durée d'inertie en secondes : plus haut = plus lent et "glissant".
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

    // Préloader + intro vidéo
    intro: {
        // Le compteur reste affiché au moins ce temps (s), même si tout est en cache.
        minLoaderTime: 1.2,
        // Au-delà (s), on lance l'intro même si tout n'est pas chargé.
        maxLoaderTime: 8,
        // Vitesse de rattrapage du compteur (0–1) : plus bas = compteur plus "posé".
        counterLerp: 0.08,
        // Durée du fondu intro → hero (s).
        outroDuration: 1.6,
    },

    // Curseur custom (desktop uniquement)
    cursor: {
        // Inertie (0–1) : 1 = colle à la souris, plus bas = plus de traîne.
        dotLerp: 0.4,
        haloLerp: 0.13,
        // Déformation du halo selon la vitesse (0 = aucune).
        stretch: 0.0045,
        maxStretch: 0.35,
    },

    // Éléments magnétiques
    magnetic: {
        // Part du décalage curseur/centre appliquée à l'élément (0–1).
        // Surcharge possible par élément : data-magnetic="0.5".
        strength: 0.3,
        // Inertie du retour (0–1).
        lerp: 0.15,
    },

    // Fond WebGL du hero (marbre veiné d'or)
    heroGL: {
        // Vitesse de dérive du marbre (1 = défaut, 0 = figé).
        speed: 1,
        // Intensité des veines dorées (0–1.5).
        veinIntensity: 1,
        // Force de la distorsion "liquide" au curseur (0 = aucune).
        distortion: 1,
        // Inertie de la souris (0–1) : plus bas = traînée plus longue.
        mouseLerp: 0.06,
        // Résolution de rendu sur mobile / appareils faibles (0.5 = moitié).
        lowResolution: 0.6,
    },

    // Titre du hero
    heroTitle: {
        // Rayon de la lumière dorée qui suit la souris (px).
        lightRadius: 140,
        // Soulèvement max des lettres proches du curseur (px).
        lift: 6,
        // Distance d'influence du curseur sur les lettres (px).
        influence: 160,
    },

    // Reveals au scroll — même vocabulaire sur tout le site
    reveal: {
        // Durée et easing communs à toutes les apparitions.
        duration: 1.2,
        ease: 'expo.out',
        // Décalage vertical de départ des blocs (px).
        distance: 40,
        // Écart entre deux éléments d'un même groupe (s).
        stagger: 0.08,
        // Écart entre deux lettres d'un titre (s).
        charStagger: 0.035,
        // Déclenchement : quand le haut de l'élément atteint 85 % de la hauteur d'écran.
        start: 'top 85%',
        // Opacité de départ des mots du texte About (révélés au fil du scroll).
        wordDim: 0.15,
    },

    // Bandeau géant "BIZARRE IS THE NEW STANDARD"
    marquee: {
        // Vitesse de croisière (px/s).
        speed: 60,
        // Accélération apportée par la vitesse de scroll.
        velocityFactor: 900,
        // Vitesse additionnelle max (px/s).
        maxBoost: 1400,
        // Inclinaison max liée à la vitesse (degrés, 0 = aucune).
        maxSkew: 6,
    },

    // Transitions de pages (rideau "liquid gold")
    transition: {
        // Durée de la couverture à la sortie (s).
        leaveDuration: 0.9,
        // Durée du dévoilement à l'arrivée (s).
        enterDuration: 1.1,
        // Décalage entre la nappe or et la nappe noire (s).
        layerDelay: 0.12,
    },
};
