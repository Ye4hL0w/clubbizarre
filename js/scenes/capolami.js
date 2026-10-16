/* ============================================================
   SCÈNE CAPOLAMI — pose longue, traînées de lumière

   Inspirée de sa photo (flash, bougé, traînées de lumière de club) :
   des points lumineux dorés — et un rouge, comme l'éventail — dessinent
   des courbes lentes et laissent des traînées, comme un appareil photo
   en pose longue. Le curseur devient lui aussi une source de lumière.
   - Arrivée : un flash d'appareil photo, puis les traînées se dessinent.
   - Scroll : les lumières accélèrent, les traînées s'allongent.
   - Le bas gauche (le nom) reste assombri pour rester lisible.
   Technique : deux textures en alternance (ping-pong) — chaque image
   reprend la précédente en l'estompant, puis y ajoute les lumières.

   Réglages : MOTION.scenes.capolami dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

const MAX_LIGHTS = 7;

let renderer;
let camera;
let accumScene;
let displayScene;
let targets;
let accumUniforms;
let displayUniforms;
let disposables = [];
let lights = [];
let current = 0;
let flash = 1;

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

/* Accumulation : l'image précédente s'estompe, les lumières s'y ajoutent */
const accumFragment = /* glsl */ `
    uniform sampler2D tPrev;
    uniform vec2  uRes;
    uniform float uDecay;
    uniform float uWidth;
    uniform vec4  uFrom[${MAX_LIGHTS}];   // xy : position précédente, z : intensité, w : teinte (0 or, 1 rouge)
    uniform vec2  uTo[${MAX_LIGHTS}];     // position actuelle
    uniform int   uCount;
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform vec3  uWhite;
    varying vec2 vUv;

    // Distance d'un point à un segment : la traînée est continue même si la lumière va vite
    float segDist(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
        return length(pa - ba * h);
    }

    void main() {
        float aspect = uRes.x / uRes.y;
        vec2 p = vec2(vUv.x * aspect, vUv.y);
        vec3 col = texture2D(tPrev, vUv).rgb * uDecay;

        for (int i = 0; i < ${MAX_LIGHTS}; i++) {
            if (i >= uCount) break;
            vec2 a = vec2(uFrom[i].x * aspect, uFrom[i].y);
            vec2 b = vec2(uTo[i].x * aspect, uTo[i].y);
            float d = segDist(p, a, b);
            float core = exp(-d * d / (uWidth * uWidth));                // filet net
            float halo = exp(-d * d / (uWidth * uWidth * 30.0)) * 0.12;  // halo doux
            vec3 tint = mix(uGold, uRed * 1.5, uFrom[i].w);
            col += (tint * (core + halo) + uWhite * core * core * 0.25) * uFrom[i].z * 0.22;
        }
        gl_FragColor = vec4(col, 1.0);
    }
`;

/* Affichage : légère compression des hautes lumières, flash, grain, zone du nom assombrie */
const displayFragment = /* glsl */ `
    uniform sampler2D tAccum;
    uniform vec2  uRes;
    uniform float uFlash;
    uniform float uTime;
    uniform vec3  uBg;
    uniform vec3  uGold;
    uniform vec3  uWhite;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    void main() {
        vec3 light = texture2D(tAccum, vUv).rgb;
        light = 1.0 - exp(-light * 1.6);                                  // pas de blanc brûlé
        // Le nom (bas gauche) reste lisible
        float nameZone = smoothstep(0.55, 0.0, vUv.y) * smoothstep(0.95, 0.15, vUv.x);
        light *= 1.0 - nameZone * 0.75;
        vec3 col = uBg + light;
        // Flash d'appareil photo à l'arrivée
        col = mix(col, mix(uWhite, uGold, 0.25), uFlash);
        col += (hash(vUv * uRes + uTime) - 0.5) * 0.03;                  // grain de pellicule
        gl_FragColor = vec4(col, 1.0);
    }
`;

/* ── Trajectoires : courbes de Lissajous lentes, toutes différentes ── */
function makeLights(count) {
    return Array.from({ length: count }, (_, i) => ({
        fx: 0.13 + i * 0.037,
        fy: 0.17 + i * 0.029,
        px: i * 1.7,
        py: i * 2.3,
        cx: 0.62 + Math.sin(i * 1.3) * 0.12,     // centrées à droite, au-dessus du nom
        cy: 0.62 + Math.cos(i * 0.9) * 0.08,
        rx: 0.22 + (i % 3) * 0.06,
        ry: 0.18 + (i % 2) * 0.07,
        power: 0.6 + (i % 3) * 0.25,
        red: i === 2 ? 1 : 0,                     // une lumière rouge, comme l'éventail
        x: null,
        y: null,
    }));
}

