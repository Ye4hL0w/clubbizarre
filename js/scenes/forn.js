/* ============================================================
   SCÈNE FØRN — cordes de guitare vivantes

   - Six cordes dorées tendues en diagonale sur un manche d'ébène sombre :
     frettes dorées (espacement réel : 2^(1/12)), repères incrustés,
     et la lumière des cordes qui vibrent déborde sur le bois.
   - Un reflet glisse lentement le long des cordes ; une poussière dorée
     flotte autour du manche et s'allume quand on joue.
   - Chaque corde vibre selon ses vrais modes (ondes stationnaires),
     les harmoniques aiguës s'éteignent plus vite que la fondamentale.
   - Halo "flou de vibration" : la lueur s'élargit aux ventres de l'onde
     et vire du doré au rouge braise quand la corde est attaquée fort.
   - Curseur : on accroche une corde en la traversant, on la tend,
     elle claque quand on la lâche. Un balayage rapide = un strum.
   - Sans souris (mobile) / au repos : un strum discret de temps en temps.
   - Scroll dans le hero : strums plus fréquents, éclat plus fort.
   - Apparition : les cordes se tendent du centre vers les bords,
     puis un premier accord.
   Toute la vibration est calculée dans le vertex shader : géométries
   statiques, rien n'est réalloué pendant l'animation.

   Réglages : MOTION.scenes.forn dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

const STRINGS = 6;
const LENGTH = 7.5;          // longueur des cordes (dépassent du cadre)
const SPACING = 0.17;        // écart entre deux cordes
const MODES = 5;             // harmoniques simulées

// Grave → aigu : rayon, corde filée, fréquence visuelle (Hz, rapports réels EADGBE)
const GAUGES = [
    { r: 0.030, wound: 1, f: 1.5 },
    { r: 0.025, wound: 1, f: 2.0 },
    { r: 0.021, wound: 1, f: 2.68 },
    { r: 0.017, wound: 1, f: 3.58 },
    { r: 0.0125, wound: 0, f: 4.5 },
    { r: 0.0105, wound: 0, f: 6.0 },
];

let renderer;
let scene;
let camera;
let group;
let strings = [];
let boardMat;
let dustMat;
let disposables = [];

/* ── Vibration d'une corde : partagé par la corde et son halo ── */
const VIBRATION_GLSL = /* glsl */ `
    #define PI 3.14159265
    uniform float uTime;
    uniform float uLen;
    uniform float uF1;
    uniform float uDecay;
    uniform float uPluckT;     // instant de l'attaque
    uniform float uPluckAmp;   // amplitude (signée)
    uniform float uPluckU;     // point d'attaque le long de la corde (0–1)
    uniform float uGrab;       // corde tenue par le curseur : écart au point tenu
    uniform float uGrabU;
    uniform float uAmbient;
    uniform float uSeed;

    // Renvoie (déplacement x, déplacement z, enveloppe de vibration)
    vec3 vibrate(float u) {
        float x = 0.0;
        float z = 0.0;
        float env = 0.0;

        float t = max(uTime - uPluckT, 0.0);
        float u0 = clamp(uPluckU, 0.06, 0.94);
        float k = 2.0 / (PI * PI * u0 * (1.0 - u0));
        for (int i = 1; i <= ${MODES}; i++) {
            float n = float(i);
            // Coefficients de Fourier d'une corde pincée (forme triangulaire)
            float a = uPluckAmp * k * sin(n * PI * u0) / (n * n);
            a *= exp(-t * uDecay * (1.0 + 0.9 * (n - 1.0)));
            float shape = sin(n * PI * u);
            float w = 2.0 * PI * uF1 * n * t;
            x += a * shape * cos(w);
            z += a * shape * sin(w) * 0.35;      // légère orbite : relief 3D
            env += abs(a * shape);
        }

        // Corde tenue : forme triangulaire sous le "doigt"
        float g = uGrabU;
        x += uGrab * (u < g ? u / max(g, 0.001) : (1.0 - u) / max(1.0 - g, 0.001));

        // Respiration au repos : la corde n'est jamais tout à fait morte
        float breathe = sin(PI * u) * uAmbient;
        x += breathe * sin(uTime * 1.7 + uSeed * 4.0) * 0.6;
        z += breathe * cos(uTime * 1.1 + uSeed * 7.0) * 0.4;
        env += abs(breathe) * 0.3;

        return vec3(x, z, env);
    }
`;

