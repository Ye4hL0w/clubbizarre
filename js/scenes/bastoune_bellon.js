/* ============================================================
   SCÈNE BASTOUNE BELLON — l'éclairagiste : faisceaux et lasers

   - Une rampe de projecteurs au-dessus de la scène : des faisceaux
     dorés (un rouge) balayent l'espace dans une brume qui dérive.
   - Une "poursuite" (follow spot) suit le curseur ; sans curseur
     (mobile, souris hors du hero), elle éclaire le nom de l'artiste.
   - Des lasers fins traversent l'espace par moments, plus présents
     quand on scrolle.
   - À l'arrivée, les projecteurs s'allument un par un, avec le petit
     scintillement d'une lampe qui chauffe.
   Image calculée dans un seul shader plein écran (pas de géométrie 3D).

   Réglages : MOTION.scenes.bastoune_bellon dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

let renderer;
let scene;
let camera;
let uniforms;
let disposables = [];
const aim = new THREE.Vector2(-0.6, -0.5);   // cible lissée de la poursuite

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
    uniform float uSweep;      // phase de balayage (accélère au scroll)
    uniform vec2  uAim;        // cible de la poursuite (repère p)
    uniform float uReveal;
    uniform float uHaze;
    uniform float uLaser;
    uniform float uBeams;      // intensité des faisceaux
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform vec3  uWhite;
    uniform vec3  uBg;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < OCTAVES; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
        return v;
    }

    // Faisceau conique partant de src, orienté dir, d'ouverture 'width' (radians)
    float beam(vec2 p, vec2 src, vec2 dir, float width) {
        vec2 v = p - src;
        float len = length(v);
        float ang = acos(clamp(dot(v / len, dir), -1.0, 1.0));
        float cone = smoothstep(width, width * 0.15, ang);
        float core = smoothstep(width * 0.35, 0.0, ang) * 0.6;   // centre plus dense
        return (cone + core) / (1.0 + len * len * 0.35);
    }

    // Allumage échelonné avec scintillement de lampe qui chauffe
    float strike(float i) {
        float t = uReveal * 1.6 - i * 0.12;
        float on = smoothstep(0.0, 0.35, t);
        float flicker = step(0.35, fract(sin(floor(uTime * 24.0) + i * 13.0) * 917.0));
        return t < 0.35 ? on * flicker : on;
    }

    void main() {
        float aspect = uRes.x / uRes.y;
        vec2 p = (vUv * 2.0 - 1.0) * vec2(aspect, 1.0);

        // Brume qui dérive lentement : c'est elle qui rend les faisceaux visibles
        float haze = fbm(p * 1.6 + vec2(uTime * 0.05, -uTime * 0.02));
        haze = mix(0.35, 1.0, haze) * uHaze;

        vec3 col = uBg;

        // ── Rampe de projecteurs (au-dessus du cadre) ──
        for (int i = 0; i < 6; i++) {
            float fi = float(i);
            float x = (fi / 5.0 * 2.0 - 1.0) * aspect * 0.85;
            vec2 src = vec2(x, 1.25);
            float a = sin(uSweep * (0.6 + fi * 0.11) + fi * 1.7) * 0.55;   // balayage
            vec2 dir = normalize(vec2(sin(a), -cos(a)));
            float b = beam(p, src, dir, 0.09) * strike(fi);
            vec3 tint = (i == 4) ? uRed * 1.4 : uGold;                     // un projecteur rouge
            col += tint * b * haze * 0.55 * uBeams;
        }

        // ── Poursuite : suit le curseur, sinon éclaire le nom ──
        vec2 fsrc = vec2(aspect * 0.55, 1.3);
        vec2 fdir = normalize(uAim - fsrc);
        float fb = beam(p, fsrc, fdir, 0.075) * strike(6.0);
        col += mix(uGold, uWhite, 0.35) * fb * haze * 0.8 * uBeams;
        // Tache de lumière là où elle frappe
        float spot = exp(-dot(p - uAim, p - uAim) * 9.0) * strike(6.0);
        col += uGold * spot * 0.12;

        // ── Lasers : traits fins qui traversent l'écran par moments ──
        for (int j = 0; j < 3; j++) {
            float fj = float(j);
            float phase = uTime * (0.35 + fj * 0.13) + fj * 2.1;
            float vis = smoothstep(0.55, 0.9, sin(phase * 0.7)) * uLaser;   // présents par intermittence
            vec2 o = vec2(-aspect * (0.3 + fj * 0.25), 1.1);
            float ang = -0.9 + sin(phase) * 0.6 + fj * 0.5;
            vec2 d = vec2(cos(ang), sin(ang));
            vec2 v = p - o;
            float dist = abs(v.x * d.y - v.y * d.x);
            float laser = exp(-dist * dist * 9000.0) + exp(-dist * dist * 300.0) * 0.12;
            col += mix(uRed, uGold, step(1.0, fj)) * laser * vis * (0.4 + haze * 0.6);
        }

        // Grain léger pour éviter les aplats
        col += (hash(vUv * uRes + uTime) - 0.5) * 0.02;
        gl_FragColor = vec4(col, 1.0);
    }
`;

export function init(canvas, options) {
    const cfg = MOTION.scenes.bastoune_bellon;
    const { low, pixelRatio, colors } = options;

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: low ? 'low-power' : 'high-performance',
    });
    // Brume et faisceaux sont flous par nature : une résolution réduite suffit.
    renderer.setPixelRatio(Math.min(pixelRatio, low ? 0.75 : 1.25));

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vec = (c) => new THREE.Vector3(...c);
    uniforms = {
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSweep: { value: 0 },
        uAim: { value: aim.clone() },
        uReveal: { value: 0 },
        uHaze: { value: cfg.haze },
        uLaser: { value: cfg.lasers },
        uBeams: { value: cfg.beamIntensity },
        uGold: { value: vec(colors.gold) },
        uRed: { value: vec(colors.red) },
        uWhite: { value: vec(colors.text) },
        uBg: { value: vec(colors.bg) },
    };

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
        uniforms, vertexShader, fragmentShader,
        defines: { OCTAVES: low ? 3 : 5 },
        depthTest: false,
    });
    scene.add(new THREE.Mesh(geo, mat));
    disposables = [geo, mat];

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.copy(renderer.getDrawingBufferSize(new THREE.Vector2()));
}

let sweep = 0;

function render(time, dt, input) {
    if (!renderer) return;
    const cfg = MOTION.scenes.bastoune_bellon;
    const s = input.scroll;
    const aspect = uniforms.uRes.value.x / uniforms.uRes.value.y;

    sweep += dt * cfg.sweepSpeed * (1 + s * 2.5);
    uniforms.uSweep.value = dt ? sweep : time * cfg.sweepSpeed;
    uniforms.uTime.value = time;
    uniforms.uReveal.value = Math.min(1, time / cfg.revealDuration);
    uniforms.uHaze.value = cfg.haze;
    uniforms.uBeams.value = cfg.beamIntensity;
    uniforms.uLaser.value = cfg.lasers * (0.4 + s * 1.6);

    // Poursuite : vers le curseur s'il survole le hero, sinon vers le nom (bas gauche)
    const nameTarget = aspect > 1 ? [-aspect * 0.55, -0.42] : [-aspect * 0.4, -0.42];
    const tx = input.hover > 0.5 ? input.x * aspect : nameTarget[0];
    const ty = input.hover > 0.5 ? input.y : nameTarget[1];
    const k = dt ? 1 - Math.pow(1 - 0.08, dt * 60) : 1;
    aim.x += (tx - aim.x) * k;
    aim.y += (ty - aim.y) * k;
    uniforms.uAim.value.copy(aim);

    renderer.render(scene, camera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = scene = camera = uniforms = undefined;
    sweep = 0;
}
