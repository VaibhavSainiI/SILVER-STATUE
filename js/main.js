// Main JavaScript for Silver Statue E-commerce Store

// Global Variables
let cart = [];
let products = [];
let currentUser = null;
let isBackendConnected = false;

// Check if backend is available
async function checkBackendConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/health');
        if (response.ok) {
            isBackendConnected = true;
            console.log('✅ Backend connected successfully');
            
            // Check if user is logged in
            const token = localStorage.getItem('authToken');
            if (token) {
                api.setToken(token);
                try {
                    const userResponse = await api.getCurrentUser();
                    if (userResponse.success) {
                        currentUser = userResponse.data.user;
                        updateUIForAuthenticatedUser();
                    }
                } catch (error) {
                    console.log('Token expired or invalid, removing...');
                    localStorage.removeItem('authToken');
                }
            }
        }
    } catch (error) {
        console.log('⚠️ Backend not available, using local data');
        isBackendConnected = false;
    }
}

// Load products from backend or fallback to PDF/demo data
async function loadProducts() {
    if (isBackendConnected) {
        try {
            const response = await api.getFeaturedProducts();
            if (response.success && response.data.products.length > 0) {
                products = response.data.products;
                console.log(`✅ Loaded ${products.length} products from backend`);
                return;
            }
        } catch (error) {
            console.error('Error loading products from backend:', error);
        }
    }
    
    // Fallback to PDF products or demo products
    if (window.pdfProducts && window.pdfProducts.length > 0) {
        products = window.pdfProducts;
        console.log(`📄 Loaded ${products.length} products from PDF`);
    } else {
        // Demo products as last resort
        products = [
            {
                id: 1,
                name: "Lord Ganesha Statue",
                price: 15999,
                description: "Exquisite silver statue of Lord Ganesha, handcrafted with intricate details.",
                category: "religious",
                rating: { average: 5, count: 128 },
                images: [{ url: "ganesha-1.jpg", isPrimary: true }],
                stock: { isInStock: true },
                specifications: {
                    weight: { value: 2.5, unit: "kg" },
                    dimensions: { length: 15, width: 12, height: 20, unit: "cm" },
                    material: "Pure Silver 99.9%"
                }
            }
        ];
        console.log(`🔄 Using demo products`);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    await checkBackendConnection();
    await loadProducts();
    initializeApp();
});

function initializeApp() {
    // Initialize custom cursor with error handling
    try {
        initializeCustomCursor();
    } catch (error) {
        console.error('Custom cursor initialization failed:', error);
        document.body.classList.add('cursor-fallback');
    }
    initializeNavigation();
    initializeHeroAnimation();
    initializeScrollAnimations();
    initializeProductInteractions();
    initializeCart();
    initializeContactForm();
    initializeAuth();
    
    // Load cart from backend or localStorage
    loadCart();
    
    // Update featured products section with actual data
    updateFeaturedProducts();
}

