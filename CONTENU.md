# Club Bizarre — modifier le contenu sans toucher aux animations

Tout le contenu se modifie dans quelques fichiers de données. Le code des
animations (`js/core/`, `js/scenes/`, `js/pages/`) n'a pas besoin d'être ouvert.

## Artistes

| Quoi | Fichier |
|---|---|
| Nom, rôle, bio, liens, sets SoundCloud, ordre précédent/suivant | `js/data/artists.js` |
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
- Les événements passés disparaissent d'eux-mêmes.

## Médias

`js/data/media.js` : une ligne par photo ou vidéo (chemin, dimensions, légende).
Fichiers à déposer dans `media/` (par exemple `media/videos/` pour les vidéos).

## Réglages des animations

`js/core/config.js` : vitesses, intensités, durées de chaque effet et de chaque
scène d'artiste. Ajouter `?debug` à l'URL d'une page artiste ou de l'accueil pour
régler les scènes en direct depuis la console.
