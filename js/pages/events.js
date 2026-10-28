/* ============================================================
   PAGE EVENTS — liste façon "tracklist"

   Sources : événements publics Shotgun (API) + événements ajoutés
   à la main dans js/data/events.js, triés par date.
   - À venir : liste façon tracklist (ci-dessous).
   - Terminés : basculent tout seuls dans « Past Events », en cartes
     avec la bannière Shotgun, du plus récent au plus ancien.
   - Chaque ligne : grande date, titre, line-up, lieu, prix, lien billets.
   - La bannière de l'événement est toujours visible dans la ligne.
   - Survol / focus : la ligne glisse, un filet doré la souligne et la
     bannière s'anime légèrement (rien n'est caché sans survol).
   ============================================================ */

import { SHOTGUN, MANUAL_EVENTS } from '../data/events.js';
import { revealIn } from '../core/reveal.js';
import { splitRoll } from '../core/roll.js';
import { pageEntered } from '../core/transitions.js';

const container = document.getElementById('events-container');
const TZ = 'Europe/Paris';

load().then(({ upcoming, past }) => {
    render(upcoming, past);
    addStructuredData([...upcoming, ...past]);
    const cta = container.querySelector('.events-cta .btn');
    splitRoll(cta?.querySelector('.btn__label'), cta);
    pageEntered.then(() => revealIn(container));
    window.CB?.refreshMagnetic?.(container.parentElement);
});

/* ── Données ─────────────────────────────────────────────────── */

async function load() {
    let fromShotgun = [];
    try {
        // Deux appels : événements à venir, puis événements passés.
        const base = `https://smartboard-api.shotgun.live/api/shotgun/organizers/${SHOTGUN.organizerId}/events?key=${SHOTGUN.key}`;
        const lists = await Promise.all([base, `${base}&past_events=true`].map(async (url) => {
            const res = await fetch(url, { headers: { Accept: 'application/json' } });
            if (!res.ok) throw new Error(`API Shotgun : ${res.status}`);
            return (await res.json()).data || [];
        }));
        const seen = new Set();
        fromShotgun = lists.flat()
            .filter((e) => !['private', 'hidden'].includes(e.visibility) && e.isPrivate !== true)
            .filter((e) => !seen.has(e.id) && seen.add(e.id))
            .map(fromApi);
    } catch (err) {
        console.warn('[CB] Événements Shotgun indisponibles, seuls les événements manuels sont affichés.', err);
        container.dataset.error = '1';
    }

    // Terminé = heure de fin dépassée (à défaut, 12 h après le début).
    const now = Date.now();
    const ended = (e) => e.date && (e.end?.getTime() ?? e.date.getTime() + 12 * 3600e3) < now;
    const all = [...fromShotgun, ...MANUAL_EVENTS.map(fromManual)];
    return {
        upcoming: all.filter((e) => !ended(e))
            .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity)),
        past: all.filter((e) => ended(e) && !e.cancelled)
            .sort((a, b) => b.date - a.date),
    };
}