// Update featured products with actual data
function updateFeaturedProducts() {
    if (!products || products.length === 0) return;
    
    const featuredGrid = document.querySelector('.featured-grid');
    if (!featuredGrid) return;
    
    // Take first 4 products for featured section
    const featuredProducts = products.slice(0, 4);
    
    featuredGrid.innerHTML = featuredProducts.map(product => {
        // Handle different data structures (backend vs PDF)
        const productId = product._id || product.id;
        const rating = product.rating?.average || product.rating || 4;
        const reviewCount = product.rating?.count || product.reviews || 0;
        const price = product.discountedPrice || product.price;
        const isInStock = product.stock?.isInStock !== false;
        
        let imagePath;
        if (product.images && product.images.length > 0) {
            // Backend format with image objects
            if (product.images[0].url) {
                imagePath = product.images[0].url.startsWith('/') ? 
                    product.images[0].url.substring(1) : product.images[0].url;
            } else {
                // PDF format with image strings
                imagePath = `images/${product.images[0]}`;
            }
        } else {
            imagePath = `images/product_${productId}_1.png`;
        }
        
        return `
            <div class="product-card" data-product-id="${productId}">
                <div class="product-image">
                    <img src="${imagePath}" alt="${product.name}" class="actual-product-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="image-placeholder" style="display: none;">
                        <i class="fas fa-${getProductIcon(product.category)}"></i>
                    </div>
                    <div class="product-overlay">
                        <button class="quick-view-btn" data-product-id="${productId}">Quick View</button>
                        <button class="add-to-cart-btn" data-product-id="${productId}" ${!isInStock ? 'disabled' : ''}>
                            ${isInStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                        <button class="quick-buy-btn" data-product-id="${productId}" ${!isInStock ? 'disabled' : ''}>
                            ${isInStock ? '⚡ Quick Buy' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.shortDescription || product.description.substring(0, 100)}...</p>
                    <div class="product-price">₹${price.toLocaleString()}</div>
                    <div class="product-rating">
                        <span class="stars">${'★'.repeat(Math.floor(rating))}${'☆'.repeat(5-Math.floor(rating))}</span>
                        <span class="rating-count">(${reviewCount})</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Re-initialize product interactions for new elements
    initializeProductInteractions();
}

// Authentication Functions
function initializeAuth() {
    const loginBtn = document.querySelector('.login-btn');
    const registerBtn = document.querySelector('.register-btn');
    const logoutBtn = document.querySelector('.logout-btn');
    const userProfile = document.querySelector('.user-profile');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', showLoginModal);
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', showRegisterModal);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    updateAuthUI();
}

function updateUIForAuthenticatedUser() {
    updateAuthUI();
    // Reload cart from backend
    if (isBackendConnected) {
        loadCart();
    }
}

function updateAuthUI() {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (currentUser) {
        // User is logged in
        if (authButtons) {
            authButtons.innerHTML = `
                <div class="user-menu">
                    <span class="user-name">Hi, ${currentUser.firstName}</span>
                    <div class="dropdown">
                        <button class="dropdown-btn">Account ▼</button>
                        <div class="dropdown-content">
                            <a href="#" onclick="showProfile()">Profile</a>
                            <a href="#" onclick="showOrders()">Orders</a>
                            <a href="#" onclick="showWishlist()">Wishlist</a>
                            <a href="#" onclick="handleLogout()">Logout</a>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        // User is not logged in
        if (authButtons) {
            authButtons.innerHTML = `
                <button class="auth-btn login-btn" onclick="showLoginModal()">Login</button>
                <button class="auth-btn register-btn" onclick="showRegisterModal()">Register</button>
            `;
        }
    }
}

async function handleLogout() {
    try {
        if (isBackendConnected) {
            await api.logout();
        }
        currentUser = null;
        cart = [];
        updateAuthUI();
        updateCartCount();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Cart Management Functions
async function loadCart() {
    if (isBackendConnected && currentUser) {
        try {
            const response = await api.getCart();
            if (response.success) {
                cart = response.data.cart.items || [];
                updateCartCount();
                return;
            }
        } catch (error) {
            console.error('Error loading cart from backend:', error);
        }
    }
    
    // Fallback to localStorage
    loadCartFromStorage();
}

async function addToCart(productId, quantity = 1) {
    if (isBackendConnected && currentUser) {
        try {
            const response = await api.addToCart(productId, quantity);
            if (response.success) {
                cart = response.data.cart.items || [];
                updateCartCount();
                showNotification('Item added to cart', 'success');
                return;
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showNotification(error.message || 'Error adding to cart', 'error');
            return;
        }
    } else if (!currentUser) {
        showNotification('Please login to add items to cart', 'warning');
        showLoginModal();
        return;
    }
    
    // Fallback to localStorage cart
    addToCartLocal(productId, quantity);
}

function addToCartLocal(productId, quantity = 1) {
    const product = products.find(p => (p._id || p.id) === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            productId: productId,
            quantity: quantity,
            product: product
        });
    }
    
    saveCartToStorage();
    updateCartCount();
    showNotification('Item added to cart', 'success');
}

// Custom Cursor Implementation
function initializeCustomCursor() {
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');
    
    // Check if cursor elements exist
    if (!cursor || !cursorFollower) {
        console.warn('Custom cursor elements not found, falling back to default cursor');
        document.body.classList.add('cursor-fallback');
        return;
    }
    
    let mouseX = 0;
    let mouseY = 0;
    let followerX = 0;
    let followerY = 0;
    let isVisible = true;
    
    // Mouse move event
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        if (!isVisible) {
            cursor.style.opacity = '1';
            cursorFollower.style.opacity = '0.7';
            isVisible = true;
        }
        
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
    });
    
    // Hide cursor when mouse leaves window
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
        cursorFollower.style.opacity = '0';
        isVisible = false;
    });
    
    // Show cursor when mouse enters window
    document.addEventListener('mouseenter', () => {
        cursor.style.opacity = '1';
        cursorFollower.style.opacity = '0.7';
        isVisible = true;
    });
    
    // Smooth follower animation
    function animateFollower() {
        const speed = 0.1;
        
        followerX += (mouseX - followerX) * speed;
        followerY += (mouseY - followerY) * speed;
        
        cursorFollower.style.left = followerX + 'px';
        cursorFollower.style.top = followerY + 'px';
        
        requestAnimationFrame(animateFollower);
    }
    animateFollower();
    
    // Hover effects for interactive elements
    const updateHoverElements = () => {
        const hoverElements = document.querySelectorAll('a, button, .product-card, .category-card, input, textarea, .close, .quick-buy-btn, .cart-btn, .nav-link');
        
        hoverElements.forEach(element => {
            // Remove existing listeners to prevent duplicates
            element.removeEventListener('mouseenter', addHoverEffect);
            element.removeEventListener('mouseleave', removeHoverEffect);
            
            // Add new listeners
            element.addEventListener('mouseenter', addHoverEffect);
            element.addEventListener('mouseleave', removeHoverEffect);
        });
    };
    
    const addHoverEffect = () => {
        cursor.classList.add('hover');
        cursorFollower.classList.add('hover');
    };
    
    const removeHoverEffect = () => {
        cursor.classList.remove('hover');
        cursorFollower.classList.remove('hover');
    };
    
    // Initial setup
    updateHoverElements();
    
    // Update hover elements when DOM changes (for dynamically added content)
    const observer = new MutationObserver(updateHoverElements);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Ensure cursor is visible over modals
    document.addEventListener('DOMNodeInserted', (e) => {
        if (e.target.classList && (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay'))) {
            setTimeout(updateHoverElements, 100);
        }
    });
}