/* ── Corde : tube métallique doré ──────────────────────────── */
const stringVertex = /* glsl */ `
    ${VIBRATION_GLSL}
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vU;
    varying float vEnergy;

    void main() {
        float u = position.y / uLen + 0.5;
        vec3 v = vibrate(u);
        vec3 p = position + vec3(v.x, 0.0, v.y);
        vU = u;
        vEnergy = v.z;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
    }
`;

const stringFragment = /* glsl */ `
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform float uWound;
    uniform float uLen;
    uniform float uReveal;
    uniform float uGlow;
    uniform float uTime;
    uniform float uSeed;
    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vU;
    varying float vEnergy;

    void main() {
        // Apparition : la corde se tend du centre vers les bords
        if (abs(vU - 0.5) > uReveal * 0.62) discard;

        vec3 n = normalize(vNormal);
        vec3 v = normalize(-vViewPos);
        vec3 L = normalize(vec3(-0.6, 0.75, 0.55));
        float diff = max(dot(n, L), 0.0);
        float spec = pow(max(dot(reflect(-L, n), v), 0.0), 40.0);
        float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0);

        // Cordes filées : enroulement fin qui accroche la lumière
        float winding = 0.78 + 0.22 * smoothstep(-0.4, 0.9, sin(vU * uLen * 520.0));
        float metal = mix(1.0, winding, uWound);

        float e = clamp(vEnergy * 9.0, 0.0, 1.0);
        // Reflet qui glisse lentement le long de la corde
        float gp = fract(vU * 0.9 - uTime * 0.06 + uSeed * 0.31) - 0.5;
        float glint = exp(-gp * gp * 380.0);
        vec3 col = uGold * (0.22 + diff * 0.6) * metal
                 + vec3(1.0, 0.9, 0.7) * glint * (0.35 + spec) * 0.9
                 + vec3(1.0, 0.93, 0.75) * spec * 0.9 * metal
                 + uGold * rim * 0.35
                 + mix(uGold, uRed, 0.55) * e * 0.55 * uGlow;

        // Les extrémités se perdent dans le noir
        col *= smoothstep(0.0, 0.18, vU) * smoothstep(1.0, 0.82, vU);
        gl_FragColor = vec4(col, 1.0);
    }
`;

/* ── Halo : le flou lumineux d'une corde qui vibre ─────────── */
const haloVertex = /* glsl */ `
    ${VIBRATION_GLSL}
    uniform float uHaloW;
    varying float vSide;
    varying float vU;
    varying float vSpread;
    varying float vEnergy;

    void main() {
        float u = position.y / uLen + 0.5;
        vec3 v = vibrate(u);
        float side = position.x * 2.0;            // -1 → 1
        float spread = uHaloW + v.z * 1.15;       // le flou s'élargit aux ventres
        vec3 p = vec3(v.x + side * spread, position.y, v.y);
        vSide = side;
        vU = u;
        vSpread = spread;
        vEnergy = v.z;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`;

const haloFragment = /* glsl */ `
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform float uHaloW;
    uniform float uReveal;
    uniform float uGlow;
    uniform float uTime;
    varying float vSide;
    varying float vU;
    varying float vSpread;
    varying float vEnergy;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
        if (abs(vU - 0.5) > uReveal * 0.62) discard;
        float e = clamp(vEnergy * 7.0, 0.0, 1.0);
        float profile = exp(-vSide * vSide * 3.2);
        // Plus le flou est large, moins il est dense (énergie conservée)
        float density = uHaloW / vSpread;
        float a = profile * (0.05 + e * 0.75) * density * uGlow;
        a *= smoothstep(0.0, 0.2, vU) * smoothstep(1.0, 0.8, vU);
        a *= 0.9 + 0.2 * hash(gl_FragCoord.xy + floor(uTime * 24.0));   // grain
        vec3 col = mix(uGold, uRed, smoothstep(0.25, 0.9, e));
        gl_FragColor = vec4(col * a, a);
    }
`;

