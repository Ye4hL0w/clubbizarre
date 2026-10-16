/* ============================================================
   SCÈNE JEREM.WAV — forme d'onde audio en 3D

   Une onde principale dorée (ruban fin, cœur lumineux) au premier plan,
   suivie d'une nappe d'échos qui s'enfoncent dans la profondeur et
   virent du doré vers le rouge en s'éteignant dans le noir.
   - Au chargement : ligne plate → le signal "prend vie".
   - Curseur : bosse d'énergie là où il passe + léger déplacement caméra.
   - Scroll dans le hero : l'amplitude et l'éclat montent, la caméra avance.
   Tout le calcul de l'onde est fait dans le vertex shader (GPU) :
   les géométries sont statiques, rien n'est réalloué pendant l'animation.

   Réglages : MOTION.scenes.jerem_wav dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

let renderer;
let scene;
let camera;
let disposables = [];
let uniforms;

/* ── Onde : même fonction pour le ruban et les échos ───────── */
const WAVE_GLSL = /* glsl */ `
    uniform float uTime;
    uniform float uAmp;
    uniform float uMouseX;
    uniform float uMouseAmp;
    uniform float uReveal;
    uniform float uEchoDelay;

    // Signal "audio" : quelques harmoniques, modulées en amplitude,
    // plus fortes au centre (enveloppe) — comme un .wav zoomé.
    float wave(float x, float t, float seed) {
        float env = exp(-x * x * 1.4);
        float w = sin(x * 7.0 + t * 1.1 + seed * 5.0) * 0.55
                + sin(x * 17.0 - t * 1.9 + seed * 2.0) * 0.28
                + sin(x * 41.0 + t * 3.1 + seed * 9.0) * 0.12
                + sin(x * 83.0 - t * 4.7) * 0.05;
        float mod = 0.45 + 0.55 * (0.5 + 0.5 * sin(x * 2.3 - t * 0.5 + seed * 3.0));
        return w * env * mod;
    }

    float heightAt(float x, float line) {
        float t = uTime - line * uEchoDelay;                       // l'écho rejoue le signal en retard
        float bump = exp(-pow((x - uMouseX) * 2.6, 2.0)) * uMouseAmp; // énergie apportée par le curseur
        float a = uAmp * (1.0 - line * 0.55) + bump * (1.0 - line * 0.8);
        // Apparition : l'onde s'ouvre depuis le centre.
        float open = smoothstep(0.0, 1.0, uReveal * 1.6 - abs(x) * 0.6);
        return wave(x, t, line) * a * open;
    }
`;

/* ── Échos : lignes fines dans la profondeur ───────────────── */
const echoVertex = /* glsl */ `
    attribute float aLine;      // 0 = devant, 1 = au fond
    uniform float uWidth;
    uniform float uDepth;
    varying float vLine;
    varying float vHeight;
    ${WAVE_GLSL}
    void main() {
        float x = position.x;   // -1 → 1
        float y = heightAt(x, aLine);
        vec3 p = vec3(x * uWidth, y, -aLine * uDepth);
        vLine = aLine;
        vHeight = y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`;

const echoFragment = /* glsl */ `
    uniform vec3 uGold;
    uniform vec3 uRed;
    uniform float uEchoOpacity;
    uniform float uGlow;
    varying float vLine;
    varying float vHeight;
    void main() {
        vec3 col = mix(uGold, uRed, smoothstep(0.15, 0.9, vLine));     // or → rouge vers le fond
        float fade = pow(1.0 - vLine, 1.3);                            // s'éteint dans le noir
        float energy = 0.5 + min(abs(vHeight) * 3.0, 1.0) * 0.5;     // les crêtes brillent
        gl_FragColor = vec4(col * energy * uGlow, fade * uEchoOpacity * energy);
    }
`;

/* ── Ruban principal : onde nette au premier plan ──────────── */
const ribbonVertex = /* glsl */ `
    uniform float uWidth;
    uniform float uThickness;
    varying float vEdge;
    varying float vHeight;
    ${WAVE_GLSL}
    void main() {
        float x = position.x;
        float y = heightAt(x, 0.0);
        // Épaisseur perpendiculaire à la pente : trait régulier même sur les fronts raides.
        float dx = 0.002;
        float slope = (heightAt(x + dx, 0.0) - heightAt(x - dx, 0.0)) / (2.0 * dx * uWidth);
        vec2 n = normalize(vec2(-slope, 1.0));
        vec3 p = vec3(x * uWidth, y, 0.02) + vec3(n * position.y * uThickness, 0.0);
        vEdge = position.y;   // -1 → 1 à travers le ruban
        vHeight = y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`;