// Navigation Implementation
function initializeNavigation() {
    const navbar = document.querySelector('.navbar');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Close mobile menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Hero Animation Implementation
function initializeHeroAnimation() {
    const statueItems = document.querySelectorAll('.statue-item');
    let currentIndex = 0;
    
    // Auto-rotate hero statues
    function rotateStatues() {
        statueItems.forEach(item => item.classList.remove('active'));
        statueItems[currentIndex].classList.add('active');
        currentIndex = (currentIndex + 1) % statueItems.length;
    }
    
    // Start rotation
    setInterval(rotateStatues, 4000);
    
    // Hero buttons interaction
    const heroButtons = document.querySelectorAll('.hero-buttons .btn');
    heroButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (button.textContent.includes('Explore')) {
                e.preventDefault();
                document.querySelector('#featured').scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Floating particles animation
    createFloatingParticles();
}

// Create floating particles
function createFloatingParticles() {
    const particlesContainer = document.querySelector('.floating-particles');
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            background: linear-gradient(45deg, #d4af37, #f4d03f);
            border-radius: 50%;
            opacity: ${Math.random() * 0.5 + 0.3};
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: floatParticle ${Math.random() * 10 + 5}s ease-in-out infinite;
            animation-delay: ${Math.random() * 5}s;
        `;
        
        particlesContainer.appendChild(particle);
    }
    
    // Add particle animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes floatParticle {
            0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
            25% { transform: translateY(-20px) translateX(10px) rotate(90deg); }
            50% { transform: translateY(-10px) translateX(-15px) rotate(180deg); }
            75% { transform: translateY(-30px) translateX(5px) rotate(270deg); }
        }
    `;
    document.head.appendChild(style);
}

// Scroll Animations
function initializeScrollAnimations() {
    const animatedElements = document.querySelectorAll('.product-card, .category-card, .about-text, .contact-item');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.style.transition = 'all 0.6s ease-out';
            }
        });
    }, observerOptions);
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        observer.observe(element);
    });
    
    // Stagger animation for product grid
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Product Interactions
function initializeProductInteractions() {
    const productCards = document.querySelectorAll('.product-card');
    const quickViewBtns = document.querySelectorAll('.quick-view-btn');
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    const quickBuyBtns = document.querySelectorAll('.quick-buy-btn');
    
    // Product card hover effects
    productCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Quick view functionality
    quickViewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productCard = btn.closest('.product-card');
            const productId = parseInt(productCard.dataset.productId);
            showQuickView(productId);
        });
    });
    
    // Add to cart functionality
    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productCard = btn.closest('.product-card');
            const productId = parseInt(productCard.dataset.productId);
            addToCart(productId);
            
            // Animation feedback
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    // Quick buy functionality
    quickBuyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productCard = btn.closest('.product-card');
            const productId = parseInt(productCard.dataset.productId);
            
            // Check if showQuickBuyModal function exists (from quick-buy.js)
            if (typeof showQuickBuyModal === 'function') {
                showQuickBuyModal(productId);
            } else {
                console.error('Quick Buy functionality not loaded. Please ensure quick-buy.js is included.');
                alert('Quick Buy feature is loading. Please try again in a moment.');
            }
        });
    });
    
    // Category card interactions
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const categoryName = card.querySelector('h3').textContent;
            filterProductsByCategory(categoryName.toLowerCase());
        });
    });
}

