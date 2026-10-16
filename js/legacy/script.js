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
                hamburger.setAttribute('aria-label', 'Ouvrir le menu');
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
        hamburger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
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

    // 5. Team Marquee Auto-Scroll and Wheel Support
    const marqueeContainer = document.querySelector('.team-marquee-container');
    const marquee = document.querySelector('.team-marquee');
    
    // Animations réduites : pas de défilement automatique, le carrousel
    // se fait glisser à la main (voir css/components/a11y.css).
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (marqueeContainer && marquee && !reduceMotion) {
        let xOffset = 0;
        let isPaused = false;
        let speedFactor = 1;
        let lastTime = 0;
        let halfWidth = 0;
        
        function updateHalfWidth() {
            halfWidth = marquee.scrollWidth / 2;
        }
        
        // Wait for layout/images to update
        window.addEventListener('load', updateHalfWidth);
        window.addEventListener('resize', updateHalfWidth);
        setTimeout(updateHalfWidth, 100);

        const bubbles = document.querySelectorAll('.team-bubble');
        bubbles.forEach(bubble => {
            bubble.addEventListener('mouseenter', () => isPaused = true);
            bubble.addEventListener('mouseleave', () => isPaused = false);
        });

        marqueeContainer.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.preventDefault();
                xOffset -= e.deltaX;
            }
        }, { passive: false });

        function animateMarquee(time) {
            if (!lastTime) lastTime = time;
            const delta = time - lastTime;
            lastTime = time;

            if (halfWidth > 0) {
                // Au survol, le défilement ralentit progressivement jusqu'à l'arrêt
                // (et repart en douceur), au lieu de se figer d'un coup.
                speedFactor += ((isPaused ? 0 : 1) - speedFactor) * Math.min(1, delta / 350); // ~0,35 s de ralentissement
                xOffset -= delta * 0.05 * speedFactor; // Adjust speed here

                if (xOffset <= -halfWidth) {
                    xOffset += halfWidth;
                } else if (xOffset > 0) {
                    xOffset -= halfWidth;
                }

                marquee.style.transform = `translateX(${xOffset}px)`;
            }

            requestAnimationFrame(animateMarquee);
        }

        requestAnimationFrame(animateMarquee);
    }
});
