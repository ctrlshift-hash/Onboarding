// ============================================
// ONBOARDING.DEV - Premium JavaScript
// Award-Winning Interactions & Animations
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all modules
    initLoader();
    initParticles();
    initCursorGlow();
    initScrollAnimations();
    initCounterAnimations();
    initNavbarScroll();
    initSmoothScroll();
    initTiltEffect();
});

// ============================================
// PAGE LOADER
// ============================================

function initLoader() {
    const loader = document.createElement('div');
    loader.className = 'page-loader';
    loader.innerHTML = '<div class="loader-spinner"></div>';
    document.body.prepend(loader);

    window.addEventListener('load', () => {
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 500);
        }, 500);
    });
}

// ============================================
// PARTICLE SYSTEM
// ============================================

function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
            this.hue = Math.random() * 60 + 250; // Purple to pink range
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Wrap around edges
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${this.opacity})`;
            ctx.fill();
        }
    }

    function createParticles() {
        const particleCount = Math.min(100, Math.floor((canvas.width * canvas.height) / 15000));
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    function connectParticles() {
        const maxDistance = 150;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < maxDistance) {
                    const opacity = (1 - distance / maxDistance) * 0.15;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(168, 85, 247, ${opacity})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        connectParticles();
        animationId = requestAnimationFrame(animate);
    }

    resize();
    createParticles();
    animate();

    window.addEventListener('resize', () => {
        resize();
        createParticles();
    });
}

// ============================================
// CURSOR GLOW EFFECT
// ============================================

function initCursorGlow() {
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function updateGlow() {
        // Smooth follow with easing
        glowX += (mouseX - glowX) * 0.1;
        glowY += (mouseY - glowY) * 0.1;

        glow.style.left = glowX + 'px';
        glow.style.top = glowY + 'px';

        requestAnimationFrame(updateGlow);
    }

    updateGlow();

    // Hide on mobile
    if ('ontouchstart' in window) {
        glow.style.display = 'none';
    }
}

// ============================================
// SCROLL ANIMATIONS (Intersection Observer)
// ============================================

function initScrollAnimations() {
    // Add animation classes to elements
    const animateElements = [
        ...document.querySelectorAll('.stat-card'),
        ...document.querySelectorAll('.value-card'),
        ...document.querySelectorAll('.project-card'),
        ...document.querySelectorAll('.section-title'),
        ...document.querySelectorAll('.section-subtitle'),
        document.querySelector('.cta-card')
    ].filter(Boolean);

    animateElements.forEach(el => {
        el.classList.add('animate-on-scroll');
    });

    // Add stagger animation to grids
    document.querySelectorAll('.stats-grid, .value-grid, .projects-grid').forEach(grid => {
        grid.classList.add('stagger-children');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');

                // Trigger counter animation for stat cards
                if (entry.target.classList.contains('stat-card')) {
                    const counter = entry.target.querySelector('.stat-value[data-target]');
                    if (counter && !counter.dataset.animated) {
                        animateCounter(counter);
                        counter.dataset.animated = 'true';
                    }
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animateElements.forEach(el => observer.observe(el));
    document.querySelectorAll('.stats-grid, .value-grid, .projects-grid').forEach(el => observer.observe(el));
}

// ============================================
// COUNTER ANIMATIONS
// ============================================

function initCounterAnimations() {
    // Initial setup - counters will be triggered by scroll observer
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const duration = 2000;
    const start = performance.now();
    const isCurrency = element.textContent.includes('$');

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out-expo)
        const easeOut = 1 - Math.pow(2, -10 * progress);
        const current = Math.floor(target * easeOut);

        if (isCurrency) {
            element.textContent = '$' + current.toLocaleString();
        } else {
            element.textContent = current.toLocaleString();
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// NAVBAR SCROLL EFFECT
// ============================================

function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScroll = currentScroll;
    });
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
                const offsetTop = target.offsetTop - 100;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============================================
// TILT EFFECT ON CARDS
// ============================================

function initTiltEffect() {
    const cards = document.querySelectorAll('.project-card, .stat-card, .value-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ============================================
// MAGNETIC BUTTONS
// ============================================

function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-primary, .nav-cta');

    buttons.forEach(button => {
        button.addEventListener('mousemove', (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translate(0, 0)';
        });
    });
}

// Initialize magnetic buttons after DOM load
document.addEventListener('DOMContentLoaded', initMagneticButtons);

// ============================================
// TYPING EFFECT (Optional - for headlines)
// ============================================

function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// ============================================
// RIPPLE EFFECT ON BUTTONS
// ============================================

document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();

        ripple.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            pointer-events: none;
            transform: scale(0);
            animation: ripple 0.6s ease-out;
            left: ${e.clientX - rect.left}px;
            top: ${e.clientY - rect.top}px;
            width: 100px;
            height: 100px;
            margin-left: -50px;
            margin-top: -50px;
        `;

        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ============================================
// PERFORMANCE: Reduce animations on low-end devices
// ============================================

function checkPerformance() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.classList.add('reduced-motion');
    }

    // Check for low-end device (basic check)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
        document.body.classList.add('low-end-device');
    }
}

checkPerformance();

// ============================================
// CONSOLE EASTER EGG
// ============================================

console.log('%c onboarding.dev ', 'background: linear-gradient(135deg, #a855f7, #6366f1, #ec4899); color: white; font-size: 24px; font-weight: bold; padding: 10px 20px; border-radius: 8px;');
console.log('%c Launch your project. Keep 100% of fees. ', 'color: #a855f7; font-size: 14px; padding: 5px 0;');
