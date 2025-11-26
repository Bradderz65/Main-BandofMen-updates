/* ============================================
   BAND OF MEN - Preloader
   ============================================
   Image preloading and loading screen
   ============================================ */

const Preloader = {
    // Critical images that must load before site reveals
    criticalImages: [
        'Photos/Branding/logo.png',
        'Photos/Branding/inside photo.jpeg',
        'Photos/Branding/exterior.jpeg',
        'Photos/Haircuts/haircut-1.jpeg',
        'Photos/Haircuts/haircut-2.jpeg',
        'Photos/Haircuts/haircut-3.jpeg',
        'Photos/Haircuts/haircut-4.jpeg'
    ],

    loadedCount: 0,
    totalImages: 0,

    init() {
        this.totalImages = this.criticalImages.length;
        this.preloader = document.getElementById('preloader');
        this.loaderBar = document.getElementById('loaderBar');
        this.loaderText = document.getElementById('loaderText');
        
        if (this.preloader) {
            this.startPreloading();
        }
        
        this.setupLazyLoading();
    },

    updateProgress() {
        const percentage = Math.round((this.loadedCount / this.totalImages) * 100);
        if (this.loaderBar) {
            this.loaderBar.style.width = percentage + '%';
        }
        if (this.loaderText) {
            this.loaderText.textContent = `Loading... ${percentage}%`;
        }
    },

    preloadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.loadedCount++;
                this.updateProgress();
                resolve();
            };
            img.onerror = () => {
                this.loadedCount++;
                this.updateProgress();
                resolve(); // Still resolve to prevent blocking
            };
            img.src = src;
        });
    },

    async startPreloading() {
        const startTime = Date.now();
        const minimumLoadTime = 800; // Minimum 800ms to show preloader
        
        try {
            // Preload all critical images
            await Promise.all(this.criticalImages.map(src => this.preloadImage(src)));
            
            // Calculate remaining time to meet minimum load time
            const elapsed = Date.now() - startTime;
            const remainingTime = Math.max(0, minimumLoadTime - elapsed);
            
            // Wait for remaining time if needed
            await new Promise(resolve => setTimeout(resolve, remainingTime));
            
            // Complete animation
            setTimeout(() => {
                if (this.loaderText) {
                    this.loaderText.textContent = 'Welcome...';
                }
                if (this.loaderBar) {
                    this.loaderBar.style.width = '100%';
                }
                
                // Hide preloader
                setTimeout(() => {
                    if (this.preloader) {
                        this.preloader.classList.add('hidden');
                    }
                    document.body.classList.remove('preloading');
                    
                    // Remove preloader from DOM
                    setTimeout(() => {
                        if (this.preloader) {
                            this.preloader.remove();
                        }
                    }, 500);
                }, 300);
            }, 200);
        } catch (error) {
            console.error('Preload error:', error);
            if (this.preloader) {
                this.preloader.classList.add('hidden');
            }
            document.body.classList.remove('preloading');
        }
    },

    setupLazyLoading() {
        document.addEventListener('DOMContentLoaded', () => {
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            
                            if (img.complete) {
                                img.classList.add('loaded');
                            } else {
                                img.addEventListener('load', () => {
                                    img.classList.add('loaded');
                                }, { once: true });
                            }
                            observer.unobserve(img);
                        }
                    });
                }, {
                    rootMargin: '50px'
                });
                
                lazyImages.forEach(img => imageObserver.observe(img));
            } else {
                // Fallback
                lazyImages.forEach(img => {
                    if (img.complete) {
                        img.classList.add('loaded');
                    } else {
                        img.addEventListener('load', () => {
                            img.classList.add('loaded');
                        }, { once: true });
                    }
                });
            }
            
            // Handle eager loaded images
            const eagerImages = document.querySelectorAll('img[loading="eager"]');
            eagerImages.forEach(img => {
                if (img.complete) {
                    img.style.opacity = '1';
                } else {
                    img.addEventListener('load', () => {
                        img.style.opacity = '1';
                    }, { once: true });
                }
            });
        });
    }
};

// Initialize preloader
Preloader.init();