const ribbonFragment = /* glsl */ `
    uniform vec3 uGold;
    uniform vec3 uWhite;
    uniform float uGlow;
    varying float vEdge;
    varying float vHeight;
    void main() {
        float core = 1.0 - abs(vEdge);
        float alpha = smoothstep(0.0, 0.6, core);
        vec3 col = mix(uGold, uWhite, pow(core, 6.0) * 0.55);            // cœur presque blanc
        col *= 0.75 + min(abs(vHeight) * 2.5, 1.0) * 0.5;
        gl_FragColor = vec4(col * uGlow, alpha);
    }
`;

/* ── Cycle de vie ───────────────────────────────────────────── */

export function init(canvas, options) {
    const cfg = MOTION.scenes.jerem_wav;
    const { low, pixelRatio, colors } = options;

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,                 // le dégradé CSS du hero reste visible derrière
        antialias: !low,
        powerPreference: low ? 'low-power' : 'high-performance',
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

    const echoes = low ? Math.round(cfg.echoes / 2) : cfg.echoes;
    const points = low ? Math.round(cfg.resolution / 2) : cfg.resolution;
    const vec = (c) => new THREE.Vector3(...c);

    uniforms = {
        uTime: { value: 0 },
        uAmp: { value: cfg.amplitude },
        uMouseX: { value: 0 },
        uMouseAmp: { value: 0 },
        uReveal: { value: 0 },
        uEchoDelay: { value: cfg.echoDelay },
        uWidth: { value: 2.2 },
        uDepth: { value: 4.5 },
        uThickness: { value: 0.006 },
        uGlow: { value: 1 },
        uEchoOpacity: { value: cfg.echoOpacity },
        uGold: { value: vec(colors.gold) },
        uRed: { value: vec(colors.red) },
        uWhite: { value: vec(colors.text) },
    };

    /* Échos : une seule géométrie LineSegments pour toutes les lignes (1 draw call). */
    const positions = new Float32Array(echoes * points * 3);
    const lines = new Float32Array(echoes * points);
    const index = [];
    for (let l = 0; l < echoes; l++) {
        const line = (l + 1) / echoes; // la ligne 0 est le ruban, dessiné à part
        for (let i = 0; i < points; i++) {
            const v = l * points + i;
            positions[v * 3] = (i / (points - 1)) * 2 - 1;
            lines[v] = line;
            if (i < points - 1) index.push(v, v + 1);
        }
    }
    const echoGeo = new THREE.BufferGeometry();
    echoGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    echoGeo.setAttribute('aLine', new THREE.BufferAttribute(lines, 1));
    echoGeo.setIndex(index);
    const echoMat = new THREE.ShaderMaterial({
        uniforms, vertexShader: echoVertex, fragmentShader: echoFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const echoMesh = new THREE.LineSegments(echoGeo, echoMat);
    echoMesh.frustumCulled = false; // la hauteur est calculée dans le shader

    /* Ruban : bande de 2 × points sommets (x, ±1). */
    const ribbonGeo = new THREE.PlaneGeometry(2, 2, points - 1, 1);
    const ribbonMat = new THREE.ShaderMaterial({
        uniforms, vertexShader: ribbonVertex, fragmentShader: ribbonFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.frustumCulled = false;

    scene.add(echoMesh, ribbon);
    disposables = [echoGeo, echoMat, ribbonGeo, ribbonMat];

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // L'onde occupe toute la largeur, quel que soit le format d'écran.
    uniforms.uWidth.value = 2.2 * Math.max(camera.aspect / 1.6, 0.55);
    camera.updateProjectionMatrix();
}

function render(time, dt, input) {
    if (!renderer) return;
    const cfg = MOTION.scenes.jerem_wav;

    uniforms.uTime.value = time * cfg.speed * 2.0;
    uniforms.uEchoOpacity.value = cfg.echoOpacity;
    uniforms.uEchoDelay.value = cfg.echoDelay;
    uniforms.uReveal.value = Math.min(1, time / cfg.revealDuration);

    // Scroll : plus d'amplitude et d'éclat, la caméra avance vers l'onde.
    const s = input.scroll;
    uniforms.uAmp.value = cfg.amplitude * (1 + s * cfg.scrollBoost);
    uniforms.uGlow.value = 1 + s * 0.6;

    // Curseur : bosse d'énergie à sa position horizontale.
    uniforms.uMouseX.value = input.x;
    uniforms.uMouseAmp.value = cfg.mouseStrength * input.hover * 0.35;

    // Caméra : au-dessus de la nappe, regarde vers le fond ; parallaxe discrète.
    camera.position.set(input.x * 0.25, 1.55 + input.y * 0.12 - s * 0.35, 4.4 - s * 1.2);
    camera.lookAt(0, -0.45, -1.8);

    renderer.render(scene, camera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = scene = camera = uniforms = undefined;
}
