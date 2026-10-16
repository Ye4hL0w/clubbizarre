/* ============================================================
   PAGE EVENTS — liste façon "tracklist"

   Sources : événements publics Shotgun (API) + événements ajoutés
   à la main dans js/data/events.js, triés par date.
   - Chaque ligne : grande date, titre, line-up, lieu, prix, lien billets.
   - La bannière de l'événement est toujours visible dans la ligne.
   - Survol / focus : la ligne glisse, un filet doré la souligne et la
     bannière s'anime légèrement (rien n'est caché sans survol).
   ============================================================ */

import { SHOTGUN, MANUAL_EVENTS } from '../data/events.js';
import { revealIn } from '../core/reveal.js';
import { pageEntered } from '../core/transitions.js';

const container = document.getElementById('events-container');
const TZ = 'Europe/Paris';

load().then((events) => {
    render(events);
    pageEntered.then(() => revealIn(container));
    window.CB?.refreshMagnetic?.(container.parentElement);
});

/* ── Données ─────────────────────────────────────────────────── */

async function load() {
    let fromShotgun = [];
    try {
        const url = `https://smartboard-api.shotgun.live/api/shotgun/organizers/${SHOTGUN.organizerId}/events?key=${SHOTGUN.key}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`API Shotgun : ${res.status}`);
        const json = await res.json();
        fromShotgun = (json.data || [])
            .filter((e) => !['private', 'hidden'].includes(e.visibility) && e.isPrivate !== true)
            .map(fromApi);
    } catch (err) {
        console.warn('[CB] Événements Shotgun indisponibles, seuls les événements manuels sont affichés.', err);
        container.dataset.error = '1';
    }

    const now = Date.now();
    return [...fromShotgun, ...MANUAL_EVENTS.map(fromManual)]
        .filter((e) => !e.date || e.date.getTime() > now - 12 * 3600e3)   // passés depuis +12 h : masqués
        .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));
}

/** Format commun à partir d'un événement de l'API Shotgun. */
function fromApi(e) {
    const prices = (e.deals || []).map((d) => d.price).filter((p) => p != null);
    const geo = e.geolocation || {};
    return {
        title: e.name || 'Club Bizarre',
        date: e.startTime ? new Date(e.startTime) : null,
        venue: geo.venue || geo.name || geo.street || '',
        city: geo.city || '',
        url: e.url || `https://shotgun.live/events/${e.slug || e.id || ''}`,
        image: e.coverUrl || e.coverThumbnailUrl || '',
        artists: (e.artists || []).map((a) => a.name),
        genres: (e.genres || []).map((g) => g.name),
        price: prices.length ? Math.max(Math.min(...prices), SHOTGUN.minPrice) : null,
        ticketsLeft: e.leftTicketsCount ?? null,
        cancelled: Boolean(e.cancelledAt || e.canceledAt),
    };
}

/** Format commun à partir d'un événement saisi dans js/data/events.js. */
function fromManual(e) {
    return {
        title: e.title || 'Club Bizarre',
        date: e.date ? new Date(e.date) : null,
        venue: e.venue || '',
        city: e.city || '',
        url: e.url || SHOTGUN.pageUrl,
        image: e.image || '',
        artists: e.artists || [],
        genres: e.genres || [],
        price: e.price ?? null,
        ticketsLeft: e.soldOut ? 0 : null,
        cancelled: Boolean(e.cancelled),
    };
}

/* ── Rendu ───────────────────────────────────────────────────── */

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (date, opts) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...opts }).format(date);

function render(events) {
    const cta = `
        <div class="events-cta" data-reveal="up">
            <a class="btn primary-btn" href="${SHOTGUN.pageUrl}" target="_blank" rel="noopener noreferrer" data-cursor="SHOTGUN">
                Tous nos événements sur Shotgun
            </a>
        </div>`;

    if (!events.length) {
        const msg = container.dataset.error
            ? 'La billetterie est momentanément indisponible.'
            : 'Aucun événement annoncé pour le moment. La prochaine date arrive bientôt.';
        container.innerHTML = `<p class="events-empty" data-reveal="up">${msg}</p>${cta}`;
        return;
    }

    container.innerHTML = `
        <ol class="tracklist" data-reveal="stagger" aria-label="Prochains événements">
            ${events.map(row).join('')}
        </ol>
        ${cta}`;
}

function row(e, i) {
    const date = e.date
        ? `<span class="track__day">${fmt(e.date, { day: '2-digit' })}</span>
           <span class="track__month">${fmt(e.date, { month: 'short' }).replace('.', '')}</span>
           <span class="track__when">${fmt(e.date, { weekday: 'short' }).replace('.', '')} · ${fmt(e.date, { hour: '2-digit', minute: '2-digit' })}</span>`
        : '<span class="track__day">—</span><span class="track__month">À venir</span>';

    const place = [e.venue, e.city].filter(Boolean).join(', ') || 'Lieu dévoilé bientôt';
    const lineup = e.artists.length ? e.artists.join(' · ') : '';

    let status = '';
    if (e.cancelled) status = '<span class="track__status track__status--off">Annulé</span>';
    else if (e.ticketsLeft === 0) status = '<span class="track__status">Complet</span>';
    else if (e.ticketsLeft !== null && e.ticketsLeft < 50) status = `<span class="track__status track__status--hot">Plus que ${e.ticketsLeft} places</span>`;
    const price = !e.cancelled && e.price != null ? `<span class="track__price">dès ${String(e.price).replace('.', ',')} €</span>` : '';
    const action = e.cancelled ? 'Annulé' : e.ticketsLeft === 0 ? 'Liste d’attente' : 'Billets';

    const inner = `
        <span class="track__index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <span class="track__date">${date}</span>
        <span class="track__main">
            <span class="track__title">${esc(e.title)}</span>
            ${lineup ? `<span class="track__lineup">${esc(lineup)}</span>` : ''}
            <span class="track__place">${esc(place)}</span>
        </span>
        <span class="track__side">${price}${status}</span>
        <span class="track__cta" aria-hidden="true">${action}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17 17 7M9 7h8v8"/></svg>
        </span>
        <span class="track__banner" aria-hidden="true">
            ${e.image
                ? `<img src="${esc(e.image)}" alt="" loading="lazy" decoding="async">`
                : '<span class="track__banner-empty">Club Bizarre</span>'}
        </span>`;

    // Ligne entière cliquable (sauf événement annulé)
    return e.cancelled
        ? `<li class="track track--off" aria-disabled="true">${inner}</li>`
        : `<li><a class="track" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer"
               data-cursor="${action.toUpperCase()}"
               aria-label="${esc(`${e.title}, ${e.date ? fmt(e.date, { dateStyle: 'full', timeStyle: 'short' }) : 'date à venir'}, ${place} — ${action}`)}">${inner}</a></li>`;
}
