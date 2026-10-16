/* ============================================================
   SCÈNE FØRN — matière brute, forme organique déformée par le bruit

   - Une masse sombre, comme une roche volcanique encore vivante,
     déformée en continu par un bruit 3D (simplex, domaine déformé).
   - Éclairage calculé à la main : lumière rasante dorée, liseré doré
     sur les contours, braise rouge très sourde dans les creux.
   - Texture granuleuse : grain fin qui vibre à la surface.
   - Apparition : la matière se forme en se "dé-dissolvant" grain à grain.
   - Curseur : la matière gonfle doucement vers lui ; scroll : elle
     s'agite davantage et tourne.

   Réglages : MOTION.scenes.forn dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

let renderer;
let scene;
let camera;
let mesh;
let uniforms;
let disposables = [];

/* Bruit simplex 3D (Ashima Arts / Stefan Gustavson, licence MIT) */
const NOISE_GLSL = /* glsl */ `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
`;

const vertexShader = /* glsl */ `
    uniform float uTime;
    uniform float uAmp;
    uniform float uFreq;
    uniform vec3  uMouseDir;    // direction du curseur, dans le repère de l'objet
    uniform float uMousePush;

    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vCavity;
    varying vec3 vObj;

    ${NOISE_GLSL}

    // Déplacement le long de la normale : bruit à domaine déformé = formes organiques
    float field(vec3 p) {
        float t = uTime * 0.12;
        vec3 q = p * uFreq + vec3(t, -t * 0.7, t * 0.5);
        vec3 warp = vec3(snoise(q), snoise(q + 5.2), snoise(q + 9.7)) * 0.35;
        float n = snoise(q + warp) * 0.75 + snoise(q * 2.3 + warp * 2.0) * 0.25;
        // Le curseur gonfle la matière dans sa direction
        float pull = pow(max(dot(normalize(p), uMouseDir), 0.0), 6.0) * uMousePush;
        return n * uAmp + pull;
    }

    vec3 displaced(vec3 p) {
        return p * (1.0 + field(p));
    }

    void main() {
        vec3 p = position;
        vec3 n = normalize(p);
        // Normale recalculée par différences finies sur la surface déformée
        vec3 tangent = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
        vec3 bitangent = cross(n, tangent);
        float e = 0.01;
        float f0 = field(p);
        vec3 d0 = p * (1.0 + f0);
        vec3 d1 = displaced(normalize(p + tangent * e));
        vec3 d2 = displaced(normalize(p + bitangent * e));
        vec3 nrm = normalize(cross(d1 - d0, d2 - d0));

        vCavity = f0;
        vObj = p;
        vNormal = normalize(normalMatrix * nrm);
        vec4 mv = modelViewMatrix * vec4(d0, 1.0);
        vViewPos = mv.xyz;
        gl_Position = projectionMatrix * mv;
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3  uGold;
    uniform vec3  uRed;
    uniform vec3  uBg;
    uniform float uTime;
    uniform float uAmp;
    uniform float uReveal;
    uniform float uGrain;
    uniform float uGlow;

    varying vec3 vNormal;
    varying vec3 vViewPos;
    varying float vCavity;
    varying vec3 vObj;

    float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    void main() {
        // Apparition : la matière se forme grain à grain
        float dissolve = hash(floor(vObj * 90.0));
        if (dissolve > uReveal * 1.05) discard;

        vec3 n = normalize(vNormal);
        vec3 v = normalize(-vViewPos);

        // Lumière rasante chaude venant du haut à gauche
        vec3 L = normalize(vec3(-0.6, 0.75, 0.45));
        float diff = max(dot(n, L), 0.0);
        float spec = pow(max(dot(reflect(-L, n), v), 0.0), 24.0);
        float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);

        // Creux : là où le bruit enfonce la surface, une braise rouge très sourde
        float cavity = smoothstep(0.0, -uAmp, vCavity);

        vec3 base = uBg * 2.2;                                   // pierre presque noire
        vec3 col = base
                 + uGold * diff * 0.11
                 + uGold * spec * 0.45
                 + uGold * rim * 0.65 * uGlow
                 + uRed * cavity * 0.18 * uGlow;

        // Grain : texture brute qui vibre légèrement
        float g = hash(vec3(gl_FragCoord.xy, floor(uTime * 24.0))) - 0.5;
        col += g * uGrain;
        col *= 0.92 + 0.08 * hash(floor(vObj * 160.0));         // micro-relief statique

        gl_FragColor = vec4(col, 1.0);
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

    const vec = (c) => new THREE.Vector3(...c);
    uniforms = {
        uTime: { value: 0 },
        uAmp: { value: cfg.deformation },
        uFreq: { value: cfg.scale },
        uMouseDir: { value: new THREE.Vector3(0, 0, 1) },
        uMousePush: { value: 0 },
        uReveal: { value: 0 },
        uGrain: { value: cfg.grain },
        uGlow: { value: 1 },
        uGold: { value: vec(colors.gold) },
        uRed: { value: vec(colors.red) },
        uBg: { value: vec(colors.bg) },
    };

    // Sphère très subdivisée : support de la déformation (moins dense sur mobile)
    const geo = new THREE.IcosahedronGeometry(1, low ? 40 : 80);
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    disposables = [geo, mat];

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

const mouseDir = new THREE.Vector3();
const inverse = new THREE.Quaternion();

function render(time, dt, input) {
    if (!renderer) return;
    const cfg = MOTION.scenes.forn;
    const s = input.scroll;
    const reveal = Math.min(1, time / cfg.revealDuration);

    uniforms.uTime.value = time * cfg.speed * (1 + s * 1.5);
    uniforms.uAmp.value = cfg.deformation * (1 + s * 0.8);
    uniforms.uFreq.value = cfg.scale;
    uniforms.uGrain.value = cfg.grain;
    uniforms.uReveal.value = reveal;
    uniforms.uGlow.value = 1 + s * 0.6;

    mesh.rotation.set(time * 0.03 + input.y * 0.2, time * 0.05 * (1 + s * 2) + input.x * 0.3, 0);
    mesh.scale.setScalar(0.9 + (1 - Math.pow(1 - reveal, 3)) * 0.1 + s * 0.15);

    // Direction du curseur vue depuis l'objet (dans son propre repère)
    mouseDir.set(input.x, input.y, 0.9).normalize();
    inverse.copy(mesh.quaternion).invert();
    uniforms.uMouseDir.value.copy(mouseDir.applyQuaternion(inverse));
    uniforms.uMousePush.value = cfg.mouseStrength * input.hover;

    // Composition : à droite au-dessus du nom (centré sur écran étroit)
    const narrow = camera.aspect < 1;
    const offsetX = narrow ? 0 : -1.5;
    camera.position.set(offsetX, narrow ? -0.45 : -0.5, narrow ? 7.4 : 6);
    camera.lookAt(offsetX, narrow ? -0.45 : -0.5, 0);

    renderer.render(scene, camera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = scene = camera = mesh = uniforms = undefined;
}
