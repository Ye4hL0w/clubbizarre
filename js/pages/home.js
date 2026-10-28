/* ============================================================
   ACCUEIL — chorégraphie du hero

   0.0 s  le marbre WebGL sort du noir, le logo se dé-floute
   0.35 s les lettres de "CLUB BIZARRE" montent de leurs masques,
          du centre vers les bords
   1.0 s  la tagline s'ouvre depuis le centre
   1.8 s  l'indicateur de scroll apparaît
   Puis : lumière dorée au curseur sur le titre, parallax au scroll.
   ============================================================ */

import { introDone } from '../core/intro.js';
import { pageEntered } from '../core/transitions.js';
import { prefersReducedMotion, supportsWebGL } from '../core/utils.js';
import { splitTitle, initTitleHover } from './home/hero-title.js';
import { initMarquee } from './home/marquee.js';
import { initTvs } from './home/tvs.js';
import { initAbout, initTeam, initPartners, initContact } from './home/sections.js';

const root = document.documentElement;
const { gsap, ScrollTrigger } = window;
const reduced = prefersReducedMotion();

const hero = document.querySelector('.hero');
const content = hero?.querySelector('.hero-content');
const logo = hero?.querySelector('.hero-logo-container');
const title = hero?.querySelector('.hero-title');
const subtitle = hero?.querySelector('.hero-subtitle');
const indicator = hero?.querySelector('.scroll-indicator');

// Découpe immédiate : le titre est encore masqué par .hero-pending.
const chars = title ? splitTitle(title) : [];

/* ── Sections ───────────────────────────────────────────────
   Le découpage de l'email est immédiat (hors écran) ; les animations
   au scroll attendent l'ouverture du rideau, comme les reveals génériques. */
initPartners(document.querySelector('#partners'));
initContact(document.querySelector('#contact'));
initMarquee(document.querySelector('.marquee-band'));
initTvs(document.querySelector('.team-heading'));
pageEntered.then(() => {
    initAbout(document.querySelector('#about'));
    initTeam(document.querySelector('#team'));
});

// Le fond WebGL (et Three.js) se charge pendant l'intro, en parallèle.
const glReady = hero && supportsWebGL()
    ? import('./home/hero-gl.js')
        .then((m) => m.createHeroGL(hero))
        .catch((err) => {
            console.warn('[CB] Fond WebGL indisponible, fond CSS conservé.', err);
            return null;
        })
    : Promise.resolve(null);

Promise.all([introDone, pageEntered]).then(async () => {
    // On n'attend pas indéfiniment Three.js : au pire le marbre arrive après le titre.
    const gl = await Promise.race([glReady, new Promise((r) => setTimeout(r, 1500, null))]);
    revealHero();
    if (gl) gl.reveal();
    else glReady.then((late) => late && late.reveal());
    glReady.then((g) => g && bindScroll(g));
});

/* ── Entrée ─────────────────────────────────────────────────── */

function revealHero() {
    if (!hero) return;

    if (!gsap || reduced) {
        root.classList.remove('hero-pending');
        return;
    }

    // États de départ posés avant de lever .hero-pending : aucun flash.
    gsap.set([logo, subtitle, indicator], { autoAlpha: 0 });
    gsap.set(chars, { yPercent: 115 });
    root.classList.remove('hero-pending');

    gsap.timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(logo,
            { y: 30, scale: 0.9, filter: 'blur(14px)' },
            { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 2.2 }, 0)
        .to(chars, {
            yPercent: 0,
            duration: 1.6,
            stagger: { each: 0.06, from: 'center' },
        }, 0.35)
        .fromTo(subtitle,
            { clipPath: 'inset(0% 50% 0% 50%)' },
            { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'expo.inOut' }, 1.0)
        .to(indicator, { autoAlpha: 1, duration: 1.2, ease: 'power2.out' }, 1.8)
        .add(() => {
            // Rend la main au CSS (responsive, :hover) une fois l'entrée jouée.
            gsap.set([logo, subtitle], { clearProps: 'filter,transform,clipPath' });
            gsap.set(chars, { clearProps: 'transform' });
            initTitleHover(title, chars);
        });

    bindContentParallax();
}

/* ── Scroll ─────────────────────────────────────────────────── */

/** Le contenu du hero remonte et s'efface doucement quand on descend. */
function bindContentParallax() {
    if (!ScrollTrigger || reduced) return;

    gsap.to(content, {
        y: () => -window.innerHeight * 0.18,
        autoAlpha: 0.15,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });

    gsap.to(indicator, {
        autoAlpha: 0,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=180', scrub: true },
    });
}

/** Transmet la progression du scroll au marbre (léger décalage + assombrissement). */
function bindScroll(gl) {
    if (!ScrollTrigger) return;
    ScrollTrigger.create({
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        onUpdate: (self) => gl.setScroll(self.progress),
    });
}
