/* ============================================================
   VIDEO INTRO OVERLAY
   ============================================================ */
(function () {
    const overlay = document.getElementById('intro-overlay');
    const video   = document.getElementById('intro-video');
    const skipBtn = document.getElementById('skip-intro');

    if (!overlay || !video) return;

    function dismissIntro() {
        overlay.classList.add('fade-out');
        document.body.classList.remove('no-scroll');

        // Remove overlay from DOM after transition ends
        overlay.addEventListener('transitionend', () => {
            overlay.remove();
        }, { once: true });
    }

    // Auto-dismiss when the video finishes
    video.addEventListener('ended', dismissIntro);

    // Skip button
    if (skipBtn) {
        skipBtn.addEventListener('click', dismissIntro);
    }

    // If autoplay is blocked by the browser, dismiss immediately
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {
            // Autoplay was prevented — skip intro silently
            dismissIntro();
        });
    }
})();

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
                    if (targetElement) {
                        window.scrollTo({
                            top: targetElement.offsetTop - 80,
                            behavior: 'smooth'
                        });
                    }
                }
            } else if (href.startsWith('#')) {
                // Lien d'ancre classique sur la même page
                e.preventDefault();
                const targetElement = document.querySelector(href);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            }

            // Close mobile menu if open
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active');
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

    // 3. Instagram Local Media Integration with content
    const instaPosts = [
        { url: "media/post_1.jpg", text: "Latest event recap! What a night at the factory. 💥", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_2.jpg", text: "New track release by jerem.wav, check the link in bio.", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_3.jpg", text: "Studio sessions with the team. Big things coming.", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_4.jpg", text: "Visual arts meets minimal techno.", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_5.jpg", text: "Thank you for the energy last weekend!", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_6.jpg", text: "HELANOVA dropping bombs as usual.", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_7.jpg", text: "Behind the scenes with our visual crew.", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_8.jpg", text: "Next stop: Secret Location.", link: "https://instagram.com/clubbizarre06" },
        { url: "media/post_9.jpg", text: "Join the bizarre family. 🏴‍☠️", link: "https://instagram.com/clubbizarre06" }
    ];

    const instaFeedContainer = document.getElementById('insta-feed');

    if (instaFeedContainer) {
        instaPosts.forEach(post => {
            const wrapper = document.createElement('a'); // Make it a link wrapper
            wrapper.href = post.link;
            wrapper.target = "_blank";
            wrapper.className = 'insta-wrapper';

            const img = document.createElement('img');
            img.src = post.url;
            img.alt = "Club Bizarre Instagram Post";
            img.loading = "lazy";

            const overlay = document.createElement('div');
            overlay.className = 'insta-overlay';
            
            const text = document.createElement('p');
            text.className = 'insta-text';
            text.textContent = post.text;

            const icon = document.createElement('div');
            icon.className = 'insta-icon';
            icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-instagram"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>';

            overlay.appendChild(text);
            overlay.appendChild(icon);

            wrapper.appendChild(img);
            wrapper.appendChild(overlay);
            instaFeedContainer.appendChild(wrapper);
        });
    }

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

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
});
