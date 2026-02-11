/* ============================================
   BAND OF MEN - Main JavaScript
   ============================================
   Main entry point and initialization
   ============================================ */

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', () => {
    // Keep a CSS var in sync with the real header height (header can change height on some mobile landscape widths).
    const updateHeaderHeightVar = () => {
        const header = document.querySelector('header');
        if (!header) return;
        const h = Math.ceil(header.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--header-height-dyn', `${h}px`);
    };

    updateHeaderHeightVar();
    window.addEventListener('resize', () => {
        // Wait a tick so layout settles (especially on orientation changes).
        window.requestAnimationFrame(updateHeaderHeightVar);
    }, { passive: true });
    window.addEventListener('orientationchange', () => {
        setTimeout(updateHeaderHeightVar, 150);
    }, { passive: true });

    // Handle smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                const headerHeight = document.querySelector('header')?.offsetHeight || 70;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add loaded class to intro image when it loads
    const introImg = document.querySelector('.intro-img');
    if (introImg) {
        if (introImg.complete) {
            introImg.classList.add('loaded');
        } else {
            introImg.addEventListener('load', () => {
                introImg.classList.add('loaded');
            }, { once: true });
        }
    }

    // Mobile map effect: apply "hover" style when map scrolls into view on touch devices
    const mapSide = document.querySelector('.map-side');
    const isTouchLike = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    if (mapSide && isTouchLike && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    mapSide.classList.add('in-view');
                } else {
                    mapSide.classList.remove('in-view');
                }
            });
        }, {
            threshold: 0.35
        });

        observer.observe(mapSide);
    }

    // Console branding
    console.log('%c BAND OF MEN ', 'background: #c5a059; color: #080f0d; font-size: 20px; font-weight: bold; padding: 10px;');
    console.log('%c Legendary Grooming ', 'color: #8ca39d; font-size: 12px;');
});

// Scroll-based header styling (optional enhancement)
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (!header) return;

    const currentScrollY = window.scrollY;

    // Add shadow on scroll
    if (currentScrollY > 50) {
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
    } else {
        header.style.boxShadow = 'none';
    }

    lastScrollY = currentScrollY;
}, { passive: true });
