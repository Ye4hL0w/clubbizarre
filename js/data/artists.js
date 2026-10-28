/* ============================================================
   ARTISTES — contenu des pages artistes (à éditer à la main)

   Pour chaque artiste :
   - slug   : nom du fichier de page (pages/<slug>.html) ET du dossier
              photos (assets/artistes/<slug>/). Ne pas changer.
   - name   : nom affiché
   - role   : rôle affiché sous le nom
   - bio    : liste de paragraphes (vide → "Biographie à venir.")
   - links  : liens affichés en icônes rondes sous la bio (icon : instagram,
              soundcloud, shotgun, tiktok, youtube, facebook, spotify, link)
   - soundcloud (conseillé) : lien du profil SoundCloud. Affiche un lecteur
              avec TOUS ses morceaux, mis à jour automatiquement.
   - sets   : (si pas de `soundcloud`) liste choisie à la main. Une URL
              SoundCloud est affichée en lecteur intégré ; toute autre URL
              devient un lien.
              Rien des deux → message "Sets coming soon" + SoundCloud du collectif.

   Les PHOTOS ne se déclarent pas ici : voir js/data/artist-photos.js
   (généré par `node scripts/artist-photos.mjs`).

   L'ordre de ce tableau = l'ordre "Artiste précédent / suivant".
   ============================================================ */

export const ARTISTS = [
    {
        slug: 'jerem_wav',
        name: 'jerem.wav',
        role: 'DJ',
        bio: [
            "For jerem.wav, a set is a story. Each one is built like a narrative, sometimes drawn from a chapter of his own life, sometimes from somewhere else entirely, and always carried by his own universe.",
            "He loves taking the crowd on a journey, blending styles and slipping in unexpected, atypical sounds along the way. But his heart beats for one thing above all: club music.",
        ],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/jerem_mcd/', icon: 'instagram' },
            { label: 'SoundCloud', url: 'https://soundcloud.com/jeremy-moncada-350394306', icon: 'soundcloud' },
            { label: 'Shotgun', url: 'https://shtgn.live/artist/jeremy-moncada-350394306', icon: 'shotgun' },
        ],
        soundcloud: 'https://soundcloud.com/jeremy-moncada-350394306',
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
            { label: 'SoundCloud', url: 'https://soundcloud.com/dj-seven-410848559', icon: 'soundcloud' },
        ],
        soundcloud: 'https://soundcloud.com/dj-seven-410848559',
        sets: [],
    },
    {
        slug: 'forn',
        name: 'FØRN',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/adrien_fornes06115/', icon: 'instagram' },
            { label: 'SoundCloud', url: 'https://soundcloud.com/adrien-fornes', icon: 'soundcloud' },
        ],
        soundcloud: 'https://soundcloud.com/adrien-fornes',
        sets: [],
    },
    {
        slug: '90cynomen',
        name: '90cynomen',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/cynthia.lng/', icon: 'instagram' },
            { label: 'SoundCloud', url: 'https://soundcloud.com/cynthiaa-lng', icon: 'soundcloud' },
        ],
        soundcloud: 'https://soundcloud.com/cynthiaa-lng',
        sets: [],
    },
    {
        slug: 'bastoune_bellon',
        name: 'bastoune bellon',
        role: 'Light + DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/bastoune.bellon/', icon: 'instagram' },
            { label: 'SoundCloud', url: 'https://soundcloud.com/bastounebellon', icon: 'soundcloud' },
        ],
        soundcloud: 'https://soundcloud.com/bastounebellon',
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
    {
        slug: 'capolami',
        name: 'CAPOLAMI',
        role: 'DJ',
        bio: [],
        links: [
            { label: 'Instagram', url: 'https://www.instagram.com/lucas.lesbros/', icon: 'instagram' },
        ],
        sets: [],
    },
];

/** Liens du collectif, utilisés quand un artiste n'a pas encore de sets. */
export const COLLECTIVE = {
    soundcloud: 'https://soundcloud.com/clubbizarre06',
};
