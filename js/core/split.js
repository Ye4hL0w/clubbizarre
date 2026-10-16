/* ============================================================
   DÉCOUPE DE TEXTE — lettres et mots, pour les animations.

   Le texte d'origine reste accessible : aria-label sur l'élément,
   aria-hidden sur les morceaux.
   ============================================================ */

/**
 * Découpe en lettres masquées :  span.word > span.char-mask > span.char
 * Un espace normal sépare les mots : le retour à la ligne reste possible.
 * Renvoie la liste des .char.
 */
export function splitChars(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.textContent = '';

    const chars = [];
    text.split(' ').forEach((word, i) => {
        if (i > 0) el.append(' ');
        const wordEl = document.createElement('span');
        wordEl.className = 'word';
        wordEl.setAttribute('aria-hidden', 'true');
        [...word].forEach((letter) => {
            const mask = document.createElement('span');
            mask.className = 'char-mask';
            const char = document.createElement('span');
            char.className = 'char';
            char.textContent = letter;
            mask.appendChild(char);
            wordEl.appendChild(mask);
            chars.push(char);
        });
        el.appendChild(wordEl);
    });
    return chars;
}

/**
 * Découpe en mots en conservant les balises internes (ex. <span class="highlight">).
 * Chaque mot devient span.reveal-word. Renvoie la liste des mots.
 */
export function splitWords(el) {
    const words = [];
    const walk = (node) => {
        [...node.childNodes].forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
                const frag = document.createDocumentFragment();
                child.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) {
                        frag.append(' ');
                        return;
                    }
                    const span = document.createElement('span');
                    span.className = 'reveal-word';
                    span.textContent = part;
                    frag.append(span);
                    words.push(span);
                });
                child.replaceWith(frag);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
                walk(child);
            }
        });
    };
    walk(el);
    return words;
}
