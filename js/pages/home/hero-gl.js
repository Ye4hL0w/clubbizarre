/* ============================================================
   HERO WEBGL — marbre noir veiné d'or (Three.js, plein écran)

   - Veines générées par un bruit fractal déformé (domain warping),
     qui dérive très lentement.
   - Le curseur "tire" la matière comme un liquide (traînée + tourbillon
     qui s'amortissent quand la souris s'arrête) et éclaire les veines.
   - Le scroll décale et assombrit le marbre.
   - Le centre reste plus sombre : le titre garde le focus.

   Perf : pixel ratio plafonné à 2, rendu en pause hors écran / onglet
   caché, version allégée sur mobile et appareils faibles.
   Fallback : si WebGL ou Three.js manquent, le fond CSS d'origine reste.
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../../core/config.js';
import { cssColor, frameFactor, hasFinePointer, isLowPowerDevice, prefersReducedMotion } from '../../core/utils.js';

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    precision highp float;

    uniform float uTime;
    uniform vec2  uRes;
    uniform vec2  uMouse;     // position lissée (0–1)
    uniform vec2  uVel;       // "vitesse" lissée du curseur
    uniform float uHover;     // 1 quand la souris est sur le hero
    uniform float uScroll;    // 0 en haut, 1 quand le hero est sorti
    uniform float uReveal;    // fondu d'entrée 0 → 1
    uniform float uVeinGlow;  // intensité des veines
    uniform float uDistort;   // intensité de la distorsion liquide
    uniform vec3  uBg;
    uniform vec3  uGold;
    uniform vec3  uRed;

    varying vec2 vUv;

    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
        for (int i = 0; i < OCTAVES; i++) {
            v += a * noise(p);
            p = m * p;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        float aspect = uRes.x / uRes.y;
        vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);

        // ── Distorsion liquide autour du curseur ──
        vec2 m = (uMouse - 0.5) * vec2(aspect, 1.0);
        vec2 d = p - m;
        float fall = exp(-dot(d, d) * 7.0) * uHover;
        float speed = length(uVel);
        p -= uVel * fall * 0.9 * uDistort;                          // la matière suit le geste
        p += vec2(-d.y, d.x) * fall * speed * 2.2 * uDistort;       // léger tourbillon

        // ── Scroll : le marbre remonte et s'approche ──
        p.y -= uScroll * 0.35;
        p *= 1.0 + uScroll * 0.12;

        // ── Marbre : bruit fractal déformé ──
        float t = uTime * 0.02;
        vec2 sp = p * vec2(0.9, 1.3);                               // formes étirées, comme une coupe de pierre
        vec2 q = vec2(fbm(sp + vec2(0.0, t)), fbm(sp + vec2(5.2, 1.3) - t));
        vec2 r = vec2(fbm(sp + 1.8 * q + vec2(1.7, 9.2) + t * 1.4),
                      fbm(sp + 1.8 * q + vec2(8.3, 2.8) - t));
        float f = fbm(sp + 2.0 * r);

        // Veines : lignes d'iso-valeur du champ, d'épaisseur constante à l'écran
        // (fwidth = anticrénelage), modulée pour un rendu organique.
        float g = f * 5.0 + r.x * 1.5;
        float dl = abs(fract(g + 0.5) - 0.5);                         // 0 sur la veine
        float aa = fwidth(g);
        float thickness = mix(0.6, 2.2, smoothstep(0.3, 0.8, q.y));  // filets fins ↔ plus marqués
        float vein = 1.0 - smoothstep(0.0, aa * thickness, dl);
        float veinHalo = exp(-dl * dl * 90.0);
        float veinMask = smoothstep(0.3, 0.7, q.x + r.y * 0.5);     // veines par zones, pas partout

        vec3 col = uBg + vec3(0.05) * smoothstep(0.3, 0.8, f);       // profondeur de la pierre
        vec3 gold = uGold * (vein * 0.8 + veinHalo * 0.12);
        gold += vec3(1.0) * vein * 0.12;                             // cœur lumineux du filet
        col += gold * veinMask * uVeinGlow;

        // Lumière dorée qui suit le curseur (surtout sur les veines)
        col += uGold * fall * (0.035 + vein * veinMask * 0.9);

        // Braise rouge très douce au centre (rappel de l'ancien hero)
        float center = length((vUv - 0.5) * vec2(aspect, 1.0));
        col += uRed * 0.10 * smoothstep(0.7, 0.0, center);

        // Centre assombri pour laisser le titre en point focal, + vignette
        col *= mix(0.18, 1.0, smoothstep(0.08, 0.75, length((vUv - 0.5) * vec2(aspect * 0.6, 1.6))));
        col *= smoothstep(1.3, 0.3, center);

        col *= uReveal * (1.0 - uScroll * 0.65);
        col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;       // dithering anti-banding

        gl_FragColor = vec4(col, 1.0);
    }
`;

/**
 * Monte le fond WebGL dans `hero`. Renvoie un contrôleur
 * { reveal(), setScroll(p), destroy() } ou null en cas d'échec.
 */
