// ============================================
// BAND OF MEN - Authentication Module
// ============================================

const Auth = {
    // Storage keys
    TOKEN_KEY: 'bom_auth_token',
    USER_KEY: 'bom_user',

    // Get stored token
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    // Get stored user
    getUser() {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    // Store auth data
    setAuth(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    // Clear auth data
    clearAuth() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },

    // Check if user is logged in
    isLoggedIn() {
        return !!this.getToken();
    },

    // Sign up new user (step 1: validate, step 2: with verification code)
    async signup(email, password, name, verificationCode = null) {
        try {
            const response = await fetch('/.netlify/functions/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, name, verificationCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            // If verification is required, return that status
            if (data.requiresVerification) {
                return { success: true, requiresVerification: true };
            }

            this.setAuth(data.token, data.user);
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Send verification code
    async sendCode(email, type) {
        try {
            const response = await fetch('/.netlify/functions/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, type })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send code');
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Login user (supports 2FA)
    async login(email, password, twoFactorCode = null) {
        try {
            const response = await fetch('/.netlify/functions/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, twoFactorCode })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // If 2FA is required, return that status
            if (data.requires2FA) {
                return { success: true, requires2FA: true };
            }

            this.setAuth(data.token, data.user);
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Logout user
    async logout() {
        try {
            const token = this.getToken();
            if (token) {
                await fetch('/.netlify/functions/user', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            updateAuthUI();
        }
    },

    // Verify current session
    async verifySession() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const response = await fetch('/.netlify/functions/user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                this.clearAuth();
                return false;
            }

            const data = await response.json();
            // Update stored user data
            localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
            return true;
        } catch (error) {
            this.clearAuth();
            return false;
        }
    }
};

// ============================================
// Modal Management
// ============================================

function openAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Switch to correct tab
    if (mode === 'signup') {
        switchAuthTab('signup');
    } else {
        switchAuthTab('login');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Clear form errors
    clearAuthErrors();
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
    }
    
    clearAuthErrors();
}

function clearAuthErrors() {
    document.querySelectorAll('.auth-error').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

function showAuthError(formId, message) {
    const errorEl = document.querySelector(`#${formId} .auth-error`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function setFormLoading(formId, loading) {
    const form = document.getElementById(formId);
    const btn = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input');
    
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="auth-spinner"></span> Please wait...';
        inputs.forEach(input => input.disabled = true);
    } else {
        btn.disabled = false;
        btn.textContent = formId === 'loginForm' ? 'Sign In' : 'Create Account';
        inputs.forEach(input => input.disabled = false);
    }
}

// ============================================
// Form Handlers
// ============================================

// Store form data temporarily for verification flow
let pendingSignup = null;
let pendingLogin = null;

async function handleLogin(e) {
    e.preventDefault();
    clearAuthErrors();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const twoFactorCode = document.getElementById('login2FACode')?.value?.trim();
    
    if (!email || !password) {
        showAuthError('loginForm', 'Please fill in all fields');
        return;
    }
    
    setFormLoading('loginForm', true);
    
    const result = await Auth.login(email, password, twoFactorCode || null);
    
    setFormLoading('loginForm', false);
    
    if (result.success) {
        if (result.requires2FA) {
            // Store credentials and show 2FA input
            pendingLogin = { email, password };
            show2FAInput('login');
            // Send 2FA code
            const sendResult = await Auth.sendCode(email, 'login_2fa');
            if (sendResult.success) {
                showNotification('Verification code sent to your email');
            } else {
                showAuthError('loginForm', sendResult.error);
            }
        } else {
            closeAuthModal();
            updateAuthUI();
            showNotification(`Welcome back, ${result.user.name}!`);
            pendingLogin = null;
        }
    } else {
        showAuthError('loginForm', result.error);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    clearAuthErrors();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const verificationCode = document.getElementById('signupVerificationCode')?.value?.trim();
    
    if (!name || !email || !password || !confirmPassword) {
        showAuthError('signupForm', 'Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showAuthError('signupForm', 'Passwords do not match');
        return;
    }
    
    if (password.length < 8) {
        showAuthError('signupForm', 'Password must be at least 8 characters');
        return;
    }
    
    setFormLoading('signupForm', true);
    
    // If we have a verification code, complete signup
    if (verificationCode && pendingSignup) {
        const result = await Auth.signup(
            pendingSignup.email, 
            pendingSignup.password, 
            pendingSignup.name, 
            verificationCode
        );
        
        setFormLoading('signupForm', false);
        
        if (result.success && result.user) {
            closeAuthModal();
            updateAuthUI();
            showNotification(`Welcome to Band of Men, ${result.user.name}!`);
            pendingSignup = null;
            hideVerificationInput('signup');
        } else {
            showAuthError('signupForm', result.error || 'Verification failed');
        }
        return;
    }
    
    // Step 1: Validate and request verification
    const result = await Auth.signup(email, password, name);
    
    setFormLoading('signupForm', false);
    
    if (result.success) {
        if (result.requiresVerification) {
            // Store signup data and show verification input
            pendingSignup = { email, password, name };
            showVerificationInput('signup');
            // Send verification code
            const sendResult = await Auth.sendCode(email, 'signup');
            if (sendResult.success) {
                showNotification('Verification code sent to your email');
            } else {
                showAuthError('signupForm', sendResult.error);
            }
        } else if (result.user) {
            closeAuthModal();
            updateAuthUI();
            showNotification(`Welcome to Band of Men, ${result.user.name}!`);
        }
    } else {
        showAuthError('signupForm', result.error);
    }
}

function showVerificationInput(formType) {
    const container = document.getElementById(`${formType}VerificationContainer`);
    if (container) {
        container.style.display = 'block';
    }
    // Update button text
    const btn = document.querySelector(`#${formType}Form button[type="submit"]`);
    if (btn) {
        btn.textContent = 'Verify & Create Account';
    }
}

function hideVerificationInput(formType) {
    const container = document.getElementById(`${formType}VerificationContainer`);
    if (container) {
        container.style.display = 'none';
        const input = container.querySelector('input');
        if (input) input.value = '';
    }
}

function show2FAInput(formType) {
    const container = document.getElementById(`${formType}2FAContainer`);
    if (container) {
        container.style.display = 'block';
    }
    // Update button text
    const btn = document.querySelector(`#${formType}Form button[type="submit"]`);
    if (btn) {
        btn.textContent = 'Verify & Sign In';
    }
}

function hide2FAInput(formType) {
    const container = document.getElementById(`${formType}2FAContainer`);
    if (container) {
        container.style.display = 'none';
        const input = container.querySelector('input');
        if (input) input.value = '';
    }
}

async function resendCode(type, email) {
    const result = await Auth.sendCode(email || pendingSignup?.email || pendingLogin?.email, type);
    if (result.success) {
        showNotification('New verification code sent');
    } else {
        showNotification(result.error || 'Failed to send code');
    }
}

async function handleLogout() {
    await Auth.logout();
    showNotification('You have been logged out');
}

// ============================================
// UI Updates
// ============================================

function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const mobileAuthBtn = document.getElementById('mobileAuthBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (Auth.isLoggedIn()) {
        const user = Auth.getUser();
        const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
        
        // Desktop
        if (authBtn) authBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'flex';
            if (userName) userName.textContent = user?.name || 'Account';
            if (userAvatar) userAvatar.textContent = initials;
        }
        
        // Mobile - show name and link to account
        if (mobileAuthBtn) {
            mobileAuthBtn.textContent = user?.name || 'Account';
            mobileAuthBtn.classList.add('logged-in');
            mobileAuthBtn.onclick = () => { 
                closeMenu(); 
                window.location.href = 'account.html';
            };
        }
    } else {
        // Desktop
        if (authBtn) authBtn.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';
        
        // Mobile
        if (mobileAuthBtn) {
            mobileAuthBtn.textContent = 'Login';
            mobileAuthBtn.classList.remove('logged-in');
            mobileAuthBtn.onclick = () => { closeMenu(); openAuthModal('login'); };
        }
    }
}

function openUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'auth-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Verify session on page load
    if (Auth.isLoggedIn()) {
        await Auth.verifySession();
    }
    
    // Update UI
    updateAuthUI();
    
    // Close modal on backdrop click
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAuthModal();
            }
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('userDropdown');
        const userMenu = document.getElementById('userMenu');
        if (dropdown && userMenu && !userMenu.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAuthModal();
        }
    });
});
