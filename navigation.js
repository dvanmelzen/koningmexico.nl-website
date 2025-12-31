// Unified Navigation Component for Koning Mexico
// Include this script in <head> or at the end of <body> on all pages

const KoningMexicoNav = {
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.render());
        } else {
            this.render();
        }
    },

    render() {
        // Check if navigation already exists
        if (document.getElementById('main-header')) {
            return;
        }

        // Create navigation HTML
        const navHTML = `
<header id="main-header" class="bg-gradient-to-r from-green to-green-light shadow-lg sticky top-0 z-50">
    <div class="container mx-auto px-4 py-3">
        <div class="flex justify-between items-center">
            <!-- Logo -->
            <a href="/" class="flex-shrink-0">
                <img src="assets/logo-fixed.png" alt="Koning Mexico Logo" class="h-12 md:h-16 w-auto">
            </a>

            <!-- Desktop Navigation -->
            <nav class="hidden lg:flex items-center gap-2">
                <a href="/" class="nav-link">
                    <span class="nav-icon">🏠</span>
                    <span class="nav-text">Home</span>
                </a>

                <!-- Spelregels Dropdown -->
                <div class="nav-dropdown">
                    <button class="nav-link nav-dropdown-btn">
                        <span class="nav-icon">📖</span>
                        <span class="nav-text">Spelregels</span>
                        <span class="dropdown-arrow">▼</span>
                    </button>
                    <div class="nav-dropdown-menu">
                        <a href="spelregels.html" class="nav-dropdown-item">
                            <span>📜</span>
                            <span>Spelregels</span>
                        </a>
                        <a href="ai_psychology.html" class="nav-dropdown-item">
                            <span>🧠</span>
                            <span>AI Psychologie</span>
                        </a>
                    </div>
                </div>

                <a href="spel.html" class="nav-link">
                    <span class="nav-icon">🎲</span>
                    <span class="nav-text">Solo Spelen</span>
                </a>
                <a href="spel_vs_computer.html" class="nav-link">
                    <span class="nav-icon">🤖</span>
                    <span class="nav-text">vs Computer</span>
                </a>
                <a href="multiplayer.html" class="nav-link nav-link-primary">
                    <span class="nav-icon">🎮</span>
                    <span class="nav-text">Multiplayer</span>
                </a>
            </nav>

            <!-- Mobile Menu Button -->
            <button id="mobile-menu-btn" class="lg:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-white/10 transition-colors" aria-label="Menu">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
        </div>

        <!-- Mobile Navigation -->
        <nav id="mobile-menu" class="mobile-menu">
            <div class="py-4 space-y-2">
                <a href="/" class="mobile-nav-link">
                    <span class="text-2xl">🏠</span>
                    <span>Home</span>
                </a>
                <a href="spelregels.html" class="mobile-nav-link">
                    <span class="text-2xl">📖</span>
                    <span>Spelregels</span>
                </a>
                <a href="ai_psychology.html" class="mobile-nav-link mobile-nav-subitem">
                    <span class="text-2xl">🧠</span>
                    <span>AI Psychologie</span>
                </a>
                <a href="spel.html" class="mobile-nav-link">
                    <span class="text-2xl">🎲</span>
                    <span>Solo Spelen</span>
                </a>
                <a href="spel_vs_computer.html" class="mobile-nav-link">
                    <span class="text-2xl">🤖</span>
                    <span>vs Computer</span>
                </a>
                <a href="multiplayer.html" class="mobile-nav-link mobile-nav-link-primary">
                    <span class="text-2xl">🎮</span>
                    <span>Multiplayer</span>
                </a>
            </div>
        </nav>
    </div>
</header>
        `;

        // Inject navigation at the start of body
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = navHTML;
        const nav = tempDiv.firstElementChild;

        if (document.body.firstChild) {
            document.body.insertBefore(nav, document.body.firstChild);
        } else {
            document.body.appendChild(nav);
        }

        // Inject styles
        this.injectStyles();

        // Initialize functionality
        this.initializeMobileMenu();
        this.highlightActivePage();
    },

    injectStyles() {
        const styles = `
            /* Navigation Styles */
            .nav-link {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                color: white;
                font-weight: 600;
                border-radius: 0.5rem;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .nav-link:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateY(-2px);
            }

            .nav-link-primary {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid #FFD700;
                color: #FFD700;
                font-weight: 700;
                animation: pulse-gold 2s ease-in-out infinite;
            }

            .nav-link-primary:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            @keyframes pulse-gold {
                0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.3); }
                50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.6); }
            }

            .nav-icon {
                font-size: 1.25rem;
            }

            .nav-text {
                font-size: 0.95rem;
            }

            /* Hamburger Menu */
            .hamburger-line {
                display: block;
                width: 24px;
                height: 2px;
                background: white;
                border-radius: 2px;
                transition: all 0.3s ease;
            }

            .hamburger-line:not(:last-child) {
                margin-bottom: 5px;
            }

            /* Hamburger Animation */
            #mobile-menu-btn.active .hamburger-line:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }

            #mobile-menu-btn.active .hamburger-line:nth-child(2) {
                opacity: 0;
            }

            #mobile-menu-btn.active .hamburger-line:nth-child(3) {
                transform: rotate(-45deg) translate(7px, -7px);
            }

            /* Mobile Menu */
            .mobile-menu {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-in-out;
            }

            .mobile-menu.active {
                max-height: 500px;
            }

            .mobile-nav-link {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                color: white;
                font-weight: 600;
                border-radius: 0.5rem;
                transition: all 0.2s;
                background: rgba(255, 255, 255, 0.05);
            }

            .mobile-nav-link:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateX(8px);
            }

            .mobile-nav-link-primary {
                background: rgba(255, 215, 0, 0.15);
                border: 2px solid #FFD700;
                color: #FFD700;
            }

            .mobile-nav-link-primary:hover {
                background: rgba(255, 215, 0, 0.25);
            }

            /* Mobile subitem */
            .mobile-nav-subitem {
                margin-left: 2rem;
                font-size: 0.9rem;
                opacity: 0.9;
            }

            /* Dropdown Menu */
            .nav-dropdown {
                position: relative;
            }

            .nav-dropdown-btn {
                cursor: pointer;
                background: transparent;
                border: none;
            }

            .dropdown-arrow {
                font-size: 0.7rem;
                margin-left: 0.25rem;
                transition: transform 0.2s;
            }

            .nav-dropdown:hover .dropdown-arrow {
                transform: rotate(180deg);
            }

            .nav-dropdown-menu {
                position: absolute;
                top: 100%;
                left: 0;
                min-width: 200px;
                background: rgba(13, 94, 58, 0.98);
                border-radius: 0.5rem;
                padding: 0.5rem;
                margin-top: 0.5rem;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
                z-index: 1000;
            }

            .nav-dropdown:hover .nav-dropdown-menu {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .nav-dropdown-item {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                color: white;
                font-weight: 600;
                border-radius: 0.375rem;
                transition: all 0.2s;
                white-space: nowrap;
            }

            .nav-dropdown-item:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateX(5px);
            }

            .nav-dropdown-item span:first-child {
                font-size: 1.25rem;
            }

            /* Responsive adjustments */
            @media (max-width: 1024px) {
                .nav-text {
                    display: none;
                }

                .nav-icon {
                    font-size: 1.5rem;
                }

                .dropdown-arrow {
                    display: none;
                }
            }

            @media (max-width: 640px) {
                #main-header .container {
                    padding-left: 1rem;
                    padding-right: 1rem;
                }
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    },

    initializeMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        if (!menuBtn || !mobileMenu) return;

        // Toggle menu
        menuBtn.addEventListener('click', function() {
            menuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        // Close menu when clicking a link
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!menuBtn.contains(event.target) && !mobileMenu.contains(event.target)) {
                menuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
            }
        });
    },

    highlightActivePage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage ||
                (href === '/' && (currentPage === 'index.html' || currentPage === '')) ||
                (href === 'index.html' && (currentPage === '/' || currentPage === ''))) {
                link.style.background = 'rgba(255, 255, 255, 0.2)';
                link.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
            }
        });
    }
};

// Auto-initialize when script loads
KoningMexicoNav.init();
