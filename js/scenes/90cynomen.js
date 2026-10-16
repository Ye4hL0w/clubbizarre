/* ============================================================
   SCÈNE 90CYNOMEN — rétro 90s revisité, sans néon

   - Sol en grille dorée qui défile vers l'horizon (perspective).
   - Au-dessus : un soleil couchant or → rouge, découpé de bandes
     horizontales, et un halo d'horizon.
   - Filtre CRT : légère courbure d'écran, lignes de balayage, vignette,
     fantôme rouge minime, grain et scintillement discrets.
   - Allumage façon vieux téléviseur : un trait lumineux s'ouvre en image.
   - Curseur : le point de fuite et le soleil suivent la souris.
   - Scroll : la grille accélère, la caméra rase le sol.
   Toute l'image est calculée dans un seul shader plein écran.

   Réglages : MOTION.scenes['90cynomen'] dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

let renderer;
let scene;
let camera;
let uniforms;
let disposables = [];

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec2  uRes;
    uniform float uTime;
    uniform float uTravel;     // distance parcourue par la grille
    uniform vec2  uMouse;
    uniform float uScroll;
    uniform float uReveal;
    uniform float uCurve;
    uniform float uScan;
    uniform float uHorizon;
    uniform float uOffsetX;
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform vec3  uBg;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    // Ligne de grille anticrénelée (épaisseur constante à l'écran)
    float gridLine(float v, float width) {
        float d = abs(fract(v - 0.5) - 0.5);
        float w = fwidth(v) * width;
        return 1.0 - smoothstep(0.0, w, d);
    }

    vec3 sceneColor(vec2 uv) {
        float aspect = uRes.x / uRes.y;
        vec2 p = (uv * 2.0 - 1.0) * vec2(aspect, 1.0);
        p.x += uOffsetX - uMouse.x * 0.25;
        float h = uHorizon + uMouse.y * 0.04 - uScroll * 0.12;

        vec3 col = uBg;

        if (p.y < h) {
            // ── Sol : grille en perspective ──
            float camH = 0.55 - uScroll * 0.25;
            float z = camH / max(h - p.y, 0.0005);
            float x = p.x * z;
            float lines = max(gridLine(x * 1.2, 1.4), gridLine(z * 0.6 + uTravel, 1.4));
            // Brume vers l'horizon, fondu vers le bas pour laisser le nom lisible
            float haze = smoothstep(18.0, 2.5, z);
            float nearFade = smoothstep(0.62, 1.9, z);
            col += uGold * lines * haze * nearFade * 0.85;
            // Reflet du soleil sur le sol
            col += mix(uGold, uRed, 0.5) * exp(-abs(p.x) * 3.0) * exp(-(h - p.y) * 9.0) * 0.12;
        } else {
            // ── Ciel : soleil couchant à bandes ──
            vec2 sc = vec2(0.0, h + 0.30);
            float r = length(p - sc);
            float sun = 1.0 - smoothstep(0.32, 0.325, r);
            float k = clamp((sc.y + 0.32 - p.y) / 0.64, 0.0, 1.0);    // 0 en haut → 1 en bas
            // Bandes qui s'épaississent vers le bas, comme les affiches de l'époque
            float stripes = step(0.5 + k * 0.45, fract((p.y - h) * 22.0 + uTime * 0.15));
            sun *= mix(1.0, 1.0 - stripes, smoothstep(0.35, 0.55, k));
            vec3 sunCol = mix(uGold, uRed, smoothstep(0.2, 1.0, k));
            col += sunCol * sun * 0.75;
            col += uGold * exp(-r * 2.4) * 0.08;                         // halo
            // Quelques étoiles fixes
            vec2 cell = floor(uv * uRes / 3.0);
            float star = step(0.9975, hash(cell)) * smoothstep(h, h + 0.5, p.y);
            col += uGold * star * (0.35 + 0.35 * sin(uTime * 2.0 + hash(cell) * 50.0));
        }

        // Halo d'horizon
        col += uGold * exp(-abs(p.y - h) * 28.0) * 0.35;
        return col;
    }

    void main() {
        // ── Courbure d'écran CRT ──
        vec2 c = vUv * 2.0 - 1.0;
        c *= 1.0 + dot(c, c) * uCurve;
        vec2 uv = c * 0.5 + 0.5;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
            gl_FragColor = vec4(uBg, 1.0);
            return;
        }

        vec3 col = sceneColor(uv);
        // Fantôme rouge minime (convergence imparfaite d'un tube)
        col += uRed * sceneColor(uv + vec2(0.0025, 0.0)).g * 0.35;

        // Lignes de balayage + scintillement + grain
        float scan = 0.5 + 0.5 * sin(uv.y * uRes.y * 3.14159);
        col *= 1.0 - uScan * (1.0 - scan);
        col *= 0.97 + 0.03 * sin(uTime * 50.0);
        col += (hash(uv * uRes + uTime) - 0.5) * 0.035;

        // Vignette de tube
        col *= smoothstep(1.25, 0.35, length(c));

        // ── Allumage du téléviseur : trait horizontal, puis l'image s'ouvre ──
        float a = smoothstep(0.0, 0.3, uReveal);
        float b = smoothstep(0.25, 1.0, uReveal);
        float lineH = mix(0.004, 1.0, b);
        float lineW = mix(0.0, 1.0, a);
        float mask = step(abs(vUv.y - 0.5), lineH * 0.5) * step(abs(vUv.x - 0.5), lineW * 0.5);
        col = mix(col, vec3(1.0), (1.0 - b) * mask * 0.6);         // trait blanc au démarrage
        col *= mask;

        gl_FragColor = vec4(max(col, uBg * mask), 1.0);
    }
`;

export function init(canvas, options) {
    const cfg = MOTION.scenes['90cynomen'];
    const { low, pixelRatio, colors } = options;

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: low ? 'low-power' : 'high-performance',
    });
    // Rendu un peu plus "basse définition" : cohérent avec l'esthétique et plus léger.
    renderer.setPixelRatio(Math.min(pixelRatio, low ? 1 : 1.5));

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vec = (c) => new THREE.Vector3(...c);
    uniforms = {
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uTravel: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
        uScroll: { value: 0 },
        uReveal: { value: 0 },
        uCurve: { value: cfg.curvature },
        uScan: { value: cfg.scanlines },
        uHorizon: { value: 0.12 },
        uOffsetX: { value: 0 },
        uGold: { value: vec(colors.gold) },
        uRed: { value: vec(colors.red) },
        uBg: { value: vec(colors.bg) },
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false });
    scene.add(new THREE.Mesh(geo, mat));
    disposables = [geo, mat];

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    uniforms.uRes.value.copy(size);
    // Écran large : le soleil se décale à droite, au-dessus du nom
    uniforms.uOffsetX.value = w / h > 1 ? -0.55 * (w / h) * 0.6 : 0;
}

let travel = 0;

function render(time, dt, input) {
    if (!renderer) return;
    const cfg = MOTION.scenes['90cynomen'];
    const s = input.scroll;

    travel += dt * cfg.gridSpeed * (1 + s * 3);
    uniforms.uTravel.value = dt ? travel : time * cfg.gridSpeed;
    uniforms.uTime.value = time;
    uniforms.uScroll.value = s;
    uniforms.uMouse.value.set(input.x * input.hover, input.y * input.hover);
    uniforms.uReveal.value = Math.min(1, time / cfg.revealDuration);
    uniforms.uCurve.value = cfg.curvature;
    uniforms.uScan.value = cfg.scanlines;

    renderer.render(scene, camera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = scene = camera = uniforms = undefined;
    travel = 0;
}
