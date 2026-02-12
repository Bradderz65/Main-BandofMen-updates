/* ============================================
   BAND OF MEN - Tabs
   ============================================
   Service menu tab switching + mobile accordions
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

        this.buildMobileAccordions();

        this.applyStableHeight();
        window.addEventListener('resize', () => {
            this.applyStableHeight();
            this.refreshAccordionMode();
        }, { passive: true });
        window.addEventListener('load', () => this.applyStableHeight(), { once: true });
        setTimeout(() => this.applyStableHeight(), 250);
    },

    isMobile() {
        return window.innerWidth <= 900;
    },

    buildMobileAccordions() {
        const tabs = Array.from(document.querySelectorAll('.menu-content'));

        tabs.forEach((tab) => {
            if (tab.dataset.accordionBuilt === 'true') return;

            const headers = Array.from(tab.querySelectorAll('.cat-header'));
            headers.forEach((header, index) => {
                const section = document.createElement('div');
                section.className = 'menu-accordion-section';

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'cat-header cat-header-btn';
                button.setAttribute('aria-expanded', index === 0 ? 'true' : 'false');
                button.innerHTML = `<span>${header.textContent.trim()}</span><span class="cat-header-chevron" aria-hidden="true">⌄</span>`;

                const panel = document.createElement('div');
                panel.className = 'menu-accordion-panel';
                panel.hidden = index !== 0;

                header.parentNode.insertBefore(section, header);
                section.appendChild(button);
                section.appendChild(panel);
                header.remove();

                let next = section.nextSibling;
                while (next && !(next.classList && next.classList.contains('cat-header'))) {
                    const current = next;
                    next = next.nextSibling;
                    if (current.nodeType === 1 && current.classList.contains('pricing-row')) {
                        panel.appendChild(current);
                    }
                }

                button.addEventListener('click', () => {
                    if (!this.isMobile()) return;

                    const currentlyOpen = button.getAttribute('aria-expanded') === 'true';
                    const siblingSections = Array.from(tab.querySelectorAll('.menu-accordion-section'));

                    siblingSections.forEach((sec) => {
                        const btn = sec.querySelector('.cat-header-btn');
                        const pnl = sec.querySelector('.menu-accordion-panel');
                        btn.setAttribute('aria-expanded', 'false');
                        pnl.hidden = true;
                    });

                    if (!currentlyOpen) {
                        button.setAttribute('aria-expanded', 'true');
                        panel.hidden = false;
                    }

                    this.applyStableHeight();
                });
            });

            tab.dataset.accordionBuilt = 'true';
        });

        this.refreshAccordionMode();
    },

    refreshAccordionMode() {
        const mobile = this.isMobile();
        const tabs = Array.from(document.querySelectorAll('.menu-content'));

        tabs.forEach((tab) => {
            const sections = Array.from(tab.querySelectorAll('.menu-accordion-section'));
            sections.forEach((section, index) => {
                const button = section.querySelector('.cat-header-btn');
                const panel = section.querySelector('.menu-accordion-panel');
                if (!button || !panel) return;

                if (mobile) {
                    const shouldOpen = index === 0;
                    button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
                    panel.hidden = !shouldOpen;
                } else {
                    button.setAttribute('aria-expanded', 'true');
                    panel.hidden = false;
                }
            });
        });
    },

    applyStableHeight() {
        // Lock all tabs to the tallest one to avoid background/section jumping
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
        if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();
        const scrollY = window.scrollY;

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

        // On mobile, keep only first category open for shorter scrolling
        if (this.isMobile() && targetTab) {
            const sections = Array.from(targetTab.querySelectorAll('.menu-accordion-section'));
            sections.forEach((section, index) => {
                const btn = section.querySelector('.cat-header-btn');
                const pnl = section.querySelector('.menu-accordion-panel');
                const shouldOpen = index === 0;
                if (btn) btn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
                if (pnl) pnl.hidden = !shouldOpen;
            });
        }

        this.applyStableHeight();

        // Prevent mobile focus/layout adjustments from kicking user down the page
        if (evt && evt.currentTarget && typeof evt.currentTarget.blur === 'function') {
            evt.currentTarget.blur();
        }
        requestAnimationFrame(() => window.scrollTo(0, scrollY));
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