// Quick View Modal
function showQuickView(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const modal = createQuickViewModal(product);
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
    }, 10);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Close button clicked'); // Debug log
        closeQuickViewModal(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('Modal background clicked'); // Debug log
            closeQuickViewModal(modal);
        }
    });
    
    // Prevent modal content clicks from closing modal
    modal.querySelector('.modal-content').addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // Add keyboard support (ESC to close)
    const handleKeydown = (e) => {
        if (e.key === 'Escape') {
            console.log('ESC key pressed'); // Debug log
            closeQuickViewModal(modal);
            document.removeEventListener('keydown', handleKeydown);
        }
    };
    document.addEventListener('keydown', handleKeydown);
}

function createQuickViewModal(product) {
    const modal = document.createElement('div');
    modal.className = 'modal quick-view-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: flex; justify-content: center; align-items: center; z-index: 10000; opacity: 0; transition: opacity 0.3s ease;';
    
    // Use actual image if available, fallback to placeholder
    const imagePath = product.images && product.images[0] ? 
        `images/${product.images[0]}` : 
        `images/product_${product.id}_1.png`;
    
    modal.innerHTML = `
        <div class="modal-content" style="transform: scale(0.9); transition: transform 0.3s ease; max-width: 800px; background: var(--secondary-black); border-radius: 20px; border: 2px solid var(--primary-gold); box-shadow: var(--shadow-heavy);">
            <div class="modal-header" style="padding: 1.5rem 2rem; border-bottom: 1px solid var(--accent-black); display: flex; justify-content: space-between; align-items: center;">
                <h2 style="color: var(--primary-gold); font-family: var(--font-primary); margin: 0;">${product.name}</h2>
                <span class="close" style="color: var(--medium-gray); font-size: 2rem; font-weight: bold; cursor: pointer; transition: color var(--transition-fast); line-height: 1; user-select: none; z-index: 10001;">&times;</span>
            </div>
            <div class="modal-body">
                <div class="quick-view-content" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div class="product-image-large">
                        <img src="${imagePath}" alt="${product.name}" class="actual-product-image" 
                             style="width: 100%; height: 300px; object-fit: cover; border-radius: 15px;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="image-placeholder" style="height: 300px; background: linear-gradient(135deg, var(--accent-black), var(--secondary-black)); border-radius: 15px; display: none; align-items: center; justify-content: center; font-size: 4rem; color: var(--primary-gold);">
                            <i class="fas fa-${getProductIcon(product.category)}"></i>
                        </div>
                    </div>
                    <div class="product-details">
                        <div class="product-price" style="font-size: 2rem; color: var(--primary-gold); margin-bottom: 1rem;">₹${product.price.toLocaleString()}</div>
                        <div class="product-rating" style="margin-bottom: 1rem;">
                            <span class="stars">${'★'.repeat(product.rating)}${'☆'.repeat(5-product.rating)}</span>
                            <span class="rating-count">(${product.reviews})</span>
                        </div>
                        <p style="color: var(--light-gray); line-height: 1.6; margin-bottom: 1.5rem;">${product.description}</p>
                        <div class="product-specs" style="margin-bottom: 1.5rem;">
                            <h4 style="color: var(--primary-gold); margin-bottom: 0.5rem;">Specifications:</h4>
                            <ul style="color: var(--medium-gray); list-style: none;">
                                <li>Weight: ${product.weight}</li>
                                <li>Dimensions: ${product.dimensions}</li>
                                <li>Material: ${product.material}</li>
                            </ul>
                        </div>
                        <div class="modal-action-buttons" style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                            <button class="btn btn-secondary add-to-cart-modal" data-product-id="${product.id}" style="flex: 1;">Add to Cart</button>
                            <button class="btn btn-primary quick-buy-modal" data-product-id="${product.id}" style="flex: 1;">⚡ Quick Buy</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add to cart functionality in modal
    const addToCartBtn = modal.querySelector('.add-to-cart-modal');
    addToCartBtn.addEventListener('click', () => {
        addToCart(product.id);
        closeQuickViewModal(modal);
    });
    
    // Quick buy functionality in modal
    const quickBuyBtn = modal.querySelector('.quick-buy-modal');
    if (quickBuyBtn) {
        quickBuyBtn.addEventListener('click', () => {
            closeQuickViewModal(modal);
            // Quick buy function will be handled by quick-buy.js
            if (typeof showQuickBuyModal === 'function') {
                showQuickBuyModal(product.id);
            }
        });
    }
    
    return modal;
}

function getProductIcon(category) {
    const icons = {
        'religious': 'praying-hands',
        'royal': 'crown',
        'animals': 'horse',
        'nature': 'leaf'
    };
    return icons[category] || 'chess-king';
}

function closeQuickViewModal(modal) {
    console.log('Closing quick view modal'); // Debug log
    modal.style.opacity = '0';
    modal.querySelector('.modal-content').style.transform = 'scale(0.9)';
    setTimeout(() => {
        if (modal && modal.parentNode) {
            document.body.removeChild(modal);
            console.log('Modal removed from DOM'); // Debug log
        }
    }, 300);
}

// Cart Functionality
function initializeCart() {
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeBtn = cartModal.querySelector('.close');
    const continueShoppingBtn = document.getElementById('continue-shopping');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    // Show cart modal
    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        showCartModal();
    });
    
    // Close cart modal
    closeBtn.addEventListener('click', hideCartModal);
    continueShoppingBtn.addEventListener('click', hideCartModal);
    
    // Close modal when clicking outside
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            hideCartModal();
        }
    });
    
    // Checkout functionality
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        
        alert('Thank you for your purchase! This is a demo checkout.');
        cart = [];
        saveCartToStorage();
        updateCartDisplay();
        updateCartCount();
        hideCartModal();
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    saveCartToStorage();
    updateCartCount();
    updateCartDisplay();
    
    // Show success animation
    showCartNotification(product.name);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCartToStorage();
    updateCartCount();
    updateCartDisplay();
}

function updateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        saveCartToStorage();
        updateCartCount();
        updateCartDisplay();
    }
}

function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Animate cart count
    if (totalItems > 0) {
        cartCount.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cartCount.style.transform = 'scale(1)';
        }, 200);
    }
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total-amount');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        cartTotal.textContent = '0';
        return;
    }
    
    let cartHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        total += item.price * item.quantity;
        cartHTML += `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="fas fa-${getProductIcon(item.category)}"></i>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price.toLocaleString()}</div>
                    <div class="cart-item-quantity">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                        <span style="margin: 0 0.5rem; min-width: 20px; text-align: center;">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        <button class="quantity-btn" onclick="removeFromCart(${item.id})" style="margin-left: 1rem; background: #dc3545; border-color: #dc3545;">×</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    cartItems.innerHTML = cartHTML;
    cartTotal.textContent = total.toLocaleString();
}

