/* ============================================================
   ÉVÉNEMENTS — configuration (à éditer à la main)

   La page Events affiche automatiquement les événements publics
   du collectif sur Shotgun. Ce fichier permet :
   - de régler la connexion Shotgun (SHOTGUN) ;
   - d'ajouter des événements à la main (MANUAL_EVENTS), par exemple
     une date annoncée avant l'ouverture de la billetterie, ou un
     événement hors Shotgun. Ils sont mélangés aux événements Shotgun
     et triés par date ; ceux déjà passés disparaissent d'eux-mêmes.

   Format d'un événement manuel :
   {
       title:   'Club Bizarre x Awave',
       date:    '2026-11-21T23:00',      // date et heure (heure de Nice)
       venue:   'Blue Coast',            // lieu (optionnel)
       city:    'Nice',                  // ville (optionnel)
       url:     'https://shotgun.live/…',// lien billetterie / infos (optionnel)
       image:   '../assets/events/affiche.jpg', // affiche (optionnel)
       artists: ['HELΛNOVA', 'FØRN'],    // line-up (optionnel)
       genres:  ['techno'],              // styles (optionnel)
       price:   12,                      // prix d'entrée en € (optionnel)
       soldOut: false,                   // complet (optionnel)
   }
   ============================================================ */

export const SHOTGUN = {
    organizerId: '241189',
    // Clé de lecture publique Shotgun (lecture seule).
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJJZCI6NjM1NjYsIm9yZ2FuaXplcklkIjoyNDExODksImZvcmVzdFVzZXJFbWFpbCI6bnVsbCwiaWF0IjoxNzc3OTgzNzUzfQ.Y2D0ovEi3xUzHBATT4QeuR0asuS7adgor3KUhAUWRuM',
    // Page du collectif sur Shotgun (bouton "Tous nos événements").
    pageUrl: 'https://shotgun.live/fr/venues/clubbizarre',
    // Prix minimum affiché (frais Shotgun inclus).
    minPrice: 5.99,
};

export const MANUAL_EVENTS = [
    // Ajoutez vos événements ici (voir le format ci-dessus).
];
