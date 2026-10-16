/* ============================================================
   SCÈNE DATSEVEN — géométrie à 7 faces, fil de fer doré, glitch

   - Deux polyèdres à 7 faces imbriqués, en rotation lente et inverse :
       · un prisme pentagonal (5 côtés + 2 bases = 7 faces),
       · une pyramide hexagonale (6 côtés + 1 base = 7 faces).
   - Arêtes dorées parcourues par des impulsions de lumière, faces
     à peine teintées pour donner du volume.
   - 7 points en orbite, comme un rappel discret du chiffre.
   - Au survol du hero : glitch numérique discret par salves (tranches
     décalées, séparation or / rouge), jamais en continu.
   - Curseur : inclinaison de l'objet ; scroll : rotation et éclat montent.

   Réglages : MOTION.scenes.datseven dans js/core/config.js
   ============================================================ */

import * as THREE from 'three';
import { MOTION } from '../core/config.js';

let renderer;
let scene;
let camera;
let group;
let outer;
let inner;
let orbit;
let target;          // rendu intermédiaire pour le glitch
let post;            // scène plein écran du glitch
let postCamera;
let edgeUniforms;
let postUniforms;
let disposables = [];
const glitch = { value: 0, next: 0, until: 0 };

/* ── Arêtes : impulsions de lumière qui courent le long des lignes ── */
const edgeVertex = /* glsl */ `
    attribute float lineDistance;
    varying float vDist;
    varying float vDepth;
    void main() {
        vDist = lineDistance;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
    }
`;

const edgeFragment = /* glsl */ `
    uniform vec3 uGold;
    uniform vec3 uWhite;
    uniform float uTime;
    uniform float uPulse;
    uniform float uGlow;
    uniform float uOpacity;
    varying float vDist;
    varying float vDepth;
    void main() {
        // Impulsion : un segment lumineux qui avance le long de chaque arête
        float p = fract(vDist * 0.35 - uTime * uPulse);
        float pulse = smoothstep(0.88, 1.0, p) * 1.4;
        // Les arêtes du fond s'estompent : lecture de la profondeur
        float depth = smoothstep(7.5, 4.0, vDepth);
        vec3 col = mix(uGold, uWhite, pulse * 0.6);
        gl_FragColor = vec4(col * uGlow, (0.35 + 0.65 * depth + pulse) * uOpacity);
    }
`;

/* ── Glitch plein écran ───────────────────────────────────────── */
const postVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const postFragment = /* glsl */ `
    uniform sampler2D tScene;
    uniform float uGlitch;     // 0 = image nette
    uniform float uSeed;
    uniform vec3 uRed;
    varying vec2 vUv;

    float hash(float n) { return fract(sin(n) * 43758.5453); }

    void main() {
        vec2 uv = vUv;
        // Tranches horizontales décalées, choisies au hasard à chaque salve
        float band = floor(uv.y * 24.0);
        float on = step(1.0 - uGlitch * 0.55, hash(band + uSeed));
        uv.x += (hash(band * 1.7 + uSeed) - 0.5) * 0.08 * on * uGlitch;

        // Séparation : la copie décalée est teintée du rouge de la DA (pas de RVB arc-en-ciel)
        float shift = 0.006 * uGlitch;
        vec4 base = texture2D(tScene, uv);
        vec4 ghost = texture2D(tScene, uv + vec2(shift, 0.0));
        vec3 col = base.rgb + uRed * ghost.a * 0.9 * uGlitch;
        float alpha = max(base.a, ghost.a * uGlitch * 0.8);

        // Fines lignes de balayage pendant la salve
        col *= 1.0 - uGlitch * 0.25 * step(0.5, fract(vUv.y * 180.0));
        gl_FragColor = vec4(col, alpha);
    }
`;

/* ── Construction ─────────────────────────────────────────────── */