function showCartModal() {
    const cartModal = document.getElementById('cart-modal');
    cartModal.style.display = 'block';
    updateCartDisplay();
}

function hideCartModal() {
    const cartModal = document.getElementById('cart-modal');
    cartModal.style.display = 'none';
}

function showCartNotification(productName) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(45deg, var(--primary-gold), var(--secondary-gold));
        color: var(--primary-black);
        padding: 1rem 1.5rem;
        border-radius: 10px;
        z-index: 10001;
        font-weight: 600;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: var(--shadow-heavy);
    `;
    notification.textContent = `${productName} added to cart!`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Local Storage Functions
function saveCartToStorage() {
    localStorage.setItem('silverStatueCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('silverStatueCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

// Product Filtering
function filterProductsByCategory(category) {
    console.log(`Filtering by category: ${category}`);
    // This would be implemented with a dedicated catalog page
    // For now, scroll to featured section
    document.querySelector('#featured').scrollIntoView({
        behavior: 'smooth'
    });
}

// Contact Form
function initializeContactForm() {
    const contactForm = document.querySelector('.contact-form form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const name = contactForm.querySelector('input[type="text"]').value;
            const email = contactForm.querySelector('input[type="email"]').value;
            const message = contactForm.querySelector('textarea').value;
            
            if (name && email && message) {
                // Simulate form submission
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                
                submitBtn.innerHTML = '<div class="loading"></div> Sending...';
                submitBtn.disabled = true;
                
                setTimeout(() => {
                    submitBtn.textContent = 'Message Sent!';
                    submitBtn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                    
                    contactForm.reset();
                    
                    setTimeout(() => {
                        submitBtn.textContent = originalText;
                        submitBtn.style.background = '';
                        submitBtn.disabled = false;
                    }, 3000);
                }, 2000);
            }
        });
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize parallax effect for hero section
function initializeParallax() {
    window.addEventListener('scroll', debounce(() => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero');
        const heroBackground = document.querySelector('.hero-background');
        
        if (heroBackground) {
            heroBackground.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    }, 10));
}

// Performance optimization - lazy load images when implemented
function initializeLazyLoading() {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));
}

// Initialize all advanced features
document.addEventListener('DOMContentLoaded', function() {
    initializeParallax();
    initializeLazyLoading();
    
    // Add smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Global functions for cart operations (needed for onclick handlers)
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addToCart,
        removeFromCart,
        updateCartQuantity,
        cart,
        products
    };
}