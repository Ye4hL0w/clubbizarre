#!/usr/bin/env node
/* ============================================================
   Serveur de développement avec rechargement automatique.
   Aucune dépendance à installer.

   Usage (depuis la racine du projet) :
       node scripts/dev-server.mjs            # http://localhost:5175
       node scripts/dev-server.mjs 8080       # autre port

   - Sert le site tel quel (même arborescence que sur Vercel).
   - Dès qu'un fichier change, le navigateur se met à jour :
     le CSS est échangé à chaud (sans recharger la page),
     tout le reste recharge la page.
   - Prend en charge les requêtes Range (lecture vidéo sous Safari).
   Ne sert que pour le développement : rien n'est ajouté au site déployé.
   ============================================================ */

import { createServer } from 'node:http';
import { createReadStream, statSync, watch } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 5175;
const IGNORED = /(^|\/)(\.git|node_modules|\.DS_Store|\.claude)(\/|$)/;

const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.avif': 'image/avif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};

/* Script injecté dans chaque page HTML (uniquement en développement) */
const CLIENT = `
<script>
(() => {
    const es = new EventSource('/__reload');
    es.onmessage = (e) => {
        if (e.data === 'css') {
            document.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
                if (!l.href.startsWith(location.origin)) return;
                const u = new URL(l.href); u.searchParams.set('_r', Date.now());
                const n = l.cloneNode(); n.href = u.href;
                n.onload = () => l.remove(); l.after(n);
            });
        } else {
            location.reload();
        }
    };
})();
</script>`;

/* ── Rechargement : fs.watch → événements SSE ──────────────── */
const clients = new Set();
let timer = null;
let pending = 'css';

watch(ROOT, { recursive: true }, (_event, file) => {
    if (!file || IGNORED.test(file.replaceAll('\\', '/'))) return;
    if (!file.endsWith('.css')) pending = 'full';
    clearTimeout(timer);
    timer = setTimeout(() => {
        clients.forEach((res) => res.write(`data: ${pending}\n\n`));
        console.log(`↻ ${pending === 'css' ? 'CSS' : 'rechargement'} (${file})`);
        pending = 'css';
    }, 80);
});

/* ── Serveur statique ───────────────────────────────────────── */
createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/__reload') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write('retry: 500\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
    }

    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(ROOT, path);
    try {
        if (statSync(file).isDirectory()) file = join(file, 'index.html');
        const stat = statSync(file);
        const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';

        // Pages HTML : on injecte le client de rechargement
        if (type.startsWith('text/html')) {
            const chunks = [];
            createReadStream(file).on('data', (c) => chunks.push(c)).on('end', () => {
                let html = Buffer.concat(chunks).toString('utf8');
                html = html.includes('</body>') ? html.replace('</body>', `${CLIENT}</body>`) : html + CLIENT;
                res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
                res.end(html);
            });
            return;
        }

        // Requêtes Range (vidéos)
        const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
        const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
        if (range) {
            const start = range[1] ? Number(range[1]) : 0;
            const end = range[2] ? Number(range[2]) : stat.size - 1;
            res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
            createReadStream(file, { start, end }).pipe(res);
        } else {
            res.writeHead(200, { ...headers, 'Content-Length': stat.size });
            createReadStream(file).pipe(res);
        }
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404');
    }
}).listen(PORT, () => {
    console.log(`Club Bizarre — http://localhost:${PORT}  (rechargement automatique)`);
});
