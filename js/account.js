// ============================================
// BAND OF MEN - Account Page JavaScript
// ============================================

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Redirect to home if not logged in
    if (!Auth.isLoggedIn()) {
        window.location.href = 'index.html';
        return;
    }

    // Verify session is still valid
    const isValid = await Auth.verifySession();
    if (!isValid) {
        window.location.href = 'index.html';
        return;
    }

    // Load user data
    loadUserProfile();
    updateNavUI();
});

// Load user profile data
function loadUserProfile() {
    const user = Auth.getUser();
    
    if (user) {
        const initials = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        
        // Update profile card
        document.getElementById('profileAvatar').textContent = initials;
        document.getElementById('profileName').textContent = user.name || 'User';
        document.getElementById('profileEmail').textContent = user.email || '';
        
        // Format member since date
        if (user.created_at) {
            const date = new Date(user.created_at);
            const options = { month: 'long', year: 'numeric' };
            document.getElementById('memberSince').textContent = date.toLocaleDateString('en-GB', options);
        }
        
        // Update nav avatar
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        if (userAvatar) userAvatar.textContent = initials;
        if (userName) userName.textContent = user.name || 'Account';
        
        // Update 2FA toggle state
        const twofaToggle = document.getElementById('twofaToggle');
        const twofaIcon = document.getElementById('twofaIcon');
        if (twofaToggle) {
            twofaToggle.checked = user.two_factor_enabled || false;
        }
        if (twofaIcon && user.two_factor_enabled) {
            twofaIcon.classList.add('enabled');
        }
    }
}

// Update navigation UI for logged-in state
function updateNavUI() {
    const user = Auth.getUser();
    const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
    
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    
    if (userAvatar) userAvatar.textContent = initials;
    if (userName) userName.textContent = user?.name || 'Account';
}

// Handle password change
async function handleChangePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const errorEl = document.getElementById('passwordError');
    const successEl = document.getElementById('passwordSuccess');
    const submitBtn = document.getElementById('changePasswordBtn');
    
    // Clear previous messages
    errorEl.classList.remove('show');
    successEl.classList.remove('show');
    errorEl.textContent = '';
    successEl.textContent = '';
    
    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showPasswordError('Please fill in all fields');
        return;
    }
    
    if (newPassword.length < 8) {
        showPasswordError('New password must be at least 8 characters');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showPasswordError('New passwords do not match');
        return;
    }
    
    if (currentPassword === newPassword) {
        showPasswordError('New password must be different from current password');
        return;
    }
    
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="auth-spinner"></span> Updating...';
    
    try {
        const token = Auth.getToken();
        const response = await fetch('/.netlify/functions/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to change password');
        }
        
        // Success
        showPasswordSuccess('Password updated successfully!');
        document.getElementById('changePasswordForm').reset();
        
    } catch (error) {
        showPasswordError(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
    }
}

function showPasswordError(message) {
    const errorEl = document.getElementById('passwordError');
    errorEl.textContent = message;
    errorEl.classList.add('show');
}

function showPasswordSuccess(message) {
    const successEl = document.getElementById('passwordSuccess');
    successEl.textContent = message;
    successEl.classList.add('show');
}

// ============================================
// Two-Factor Authentication
// ============================================

let pending2FAAction = null; // 'enable' or 'disable'

async function handleToggle2FA() {
    const toggle = document.getElementById('twofaToggle');
    const user = Auth.getUser();
    const wantToEnable = toggle.checked;
    
    // Clear previous messages
    hide2FAMessages();
    
    // If trying to change state, request verification
    pending2FAAction = wantToEnable ? 'enable' : 'disable';
    
    // Send verification code
    const type = wantToEnable ? 'enable_2fa' : 'disable_2fa';
    
    try {
        const response = await fetch('/.netlify/functions/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, type })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Show verification input
            document.getElementById('twofaVerifyContainer').style.display = 'block';
            show2FASuccess('Verification code sent to your email');
        } else {
            // Revert toggle
            toggle.checked = !wantToEnable;
            show2FAError(data.error || 'Failed to send verification code');
        }
    } catch (error) {
        toggle.checked = !wantToEnable;
        show2FAError('Failed to send verification code');
    }
}

async function confirmToggle2FA() {
    const code = document.getElementById('twofaCode').value.trim();
    const user = Auth.getUser();
    
    if (!code || code.length !== 6) {
        show2FAError('Please enter a valid 6-digit code');
        return;
    }
    
    hide2FAMessages();
    
    try {
        const token = Auth.getToken();
        const response = await fetch('/.netlify/functions/toggle-2fa', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                enable: pending2FAAction === 'enable',
                verificationCode: code
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Update local user data
            user.two_factor_enabled = data.two_factor_enabled;
            localStorage.setItem('bom_user', JSON.stringify(user));
            
            // Update UI
            const twofaIcon = document.getElementById('twofaIcon');
            if (data.two_factor_enabled) {
                twofaIcon.classList.add('enabled');
                show2FASuccess('Two-factor authentication enabled!');
            } else {
                twofaIcon.classList.remove('enabled');
                show2FASuccess('Two-factor authentication disabled');
            }
            
            // Hide verification input
            document.getElementById('twofaVerifyContainer').style.display = 'none';
            document.getElementById('twofaCode').value = '';
            pending2FAAction = null;
        } else {
            show2FAError(data.error || 'Verification failed');
        }
    } catch (error) {
        show2FAError('Failed to update 2FA setting');
    }
}

async function resend2FACode() {
    const user = Auth.getUser();
    const type = pending2FAAction === 'enable' ? 'enable_2fa' : 'disable_2fa';
    
    try {
        const response = await fetch('/.netlify/functions/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email, type })
        });
        
        if (response.ok) {
            show2FASuccess('New verification code sent');
        } else {
            show2FAError('Failed to resend code');
        }
    } catch (error) {
        show2FAError('Failed to resend code');
    }
}

function show2FAError(message) {
    const el = document.getElementById('twofaError');
    el.textContent = message;
    el.classList.add('show');
    document.getElementById('twofaSuccess').classList.remove('show');
}

function show2FASuccess(message) {
    const el = document.getElementById('twofaSuccess');
    el.textContent = message;
    el.classList.add('show');
    document.getElementById('twofaError').classList.remove('show');
}

function hide2FAMessages() {
    document.getElementById('twofaError').classList.remove('show');
    document.getElementById('twofaSuccess').classList.remove('show');
}

// Handle logout (redirect to home after)
async function handleLogout() {
    await Auth.logout();
    window.location.href = 'index.html';
}

// User dropdown toggle
function openUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userMenu = document.getElementById('userMenu');
    if (dropdown && userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});
