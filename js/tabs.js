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
