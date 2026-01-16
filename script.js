// ============================================
// ONBOARDING.DEV - Enhanced Animations
// Smooth, professional, engaging
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initScrollAnimations();
    initCounterAnimations();
    initSmoothScroll();
    initCardHoverEffects();
    initBagsAPIIntegration();
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
    const fadeElements = document.querySelectorAll('.section-title, .section-subtitle, .page-subtitle, .cta-content, .bagsfm-intro, .section-intro');
    const fadeLeftElements = document.querySelectorAll('.about-content, .testimonial-content');
    const fadeRightElements = document.querySelectorAll('.about-image');
    const scaleElements = document.querySelectorAll('.featured-testimonial-card, .bagsfm-cta');

    fadeElements.forEach(el => el.classList.add('fade-in'));
    fadeLeftElements.forEach(el => el.classList.add('fade-left'));
    fadeRightElements.forEach(el => el.classList.add('fade-right'));
    scaleElements.forEach(el => el.classList.add('scale-in'));

    // Grids that stagger their children
    const staggerGrids = document.querySelectorAll(
        '.results-grid, .steps-grid, .people-grid, .testimonials-grid, ' +
        '.benefits-grid, .types-grid, .bagsfm-steps, .claim-steps, .about-stats-grid'
    );

    staggerGrids.forEach(grid => grid.classList.add('stagger'));

    // Intersection Observer with better settings
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Unobserve after animating for better performance
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animated elements
    const allAnimatedElements = [
        ...fadeElements,
        ...fadeLeftElements,
        ...fadeRightElements,
        ...scaleElements,
        ...staggerGrids
    ];

    allAnimatedElements.forEach(el => fadeObserver.observe(el));
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
                counterObserver.unobserve(entry.target);
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
    const duration = 2000;
    const start = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(target * eased);

        element.textContent = prefix + current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = prefix + target.toLocaleString();
        }
    }

    requestAnimationFrame(update);
}

// ============================================
// CARD HOVER EFFECTS
// ============================================

function initCardHoverEffects() {
    // Add subtle tilt effect on mouse move for cards
    const cards = document.querySelectorAll('.person-card, .testimonial-card, .benefit-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.1s ease';
        });

        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 30;
            const rotateY = (centerX - x) / 30;

            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });

        card.addEventListener('mouseleave', function() {
            this.style.transition = 'transform 0.3s ease';
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ============================================
// SMOOTH SCROLL
// ============================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

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

// ============================================
// BAGS.FM API INTEGRATION
// ============================================

function initBagsAPIIntegration() {
    // Configuration
    const CONFIG = {
        updateInterval: 5 * 60 * 1000, // Update every 5 minutes (in milliseconds)
        apiEndpoint: '/api/bags-stats' // Vercel serverless function
    };

    // Initial fetch
    fetchAndUpdateStats();

    // Set up periodic updates
    setInterval(fetchAndUpdateStats, CONFIG.updateInterval);

    async function fetchAndUpdateStats() {
        try {
            console.log('Fetching data from Bags API via serverless function...');

            // Call our Vercel serverless function
            const response = await fetch(CONFIG.apiEndpoint);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }

            // Update the "Total Raised" counter on the page
            updateTotalRaisedDisplay(data.totalRaised);

            // Update individual token amounts on podium
            updatePodiumAmounts(data.tokens);

            // Update featured people section with real data
            updateFeaturedPeople(data.tokens);

            console.log('Data updated successfully. Total raised:', data.totalRaised);
            console.log('Tokens tracked:', data.tokenCount);

        } catch (error) {
            console.error('Error fetching Bags API data:', error);
        }
    }

    function updateTotalRaisedDisplay(totalRaised) {
        // Find the "Total Raised" counter element
        const totalRaisedElement = document.querySelector('.result-value[data-target]');
        const heroTotalElement = document.getElementById('hero-total-raised');
        const peopleTotalElement = document.getElementById('people-total-raised');

        if (totalRaisedElement) {
            // Update the data-target attribute for future counter animations
            totalRaisedElement.dataset.target = totalRaised;

            // Animate the counter to the new value
            animateCounterToValue(totalRaisedElement, totalRaised, '$');
        }

        // Also update the hero section
        if (heroTotalElement) {
            animateCounterToValue(heroTotalElement, totalRaised, '$');
        }

        // Also update the people page
        if (peopleTotalElement) {
            animateCounterToValue(peopleTotalElement, totalRaised, '$');
        }
    }

    function animateCounterToValue(element, targetValue, prefix = '') {
        const currentValue = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
        const duration = 1500;
        const start = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(currentValue + (targetValue - currentValue) * eased);

            element.textContent = prefix + current.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.textContent = prefix + targetValue.toLocaleString();
            }
        }

        requestAnimationFrame(update);
    }

    function updatePodiumAmounts(tokens) {
        if (!tokens || !tokens.length) return;

        tokens.forEach(token => {
            // Find podium item by token address
            const podiumItem = document.querySelector(`[data-token="${token.tokenAddress}"]`);
            if (podiumItem) {
                const amountElement = podiumItem.querySelector('.podium-amount');
                if (amountElement) {
                    animateCounterToValue(amountElement, token.amountUSD || 0, '$');
                }

                // Update icon if available from API
                if (token.iconUrl) {
                    const imgElement = podiumItem.querySelector('.podium-image img');
                    if (imgElement) {
                        imgElement.src = token.iconUrl;
                        imgElement.style.display = 'block';
                        const placeholder = imgElement.nextElementSibling;
                        if (placeholder && placeholder.classList.contains('podium-placeholder')) {
                            placeholder.style.display = 'none';
                        }
                    }
                }
            }
        });
    }

    function updateFeaturedPeople(tokens) {
        if (!tokens || !tokens.length) return;

        const featuredGrid = document.getElementById('featured-people-grid');
        if (!featuredGrid) return;

        // Sort by amount (highest first)
        const sortedTokens = [...tokens].sort((a, b) => (b.amountUSD || 0) - (a.amountUSD || 0));

        // Create cards HTML
        const cardsHTML = sortedTokens.map(token => `
            <div class="person-card">
                <div class="person-header">
                    <div class="person-avatar">${token.name.charAt(0)}</div>
                    <div class="person-info">
                        <h3 class="person-name">@${token.name.toLowerCase()}_project</h3>
                        <span class="person-project">${token.name}</span>
                    </div>
                    <span class="person-status">Active</span>
                </div>
                <div class="person-results">
                    <div class="person-stat">
                        <span class="person-stat-value">$${(token.amountUSD || 0).toLocaleString()}</span>
                        <span class="person-stat-label">Fees Earned</span>
                    </div>
                </div>
                <span class="person-date">January 2025</span>
            </div>
        `).join('');

        featuredGrid.innerHTML = cardsHTML;
    }
}
