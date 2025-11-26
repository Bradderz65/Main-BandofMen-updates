/* ============================================
   BAND OF MEN - Gallery
   ============================================
   Gallery expand/collapse functionality
   ============================================ */

const Gallery = {
    grid: null,
    button: null,
    isExpanded: false,

    init() {
        this.grid = document.getElementById('gallery-grid');
        this.button = document.getElementById('gallery-btn');
        
        // Show first 4 items initially
        this.showInitialItems();
    },

    showInitialItems() {
        if (!this.grid) return;
        
        const items = this.grid.querySelectorAll('.gallery-item:nth-child(-n+4)');
        items.forEach(item => {
            item.classList.add('visible');
        });
    },

    toggle() {
        if (!this.grid || !this.button) return;

        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
        
        this.isExpanded = !this.isExpanded;
    },

    expand() {
        this.grid.classList.add('expanded');
        this.button.textContent = 'Show Less';
        
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
        this.grid.classList.remove('expanded');
        this.button.textContent = 'Show More';
        
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