function wireframe(geometry, uniforms) {
    const edges = new THREE.EdgesGeometry(geometry);
    const lines = new THREE.LineSegments(edges, new THREE.ShaderMaterial({
        uniforms, vertexShader: edgeVertex, fragmentShader: edgeFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    lines.computeLineDistances();
    const faces = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: new THREE.Color(uniforms.uGold.value.x, uniforms.uGold.value.y, uniforms.uGold.value.z),
        transparent: true, opacity: 0.035, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const obj = new THREE.Group();
    obj.add(faces, lines);
    disposables.push(geometry, edges, lines.material, faces.material);
    return obj;
}

export function init(canvas, options) {
    const cfg = MOTION.scenes.datseven;
    const { low, pixelRatio, colors } = options;

    renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: low ? 'low-power' : 'high-performance',
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);

    const vec = (c) => new THREE.Vector3(...c);
    // Couleurs passées telles quelles : la recomposition du glitch écrit les valeurs
    // sans conversion, comme les shaders des arêtes.
    const col = (c) => new THREE.Color().setRGB(...c);
    edgeUniforms = {
        uGold: { value: vec(colors.gold) },
        uWhite: { value: vec(colors.text) },
        uTime: { value: 0 },
        uPulse: { value: cfg.pulseSpeed },
        uGlow: { value: 1 },
        uOpacity: { value: 1 },
    };

    group = new THREE.Group();

    // Prisme pentagonal allongé, comme un cristal : 7 faces
    outer = wireframe(new THREE.CylinderGeometry(0.85, 0.85, 1.9, 5, 1), edgeUniforms);
    // Pyramide hexagonale, pointe vers le haut : 7 faces
    inner = wireframe(new THREE.ConeGeometry(0.5, 1.0, 6, 1), edgeUniforms);
    outer.children[0].material.color = col(colors.gold);
    inner.children[0].material.color = col(colors.gold);

    // 7 points en orbite
    const dots = new Float32Array(7 * 3);
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        dots.set([Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55], i * 3);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dots, 3));
    const dotMat = new THREE.PointsMaterial({
        color: col(colors.gold), size: 0.05, transparent: true, opacity: 0.9,
        depthWrite: false, blending: THREE.AdditiveBlending,
    });
    orbit = new THREE.Points(dotGeo, dotMat);
    orbit.rotation.x = 0.35;

    // Anneau très fin qui porte les 7 points
    const ringGeo = new THREE.RingGeometry(1.548, 1.552, 140);
    const ringMat = new THREE.MeshBasicMaterial({
        color: col(colors.gold), transparent: true, opacity: 0.18,
        side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    orbit.add(ring);

    group.add(outer, inner, orbit);
    scene.add(group);
    disposables.push(dotGeo, dotMat, ringGeo, ringMat);

    /* Glitch : on rend la scène dans une texture, puis on la recompose. */
    target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    postUniforms = {
        tScene: { value: target.texture },
        uGlitch: { value: 0 },
        uSeed: { value: 0 },
        uRed: { value: vec(colors.red) },
    };
    const postMat = new THREE.ShaderMaterial({
        uniforms: postUniforms, vertexShader: postVertex, fragmentShader: postFragment,
        // La texture contient déjà des couleurs prémultipliées : on la recopie telle quelle.
        blending: THREE.NoBlending, depthTest: false, depthWrite: false,
    });
    const postGeo = new THREE.PlaneGeometry(2, 2);
    post = new THREE.Scene();
    post.add(new THREE.Mesh(postGeo, postMat));
    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    disposables.push(target, postMat, postGeo);

    return { render, resize };
}

function resize(w, h) {
    if (!renderer || !w || !h) return;
    renderer.setSize(w, h, false);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    target.setSize(size.x, size.y);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

/* ── Animation ────────────────────────────────────────────────── */

function updateGlitch(time, hover) {
    const cfg = MOTION.scenes.datseven;
    // Salves brèves, espacées au hasard, uniquement quand le curseur est sur le hero
    if (hover > 0.5 && time > glitch.next) {
        glitch.until = time + 0.08 + Math.random() * 0.18;
        glitch.next = time + 0.7 + Math.random() * 1.8;
        postUniforms.uSeed.value = Math.random() * 100;
    }
    const active = time < glitch.until ? 1 : 0;
    // Re-tirage des tranches pendant la salve, pour un effet "numérique"
    if (active && Math.random() < 0.35) postUniforms.uSeed.value = Math.random() * 100;
    glitch.value += (active * cfg.glitch - glitch.value) * (active ? 0.6 : 0.25);
    postUniforms.uGlitch.value = glitch.value;
}

function render(time, dt, input) {
    if (!renderer) return;
    const cfg = MOTION.scenes.datseven;
    const s = input.scroll;
    const reveal = Math.min(1, time / cfg.revealDuration);
    const ease = 1 - Math.pow(1 - reveal, 3);

    const spin = time * cfg.rotationSpeed * (1 + s * 2.5);
    outer.rotation.set(0.25 + input.y * 0.25, spin, 0.1);
    inner.rotation.set(-0.2 - input.y * 0.2, -spin * 1.6, 0);
    orbit.rotation.y = spin * 0.5;
    group.rotation.z = input.x * -0.12;
    group.scale.setScalar(0.6 + ease * 0.4 + s * 0.25);

    edgeUniforms.uTime.value = time;
    edgeUniforms.uPulse.value = cfg.pulseSpeed;
    edgeUniforms.uGlow.value = 1 + s * 0.8;
    edgeUniforms.uOpacity.value = ease;

    // Composition : l'objet à droite au-dessus du nom (centré sur écran étroit)
    const narrow = camera.aspect < 1;
    const offsetX = narrow ? 0 : -1.6;
    camera.position.set(offsetX + input.x * 0.3, (narrow ? -0.4 : -0.55) + input.y * 0.2, narrow ? 8 : 6.2);
    camera.lookAt(offsetX, narrow ? -0.4 : -0.55, 0);

    updateGlitch(time, input.hover);

    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(post, postCamera);
}

export function destroy() {
    disposables.forEach((d) => d.dispose());
    disposables = [];
    renderer?.dispose();
    renderer = scene = camera = group = outer = inner = orbit = target = post = postCamera = undefined;
    edgeUniforms = postUniforms = undefined;
}
