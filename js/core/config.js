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
        // Durée totale de la sortie (s) : la vidéo s'éteint (50 %), puis le noir
        // se retire (30 %) et le hero apparaît seul.
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

    // Performance des fonds WebGL (accueil + pages artistes)
    performance: {
        // Images/s max des fonds animés (au-delà, invisible mais coûteux sur écrans 120 Hz).
        maxFps: 60,
        // Marbre de l'accueil : si l'ordinateur passe sous ce nombre d'images/s,
        // la résolution de rendu baisse par paliers (jamais sur une machine assez rapide).
        minFps: 50,
        // Palier de baisse et plancher de la résolution (1 = 1 pixel de rendu par pixel CSS).
        resolutionStep: 0.25,
        minResolution: 1,
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

    // Scènes WebGL des pages artistes (js/scenes/<slug>.js)
    scenes: {
        jerem_wav: {
            // Nombre de lignes d'écho derrière l'onde principale (mobile : moitié).
            echoes: 36,
            // Points par ligne : plus = onde plus fine (mobile : moitié).
            resolution: 320,
            // Hauteur de l'onde au repos.
            amplitude: 0.32,
            // Vitesse d'ondulation (1 = défaut).
            speed: 0.6,
            // Retard entre deux échos : plus haut = l'onde "voyage" vers le fond.
            echoDelay: 1.6,
            // Bosse créée par le curseur (0 = aucune).
            mouseStrength: 0.55,
            // Gain d'intensité quand on scrolle dans le hero (0 = aucun).
            scrollBoost: 1.6,
            // Opacité des échos (0–1).
            echoOpacity: 0.9,
            // Durée d'apparition : de la ligne plate au signal (s).
            revealDuration: 2.6,
        },
        helanova: {
            // Nombre de particules (mobile : 40 %).
            particles: 14000,
            // Part des particules qui dessinent le Λ (0–1).
            lambdaShare: 0.12,
            // Taille des particules.
            size: 26,
            // Vitesse de rotation de la nébuleuse.
            orbitSpeed: 0.05,
            // Force d'attraction du curseur (0 = aucune, 1 = collées au curseur).
            attraction: 0.35,
            // Rayon d'influence du curseur (unités de la scène).
            attractionRadius: 0.9,
            // Durée de la convergence à l'arrivée (s).
            revealDuration: 4,
        },
        datseven: {
            // Vitesse de rotation des polyèdres.
            rotationSpeed: 0.18,
            // Vitesse des impulsions lumineuses le long des arêtes.
            pulseSpeed: 0.25,
            // Intensité du glitch au survol (0 = désactivé, 1 = fort).
            glitch: 0.6,
            // Durée d'apparition (s).
            revealDuration: 2.2,
        },
        forn: {
            // Intensité de la déformation (0 = sphère lisse).
            deformation: 0.32,
            // Échelle des formes : plus haut = reliefs plus petits et nombreux.
            scale: 1.3,
            // Vitesse de transformation de la matière.
            speed: 1,
            // Grain de surface (0 = lisse).
            grain: 0.05,
            // Gonflement de la matière vers le curseur (0 = aucun).
            mouseStrength: 0.12,
            // Durée de formation à l'arrivée (s).
            revealDuration: 2.8,
        },
        '90cynomen': {
            // Vitesse de défilement de la grille.
            gridSpeed: 0.6,
            // Courbure de l'écran CRT (0 = plat).
            curvature: 0.06,
            // Intensité des lignes de balayage (0–1).
            scanlines: 0.35,
            // Durée de l'allumage du téléviseur (s).
            revealDuration: 1.6,
        },
        bastoune_bellon: {
            // Vitesse de balayage des projecteurs.
            sweepSpeed: 0.35,
            // Intensité des faisceaux (0–1.5).
            beamIntensity: 1,
            // Densité de la brume (plus = faisceaux plus visibles).
            haze: 1,
            // Présence des lasers (0 = aucun ; ils montent au scroll).
            lasers: 0.6,
            // Durée d'allumage des projecteurs (s).
            revealDuration: 2.4,
        },
        mariam: {
            // Vitesse de dérive des mots en liberté.
            drift: 1,
            // Durée d'un temps du cycle libre → rangé (s). Un cycle complet = 4 temps.
            cycle: 6,
            // Écart des mots au passage du curseur (px).
            repel: 40,
            // Durée d'apparition (s).
            revealDuration: 2.4,
        },
        capolami: {
            // Vitesse des lumières.
            speed: 1,
            // Persistance des traînées (0.9 = courtes, 0.99 = très longues).
            persistence: 0.978,
            // Éclat des lumières.
            intensity: 1,
            // Durée d'apparition après le flash (s).
            revealDuration: 1.5,
        },
    },

    // Transitions de pages (rideau "liquid gold")
    transition: {
        // Durée de la couverture à la sortie (s).
        leaveDuration: 0.9,
        // Durée du dévoilement à l'arrivée (s).
        enterDuration: 1.1,
        // Décalage entre la nappe or et la nappe noire (s) : c'est l'épaisseur
        // de la bande dorée visible (plus petit = bande plus fine).
        layerDelay: 0.05,
    },
};
