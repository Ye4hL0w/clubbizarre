/* ============================================================
   SCÈNE HELΛNOVA — nébuleuse de particules autour d'un Λ

   - Un disque de poussière stellaire, incliné, tourne lentement :
     rotation différentielle (le centre va plus vite que les bords,
     comme une vraie galaxie).
   - Au centre, un Λ formé de particules denses : le point focal,
     qui "respire" et scintille.
   - Le curseur attire les particules proches (champ de gravité doux).
   - À l'arrivée : les particules convergent depuis le vide.
   - Scroll dans le hero : la nébuleuse s'ouvre et la caméra plonge.
   Tout le mouvement est calculé dans le vertex shader.

   Réglages : MOTION.scenes.helanova dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

let renderer;
let scene;
let camera;
let points;
let uniforms;
let disposables = [];
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const ndc = new THREE.Vector2();
const mouseWorld = new THREE.Vector3();

const vertexShader = /* glsl */ `
    attribute vec3 aPolar;     // nébuleuse : rayon, angle, hauteur
    attribute vec3 aScatter;   // position de départ (avant convergence)
    attribute vec3 aSeed;      // aléas : taille, phase, couleur
    attribute float aType;     // 0 = nébuleuse, 1 = Λ

    uniform float uTime;
    uniform float uOrbit;
    uniform float uReveal;
    uniform float uSpread;
    uniform float uSize;
    uniform float uPixelRatio;
    uniform float uAttract;
    uniform float uAttractRadius;
    uniform vec3  uMouse;
    uniform float uHover;
    uniform mat3  uTilt;

    varying float vAlpha;
    varying float vTint;

    void main() {
        vec3 p;
        if (aType < 0.5) {
            // Rotation différentielle : vitesse ∝ 1/√r
            float r = aPolar.x * uSpread;
            float ang = aPolar.y + uTime * uOrbit / sqrt(0.25 + aPolar.x);
            p = uTilt * vec3(cos(ang) * r, aPolar.z, sin(ang) * r);
        } else {
            // Λ : légère respiration + frémissement propre à chaque particule
            float breathe = 1.0 + sin(uTime * 0.6) * 0.015;
            p = position * breathe + vec3(
                sin(uTime * 1.3 + aSeed.y * 40.0),
                cos(uTime * 1.1 + aSeed.y * 31.0),
                sin(uTime * 0.9 + aSeed.y * 17.0)) * 0.006;
        }

        // Convergence depuis le vide à l'arrivée (les particules du Λ en dernier)
        float delay = aType * 0.35 + aSeed.y * 0.25;
        float k = smoothstep(delay, delay + 0.6, uReveal);
        k = 1.0 - pow(1.0 - k, 3.0);
        p = mix(aScatter, p, k);

        // Gravité du curseur
        vec3 d = uMouse - p;
        float f = exp(-dot(d, d) / (uAttractRadius * uAttractRadius)) * uAttract * uHover;
        p += d * f;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;

        float twinkle = 0.65 + 0.35 * sin(uTime * (1.5 + aSeed.z * 2.0) + aSeed.y * 60.0);
        float size = uSize * (0.5 + aSeed.x * 1.3) * (aType > 0.5 ? 1.2 : 1.15);
        gl_PointSize = size * uPixelRatio * (1.0 + f * 2.0) / -mv.z;

        vAlpha = twinkle * k * (aType > 0.5 ? 1.0 : 0.9);
        vTint = aSeed.z;
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3 uGold;
    uniform vec3 uRed;
    uniform vec3 uWhite;
    varying float vAlpha;
    varying float vTint;

    void main() {
        // Particule ronde au halo doux
        float d = length(gl_PointCoord - 0.5);
        float glow = smoothstep(0.5, 0.0, d);
        glow *= glow;
        // Palette DA : or dominant, quelques étoiles blanches, rares braises rouges
        vec3 col = uGold;
        if (vTint > 0.9) col = mix(uGold, uWhite, 0.7);
        else if (vTint < 0.06) col = uRed * 1.6;
        gl_FragColor = vec4(col, glow * vAlpha);
    }
`;

/* ── Distribution des particules ───────────────────────────── */

