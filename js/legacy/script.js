// L'intro vidéo est gérée par js/core/intro.js.

// Défilement doux : passe par Lenis (js/core/main.js) s'il est actif,
// sinon scroll natif comme avant.
function smoothScrollTo(targetElement) {
    if (window.CB && window.CB.scrollTo) {
        window.CB.scrollTo(targetElement, { offset: -80 });
        return;
    }
    window.scrollTo({
        top: targetElement.offsetTop - 80,
        behavior: 'smooth'
    });
}

document.addEventListener('DOMContentLoaded', () => {

    // 1. Smooth Scrolling for Anchor Links (Handles cross-page correctly)
    document.querySelectorAll('.nav-links a, a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // Si on est sur une autre page et qu'on veut aller sur la page d'accueil
            if (href.includes('.html') && window.location.pathname.includes(href.split('#')[0])) {
                // On est déjà sur la bonne page, on fait un scroll doux
                const targetId = '#' + href.split('#')[1];
                if (targetId && targetId !== '#undefined') {
                    e.preventDefault();
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) smoothScrollTo(targetElement);
                }
            } else if (href === '#') {
                // Lien vers le haut de page (logo) : querySelector('#') lèverait une erreur.
                e.preventDefault();
                smoothScrollTo(document.body);
            } else if (href.startsWith('#')) {
                // Lien d'ancre classique sur la même page
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) smoothScrollTo(targetElement);
            }

            // Close mobile menu if open
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
                hamburger.setAttribute('aria-expanded', 'false');
                hamburger.setAttribute('aria-label', 'Open menu');
            }
        });
    });

    // 2. Intersection Observer for Fade-In Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                // Optional: stop observing once animated to keep it visible
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-section').forEach(section => {
        observer.observe(section);
    });

    // 3. (Page Media : voir js/pages/media.js et js/data/media.js)

    // 4. Navbar Background on Scroll & Mobile Menu
    const navbar = document.querySelector('.navbar');
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(5, 5, 5, 0.95)';
            navbar.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.5)';
            navbar.style.padding = '1rem 2rem';
        } else {
            navbar.style.background = 'transparent';
            navbar.style.boxShadow = 'none';
            navbar.style.padding = '1.5rem 2rem';
        }
    });

    // Menu mobile : état annoncé aux lecteurs d'écran, fermeture avec Échap
    function setMenu(open) {
        hamburger.classList.toggle('active', open);
        navLinks.classList.toggle('active', open);
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    hamburger.addEventListener('click', () => {
        setMenu(!navLinks.classList.contains('active'));
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navLinks.classList.contains('active')) {
            setMenu(false);
            hamburger.focus();
        }
    });

    // 5. Carrousel Team : défilement auto + glisser au doigt / à la souris + molette
    //    - doigt (mobile) et clic-glisser (PC) : le carrousel suit, puis glisse avec inertie ;
    //    - molette : trackpad horizontal partout, molette verticale quand la souris
    //      a été posée sur le carrousel (sinon la page défile normalement) ;
    //    - un clic sans glisser ouvre toujours la page de l'artiste.
    const marqueeContainer = document.querySelector('.team-marquee-container');
    const marquee = document.querySelector('.team-marquee');

    // Animations réduites : pas de défilement automatique, le carrousel
    // se fait glisser à la main (voir css/components/a11y.css).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (marqueeContainer && marquee && !reduceMotion) {
        const AUTO_SPEED = 0.05;     // px/ms en défilement automatique
        const DRAG_THRESHOLD = 6;    // px avant de considérer qu'on glisse (sinon : clic)
        const FRICTION = 0.94;       // inertie après lâcher / molette (par image à 60 i/s)
        const WHEEL_ARM_MS = 1200;   // molette verticale captée tant que la souris est "posée" ici

        let xOffset = 0;
        let velocity = 0;            // px/ms, inertie du geste
        let speedFactor = 1;
        let lastTime = 0;
        let halfWidth = 0;
        let isHovered = false;
        let wheelArmedUntil = 0;

        // Glisser
        let pointerId = null;
        let startX = 0;
        let startY = 0;
        let startOffset = 0;
        let dragging = false;
        let suppressClick = false;
        let lastMoveX = 0;
        let lastMoveT = 0;

        const updateHalfWidth = () => { halfWidth = marquee.scrollWidth / 2; };
        window.addEventListener('load', updateHalfWidth);
        window.addEventListener('resize', updateHalfWidth);
        setTimeout(updateHalfWidth, 100);

        const wrap = () => {
            if (halfWidth <= 0) return;
            while (xOffset <= -halfWidth) xOffset += halfWidth;
            while (xOffset > 0) xOffset -= halfWidth;
        };

        /* Survol (souris uniquement : sur mobile, pas de faux "survol" qui bloque) */
        marqueeContainer.addEventListener('pointerenter', (e) => {
            if (e.pointerType === 'mouse') isHovered = true;
        });
        marqueeContainer.addEventListener('pointerleave', (e) => {
            if (e.pointerType === 'mouse') { isHovered = false; wheelArmedUntil = 0; }
        });

        /* Doigt + clic-glisser */
        marqueeContainer.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            pointerId = e.pointerId;
            startX = lastMoveX = e.clientX;
            startY = e.clientY;
            lastMoveT = performance.now();
            startOffset = xOffset;
            dragging = false;
            velocity = 0;
        });

        marqueeContainer.addEventListener('pointermove', (e) => {
            // Une vraie souris qui bouge ici "arme" la molette verticale
            if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) {
                wheelArmedUntil = performance.now() + WHEEL_ARM_MS;
            }
            if (e.pointerId !== pointerId) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!dragging) {
                if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
                dragging = true;
                marqueeContainer.classList.add('is-dragging');
                try { marqueeContainer.setPointerCapture(e.pointerId); } catch { /* ignoré */ }
            }

            const now = performance.now();
            const dt = Math.max(1, now - lastMoveT);
            // vitesse lissée du doigt, réutilisée pour l'inertie au lâcher
            velocity = velocity * 0.6 + ((e.clientX - lastMoveX) / dt) * 0.4;
            lastMoveX = e.clientX;
            lastMoveT = now;

            xOffset = startOffset + dx;
            wrap();
        });

        const endDrag = (e) => {
            if (e.pointerId !== pointerId) return;
            pointerId = null;
            if (!dragging) return;
            dragging = false;
            suppressClick = true; // le "click" qui suit le lâcher ne doit pas ouvrir la page
            setTimeout(() => { suppressClick = false; }, 0);
            marqueeContainer.classList.remove('is-dragging');
            // doigt immobile avant de lâcher : pas d'élan
            if (performance.now() - lastMoveT > 80) velocity = 0;
        };
        marqueeContainer.addEventListener('pointerup', endDrag);
        marqueeContainer.addEventListener('pointercancel', endDrag);

        marqueeContainer.addEventListener('click', (e) => {
            if (suppressClick) { e.preventDefault(); e.stopPropagation(); }
        }, true);
        // Pas de "fantôme" d'image / de lien qu'on traîne
        marqueeContainer.addEventListener('dragstart', (e) => e.preventDefault());

        /* Molette */
        marqueeContainer.addEventListener('wheel', (e) => {
            const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
            const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
            const now = performance.now();
            let delta;
            if (horizontal) delta = e.deltaX;
            else if (e.shiftKey || now < wheelArmedUntil) delta = e.deltaY;
            else return; // la page défile normalement

            e.preventDefault();
            e.stopPropagation(); // Lenis ne fait pas défiler la page en même temps
            wheelArmedUntil = now + WHEEL_ARM_MS;
            const px = delta * unit;
            xOffset -= px * 0.35;           // déplacement immédiat…
            velocity -= (px * 0.65) / 220;  // …prolongé en douceur par l'inertie
            velocity = Math.max(-4, Math.min(4, velocity));
            wrap();
        }, { passive: false });

        function animateMarquee(time) {
            if (!lastTime) lastTime = time;
            const delta = Math.min(time - lastTime, 64);
            lastTime = time;

            if (halfWidth > 0 && !dragging) {
                // Au survol, le défilement ralentit progressivement jusqu'à l'arrêt
                // (et repart en douceur), au lieu de se figer d'un coup.
                const busy = isHovered || Math.abs(velocity) > 0.02;
                speedFactor += ((busy ? 0 : 1) - speedFactor) * Math.min(1, delta / 350);

                xOffset += velocity * delta;
                velocity *= Math.pow(FRICTION, delta / 16.67);
                if (Math.abs(velocity) < 0.001) velocity = 0;

                xOffset -= delta * AUTO_SPEED * speedFactor;
                wrap();
            }
            marquee.style.transform = `translate3d(${xOffset}px, 0, 0)`;

            requestAnimationFrame(animateMarquee);
        }

        requestAnimationFrame(animateMarquee);
    }
});