/* ── Manche : ébène sombre, frettes dorées, repères, lumière des cordes ── */
const boardVertex = /* glsl */ `
    varying vec2 vPos;
    void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const boardFragment = /* glsl */ `
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform vec3  uBg;
    uniform float uReveal;
    uniform float uFrets;
    uniform float uLen;
    uniform float uHalfW;
    uniform float uTop;
    uniform float uScale;
    uniform float uEnergy[${STRINGS}];
    uniform float uStringX[${STRINGS}];
    varying vec2 vPos;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fretY(float k) { return uTop - uScale * (1.0 - pow(2.0, -k / 12.0)); }

    void main() {
        float x = vPos.x;
        float y = vPos.y;
        float u = y / uLen + 0.5;

        // Ébène : fibres étirées dans la longueur, presque noires
        float fib = vnoise(vec2(x * 38.0, y * 1.6)) * 0.6 + vnoise(vec2(x * 90.0, y * 4.0)) * 0.4;
        vec3 col = uBg * (1.5 + fib * 1.3) + uGold * fib * 0.012;

        // Liseré doré sur les deux bords du manche
        float edge = abs(abs(x) - uHalfW * 0.97);
        col += uGold * exp(-edge * edge * 9000.0) * uFrets * 0.9;

        // Frettes : filets dorés qui s'allument une à une
        float fret = 0.0;
        for (int i = 0; i <= 14; i++) {
            float k = float(i);
            float d = y - fretY(k);
            float on = smoothstep(k * 0.05, k * 0.05 + 0.25, uReveal);
            fret += exp(-d * d * 5200.0) * on * (k < 0.5 ? 1.8 : 1.0);
        }
        col += uGold * fret * uFrets * 3.2;

        // Repères incrustés (cases 3, 5, 7, 9, 12 double, 15)
        float dots = 0.0;
        for (int i = 0; i < 6; i++) {
            float k = i == 0 ? 3.0 : i == 1 ? 5.0 : i == 2 ? 7.0 : i == 3 ? 9.0 : i == 4 ? 12.0 : 15.0;
            float cy = 0.5 * (fretY(k - 1.0) + fretY(k));
            float dx = (k == 12.0) ? abs(abs(x) - 0.2) : abs(x);
            float dd = length(vec2(dx, (y - cy) * 0.9));
            dots += smoothstep(0.042, 0.03, dd) * smoothstep(k * 0.05, k * 0.05 + 0.3, uReveal);
        }
        col = mix(col, uGold * 0.32, dots * 0.55);

        // La lumière des cordes qui vibrent déborde sur le bois
        float total = 0.0;
        vec3 spill = vec3(0.0);
        for (int i = 0; i < ${STRINGS}; i++) {
            float d = x - uStringX[i];
            float e = uEnergy[i];
            spill += mix(uGold, uRed, smoothstep(0.3, 1.0, e)) * exp(-d * d * 260.0) * e;
            total += e;
        }
        col += spill * sin(3.14159 * clamp(u, 0.0, 1.0)) * 0.55;
        col += uGold * fret * min(total, 1.5) * 0.25;

        // Bords et extrémités qui se fondent dans le noir
        float a = smoothstep(uHalfW, uHalfW * 0.9, abs(x));
        a *= smoothstep(0.0, 0.22, u) * smoothstep(1.0, 0.78, u);
        a *= smoothstep(0.0, 0.6, uReveal);
        gl_FragColor = vec4(col, a * 0.92);
    }
