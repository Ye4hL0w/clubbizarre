/* Icônes des liens artistes (SVG inline, couleur = currentColor). */

const stroke = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const fill = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${d}</svg>`;

export const ICONS = {
    instagram: stroke('<rect width="20" height="20" x="2" y="2" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>'),
    soundcloud: fill('<path d="M11 8.2c.6-.3 1.3-.5 2-.5 2.3 0 4.2 1.7 4.5 3.9.3-.1.6-.1.9-.1 1.8 0 3.1 1.4 3.1 3.1S20.2 17.7 18.4 17.7H11V8.2zM9.5 9.3V17.7h-1V9.8c.3-.2.6-.4 1-.5zM7 10.6v7.1H6v-6.6c.3-.2.6-.4 1-.5zM4.5 12v5.7h-1v-5.3c.3-.2.6-.3 1-.4zM2 13.4v3.8c-.6-.3-1-1-1-1.9s.4-1.6 1-1.9z"/>'),
    tiktok: fill('<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.88-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 1 0 5.54 6.29V8.69a8.18 8.18 0 0 0 4.78 1.52V6.77a4.85 4.85 0 0 1-1.01-.08z"/>'),
    youtube: stroke('<path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>'),
    facebook: stroke('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'),
    spotify: stroke('<circle cx="12" cy="12" r="10"/><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.5-.7 5.2-.4 7.3.8M8.6 15.5c2-.5 4-.3 5.6.6"/>'),
    link: stroke('<path d="M7 17 17 7M9 7h8v8"/>'),
    arrow: stroke('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    close: stroke('<path d="M6 6l12 12M18 6 6 18"/>'),
};
