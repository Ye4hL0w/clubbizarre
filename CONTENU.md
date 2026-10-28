# Club Bizarre — modifier le contenu sans toucher aux animations

Tout le contenu se modifie dans quelques fichiers de données. Le code des
animations (`js/core/`, `js/scenes/`, `js/pages/`) n'a pas besoin d'être ouvert.

## Artistes

| Quoi | Fichier |
|---|---|
| Nom, rôle, bio, liens, profil SoundCloud (sets à jour tout seuls), ordre précédent/suivant | `js/data/artists.js` |
| Photos (portrait + galerie) | dossier `assets/artistes/<artiste>/` |

Ajouter ou retirer une photo :

1. Déposer ou supprimer le fichier dans `assets/artistes/<artiste>/`.
2. Lancer `node scripts/artist-photos.mjs` depuis la racine du projet.

La première photo (ordre alphabétique) est le portrait, les suivantes forment la
galerie. Préfixer les noms (`01-…`, `02-…`) pour choisir l'ordre. Ne pas éditer
`js/data/artist-photos.js` : il est généré par la commande.

Photo du carrousel de l'accueil : `media/team/<artiste>.png`.

Ajouter un nouvel artiste demande en plus : une page `pages/<slug>.html`
(copier une page artiste existante et changer `data-artist`, le nom, le rôle et
les balises meta), une carte dans le carrousel de `index.html`, et une ligne
dans `sitemap.xml`.

## Événements

`js/data/events.js`

- Les événements publics Shotgun s'affichent automatiquement.
- `MANUAL_EVENTS` : ajouter une date à la main (format décrit en tête du fichier).
- Une fois terminé, un événement passe tout seul dans « Past Events » (avec
  sa bannière Shotgun), du plus récent au plus ancien.

## Partenaires

Section « Partners » de l'accueil, directement dans `index.html` (`#partners`).

- Texte : remplacer « Description coming soon. » dans le `<p class="partner__text">`.
- Logo : déposer le fichier dans `assets/partners/`, puis remplacer
  `<span class="partner__name">NOM</span>` par
  `<img class="partner__img" src="assets/partners/<fichier>" alt="Nom">`.
  Un logo clair (blanc ou or) sur fond transparent (PNG ou SVG) rend le mieux.
  Taille : `style="--logo-h: 96px"` sur le `<img>` (voir Redzing et Blue Coast).
- Lien vers le site du partenaire : copier le `<a class="partner__logo" …>` de
  Redzing Radio ou Blue Coast et changer le `href`.

## Médias

`js/data/media.js` : une ligne par photo ou vidéo (chemin, dimensions, légende).
Fichiers à déposer dans `media/` (par exemple `media/videos/` pour les vidéos).

## Réglages des animations

`js/core/config.js` : vitesses, intensités, durées de chaque effet et de chaque
scène d'artiste. Ajouter `?debug` à l'URL d'une page artiste ou de l'accueil pour
régler les scènes en direct depuis la console.
