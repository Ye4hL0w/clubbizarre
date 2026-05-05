const ORGANIZER_ID = '241189';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJJZCI6NjM1NjYsIm9yZ2FuaXplcklkIjoyNDExODksImZvcmVzdFVzZXJFbWFpbCI6bnVsbCwiaWF0IjoxNzc3OTgzNzUzfQ.Y2D0ovEi3xUzHBATT4QeuR0asuS7adgor3KUhAUWRuM';

document.addEventListener('DOMContentLoaded', () => {
    fetchEvents();
});

async function fetchEvents() {
    const container = document.getElementById('events-container');

    try {
        const response = await fetch(`https://smartboard-api.shotgun.live/api/shotgun/organizers/${ORGANIZER_ID}/events?key=${TOKEN}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        let events = data.data || [];

        // Filtrer uniquement les événements privés/cachés
        events = events.filter(event => {
            // Exclure les événements privés ou cachés
            if (event.visibility === 'private' || event.visibility === 'hidden' || event.status === 'private' || event.isPrivate === true) {
                return false;
            }
            return true;
        });

        if (events.length === 0) {
            container.innerHTML = `
                <div class="error-message" style="background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.1); color: var(--text-secondary);">
                    <p>Aucun événement disponible pour le moment.</p>
                </div>
            `;
            return;
        }

        renderEvents(events, container);

    } catch (error) {
        console.error('Erreur lors de la récupération des événements:', error);
        
        // En cas d'erreur réseau, on affiche des mocks pour illustrer la DA
        renderMockEvents(container);
    }
}

function renderEvents(events, container) {
    let html = '<div class="events-grid">';

    events.forEach(event => {
        const title = event.name || 'Événement Club Bizarre';
        const date = event.startTime;
        const formattedDate = date ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'Date à venir';
        
        let locationName = 'Lieu secret';
        if (event.geolocation) {
            const parts = [];
            if (event.geolocation.street) parts.push(event.geolocation.street);
            if (event.geolocation.city) parts.push(event.geolocation.city);
            if (parts.length > 0) locationName = parts.join(', ');
        }
        
        const imageUrl = event.coverUrl || event.coverThumbnailUrl || '../logo.png';
        const shotgunUrl = event.url || `https://shotgun.live/events/${event.slug || event.id || ''}`;

        const genres = event.genres ? event.genres.map(g => g.name) : [];
        const artists = event.artists ? event.artists.map(a => a.name).join(', ') : '';
        const ticketsLeft = event.leftTicketsCount !== undefined ? event.leftTicketsCount : null;
        const isCancelled = !!(event.cancelledAt || event.canceledAt);
        
        let lowestPrice = null;
        if (event.deals && event.deals.length > 0) {
            const prices = event.deals.map(d => d.price).filter(p => p !== undefined && p !== null);
            if (prices.length > 0) {
                lowestPrice = Math.min(...prices);
            }
        }

        html += createEventCardHtml({
            title,
            date: formattedDate,
            location: locationName,
            imageUrl,
            shotgunUrl,
            genres,
            artists,
            ticketsLeft,
            lowestPrice,
            isCancelled
        });
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderMockEvents(container) {
    const mockEvents = [
        {
            title: "CLUB BIZARRE : THE AWAKENING",
            date: "samedi 24 octobre 2026 à 23:00",
            location: "Nouveau Casino, Paris",
            imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop",
            shotgunUrl: "https://shotgun.live/",
            genres: ["electro", "techno"],
            artists: "Marcolino, DJ TREE, Gabbs",
            ticketsLeft: 124,
            lowestPrice: 15
        },
        {
            title: "Bizarre Session #04",
            date: "vendredi 13 novembre 2026 à 22:00",
            location: "Le Rex Club, Paris",
            imageUrl: "https://images.unsplash.com/photo-1545128485-c400e7702796?q=80&w=1000&auto=format&fit=crop",
            shotgunUrl: "https://shotgun.live/",
            genres: ["house", "minimal"],
            artists: "Alex Dima, Cristian Sarde",
            ticketsLeft: 42,
            lowestPrice: 12.5
        },
        {
            title: "CLUB BIZARRE x HELΛNOVA",
            date: "jeudi 31 décembre 2026 à 23:59",
            location: "Secret Location",
            imageUrl: "https://images.unsplash.com/photo-1574390353081-35b86ea6143f?q=80&w=1000&auto=format&fit=crop",
            shotgunUrl: "https://shotgun.live/",
            genres: ["acid", "electro"],
            artists: "HELΛNOVA, 90CYNOMEN",
            ticketsLeft: 0,
            lowestPrice: 20
        }
    ];

    let html = `
        <div style="margin-bottom: 2rem; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
            <p><i>Note: Connexion à l'API Shotgun en cours. Voici un aperçu du rendu.</i></p>
        </div>
        <div class="events-grid">
    `;

    mockEvents.forEach(event => {
        html += createEventCardHtml(event);
    });

    html += '</div>';
    container.innerHTML = html;
}

function createEventCardHtml({ title, date, location, imageUrl, shotgunUrl, genres, artists, ticketsLeft, lowestPrice, isCancelled }) {
    let tagsHtml = '';
    if (genres && genres.length > 0) {
        tagsHtml = '<div class="event-tags">' + genres.map(g => `<span class="event-tag">${g}</span>`).join('') + '</div>';
    }

    let artistsHtml = '';
    if (artists) {
        artistsHtml = `<div class="event-artists">🎵 ${artists}</div>`;
    }

    let infoRowHtml = '';
    if (isCancelled) {
        infoRowHtml = `
            <div class="event-info-row">
                <span style="color: var(--accent-red); font-weight: bold; text-transform: uppercase;">Événement Annulé</span>
            </div>
        `;
    } else if (lowestPrice !== null || ticketsLeft !== null) {
        let priceStr = lowestPrice !== null ? `À partir de ${lowestPrice}€` : '';
        let ticketsStr = '';
        
        if (ticketsLeft !== null) {
            if (ticketsLeft === 0) ticketsStr = '<span style="color: var(--text-secondary)">Sold Out</span>';
            else if (ticketsLeft < 50) ticketsStr = `<span class="event-tickets">Plus que ${ticketsLeft} places !</span>`;
            else ticketsStr = `${ticketsLeft} places restantes`;
        }

        infoRowHtml = `
            <div class="event-info-row">
                <span class="event-price">${priceStr}</span>
                <span>${ticketsStr}</span>
            </div>
        `;
    }

    let buttonText = 'Prendre sa place';
    if (isCancelled) buttonText = 'Annulé';
    else if (ticketsLeft === 0) buttonText = 'Liste d\'attente';

    return `
        <div class="event-card ${isCancelled ? 'cancelled-event' : ''}" style="${isCancelled ? 'opacity: 0.7;' : ''}">
            <img src="${imageUrl}" alt="${title}" class="event-image" onerror="this.src='../logo.png'">
            <div class="event-content">
                ${tagsHtml}
                <div class="event-date">${date}</div>
                <h3 class="event-title">${title}</h3>
                ${artistsHtml}
                <div class="event-location" style="margin-bottom: 1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-red);">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${location}
                </div>
                ${infoRowHtml}
                <div class="event-footer">
                    <a href="${shotgunUrl}" target="_blank" rel="noopener noreferrer" class="buy-btn" ${isCancelled ? 'style="background: #333; color: #888; cursor: not-allowed;" onclick="event.preventDefault();"' : ''}>
                        ${buttonText}
                    </a>
                </div>
            </div>
        </div>
    `;
}
