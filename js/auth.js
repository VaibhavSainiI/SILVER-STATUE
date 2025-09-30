// Authentication JavaScript

// Show/Hide Modals
function showLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
    document.getElementById('register-modal').style.display = 'none';
}

function showRegisterModal() {
    document.getElementById('register-modal').style.display = 'flex';
    document.getElementById('login-modal').style.display = 'none';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchToRegister() {
    closeModal('login-modal');
    showRegisterModal();
}

function switchToLogin() {
    closeModal('register-modal');
    showLoginModal();
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    
    if (e.target === loginModal) {
        closeModal('login-modal');
    }
    if (e.target === registerModal) {
        closeModal('register-modal');
    }
});

// Login Form Handler
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    showLoading();
    
    try {
        if (isBackendConnected) {
            const response = await api.login(loginData.email, loginData.password);
            
            if (response.success) {
                currentUser = response.user;
                updateUIForAuthenticatedUser();
                closeModal('login-modal');
                showNotification('Login successful!', 'success');
                this.reset();
            } else {
                showNotification(response.message || 'Login failed', 'error');
            }
        } else {
            // Demo mode - accept any credentials
            currentUser = {
                id: 'demo-user',
                firstName: 'Demo',
                lastName: 'User',
                email: loginData.email
            };
            updateUIForAuthenticatedUser();
            closeModal('login-modal');
            showNotification('Login successful! (Demo Mode)', 'success');
            this.reset();
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed', 'error');
    } finally {
        hideLoading();
    }
});

// Register Form Handler
document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    // Validate password strength
    if (!validatePassword(password)) {
        showNotification('Password must be at least 6 characters with 1 uppercase, 1 lowercase, and 1 number', 'error');
        return;
    }
    
    const registerData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: password,
        phone: formData.get('phone')
    };
    
    showLoading();
    
    try {
        if (isBackendConnected) {
            const response = await api.register(registerData);
            
            if (response.success) {
                currentUser = response.user;
                updateUIForAuthenticatedUser();
                closeModal('register-modal');
                showNotification('Registration successful!', 'success');
                this.reset();
            } else {
                showNotification(response.message || 'Registration failed', 'error');
            }
        } else {
            // Demo mode
            currentUser = {
                id: 'demo-user-' + Date.now(),
                firstName: registerData.firstName,
                lastName: registerData.lastName,
                email: registerData.email
            };
            updateUIForAuthenticatedUser();
            closeModal('register-modal');
            showNotification('Registration successful! (Demo Mode)', 'success');
            this.reset();
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed', 'error');
    } finally {
        hideLoading();
    }
});

// Password validation function
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
    return passwordRegex.test(password);
}

// Notification System
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? 'check-circle' : 
                type === 'error' ? 'exclamation-circle' : 
                type === 'warning' ? 'exclamation-triangle' : 'info-circle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
}

// Loading System
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// Profile Functions (placeholders)
function showProfile() {
    showNotification('Profile feature coming soon!', 'info');
}

function showOrders() {
    showNotification('Orders feature coming soon!', 'info');
}

function showWishlist() {
    showNotification('Wishlist feature coming soon!', 'info');
}

function showForgotPassword() {
    showNotification('Forgot password feature coming soon!', 'info');
}