`;

/* ── Poussière dorée autour du manche ──────────────────────── */
const dustVertex = /* glsl */ `
    attribute vec3 aSeed;
    uniform float uTime;
    uniform float uSize;
    uniform float uPixel;
    varying float vTw;
    void main() {
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.05 + aSeed.x * 0.08) + 3.5, 7.0) - 3.5;
        p.x += sin(uTime * 0.3 + aSeed.y * 6.28) * 0.08;
        p.z += cos(uTime * 0.25 + aSeed.z * 6.28) * 0.06;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vTw = 0.5 + 0.5 * sin(uTime * (1.0 + aSeed.z * 2.0) + aSeed.x * 20.0);
        gl_PointSize = uSize * uPixel * (0.6 + aSeed.y) / -mv.z;
        gl_Position = projectionMatrix * mv;
    }
`;

const dustFragment = /* glsl */ `
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform float uEnergy;
    uniform float uReveal;
    varying float vTw;
    void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a *= (0.12 + vTw * 0.18 + uEnergy * 0.7) * uReveal;
        vec3 col = mix(uGold, uRed, uEnergy * 0.35);
        gl_FragColor = vec4(col * a, a);
    }
`;

export function init(canvas, options) {
    const cfg = MOTION.scenes.forn;
    const { low, pixelRatio, colors } = options;

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: !low,
        powerPreference: low ? 'low-power' : 'high-performance',
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    group = new THREE.Group();
    scene.add(group);

    const gold = new THREE.Vector3(...colors.gold);
    const red = new THREE.Vector3(...colors.red);
    const segs = low ? 140 : 260;

    // Géométries partagées par toutes les cordes
    const haloGeo = new THREE.PlaneGeometry(1, LENGTH, 1, segs);
    disposables.push(haloGeo);

    strings = GAUGES.map((gauge, i) => {
        const x = (i - (STRINGS - 1) / 2) * SPACING;
        const uniforms = {
            uTime: { value: 0 },
            uLen: { value: LENGTH },
            uF1: { value: gauge.f },
            uDecay: { value: cfg.sustain },
            uPluckT: { value: -100 },
            uPluckAmp: { value: 0 },
            uPluckU: { value: 0.5 },
            uGrab: { value: 0 },
            uGrabU: { value: 0.5 },
            uAmbient: { value: 0 },
            uSeed: { value: i * 1.37 },
            uWound: { value: gauge.wound },
            uReveal: { value: 0 },
            uGlow: { value: 1 },
            uHaloW: { value: gauge.r * 2.6 + 0.012 },
            uGold: { value: gold },
            uRed: { value: red },
        };

        const geo = new THREE.CylinderGeometry(gauge.r, gauge.r, LENGTH, low ? 6 : 10, segs, true);
        const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: stringVertex, fragmentShader: stringFragment });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = x;

        const haloMat = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: haloVertex,
            fragmentShader: haloFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.set(x, 0, 0.002);
        halo.renderOrder = 1;

        group.add(mesh, halo);
        disposables.push(geo, mat, haloMat);

        return {
            x,
            uniforms,
            grabbed: false,
            prevOff: null,
            lastPluck: -100,
        };
    });

    // Manche : un plan sous les cordes, tout est dessiné dans son shader
    const halfW = 0.6;
    const boardGeo = new THREE.PlaneGeometry(halfW * 2, LENGTH, 1, 1);
    boardMat = new THREE.ShaderMaterial({
        uniforms: {
            uGold: { value: gold },
            uRed: { value: red },
            uBg: { value: new THREE.Vector3(...colors.bg) },
            uReveal: { value: 0 },
            uFrets: { value: cfg.frets },
            uLen: { value: LENGTH },
            uHalfW: { value: halfW },
            uTop: { value: LENGTH * 0.5 },
            uScale: { value: LENGTH * 1.45 },
            uEnergy: { value: new Array(STRINGS).fill(0) },
            uStringX: { value: strings.map((st) => st.x) },
        },
        vertexShader: boardVertex,
        fragmentShader: boardFragment,
        transparent: true,
        depthWrite: false,
    });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.z = -0.07;
    board.renderOrder = -1;
    group.add(board);
    disposables.push(boardGeo, boardMat);

    // Poussière dorée (moins de grains sur mobile)
    const count = low ? 70 : 160;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 2.6;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
        seed[i * 3] = Math.random();
        seed[i * 3 + 1] = Math.random();
        seed[i * 3 + 2] = Math.random();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    dustMat = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uSize: { value: 14 },
            uPixel: { value: pixelRatio },
            uGold: { value: gold },
            uRed: { value: red },
            uEnergy: { value: 0 },
            uReveal: { value: 0 },
        },
        vertexShader: dustVertex,
        fragmentShader: dustFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    group.add(new THREE.Points(dustGeo, dustMat));
    disposables.push(dustGeo, dustMat);

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

/* ── Jeu : attaques, accroche au curseur, strums automatiques ── */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane();
const hit = new THREE.Vector3();
const normal = new THREE.Vector3();

let lastInteraction = 0;
let nextAutoStrum = 0;
let welcomed = false;
let queue = [];              // attaques programmées (strums)

function pluck(s, time, amp, u) {
    const max = MOTION.scenes.forn.pull * 1.2;
    s.uniforms.uPluckT.value = time;
    s.uniforms.uPluckAmp.value = Math.max(-max, Math.min(max, amp));
    s.uniforms.uPluckU.value = u;
    s.lastPluck = time;
}

function strum(time, { amp, down = true, u = 0.38, gap = 0.045 }) {
    strings.forEach((s, i) => {
        const order = down ? i : STRINGS - 1 - i;
        queue.push({ s, at: time + order * gap, amp: amp * (0.85 + Math.random() * 0.3), u: u + (Math.random() - 0.5) * 0.08 });
    });
}

function pointerLocal(input) {
    ndc.set(input.x, input.y);
    raycaster.setFromCamera(ndc, camera);
    normal.set(0, 0, 1).applyQuaternion(group.quaternion);
    plane.setFromNormalAndCoplanarPoint(normal, group.position);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return group.worldToLocal(hit);
}

function play(time, input, s) {
    const cfg = MOTION.scenes.forn;
    const maxPull = cfg.pull;

    // Strums programmés
    if (queue.length) {
        queue = queue.filter((q) => {
            if (time < q.at) return true;
            if (!q.s.grabbed) pluck(q.s, time, q.amp, q.u);
            return false;
        });
    }

    // Premier accord à la fin de l'apparition
    if (!welcomed && time > cfg.revealDuration * 0.75) {
        welcomed = true;
        strum(time, { amp: maxPull * 0.75 });
        nextAutoStrum = time + cfg.autoStrum;
    }

    // Curseur : on accroche une corde en la traversant, elle claque en la lâchant
    const active = input.hover > 0.5;
    const p = active ? pointerLocal(input) : null;

    strings.forEach((str) => {
        const un = str.uniforms;
        if (!p) {
            if (str.grabbed) {
                pluck(str, time, un.uGrab.value, un.uGrabU.value);
                str.grabbed = false;
                un.uGrab.value = 0;
            }
            str.prevOff = null;
            return;
        }

        const off = p.x - str.x;
        const u = Math.min(0.92, Math.max(0.08, p.y / LENGTH + 0.5));

        if (str.grabbed) {
            // Le doigt revient en arrière ou tire trop loin : la corde s'échappe
            if (Math.sign(off) !== str.grabDir || Math.abs(off) > maxPull) {
                pluck(str, time, Math.sign(off) === str.grabDir ? str.grabDir * maxPull : un.uGrab.value, un.uGrabU.value);
                str.grabbed = false;
                un.uGrab.value = 0;
            } else {
                un.uGrab.value = off;
                un.uGrabU.value = u;
            }
        } else if (str.prevOff !== null && Math.sign(off) !== Math.sign(str.prevOff) && Math.abs(off - str.prevOff) < 1.5) {
            lastInteraction = time;
            if (Math.abs(off) >= maxPull * 0.6) {
                // Passage rapide : la corde claque tout de suite (strum à la main)
                pluck(str, time, Math.sign(off) * maxPull * 0.85, u);
            } else {
                // Passage lent : la corde reste accrochée et se tend
                str.grabbed = true;
                str.grabDir = Math.sign(off) || 1;
                un.uPluckAmp.value *= 0.2; // le doigt étouffe la vibration en cours
                un.uGrab.value = off;
                un.uGrabU.value = u;
            }
        }
        str.prevOff = off;
    });

    // Au repos (ou sur mobile) : un strum discret de temps en temps, plus souvent au scroll
    const idle = time - lastInteraction > 2.5;
    if (welcomed && idle && time > nextAutoStrum) {
        strum(time, { amp: maxPull * (0.35 + s * 0.4), down: Math.random() > 0.35, u: 0.3 + Math.random() * 0.4 });
        nextAutoStrum = time + cfg.autoStrum * (1 - s * 0.6) * (0.75 + Math.random() * 0.5);
    }
}

function render(time, dt, input) {
    if (!renderer) return;
    const cfg = MOTION.scenes.forn;
    const s = input.scroll;
    const t = time * cfg.speed;

    play(time, input, s);

    strings.forEach((str, i) => {
        const un = str.uniforms;
        // Chaque corde se tend avec un léger décalage
        un.uReveal.value = Math.min(1, Math.max(0, (time / cfg.revealDuration) * 1.35 - i * 0.07));
        un.uTime.value = time;
        un.uF1.value = GAUGES[i].f * cfg.speed;
        un.uDecay.value = cfg.sustain;
        un.uAmbient.value = 0.004 + s * 0.01;
        un.uGlow.value = cfg.glow * (1 + s * 0.7);
    });
    // Énergie de chaque corde (lumière sur le bois, poussière)
    const energies = boardMat.uniforms.uEnergy.value;
    let total = 0;
    strings.forEach((str, i) => {
        const un = str.uniforms;
        const ring = Math.abs(un.uPluckAmp.value) * Math.exp(-Math.max(0, time - un.uPluckT.value) * cfg.sustain);
        const e = Math.min(1.2, (ring + Math.abs(un.uGrab.value) * 0.6) / cfg.pull);
        energies[i] = e * cfg.glow;
        total += e;
    });
    const reveal = Math.min(1, time / cfg.revealDuration);
    boardMat.uniforms.uReveal.value = reveal;
    boardMat.uniforms.uFrets.value = cfg.frets;
    dustMat.uniforms.uTime.value = time;
    dustMat.uniforms.uReveal.value = reveal;
    dustMat.uniforms.uEnergy.value += (Math.min(1, total / 3) - dustMat.uniforms.uEnergy.value) * 0.08;

    // Manche en diagonale, légère parallaxe au curseur, dérive lente
    group.rotation.set(
        -0.32 + input.y * 0.06,
        0.42 + input.x * 0.1 + Math.sin(t * 0.15) * 0.04,
        0.42 + s * 0.12 + Math.sin(t * 0.11) * 0.02,
    );

    // Composition : à droite au-dessus du nom (centré sur écran étroit)
    const narrow = camera.aspect < 1;
    const offsetX = narrow ? 0 : -1.5;
    camera.position.set(offsetX, narrow ? -0.45 : -0.5, (narrow ? 7.4 : 6) - s * 0.6);
    camera.lookAt(offsetX, narrow ? -0.45 : -0.5, 0);
    group.updateMatrixWorld();

    renderer.render(scene, camera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = scene = camera = group = boardMat = dustMat = undefined;
    strings = [];
    queue = [];
    welcomed = false;
    lastInteraction = 0;
    nextAutoStrum = 0;
}