const gauss = () => {
    // Box-Muller
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/** Points le long des deux jambages d'un Λ (sans barre), centré en (cx, cy). */
function lambdaPoint(cx, cy, h, w) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const t = Math.pow(Math.random(), 0.85);     // un peu plus dense vers le sommet
    const x = cx + side * w * t;
    const y = cy + h / 2 - h * t;
    return [x + gauss() * 0.012, y + gauss() * 0.012, gauss() * 0.03];
}

export function init(canvas, options) {
    const cfg = MOTION.scenes.helanova;
    const { low, pixelRatio, colors } = options;

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: low ? 'low-power' : 'high-performance',
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);

    const total = low ? Math.round(cfg.particles * 0.4) : cfg.particles;
    const lambdaCount = Math.round(total * cfg.lambdaShare);

    const pos = new Float32Array(total * 3);
    const polar = new Float32Array(total * 3);
    const scatter = new Float32Array(total * 3);
    const seed = new Float32Array(total * 3);
    const type = new Float32Array(total);

    for (let i = 0; i < total; i++) {
        const isLambda = i < lambdaCount;
        type[i] = isLambda ? 1 : 0;
        if (isLambda) {
            const [x, y, z] = lambdaPoint(0, 0, 1.1, 0.48);
            pos.set([x, y, z], i * 3);
        } else {
            // Disque : densité qui décroît vers l'extérieur, bras spiraux discrets
            const r = 0.2 + Math.pow(Math.random(), 2.0) * 2.8;
            const arm = Math.floor(Math.random() * 3) * (Math.PI * 2 / 3);
            const angle = arm + r * 1.1 + gauss() * 0.45;
            polar.set([r, angle, gauss() * 0.06 * (1 + r * 0.3)], i * 3);
        }
        // Départ : une coquille lointaine autour de la scène
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const far = 6 + Math.random() * 6;
        scatter.set([far * Math.sin(phi) * Math.cos(theta), far * Math.cos(phi), far * Math.sin(phi) * Math.sin(theta)], i * 3);
        seed.set([Math.random(), Math.random(), Math.random()], i * 3);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPolar', new THREE.BufferAttribute(polar, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    geo.setAttribute('aType', new THREE.BufferAttribute(type, 1));

    // Disque incliné vers la caméra
    const tilt = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationX(-1.15));

    const vec = (c) => new THREE.Vector3(...c);
    uniforms = {
        uTime: { value: 0 },
        uOrbit: { value: cfg.orbitSpeed },
        uReveal: { value: 0 },
        uSpread: { value: 1 },
        uSize: { value: cfg.size },
        uPixelRatio: { value: pixelRatio },
        uAttract: { value: cfg.attraction },
        uAttractRadius: { value: cfg.attractionRadius },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uHover: { value: 0 },
        uTilt: { value: tilt },
        uGold: { value: vec(colors.gold) },
        uRed: { value: vec(colors.red) },
        uWhite: { value: vec(colors.text) },
    };

    const mat = new THREE.ShaderMaterial({
        uniforms, vertexShader, fragmentShader,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);
    disposables = [geo, mat];

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Sur écran étroit, on recule pour garder la nébuleuse entière.
    camera.userData.distance = camera.aspect < 1 ? 7.2 : 5;
    camera.updateProjectionMatrix();
}

function render(time, dt, input) {
    if (!renderer) return;
    const cfg = MOTION.scenes.helanova;
    const s = input.scroll;

    uniforms.uTime.value = time;
    uniforms.uOrbit.value = cfg.orbitSpeed * (1 + s * 2);
    uniforms.uReveal.value = Math.min(1, time / cfg.revealDuration);
    uniforms.uSpread.value = 1 + s * 0.6;
    uniforms.uSize.value = cfg.size;
    uniforms.uAttract.value = cfg.attraction;
    uniforms.uAttractRadius.value = cfg.attractionRadius;
    uniforms.uHover.value = input.hover;

    // Composition : le Λ en haut à droite du hero, le nom de l'artiste en bas à gauche.
    const dist = camera.userData.distance || 5;
    const offsetX = camera.aspect < 1 ? 0 : -0.9;
    camera.position.set(offsetX + input.x * 0.25, -0.35 + input.y * 0.2, dist - s * 2);
    camera.lookAt(offsetX, -0.35, 0);

    // Curseur → point du plan z = 0, cible de la gravité
    ndc.set(input.x, input.y);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, mouseWorld)) uniforms.uMouse.value.copy(mouseWorld);

    renderer.render(scene, camera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = scene = camera = points = uniforms = undefined;
}
