/* ============================================
   BAND OF MEN - Gallery
   ============================================
   Gallery expand/collapse functionality
   ============================================ */

const Gallery = {
    grid: null,
    buttonTop: null,
    buttonBottom: null,
    isExpanded: false,
    openedAtY: null,
    openedAtTargetY: null,

    init() {
        this.grid = document.getElementById('gallery-grid');
        this.buttonTop = document.getElementById('gallery-btn');
        this.buttonBottom = document.getElementById('gallery-btn-bottom');
        
        // Show first 4 items initially
        this.showInitialItems();
        this.syncButtons();
    },

    getHeaderOffset() {
        const header = document.querySelector('header');
        return header ? Math.ceil(header.getBoundingClientRect().height) : 70;
    },

    rememberOpenPosition() {
        // Store where the user was when they expanded the gallery so "Show Less" can return them there.
        this.openedAtY = window.scrollY;

        if (this.buttonTop) {
            const headerOffset = this.getHeaderOffset();
            const rect = this.buttonTop.getBoundingClientRect();
            const y = rect.top + window.scrollY - headerOffset - 16;
            this.openedAtTargetY = Math.max(0, Math.floor(y));
        } else {
            this.openedAtTargetY = this.openedAtY;
        }
    },

    returnToOpenPosition() {
        const target = typeof this.openedAtTargetY === 'number' ? this.openedAtTargetY : this.openedAtY;
        if (typeof target !== 'number') return;

        window.scrollTo({ top: target, behavior: 'smooth' });
    },

    showInitialItems() {
        if (!this.grid) return;
        
        const items = this.grid.querySelectorAll('.gallery-item:nth-child(-n+4)');
        items.forEach(item => {
            item.classList.add('visible');
        });
    },

    toggle() {
        if (!this.grid || !this.buttonTop) return;

        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
        
        this.isExpanded = !this.isExpanded;
    },

    expand() {
        this.rememberOpenPosition();
        this.grid.classList.add('expanded');
        this.setButtonText('Show Less');
        
        // Show items 5+ with staggered animation
        const items = this.grid.querySelectorAll('.gallery-item:nth-child(n+5)');
        items.forEach((item, index) => {
            item.style.display = 'block';
            item.style.transitionDelay = `${index * 0.05}s`;
            setTimeout(() => {
                item.classList.add('visible');
            }, 10);
        });
    },

    collapse() {
        // Scroll first so the browser doesn't keep us pinned to the bottom as the page height shrinks.
        this.returnToOpenPosition();

        this.grid.classList.remove('expanded');
        this.setButtonText('Show More');
        
        // Animate out items 5+
        const items = this.grid.querySelectorAll('.gallery-item:nth-child(n+5)');
        items.forEach(item => {
            item.classList.remove('visible');
            item.style.transitionDelay = '0s';
        });
        
        // Hide after animation
        setTimeout(() => {
            items.forEach(item => {
                item.style.display = 'none';
            });
        }, 400);
    },

    setButtonText(text) {
        if (this.buttonTop) this.buttonTop.textContent = text;
        if (this.buttonBottom) this.buttonBottom.textContent = text === 'Show More' ? 'Show Less' : text;
        // Note: bottom button is only visible when expanded (CSS).
    },

    syncButtons() {
        // Ensure initial labels are correct if markup changes.
        this.setButtonText(this.isExpanded ? 'Show Less' : 'Show More');
    }
};

// Global function for onclick handler
function toggleGallery() {
    Gallery.toggle();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Gallery.init();
});
