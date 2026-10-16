/* ============================================================
   SCÈNES ARTISTES — chargeur commun

   Chaque artiste peut avoir sa scène : js/scenes/<slug>.js, qui exporte
     init(canvas, options) → { render(time, dt, input), resize(w, h) }
     destroy()             → libère tout (géométries, matériaux, renderer)

   Le chargeur s'occupe de tout le reste, identique pour chaque scène :
   - charge la bonne scène (et Three.js) seulement si elle existe ;
   - fallback : sans WebGL ou en cas d'erreur, le fond CSS reste ;
   - boucle de rendu en pause hors écran / onglet caché ;
   - resize, curseur (lissé), progression du scroll dans le hero ;
   - version allégée sur mobile / appareils faibles (options.low) ;
   - animations réduites : une seule image fixe.
   ============================================================ */

import { cssColor, hasFinePointer, isLowPowerDevice, prefersReducedMotion, supportsWebGL } from '../core/utils.js';

// Ajouter une scène : créer js/scenes/<slug>.js puis l'inscrire ici.
const SCENES = {
    jerem_wav: () => import('./jerem_wav.js'),
    helanova: () => import('./helanova.js'),
    datseven: () => import('./datseven.js'),
    forn: () => import('./forn.js'),
    '90cynomen': () => import('./90cynomen.js'),
    bastoune_bellon: () => import('./bastoune_bellon.js'),
    mariam: () => import('./mariam.js'),
    capolami: () => import('./capolami.js'),
};

// Scènes dessinées en Canvas 2D : elles n'ont pas besoin de WebGL.
const CANVAS_2D = new Set(['mariam']);

export function hasScene(slug) {
    return slug in SCENES;
}

/**
 * Monte la scène de `slug` dans `container` (le fond du hero).
 * `extra` est transmis tel quel à la scène (ex. { photo } : URL du portrait).
 * Résout avec un contrôleur { destroy } ou null si rien n'a été monté.
 */
export async function mountScene(container, slug, extra = {}) {
    if (!container || !hasScene(slug)) return null;
    if (!CANVAS_2D.has(slug) && !supportsWebGL()) return null;

    let mod;
    try {
        mod = await SCENES[slug]();
    } catch (err) {
        console.warn(`[CB] Scène "${slug}" indisponible, fond CSS conservé.`, err);
        return null;
    }

    const low = isLowPowerDevice();
    const reduced = prefersReducedMotion();
    const canvas = document.createElement('canvas');
    canvas.className = 'artist-scene';
    canvas.setAttribute('aria-hidden', 'true');
    container.prepend(canvas);

    let scene;
    try {
        scene = await mod.init(canvas, {
            ...extra,
            low,
            reduced,
            pixelRatio: Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2),
            colors: {
                bg: cssColor('--color-bg', '#050505'),
                gold: cssColor('--color-gold', '#D4AF37'),
                red: cssColor('--color-red', '#A50000'),
                text: cssColor('--color-text', '#ffffff'),
            },
        });
    } catch (err) {
        console.warn(`[CB] Échec d'initialisation de la scène "${slug}".`, err);
        canvas.remove();
        return null;
    }

    /* ── Entrées partagées ─────────────────────────────────── */
    const hero = container.closest('section') || container;
    const input = { x: 0, y: 0, hover: 0, scroll: 0 };   // x, y : -1 → 1
    const target = { x: 0, y: 0, hover: 0 };
    const interactive = hasFinePointer() && !reduced;

    const onMove = (e) => {
        const r = container.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        target.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
        target.hover = e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0;
    };
    const onLeave = () => { target.hover = 0; };
    if (interactive) {
        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('mouseleave', onLeave);
    }

    const readScroll = () => {
        const r = hero.getBoundingClientRect();
        input.scroll = Math.min(1, Math.max(0, -r.top / Math.max(r.height, 1)));
    };

    /* ── Taille ────────────────────────────────────────────── */
    const resize = () => {
        scene.resize(container.clientWidth, container.clientHeight);
        if (!running) scene.render(clock, 0, input);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    /* ── Boucle ────────────────────────────────────────────── */
    let running = false;
    let raf = 0;
    let last = performance.now();
    let clock = 0;
    let inView = true;

    const tick = (now) => {
        const dt = Math.min(now - last, 100) / 1000;
        last = now;
        clock += dt;
        // Curseur lissé ici une fois pour toutes les scènes.
        const k = 1 - Math.pow(1 - 0.06, dt * 60);
        input.x += (target.x - input.x) * k;
        input.y += (target.y - input.y) * k;
        input.hover += (target.hover - input.hover) * k;
        readScroll();
        scene.render(clock, dt, input);
        raf = requestAnimationFrame(tick);
    };

    const update = () => {
        const shouldRun = !reduced && inView && !document.hidden;
        if (shouldRun === running) return;
        running = shouldRun;
        cancelAnimationFrame(raf);
        if (running) {
            last = performance.now();
            raf = requestAnimationFrame(tick);
        }
    };

    const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        update();
    });
    io.observe(container);
    document.addEventListener('visibilitychange', update);

    const destroy = () => {
        running = false;
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.documentElement.removeEventListener('mouseleave', onLeave);
        document.removeEventListener('visibilitychange', update);
        try { mod.destroy(); } catch { /* déjà libérée */ }
        canvas.remove();
        container.classList.remove('has-scene');
    };

    // Perte du contexte GPU : on nettoie, le fond CSS reprend la main.
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        destroy();
    });

    container.classList.add('has-scene');
    resize();

    // Réglage en direct : ajouter ?debug à l'URL, puis dans la console
    // __scene.frame(5, { x: 0.3, hover: 1 }) rend une image à t = 5 s.
    if (new URLSearchParams(location.search).has('debug')) {
        window.__scene = {
            canvas,
            input,
            frame: (time = clock, over = {}) => scene.render(time, 0, { ...input, ...over }),
        };
    }
    if (reduced) {
        // Image fixe, scène pleinement "révélée".
        scene.render(10, 0, input);
    } else {
        update();
    }

    return { destroy };
}