/** Format commun à partir d'un événement de l'API Shotgun. */
function fromApi(e) {
    const prices = (e.deals || []).map((d) => d.price).filter((p) => p != null);
    const geo = e.geolocation || {};
    return {
        title: e.name || 'Club Bizarre',
        date: e.startTime ? new Date(e.startTime) : null,
        end: e.endTime ? new Date(e.endTime) : null,
        venue: geo.venue || geo.name || geo.street || '',
        city: geo.city || '',
        street: geo.street || '',
        zip: geo.zipCode || geo.postalCode || '',
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
        end: null,
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

/* ── Données structurées (Google : résultats enrichis « Événements ») ── */

function addStructuredData(events) {
    const site = 'https://clubbizarre.vercel.app/';
    const org = { '@type': 'MusicGroup', name: 'Club Bizarre', url: site };
    const graph = events.filter((e) => e.date).map((e) => ({ e, lineup: e.artists.filter((a) => a.toLowerCase() !== 'club bizarre') })).map(({ e, lineup }) => ({
        '@type': 'MusicEvent',
        name: e.title,
        startDate: e.date.toISOString(),
        ...(e.end && { endDate: e.end.toISOString() }),
        eventStatus: `https://schema.org/${e.cancelled ? 'EventCancelled' : 'EventScheduled'}`,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
            '@type': 'Place',
            name: e.venue || e.city || 'French Riviera',
            address: {
                '@type': 'PostalAddress',
                ...(e.street && { streetAddress: e.street }),
                ...(e.zip && { postalCode: e.zip }),
                addressLocality: e.city || 'Nice',
                addressCountry: 'FR',
            },
        },
        ...(e.image && { image: [e.image] }),
        description: `${e.title}, a Club Bizarre night${e.city ? ` in ${e.city}` : ''} on the French Riviera.`,
        organizer: org,
        performer: lineup.length ? lineup.map((name) => ({ '@type': 'Person', name })) : org,
        offers: {
            '@type': 'Offer',
            url: e.url,
            ...(e.price != null && { price: e.price, priceCurrency: 'EUR' }),
            availability: `https://schema.org/${e.ticketsLeft === 0 ? 'SoldOut' : 'InStock'}`,
        },
    }));
    if (!graph.length) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.append(script);
}

/* ── Rendu ───────────────────────────────────────────────────── */

const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (date, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(date);

function render(upcoming, past) {
    const cta = `
        <div class="events-cta" data-reveal="up">
            <a class="btn primary-btn" href="${SHOTGUN.pageUrl}" target="_blank" rel="noopener noreferrer" data-cursor="SHOTGUN">
                <span class="btn__label">All our events</span>
                <svg class="btn__arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
            </a>
        </div>`;

    const next = upcoming.length
        ? `<ol class="tracklist" data-reveal="stagger" aria-label="Upcoming events">
               ${upcoming.map(row).join('')}
           </ol>`
        : `<p class="events-empty" data-reveal="up">${container.dataset.error
            ? 'Ticketing is temporarily unavailable.'
            : 'No events announced yet. The next date is coming soon.'}</p>`;

    const archive = past.length
        ? `<section class="past-events" aria-labelledby="past-events-title">
               <h2 class="section-title" id="past-events-title">PAST EVENTS</h2>
               <ul class="past-grid" data-reveal="stagger">${past.map(card).join('')}</ul>
           </section>`
        : '';

    container.innerHTML = `${next}${cta}${archive}`;
}

/** Carte d'un événement passé : bannière, date, titre, lieu, line-up. */
function card(e) {
    const place = [e.venue, e.city].filter(Boolean).join(', ');
    const lineup = e.artists.filter((a) => a.toLowerCase() !== 'club bizarre').join(' · ');
    const banner = e.image
        ? `<img src="${esc(e.image)}" alt="" loading="lazy" decoding="async">`
        : '<span class="track__banner-empty">Club Bizarre</span>';
    return `
        <li><a class="past-card" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer" data-cursor="VIEW"
               aria-label="${esc(`${e.title}, ${fmt(e.date, { dateStyle: 'long' })}${place ? `, ${place}` : ''}`)}">
            <span class="past-card__banner">${banner}</span>
            <span class="past-card__body">
                <span class="past-card__date">${fmt(e.date, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <span class="past-card__title">${esc(e.title)}</span>
                ${place ? `<span class="past-card__place">${esc(place)}</span>` : ''}
                ${lineup ? `<span class="past-card__lineup">${esc(lineup)}</span>` : ''}
            </span>
            <svg class="past-card__arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
        </a></li>`;
}

function row(e, i) {
    const date = e.date
        ? `<span class="track__day">${fmt(e.date, { day: '2-digit' })}</span>
           <span class="track__month">${fmt(e.date, { month: 'short' }).replace('.', '')}</span>
           <span class="track__when">${fmt(e.date, { weekday: 'short' }).replace('.', '')} · ${fmt(e.date, { hour: '2-digit', minute: '2-digit' })}</span>`
        : '<span class="track__day">—</span><span class="track__month">TBA</span>';

    const place = [e.venue, e.city].filter(Boolean).join(', ') || 'Venue revealed soon';
    const lineup = e.artists.length ? e.artists.join(' · ') : '';

    let status = '';
    if (e.cancelled) status = '<span class="track__status track__status--off">Cancelled</span>';
    else if (e.ticketsLeft === 0) status = '<span class="track__status">Sold out</span>';
    else if (e.ticketsLeft !== null && e.ticketsLeft < 50) status = `<span class="track__status track__status--hot">Only ${e.ticketsLeft} tickets left</span>`;
    const price = !e.cancelled && e.price != null ? `<span class="track__price">from €${e.price}</span>` : '';
    const action = e.cancelled ? 'Cancelled' : e.ticketsLeft === 0 ? 'Waitlist' : 'Tickets';

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
               aria-label="${esc(`${e.title}, ${e.date ? fmt(e.date, { dateStyle: 'full', timeStyle: 'short' }) : 'date TBA'}, ${place} — ${action}`)}">${inner}</a></li>`;
}
