/* ============================================
   BAND OF MEN - Tabs
   ============================================
   Service menu tab switching
   ============================================ */

const Tabs = {
    init() {
        // Set initial active tab
        const activeContent = document.querySelector('.menu-content.active');
        if (!activeContent) {
            const firstContent = document.querySelector('.menu-content');
            const firstButton = document.querySelector('.selector-btn');
            if (firstContent) firstContent.classList.add('active');
            if (firstButton) firstButton.classList.add('active');
        }

        this.applyStableHeight();
        window.addEventListener('resize', () => this.applyStableHeight(), { passive: true });
    },

    applyStableHeight() {
        // Desktop only: lock all tabs to the tallest one to avoid background/section jumping
        if (window.innerWidth < 901) {
            document.documentElement.style.removeProperty('--menu-content-max-height');
            return;
        }

        const contents = Array.from(document.querySelectorAll('.menu-content'));
        if (contents.length === 0) return;

        let maxHeight = 0;

        contents.forEach((content) => {
            const wasActive = content.classList.contains('active');

            content.classList.add('active');
            content.style.position = 'absolute';
            content.style.visibility = 'hidden';
            content.style.pointerEvents = 'none';
            content.style.left = '0';
            content.style.right = '0';
            content.style.width = '100%';

            maxHeight = Math.max(maxHeight, content.scrollHeight);

            content.style.position = '';
            content.style.visibility = '';
            content.style.pointerEvents = '';
            content.style.left = '';
            content.style.right = '';
            content.style.width = '';
            if (!wasActive) content.classList.remove('active');
        });

        if (maxHeight > 0) {
            document.documentElement.style.setProperty('--menu-content-max-height', `${maxHeight}px`);
        }
    },

    openTab(evt, tabName) {
        // Hide all tab contents
        const contents = document.getElementsByClassName('menu-content');
        for (let i = 0; i < contents.length; i++) {
            contents[i].classList.remove('active');
        }

        // Remove active class from all buttons
        const buttons = document.getElementsByClassName('selector-btn');
        for (let i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('active');
        }

        // Show the specific tab content
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Add active class to the clicked button
        if (evt && evt.currentTarget) {
            evt.currentTarget.classList.add('active');
        }
    }
};

// Global function for onclick handler
function openTab(evt, tabName) {
    Tabs.openTab(evt, tabName);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Tabs.init();
});
