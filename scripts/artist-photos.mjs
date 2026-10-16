#!/usr/bin/env node
/* ============================================================
   Liste les photos des artistes et génère js/data/artist-photos.js

   Usage (depuis la racine du projet) :
       node scripts/artist-photos.mjs

   Pour chaque dossier assets/artistes/<slug>/ :
   - lit toutes les images (jpg, jpeg, png, webp, avif), triées par nom
     → la PREMIÈRE devient le portrait, les autres la galerie ;
   - lit leurs dimensions (pour width/height, pas de saut de mise en page) ;
   - sur Mac, crée une version web allégée dans <slug>/_web/ quand c'est
     utile (JPEG ≤ 1600 px pour les grosses photos sans transparence).
   Aucune dépendance à installer.
   ============================================================ */

import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS_DIR = join(ROOT, 'assets', 'artistes');
const OUTPUT = join(ROOT, 'js', 'data', 'artist-photos.js');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const MAX_SIZE = 1600;            // px, plus grand côté des versions web
const OPTIMIZE_ABOVE = 350 * 1024; // octets : en dessous, on garde l'original
const HAS_SIPS = (() => {
    try { execFileSync('sips', ['--help'], { stdio: 'ignore' }); return true; } catch { return false; }
})();

/* ── Dimensions sans dépendance (PNG, JPEG, WebP) ──────────── */
function readImageInfo(file) {
    const buf = readFileSync(file);
    // PNG : IHDR
    if (buf.readUInt32BE(0) === 0x89504e47) {
        const colorType = buf[25];
        const hasAlpha = colorType === 4 || colorType === 6 || buf.includes(Buffer.from('tRNS'));
        return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), hasAlpha };
    }
    // JPEG : segments SOFn
    if (buf[0] === 0xff && buf[1] === 0xd8) {
        let i = 2;
        while (i < buf.length) {
            if (buf[i] !== 0xff) { i++; continue; }
            const marker = buf[i + 1];
            const len = buf.readUInt16BE(i + 2);
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
                return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), hasAlpha: false };
            }
            i += 2 + len;
        }
    }
    // WebP : VP8 / VP8L / VP8X
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
        const chunk = buf.toString('ascii', 12, 16);
        if (chunk === 'VP8X') {
            return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), hasAlpha: Boolean(buf[20] & 0x10) };
        }
        if (chunk === 'VP8L') {
            const b = buf.readUInt32LE(21);
            return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1, hasAlpha: true };
        }
        if (chunk === 'VP8 ') {
            return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, hasAlpha: false };
        }
    }
    return null; // format non lu (ex. AVIF) : la page utilisera un ratio par défaut
}

/* ── Version web (Mac uniquement, via sips intégré à macOS) ── */
function makeWebVersion(slugDir, file, info) {
    const src = join(slugDir, file);
    const size = statSync(src).size;
    const tooBig = size > OPTIMIZE_ABOVE || Math.max(info.w, info.h) > MAX_SIZE;
    if (!HAS_SIPS || !tooBig || info.hasAlpha) return null; // transparence : on garde le PNG

    const outDir = join(slugDir, '_web');
    const outName = `${basename(file, extname(file))}.jpg`;
    const out = join(outDir, outName);
    mkdirSync(outDir, { recursive: true });

    // Ne régénère que si l'original est plus récent.
    if (!existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs) {
        const args = ['-s', 'format', 'jpeg', '-s', 'formatOptions', '78'];
        if (Math.max(info.w, info.h) > MAX_SIZE) args.push('-Z', String(MAX_SIZE));
        execFileSync('sips', [...args, src, '--out', out], { stdio: 'ignore' });
    }
    const outInfo = readImageInfo(out);
    return { src: `_web/${outName}`, w: outInfo.w, h: outInfo.h };
}

/* ── Parcours ───────────────────────────────────────────────── */
const natural = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
const result = {};

for (const slug of readdirSync(PHOTOS_DIR).sort()) {
    const slugDir = join(PHOTOS_DIR, slug);
    if (!statSync(slugDir).isDirectory()) continue;

    const files = readdirSync(slugDir)
        .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()) && !f.startsWith('.'))
        .sort(natural.compare);

    result[slug] = files.map((file) => {
        const info = readImageInfo(join(slugDir, file));
        if (!info) return { src: file, w: null, h: null };
        return makeWebVersion(slugDir, file, info) || { src: file, w: info.w, h: info.h };
    });

    const count = result[slug].length;
    console.log(`${slug.padEnd(18)} ${count} photo${count > 1 ? 's' : ''}`);
}

const banner = `/* ============================================================
   PHOTOS DES ARTISTES — FICHIER GÉNÉRÉ, NE PAS ÉDITER À LA MAIN.
   Régénérer avec :  node scripts/artist-photos.mjs
   1re photo = portrait, les suivantes = galerie (ordre alphabétique
   des fichiers : préfixez 01-, 02-… pour choisir l'ordre).
   ============================================================ */

`;
writeFileSync(OUTPUT, `${banner}export const PHOTOS = ${JSON.stringify(result, null, 4)};\n`);
console.log(`\n→ ${OUTPUT.replace(ROOT + '/', '')} mis à jour.`);
