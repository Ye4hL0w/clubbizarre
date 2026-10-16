/* ============================================================
   ARTISTES — contenu des pages artistes (à éditer à la main)

   Pour chaque artiste :
   - slug   : nom du fichier de page (pages/<slug>.html) ET du dossier
              photos (assets/artistes/<slug>/). Ne pas changer.
   - name   : nom affiché
   - role   : rôle affiché sous le nom
   - bio    : liste de paragraphes (vide → "Biographie à venir.")
   - links  : liens affichés (icon : instagram, soundcloud, tiktok,
              youtube, facebook, spotify, link)
   - sets   : sets / mixes. Une URL SoundCloud est affichée en lecteur
              intégré ; toute autre URL devient un lien.
              Vide → message "Sets à venir" + lien SoundCloud du collectif.

   Les PHOTOS ne se déclarent pas ici : voir js/data/artist-photos.js
   (généré par `node scripts/artist-photos.mjs`).

   L'ordre de ce tableau = l'ordre "Artiste précédent / suivant".
   ============================================================ */

export const ARTISTS = [
    {
        slug: 'jerem_wav',
        name: 'jerem.wav',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/jerem_mcd/', icon: 'instagram' },
        ],
        sets: [],
    },
    {
        slug: 'helanova',
        name: 'HELΛNOVA',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/hele__78/', icon: 'instagram' },
        ],
        sets: [],
    },
    {
        slug: 'datseven',
        name: 'Datseven',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/mat.mileo_/', icon: 'instagram' },
        ],
        sets: [],
    },
    {
        slug: 'forn',
        name: 'FØRN',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/adrien_fornes06115/', icon: 'instagram' },
        ],
        sets: [],
    },
    {
        slug: '90cynomen',
        name: '90cynomen',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/cynthia.lng/', icon: 'instagram' },
        ],
        sets: [],
    },
    {
        slug: 'bastoune_bellon',
        name: 'bastoune bellon',
        role: 'Light + DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/bastoune.bellon/', icon: 'instagram' },
        ],
        sets: [],
    },
    {
        slug: 'mariam',
        name: 'mariam',
        role: 'Community Manager',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/mariam_vna/', icon: 'instagram' },
        ],
        sets: [],
    },
];

/** Liens du collectif, utilisés quand un artiste n'a pas encore de sets. */
export const COLLECTIVE = {
    soundcloud: 'https://soundcloud.com/clubbizarre06',
};
