// ============================================
// ONBOARDING.DEV - Clean Professional JS
// Subtle animations, nothing flashy
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initScrollAnimations();
    initCounterAnimations();
    initSmoothScroll();
});

// ============================================
// NAVBAR SCROLL EFFECT
// ============================================

function initNavbar() {
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================

function initScrollAnimations() {
    // Elements to animate on scroll
    const fadeElements = [
        document.querySelector('.hero-eyebrow'),
        document.querySelector('.hero-title'),
        document.querySelector('.hero-subtitle'),
        document.querySelector('.hero-cta'),
        ...document.querySelectorAll('.section-title'),
        ...document.querySelectorAll('.section-subtitle'),
        document.querySelector('.cta-content')
    ].filter(Boolean);

    fadeElements.forEach(el => el.classList.add('fade-in'));

    // Grids that stagger their children
    const staggerGrids = [
        document.querySelector('.results-grid'),
        document.querySelector('.steps-grid'),
        document.querySelector('.people-grid'),
        document.querySelector('.testimonials-grid')
    ].filter(Boolean);

    // About section elements
    const aboutElements = [
        document.querySelector('.about-content'),
        document.querySelector('.about-image')
    ].filter(Boolean);

    aboutElements.forEach(el => el.classList.add('fade-in'));

    staggerGrids.forEach(grid => grid.classList.add('stagger'));

    // Observer for fade-in elements
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    fadeElements.forEach(el => fadeObserver.observe(el));
    aboutElements.forEach(el => fadeObserver.observe(el));
    staggerGrids.forEach(grid => fadeObserver.observe(grid));
}

// ============================================
// COUNTER ANIMATIONS
// ============================================

function initCounterAnimations() {
    const counters = document.querySelectorAll('.result-value[data-target]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.dataset.animated) {
                animateCounter(entry.target);
                entry.target.dataset.animated = 'true';
            }
        });
    }, {
        threshold: 0.5
    });

    counters.forEach(counter => counterObserver.observe(counter));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const prefix = element.dataset.prefix || '';
    const duration = 1500;
    const start = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * eased);

        element.textContent = prefix + current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// SMOOTH SCROLL
// ============================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));

            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}