export function init(canvas, options) {
    const cfg = MOTION.scenes.capolami;
    const { low, pixelRatio, colors } = options;

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: low ? 'low-power' : 'high-performance',
    });
    renderer.setPixelRatio(Math.min(pixelRatio, low ? 1 : 1.5));
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const rtOptions = { type: THREE.HalfFloatType, depthBuffer: false };
    targets = [new THREE.WebGLRenderTarget(1, 1, rtOptions), new THREE.WebGLRenderTarget(1, 1, rtOptions)];

    const vec = (c) => new THREE.Vector3(...c);
    accumUniforms = {
        tPrev: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uDecay: { value: cfg.persistence },
        uWidth: { value: 0.0045 },
        uFrom: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector4()) },
        uTo: { value: Array.from({ length: MAX_LIGHTS }, () => new THREE.Vector2()) },
        uCount: { value: 0 },
        uGold: { value: vec(colors.gold) },
        uRed: { value: vec(colors.red) },
        uWhite: { value: vec(colors.text) },
    };
    displayUniforms = {
        tAccum: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uFlash: { value: 1 },
        uTime: { value: 0 },
        uBg: { value: vec(colors.bg) },
        uGold: { value: vec(colors.gold) },
        uWhite: { value: vec(colors.text) },
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    const accumMat = new THREE.ShaderMaterial({ uniforms: accumUniforms, vertexShader, fragmentShader: accumFragment, depthTest: false });
    const displayMat = new THREE.ShaderMaterial({ uniforms: displayUniforms, vertexShader, fragmentShader: displayFragment, depthTest: false });
    accumScene = new THREE.Scene();
    accumScene.add(new THREE.Mesh(geo, accumMat));
    displayScene = new THREE.Scene();
    displayScene.add(new THREE.Mesh(geo, displayMat));
    disposables = [geo, accumMat, displayMat, ...targets];

    // Mobile / appareils faibles : moins de sources ; la lumière du curseur est la dernière
    lights = makeLights(low ? 4 : MAX_LIGHTS - 1);
    current = 0;
    flash = 1;

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    targets.forEach((t) => t.setSize(size.x, size.y));
    accumUniforms.uRes.value.copy(size);
    displayUniforms.uRes.value.copy(size);
    // On repart d'une image noire après un redimensionnement
    targets.forEach((t) => { renderer.setRenderTarget(t); renderer.clear(); });
    renderer.setRenderTarget(null);
    lights.forEach((l) => { l.x = null; });
}

let cursorLight = null;

/** Une étape de simulation : déplace les lumières et ajoute leur traînée. */
function step(time, input) {
    const cfg = MOTION.scenes.capolami;
    const s = input.scroll;
    const t = time * cfg.speed * (1 + s * 1.8);
    const reveal = Math.min(1, time / cfg.revealDuration);

    const from = accumUniforms.uFrom.value;
    const to = accumUniforms.uTo.value;
    let n = 0;
    lights.forEach((l) => {
        const x = l.cx + Math.sin(t * l.fx * 6.283 + l.px) * l.rx;
        const y = l.cy + Math.sin(t * l.fy * 6.283 + l.py) * l.ry;
        const px = l.x ?? x;
        const py = l.y ?? y;
        from[n].set(px, py, l.power * reveal * cfg.intensity, l.red);
        to[n].set(x, y);
        l.x = x;
        l.y = y;
        n++;
    });

    // Le curseur peint lui aussi (quand il survole le hero)
    if (input.hover > 0.05) {
        const x = input.x * 0.5 + 0.5;
        const y = input.y * 0.5 + 0.5;
        const prev = cursorLight ?? { x, y };
        from[n].set(prev.x, prev.y, 1.3 * input.hover * cfg.intensity, 0);
        to[n].set(x, y);
        cursorLight = { x, y };
        n++;
    } else {
        cursorLight = null;
    }

    accumUniforms.uCount.value = n;
    accumUniforms.uDecay.value = Math.min(0.995, cfg.persistence + s * 0.02);
    accumUniforms.tPrev.value = targets[current].texture;
    const next = 1 - current;
    renderer.setRenderTarget(targets[next]);
    renderer.render(accumScene, camera);
    renderer.setRenderTarget(null);
    current = next;
}

function render(time, dt, input) {
    if (!renderer) return;

    if (dt === 0) {
        // Image fixe (animations réduites / debug) : on simule quelques secondes
        // pour que les traînées soient déjà dessinées.
        for (let i = 240; i > 0; i--) step(time - i / 60, { ...input, hover: 0 });
        flash = 0;
    } else {
        step(time, input);
        flash = Math.max(0, flash - dt * 1.4);   // le flash retombe en ~0,7 s
    }

    displayUniforms.tAccum.value = targets[current].texture;
    displayUniforms.uFlash.value = flash * flash;
    displayUniforms.uTime.value = time;
    renderer.render(displayScene, camera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = camera = accumScene = displayScene = targets = accumUniforms = displayUniforms = undefined;
    lights = [];
    cursorLight = null;
}
