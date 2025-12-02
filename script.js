// ========================================
// Koning Mexico - Interactive Features
// ========================================

(function() {
    'use strict';

    // ========================================
    // Smooth Scrolling for Navigation Links
    // ========================================
    function initSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');

        links.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();

                const targetId = this.getAttribute('href');

                // Handle #home separately (scroll to top)
                if (targetId === '#home') {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                    return;
                }

                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    const headerOffset = 80; // Height of sticky header
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ========================================
    // Dice Animation on Click
    // ========================================
    function initDiceAnimation() {
        const dice = document.querySelectorAll('.die, .die-mini');
        const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

        dice.forEach(die => {
            die.addEventListener('click', function() {
                // Prevent animation if already animating
                if (this.classList.contains('rolling')) return;

                this.classList.add('rolling');

                // Store original value
                const originalValue = this.textContent;

                // Animate through random numbers
                let rolls = 0;
                const rollInterval = setInterval(() => {
                    const randomIndex = Math.floor(Math.random() * diceSymbols.length);
                    this.textContent = diceSymbols[randomIndex];
                    rolls++;

                    if (rolls >= 10) {
                        clearInterval(rollInterval);
                        this.textContent = originalValue;
                        this.classList.remove('rolling');
                    }
                }, 50);
            });

            // Make it clear the dice are clickable
            die.style.cursor = 'pointer';
            die.title = 'Klik om te gooien!';
        });
    }

    // ========================================
    // Scroll-triggered Animations
    // ========================================
    function initScrollAnimations() {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements that should animate in
        const animateElements = document.querySelectorAll(
            '.requirement-card, .variant-card, .phase-card, .rangorde-item, .strategy-item'
        );

        animateElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });
    }

    // Add CSS for animate-in class
    function addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .animate-in {
                opacity: 1 !important;
                transform: translateY(0) !important;
            }

            .die.rolling {
                animation: diceRoll 0.5s ease;
            }

            @keyframes diceRoll {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(90deg) scale(1.1); }
                50% { transform: rotate(180deg) scale(1.2); }
                75% { transform: rotate(270deg) scale(1.1); }
            }

            .variant-card {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    // ========================================
    // Header Shadow on Scroll
    // ========================================
    function initHeaderShadow() {
        const header = document.querySelector('.site-header');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
            } else {
                header.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }
        });
    }

    // ========================================
    // Variant Cards Interaction
    // ========================================
    function initVariantCards() {
        const variantCards = document.querySelectorAll('.variant-card');

        variantCards.forEach(card => {
            card.addEventListener('click', function() {
                // Toggle active state
                const isActive = this.classList.contains('active');

                // Remove active from all cards
                variantCards.forEach(c => c.classList.remove('active'));

                // Add active to clicked card if it wasn't active
                if (!isActive) {
                    this.classList.add('active');

                    // Add visual feedback
                    this.style.borderColor = 'var(--color-gold)';
                    this.style.backgroundColor = 'var(--color-white)';
                } else {
                    this.style.borderColor = 'var(--color-cream)';
                    this.style.backgroundColor = 'var(--color-cream-light)';
                }
            });
        });
    }

    // ========================================
    // Mobile Menu Toggle
    // ========================================
    function initMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.main-nav');

        if (!menuToggle || !nav) return;

        // Toggle menu
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isActive = nav.classList.toggle('active');
            menuToggle.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isActive);
        });

        // Close menu when clicking a link
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
                nav.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                nav.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ========================================
    // Performance: Lazy Load Images
    // ========================================
    function initLazyLoading() {
        if ('loading' in HTMLImageElement.prototype) {
            const images = document.querySelectorAll('img[loading="lazy"]');
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        } else {
            // Fallback for browsers that don't support lazy loading
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
            document.body.appendChild(script);
        }
    }

    // ========================================
    // Add "Back to Top" functionality
    // ========================================
    function initBackToTop() {
        let backToTopBtn = document.createElement('button');
        backToTopBtn.innerHTML = '↑';
        backToTopBtn.className = 'back-to-top';
        backToTopBtn.setAttribute('aria-label', 'Terug naar boven');

        // Style the button
        Object.assign(backToTopBtn.style, {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 100%)',
            color: 'var(--color-brown-dark)',
            border: '3px solid var(--color-gold-dark)',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
            zIndex: '999',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(backToTopBtn);

        // Show/hide based on scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.style.display = 'flex';
            } else {
                backToTopBtn.style.display = 'none';
            }
        });

        // Scroll to top on click
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Hover effect
        backToTopBtn.addEventListener('mouseenter', () => {
            backToTopBtn.style.transform = 'scale(1.1) translateY(-5px)';
        });

        backToTopBtn.addEventListener('mouseleave', () => {
            backToTopBtn.style.transform = 'scale(1) translateY(0)';
        });
    }

    // ========================================
    // Easter Egg: Mexico Celebration
    // ========================================
    function initMexicoCelebration() {
        // If someone clicks on the hero logo 5 times quickly, show celebration
        const heroLogo = document.querySelector('.hero-logo');
        let clickCount = 0;
        let clickTimer;

        if (heroLogo) {
            heroLogo.addEventListener('click', () => {
                clickCount++;

                clearTimeout(clickTimer);

                if (clickCount === 5) {
                    celebrateMexico();
                    clickCount = 0;
                }

                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 2000);
            });
        }
    }

    function celebrateMexico() {
        // Create confetti effect
        const colors = ['#D4AF37', '#FFD700', '#8B0000', '#0D5E3A'];

        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                createConfetti(colors[Math.floor(Math.random() * colors.length)]);
            }, i * 30);
        }

        // Show message
        const message = document.createElement('div');
        message.textContent = '🎉 MEXICO! 🎉';
        Object.assign(message.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '4rem',
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-gold)',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            zIndex: '10000',
            animation: 'bounce 1s ease',
            pointerEvents: 'none'
        });

        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 2000);
    }

    function createConfetti(color) {
        const confetti = document.createElement('div');
        Object.assign(confetti.style, {
            position: 'fixed',
            width: '10px',
            height: '10px',
            backgroundColor: color,
            left: Math.random() * window.innerWidth + 'px',
            top: '-10px',
            borderRadius: '50%',
            zIndex: '9999',
            pointerEvents: 'none'
        });

        document.body.appendChild(confetti);

        const duration = 2000 + Math.random() * 1000;
        const xMovement = (Math.random() - 0.5) * 200;

        confetti.animate([
            {
                transform: 'translateY(0) translateX(0) rotate(0deg)',
                opacity: 1
            },
            {
                transform: `translateY(${window.innerHeight + 20}px) translateX(${xMovement}px) rotate(${Math.random() * 360}deg)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        setTimeout(() => {
            confetti.remove();
        }, duration);
    }

    // ========================================
    // Initialize All Features
    // ========================================
    function init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        addAnimationStyles();
        initSmoothScrolling();
        initDiceAnimation();
        initScrollAnimations();
        initHeaderShadow();
        initVariantCards();
        initMobileMenu();
        initLazyLoading();
        initBackToTop();
        initMexicoCelebration();

        console.log('🎲 Koning Mexico website loaded! Veel speelplezier!');
    }

    // Start initialization
    init();

})();
