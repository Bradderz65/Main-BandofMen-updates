/* ============================================
   BAND OF MEN - Navigation
   ============================================
   Mobile menu toggle and navigation handling
   ============================================ */

const Navigation = {
    menu: null,
    hamburger: null,
    body: document.body,

    init() {
        this.menu = document.getElementById('mobileMenu');
        this.hamburger = document.querySelector('.hamburger-btn');
        
        // Bind event handlers
        this.bindEvents();
    },

    bindEvents() {
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMenuOpen()) {
                this.closeMenu();
            }
        });

        // Close menu when clicking outside
        if (this.menu) {
            this.menu.addEventListener('click', (e) => {
                if (e.target === this.menu) {
                    this.closeMenu();
                }
            });
        }
    },

    isMenuOpen() {
        return this.menu && this.menu.classList.contains('active');
    },

    toggleMenu() {
        if (this.isMenuOpen()) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    },

    openMenu() {
        if (this.menu) {
            this.menu.classList.add('active');
        }
        if (this.hamburger) {
            this.hamburger.classList.add('active');
        }
        this.body.classList.add('noscroll');
    },

    closeMenu() {
        if (this.menu) {
            this.menu.classList.remove('active');
        }
        if (this.hamburger) {
            this.hamburger.classList.remove('active');
        }
        this.body.classList.remove('noscroll');
    }
};

// Global functions for onclick handlers
function toggleMenu() {
    Navigation.toggleMenu();
}

function closeMenu() {
    Navigation.closeMenu();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Navigation.init();
});
