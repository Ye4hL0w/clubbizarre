/* ============================================================
   SCÈNE MARIAM — éditoriale et typographique (Canvas 2D)

   La community manager raconte le collectif : ici, plus de photo,
   moins de 3D.
   - Son portrait occupe la droite du hero, traité en bichromie
     noir → or (comme une couverture de magazine), avec une légère
     parallaxe et une révélation par rideau.
   - Les mots du collectif flottent librement, puis se rangent
     régulièrement en mise en page éditoriale (colonne, puis grille
     indexée), avant de se disperser à nouveau.
   - Le curseur écarte les mots et dore ceux qu'il frôle ;
     au scroll, les mots montent plus vite et s'écartent.
   Pas de WebGL : du texte net, rendu par le navigateur.

   Réglages : MOTION.scenes.mariam dans js/core/config.js
   ============================================================ */

import { MOTION } from '../core/config.js';

// Le vocabulaire du collectif (modifiable librement)
const WORDS = [
    'Bizarre', 'Collectif', 'Nice', 'Techno', 'Nuit', 'Communauté',
    'Culture', 'Club', 'Montage', 'Publications', 'Standard', 'Scène', 'Vibes', 'Stories',
];

let ctx;
let canvas;
let state;

const rgb = (c, a = 1) => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/* ── Portrait en bichromie ─────────────────────────────────── */
function loadDuotone(url, colors) {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            const scale = Math.min(1, 1100 / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const off = document.createElement('canvas');
            off.width = w;
            off.height = h;
            const o = off.getContext('2d', { willReadFrequently: true });
            o.drawImage(img, 0, 0, w, h);
            const data = o.getImageData(0, 0, w, h);
            const d = data.data;
            const [br, bg, bb] = colors.bg;
            const [gr, gg, gb] = colors.gold;
            for (let i = 0; i < d.length; i += 4) {
                // Luminance → dégradé fond noir → or, contraste légèrement renforcé
                let l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
                l = Math.pow(clamp01((l - 0.06) / 0.88), 1.15);
                d[i] = (br + (gr - br) * l) * 255;
                d[i + 1] = (bg + (gg - bg) * l) * 255;
                d[i + 2] = (bb + (gb - bb) * l) * 255;
            }
            o.putImageData(data, 0, 0);
            resolve(off);
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

/* ── Cycle de vie ───────────────────────────────────────────── */

export async function init(target, options) {
    canvas = target;
    ctx = canvas.getContext('2d');
    const { low, pixelRatio, colors, photo } = options;

    const words = WORDS.map((text, i) => ({
        text: text.toUpperCase(),
        index: String(i + 1).padStart(2, '0'),
        // Styles alternés : plein, contour, or — comme une page de magazine
        style: i % 5 === 0 ? 'gold' : i % 3 === 0 ? 'outline' : 'fill',
        weight: i % 4 === 0 ? 1 : 0.55 + ((i * 37) % 10) / 22,   // taille relative
        seed: (i * 9301 + 49297) % 233280 / 233280,
        x: 0, y: 0, push: { x: 0, y: 0 }, glow: 0,
    }));

    state = {
        words,
        colors,
        pixelRatio: Math.min(pixelRatio, 2),
        low,
        w: 1,
        h: 1,
        photo: await loadDuotone(photo, colors),
    };
    return { render, resize };
}

function resize(w, h) {
    if (!ctx || !w || !h) return;
    state.w = w;
    state.h = h;
    canvas.width = Math.round(w * state.pixelRatio);
    canvas.height = Math.round(h * state.pixelRatio);
}

/* ── Mise en page ──────────────────────────────────────────── */

/**
 * Zones : la photo garde son vrai format (pas de recadrage hasardeux),
 * le texte occupe l'espace restant. Tout s'arrête au-dessus du nom.
 */
function zones() {
    const { w, h, photo } = state;
    const wide = w / h > 1;
    const aspect = photo ? photo.width / photo.height : 0.75;
    // Haut : sous la barre de navigation (≈ 90 px) avec une marge.
    // Les mots s'arrêtent au-dessus du nom ; la photo, elle, descend
    // derrière le nom, comme une couverture de magazine.
    const top = Math.max(h * 0.16, wide ? 120 : 100);
    const bottom = h * (wide ? 0.57 : 0.64);
    const photoBottom = h * 0.94;
    if (wide) {
        const ph = photoBottom - top;
        const pw = ph * aspect;
        const photoRect = { x: w * 0.93 - pw, y: top, w: pw, h: ph };
        const textX = w * 0.06;
        return {
            text: { x: textX, y: top, w: photoRect.x - w * 0.05 - textX, h: bottom - top },
            photo: photoRect,
            wide,
        };
    }
    return {
        text: { x: w * 0.06, y: top, w: w * 0.88, h: bottom - top },
        photo: { x: 0, y: top - 30, w, h: photoBottom - top + 30 },
        wide,
    };
}

/** Position d'un mot dans chacun des trois états : libre, colonnes, grille. */
function layouts(word, i, n, time, zone) {
    const t = time * MOTION.scenes.mariam.drift;
    // Libre : chaque mot a sa "case" dans une grille décalée et y dérive
    // doucement — ça flotte sans que les mots s'empilent.
    const rows = Math.ceil(n / 2);
    const cellW = zone.w / 2;
    const cellH = zone.h / rows;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const free = {
        x: zone.x + col * cellW + (row % 2) * cellW * 0.18 + cellW * 0.12 * (1 + Math.sin(t * 0.23 + word.seed * 12.0)),
        y: zone.y + (row + 0.8) * cellH + cellH * 0.35 * Math.cos(t * 0.19 + word.seed * 7.0 + i),
    };
    // Colonnes : deux listes alignées à gauche
    const half = Math.ceil(n / 2);
    const lineH = zone.h / half;
    const column = {
        x: zone.x + (i < half ? 0 : zone.w * 0.52),
        y: zone.y + ((i % half) + 0.8) * lineH,
    };
    // Grille : 3 colonnes indexées
    const cols = 3;
    const grid = {
        x: zone.x + (i % cols) * (zone.w / cols),
        y: zone.y + (Math.floor(i / cols) + 0.8) * (zone.h / Math.ceil(n / cols)),
    };
    // Largeur disponible pour le mot dans chaque état (pour ajuster sa taille)
    const room = { free: cellW * 1.15, column: zone.w * 0.46, grid: (zone.w / cols) * 0.9 };
    const lines = { free: cellH, column: lineH, grid: zone.h / Math.ceil(n / cols) };
    return { free, column, grid, room, lines };
}

/* ── Rendu ─────────────────────────────────────────────────── */

function render(time, dt, input) {
    if (!ctx) return;
    const cfg = MOTION.scenes.mariam;
    const { w, h, words, colors, photo } = state;
    const z = zones();
    const s = input.scroll;
    const reveal = clamp01(time / cfg.revealDuration);

    ctx.setTransform(state.pixelRatio, 0, 0, state.pixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    /* Portrait : rideau qui se lève + parallaxe */
    if (photo) {
        const r = z.photo;
        const open = easeInOut(clamp01(reveal * 1.3));
        const cover = Math.max(r.w / photo.width, r.h / photo.height) * (1.08 + s * 0.1);
        const pw = photo.width * cover;
        const ph = photo.height * cover;
        const px = r.x + (r.w - pw) / 2 - input.x * 14 * input.hover;
        // Ancrage vers le haut : on garde le visage dans le cadre
        const py = r.y + (r.h - ph) * 0.2 + input.y * 10 * input.hover - s * 60;
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y + r.h * (1 - open), r.w, r.h * open);
        ctx.clip();
        ctx.globalAlpha = z.wide ? 0.95 : 0.35;      // sur mobile, la photo passe en fond
        ctx.drawImage(photo, px, py, pw, ph);
        ctx.restore();
        // Fondu du bord gauche et du bas vers le fond
        const fadeL = ctx.createLinearGradient(r.x, 0, r.x + r.w * 0.35, 0);
        fadeL.addColorStop(0, rgb(colors.bg, 1));
        fadeL.addColorStop(1, rgb(colors.bg, 0));
        ctx.fillStyle = fadeL;
        ctx.fillRect(r.x - 1, r.y, r.w * 0.35 + 1, r.h);
        const fadeB = ctx.createLinearGradient(0, r.y + r.h * 0.65, 0, r.y + r.h);
        fadeB.addColorStop(0, rgb(colors.bg, 0));
        fadeB.addColorStop(1, rgb(colors.bg, 1));
        ctx.fillStyle = fadeB;
        ctx.fillRect(r.x, r.y + r.h * 0.65, r.w, r.h * 0.35 + 1);
        // Liseré doré éditorial
        ctx.strokeStyle = rgb(colors.gold, 0.25 * open);
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + r.h * (1 - open) + 0.5, r.w - 1, r.h * open - 1);
    }

    /* Cycle des mises en page : libre → colonne → libre → grille → … */
    const period = cfg.cycle;
    const phase = (time % (period * 4)) / period;           // 0 → 4
    const slot = Math.floor(phase);
    const local = phase - slot;
    // Part "rangée" : monte en début de slot impair, redescend à la fin
    const ordered = slot % 2 === 1 ? easeInOut(clamp01(local / 0.25)) * (1 - easeInOut(clamp01((local - 0.75) / 0.25))) : 0;
    const which = slot === 1 ? 'column' : 'grid';

    const base = Math.min(w, h * 1.4);
    const n = words.length;
    words.forEach((word, i) => {
        const L = layouts(word, i, n, time, z.text);
        const tgt = L[which];
        let x = L.free.x + (tgt.x - L.free.x) * ordered;
        let y = L.free.y + (tgt.y - L.free.y) * ordered - s * h * 0.25 * (0.5 + word.seed);

        // Taille : variée en liberté, homogène une fois rangés, et toujours
        // contenue dans la place disponible (largeur de la case, hauteur de ligne)
        if (!word.ratio) {
            ctx.font = '700 100px Syncopate, sans-serif';
            word.ratio = ctx.measureText(word.text).width / 100;
        }
        const fit = (want, key) => Math.min(want, L.room[key] / word.ratio, L.lines[key] * 0.62);
        const freeSize = fit(base * 0.03 * (0.7 + word.weight * 1.3), 'free');
        const orderedSize = fit(base * (which === 'column' ? 0.026 : 0.022), which);
        const size = freeSize + (orderedSize - freeSize) * ordered;

        // Le curseur écarte et dore les mots proches
        const mx = (input.x * 0.5 + 0.5) * w;
        const my = (-input.y * 0.5 + 0.5) * h;
        const dx = x - mx;
        const dy = y - my;
        const dist = Math.hypot(dx, dy) || 1;
        const near = Math.max(0, 1 - dist / 180) * input.hover;
        word.push.x += ((dx / dist) * near * cfg.repel - word.push.x) * 0.12;
        word.push.y += ((dy / dist) * near * cfg.repel - word.push.y) * 0.12;
        word.glow += (near - word.glow) * 0.15;
        x += word.push.x;
        y += word.push.y;

        // Apparition échelonnée
        const appear = easeInOut(clamp01(reveal * 1.6 - i * 0.05));
        if (appear <= 0) return;

        ctx.font = `700 ${size.toFixed(1)}px Syncopate, sans-serif`;
        ctx.textBaseline = 'alphabetic';
        // Le mot reste dans sa zone : il ne déborde jamais sur la photo
        const textW = ctx.measureText(word.text).width;
        x = Math.min(x, z.text.x + z.text.w - textW);
        x = Math.max(x, z.text.x);
        const alpha = appear * (0.55 + 0.45 * ordered);
        const goldMix = Math.min(1, word.glow * 1.5);

        if (word.style === 'outline' && goldMix < 0.5) {
            ctx.strokeStyle = rgb(colors.text, alpha * 0.55);
            ctx.lineWidth = 1;
            ctx.strokeText(word.text, x, y + (1 - appear) * 20);
        } else {
            const c = word.style === 'gold' || goldMix > 0.5 ? colors.gold : colors.text;
            ctx.fillStyle = rgb(c, alpha * (word.style === 'fill' ? 0.75 : 0.95));
            ctx.fillText(word.text, x, y + (1 - appear) * 20);
        }

        // Index éditorial (01, 02…) quand les mots sont rangés
        if (ordered > 0.05) {
            ctx.font = `400 ${Math.max(9, size * 0.32).toFixed(1)}px Outfit, sans-serif`;
            ctx.fillStyle = rgb(colors.gold, ordered * appear * 0.8);
            ctx.fillText(word.index, x, y - size * 0.95);
        }
    });
}

export function destroy() {
    if (ctx && state) ctx.clearRect(0, 0, state.w, state.h);
    ctx = canvas = state = undefined;
}