export function createHeroGL(hero) {
    const cfg = MOTION.heroGL;
    const low = isLowPowerDevice();
    const reduced = prefersReducedMotion();
    const interactive = hasFinePointer() && !reduced;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            antialias: false,
            alpha: false,
            powerPreference: low ? 'low-power' : 'high-performance',
        });
    } catch {
        return null;
    }

    // Pixel ratio plafonné ; résolution réduite sur appareils faibles (le flou du marbre le permet).
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * (low ? cfg.lowResolution : 1);
    renderer.setPixelRatio(pixelRatio);

    const canvas = renderer.domElement;
    canvas.className = 'hero-gl';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
        uTime: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uVel: { value: new THREE.Vector2(0, 0) },
        uHover: { value: 0 },
        uScroll: { value: 0 },
        uReveal: { value: 0 },
        uVeinGlow: { value: cfg.veinIntensity },
        uDistort: { value: cfg.distortion },
        uBg: { value: new THREE.Vector3(...cssColor('--color-bg', '#050505')) },
        uGold: { value: new THREE.Vector3(...cssColor('--color-gold', '#D4AF37')) },
        uRed: { value: new THREE.Vector3(...cssColor('--color-red', '#A50000')) },
    };

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        defines: { OCTAVES: low ? 3 : 5 },
        depthTest: false,
        depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    /* ── Taille ─────────────────────────────────────────────── */
    const resize = () => {
        const w = hero.clientWidth;
        const h = hero.clientHeight;
        renderer.setSize(w, h, false);
        uniforms.uRes.value.set(w, h);
        if (!running) renderer.render(scene, camera);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(hero);

    /* ── Curseur ────────────────────────────────────────────── */
    const target = new THREE.Vector2(0.5, 0.5);
    let hoverTarget = 0;
    const onMove = (e) => {
        const r = hero.getBoundingClientRect();
        target.set((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
        hoverTarget = e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0;
    };
    const onLeave = () => { hoverTarget = 0; };
    if (interactive) {
        window.addEventListener('pointermove', onMove, { passive: true });
        document.documentElement.addEventListener('mouseleave', onLeave);
    }

    /* ── Boucle + pause ─────────────────────────────────────── */
    let running = false;
    let started = false;
    let inView = true;
    let last = performance.now();
    let reveal = 0;
    let revealTarget = 0;

    const tick = (now) => {
        const dt = Math.min(now - last, 100);
        last = now;
        if (!reduced) uniforms.uTime.value += (dt / 1000) * cfg.speed;

        // Souris lissée ; l'écart cible/lissé sert de vitesse (s'amortit seul).
        const m = uniforms.uMouse.value;
        m.lerp(target, frameFactor(cfg.mouseLerp, dt));
        const aspect = uniforms.uRes.value.x / uniforms.uRes.value.y;
        uniforms.uVel.value.set((target.x - m.x) * aspect, target.y - m.y);
        uniforms.uHover.value += (hoverTarget - uniforms.uHover.value) * frameFactor(0.05, dt);

        reveal += (revealTarget - reveal) * frameFactor(0.025, dt);
        uniforms.uReveal.value = reveal;

        renderer.render(scene, camera);
    };

    const update = () => {
        const shouldRun = started && inView && !document.hidden;
        if (shouldRun === running) return;
        running = shouldRun;
        last = performance.now();
        renderer.setAnimationLoop(running ? tick : null);
    };

    const io = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        update();
    });
    io.observe(hero);
    document.addEventListener('visibilitychange', update);

    // Perte de contexte GPU : on retire le canvas, le fond CSS reprend la main.
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        destroy();
    });

    resize();

    function destroy() {
        renderer.setAnimationLoop(null);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('visibilitychange', update);
        material.dispose();
        mesh.geometry.dispose();
        renderer.dispose();
        canvas.remove();
        hero.classList.remove('has-gl');
    }

    hero.classList.add('has-gl');

    // Réglage en direct : ouvrir l'accueil avec ?debug puis, dans la console,
    // modifier __heroGL.uniforms.uVeinGlow.value, uDistort, etc.
    if (new URLSearchParams(location.search).has('debug')) {
        window.__heroGL = {
            uniforms,
            material,
            render: () => renderer.render(scene, camera),
            state: () => ({ started, inView, running, hidden: document.hidden }),
        };
    }

    return {
        /** Lance le rendu et le fondu d'entrée du marbre. */
        reveal() {
            started = true;
            revealTarget = 1;
            if (reduced) {
                // Animations réduites : une image fixe, sans boucle.
                reveal = 1;
                uniforms.uReveal.value = 1;
                renderer.render(scene, camera);
                return;
            }
            update();
        },
        /** p : 0 → 1 pendant que le hero sort de l'écran. */
        setScroll(p) {
            uniforms.uScroll.value = p;
            if (!running && started) renderer.render(scene, camera);
        },
        destroy,
    };
}
