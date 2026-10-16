/* ============================================================
   MÉDIAS — contenu de la page Media (à éditer à la main)

   Chaque entrée est une photo ou une vidéo, affichée dans l'ordre
   de la liste. Les chemins partent de la racine du site.

   Photo :
   { type: 'image', src: 'media/post_1.jpg', width: 640, height: 640,
     caption: 'Texte affiché au survol et dans la lightbox',
     link: 'https://www.instagram.com/p/…' }      // lien optionnel

   Vidéo (se lance au survol sur ordinateur, à l'écran sur mobile) :
   { type: 'video', src: 'media/videos/aftermovie.mp4',
     poster: 'media/videos/aftermovie.jpg',        // image d'attente
     width: 1080, height: 1350, caption: '…' }

   width / height : dimensions du fichier (évitent les sauts de mise
   en page). Si vous ne les connaissez pas, laissez-les : un format
   carré sera supposé.
   Conseil : vidéos en MP4 (H.264), muettes, courtes (≤ 15 s, ≤ 4 Mo).
   ============================================================ */

export const MEDIA = [
    { type: 'image', src: 'media/post_1.jpg', width: 640, height: 640, caption: 'Latest event recap! What a night at the factory. 💥' },
    { type: 'image', src: 'media/post_2.jpg', width: 320, height: 320, caption: 'New track release by jerem.wav, check the link in bio.' },
    { type: 'image', src: 'media/post_3.jpg', width: 320, height: 320, caption: 'Studio sessions with the team. Big things coming.' },
    { type: 'image', src: 'media/post_4.jpg', width: 320, height: 320, caption: 'Visual arts meets minimal techno.' },
    { type: 'image', src: 'media/post_5.jpg', width: 320, height: 320, caption: 'Thank you for the energy last weekend!' },
    { type: 'image', src: 'media/post_6.jpg', width: 320, height: 320, caption: 'HELANOVA dropping bombs as usual.' },
    { type: 'image', src: 'media/post_7.jpg', width: 320, height: 320, caption: 'Behind the scenes with our visual crew.' },
    { type: 'image', src: 'media/post_8.jpg', width: 320, height: 320, caption: 'Next stop: Secret Location.' },
    { type: 'image', src: 'media/post_9.jpg', width: 320, height: 320, caption: 'Join the bizarre family. 🏴‍☠️' },
];
