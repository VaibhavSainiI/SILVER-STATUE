// Catalog Page JavaScript

// Extended products array with more items
let allProducts = [];

// Catalog state
let currentPage = 1;
let itemsPerPage = 12;
let filteredProducts = [];
let currentFilters = {
    category: 'all',
    priceRange: 'all',
    search: '',
    sort: 'name'
};
let currentView = 'grid';
let compareItems = [];

// Initialize catalog
document.addEventListener('DOMContentLoaded', function() {
    // Load products from PDF data if available
    if (window.pdfProducts && window.pdfProducts.length > 0) {
        allProducts = window.pdfProducts;
        console.log(`Loaded ${allProducts.length} products from PDF for catalog`);
    } else {
        // Fallback to demo products if PDF data not available
        allProducts = [
            {
                id: 1,
                name: "Lord Ganesha Statue",
                price: 15999,
                description: "Exquisite silver statue of Lord Ganesha, handcrafted with intricate details.",
                category: "religious",
                rating: 5,
                reviews: 128,
                images: ["ganesha-1.jpg"],
                inStock: true,
                weight: "2.5 kg",
                dimensions: "15cm x 12cm x 20cm",
                material: "Pure Silver 99.9%",
                badge: "bestseller",
                dateAdded: "2024-01-15"
            }
        ];
    }
    
    // Initialize filtered products
    filteredProducts = [...allProducts];
    
    initializeCatalog();
    setupEventListeners();
    loadInitialData();
});

function initializeCatalog() {
    // Initialize custom cursor (inherited from main.js)
    if (window.initializeCustomCursor) {
        initializeCustomCursor();
    }
    
    // Initialize navigation
    initializeCatalogNavigation();
    
    // Load cart from storage
    if (window.loadCartFromStorage) {
        loadCartFromStorage();
        updateCartCount();
    }
    
    // Initialize cart modal
    if (window.initializeCart) {
        initializeCart();
    }
}

function initializeCatalogNavigation() {
    const navbar = document.querySelector('.navbar');
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', debounce(handleSearch, 300));
    
    // Filter listeners
    document.getElementById('category-filter').addEventListener('change', handleCategoryFilter);
    document.getElementById('price-filter').addEventListener('change', handlePriceFilter);
    document.getElementById('sort-filter').addEventListener('change', handleSort);
    document.getElementById('per-page').addEventListener('change', handlePerPageChange);
    
    // View toggle
    document.getElementById('grid-view').addEventListener('click', () => setView('grid'));
    document.getElementById('list-view').addEventListener('click', () => setView('list'));
    
    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('next-page').addEventListener('click', () => changePage(currentPage + 1));
}

function loadInitialData() {
    filteredProducts = [...allProducts];
    applyFilters();
    renderProducts();
    updateResultsCount();
    renderPagination();
}

function handleSearch(e) {
    currentFilters.search = e.target.value.toLowerCase();
    currentPage = 1;
    applyFilters();
    renderProducts();
    updateResultsCount();
    renderPagination();
}

function handleCategoryFilter(e) {
    currentFilters.category = e.target.value;
    currentPage = 1;
    applyFilters();
    renderProducts();
    updateResultsCount();
    renderPagination();
}

function handlePriceFilter(e) {
    currentFilters.priceRange = e.target.value;
    currentPage = 1;
    applyFilters();
    renderProducts();
    updateResultsCount();
    renderPagination();
}

function handleSort(e) {
    currentFilters.sort = e.target.value;
    applyFilters();
    renderProducts();
}

function handlePerPageChange(e) {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderProducts();
    renderPagination();
}

function setView(view) {
    currentView = view;
    const gridBtn = document.getElementById('grid-view');
    const listBtn = document.getElementById('list-view');
    const productsGrid = document.getElementById('products-grid');
    
    if (view === 'grid') {
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        productsGrid.className = 'products-grid grid-view';
    } else {
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        productsGrid.className = 'products-grid list-view';
    }
    
    renderProducts();
}

function applyFilters() {
    filteredProducts = allProducts.filter(product => {
        // Category filter
        if (currentFilters.category !== 'all' && product.category !== currentFilters.category) {
            return false;
        }
        
        // Price range filter
        if (currentFilters.priceRange !== 'all') {
            const price = product.price;
            switch (currentFilters.priceRange) {
                case '0-10000':
                    if (price > 10000) return false;
                    break;
                case '10000-20000':
                    if (price < 10000 || price > 20000) return false;
                    break;
                case '20000-50000':
                    if (price < 20000 || price > 50000) return false;
                    break;
                case '50000+':
                    if (price < 50000) return false;
                    break;
            }
        }
        
        // Search filter
        if (currentFilters.search) {
            const searchTerm = currentFilters.search;
            return product.name.toLowerCase().includes(searchTerm) ||
                   product.description.toLowerCase().includes(searchTerm) ||
                   product.category.toLowerCase().includes(searchTerm);
        }
        
        return true;
    });
    
    // Apply sorting
    filteredProducts.sort((a, b) => {
        switch (currentFilters.sort) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'rating':
                return b.rating - a.rating;
            case 'newest':
                return new Date(b.dateAdded) - new Date(a.dateAdded);
            default:
                return 0;
        }
    });
}

function renderProducts() {
    const productsGrid = document.getElementById('products-grid');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    if (productsToShow.length === 0) {
        productsGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms</p>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = productsToShow.map(product => createProductCard(product)).join('');
    
    // Add event listeners to new product cards
    addProductEventListeners();
    
    // Animate product cards
    animateProductCards();
}

function createProductCard(product) {
    const isListView = currentView === 'list';
    const stockClass = product.inStock ? '' : 'out-of-stock';
    const badge = product.badge ? `<div class="product-badge ${product.badge}">${product.badge}</div>` : '';
    
    // Use actual image if available, fallback to placeholder
    const imagePath = product.images && product.images[0] ? 
        `../images/${product.images[0]}` : 
        `../images/product_${product.id}_1.png`;
    
    if (isListView) {
        return `
            <div class="product-card ${stockClass}" data-product-id="${product.id}">
                ${badge}
                <div class="quick-actions">
                    <div class="quick-action" title="Quick View" onclick="showQuickView(${product.id})">
                        <i class="fas fa-eye"></i>
                    </div>
                    <div class="quick-action" title="Add to Wishlist">
                        <i class="fas fa-heart"></i>
                    </div>
                </div>
                <div class="product-image">
                    <img src="${imagePath}" alt="${product.name}" class="actual-product-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="image-placeholder" style="display: none;">
                        <i class="fas fa-${getProductIcon(product.category)}"></i>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-details">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description}</p>
                        <div class="product-rating">
                            <span class="stars">${'★'.repeat(product.rating)}${'☆'.repeat(5-product.rating)}</span>
                            <span class="rating-count">(${product.reviews})</span>
                        </div>
                        <div class="product-specs">
                            <small>Weight: ${product.weight} | Dimensions: ${product.dimensions}</small>
                        </div>
                    </div>
                    <div class="product-actions">
                        <div class="product-price">₹${product.price.toLocaleString()}</div>
                        <button class="btn btn-primary add-to-cart-btn" 
                                data-product-id="${product.id}" 
                                ${!product.inStock ? 'disabled' : ''}>
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                        <button class="btn btn-secondary quick-view-btn" data-product-id="${product.id}">
                            Quick View
                        </button>
                    </div>
                </div>
                <div class="compare-checkbox">
                    <input type="checkbox" id="compare-${product.id}" onchange="toggleCompare(${product.id})">
                    <label for="compare-${product.id}">Compare</label>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="product-card ${stockClass}" data-product-id="${product.id}">
                ${badge}
                <div class="quick-actions">
                    <div class="quick-action" title="Quick View" onclick="showQuickView(${product.id})">
                        <i class="fas fa-eye"></i>
                    </div>
                    <div class="quick-action" title="Add to Wishlist">
                        <i class="fas fa-heart"></i>
                    </div>
                </div>
                <div class="product-image">
                    <img src="${imagePath}" alt="${product.name}" class="actual-product-image" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="image-placeholder" style="display: none;">
                        <i class="fas fa-${getProductIcon(product.category)}"></i>
                    </div>
                    <div class="product-overlay">
                        <button class="quick-view-btn" data-product-id="${product.id}">Quick View</button>
                        <button class="add-to-cart-btn" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                        <button class="quick-buy-btn" data-product-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
                            ${product.inStock ? '⚡ Quick Buy' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description.substring(0, 100)}...</p>
                    <div class="product-price">₹${product.price.toLocaleString()}</div>
                    <div class="product-rating">
                        <span class="stars">${'★'.repeat(product.rating)}${'☆'.repeat(5-product.rating)}</span>
                        <span class="rating-count">(${product.reviews})</span>
                    </div>
                </div>
                <div class="compare-checkbox">
                    <input type="checkbox" id="compare-${product.id}" onchange="toggleCompare(${product.id})">
                    <label for="compare-${product.id}">Compare</label>
                </div>
            </div>
        `;
    }
}

function addProductEventListeners() {
    // Quick view buttons
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(btn.dataset.productId);
            if (window.showQuickView) {
                showQuickView(productId);
            }
        });
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const productId = parseInt(btn.dataset.productId);
            if (window.addToCart) {
                addToCart(productId);
            }
            
            // Animation feedback
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    // Product card clicks
    document.querySelectorAll('.product-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-actions') && 
                !e.target.closest('.product-overlay') && 
                !e.target.closest('.compare-checkbox')) {
                const productId = parseInt(card.dataset.productId);
                // Could navigate to product detail page
                console.log('Navigate to product detail:', productId);
            }
        });
    });
}

function animateProductCards() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.animationDelay = `${index * 0.1}s`;
        
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            card.style.transition = 'all 0.6s ease-out';
        }, index * 100);
    });
}

function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    const total = filteredProducts.length;
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, total);
    
    if (total === 0) {
        resultsCount.textContent = 'No products found';
    } else {
        resultsCount.textContent = `Showing ${startIndex}-${endIndex} of ${total} products`;
    }
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const pageNumbers = document.getElementById('page-numbers');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    // Update button states
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // Generate page numbers
    let pageHTML = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        pageHTML += `
            <div class="page-number ${i === currentPage ? 'active' : ''}" 
                 onclick="changePage(${i})">${i}</div>
        `;
    }
    
    pageNumbers.innerHTML = pageHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderProducts();
    renderPagination();
    
    // Scroll to top of products
    document.querySelector('.catalog-products').scrollIntoView({
        behavior: 'smooth'
    });
}

function toggleCompare(productId) {
    const index = compareItems.indexOf(productId);
    if (index > -1) {
        compareItems.splice(index, 1);
    } else {
        if (compareItems.length < 3) {
            compareItems.push(productId);
        } else {
            alert('You can compare up to 3 products at a time');
            document.getElementById(`compare-${productId}`).checked = false;
            return;
        }
    }
    
    updateCompareBar();
}

function updateCompareBar() {
    let compareBar = document.querySelector('.compare-bar');
    
    if (!compareBar) {
        compareBar = document.createElement('div');
        compareBar.className = 'compare-bar';
        compareBar.innerHTML = `
            <div class="compare-items"></div>
            <div class="compare-actions">
                <button class="btn btn-primary" onclick="compareProducts()">Compare</button>
                <button class="btn btn-secondary" onclick="clearCompare()">Clear All</button>
            </div>
        `;
        document.body.appendChild(compareBar);
    }
    
    const compareItemsContainer = compareBar.querySelector('.compare-items');
    
    if (compareItems.length === 0) {
        compareBar.classList.remove('active');
        return;
    }
    
    compareBar.classList.add('active');
    
    const itemsHTML = compareItems.map(id => {
        const product = allProducts.find(p => p.id === id);
        return `
            <div class="compare-item">
                <span>${product.name}</span>
                <span class="remove" onclick="removeFromCompare(${id})">&times;</span>
            </div>
        `;
    }).join('');
    
    compareItemsContainer.innerHTML = itemsHTML;
}

function removeFromCompare(productId) {
    const index = compareItems.indexOf(productId);
    if (index > -1) {
        compareItems.splice(index, 1);
        document.getElementById(`compare-${productId}`).checked = false;
        updateCompareBar();
    }
}

function clearCompare() {
    compareItems.forEach(id => {
        document.getElementById(`compare-${id}`).checked = false;
    });
    compareItems = [];
    updateCompareBar();
}

function compareProducts() {
    if (compareItems.length < 2) {
        alert('Please select at least 2 products to compare');
        return;
    }
    
    // This would open a comparison modal or navigate to comparison page
    alert(`Comparing ${compareItems.length} products: ${compareItems.join(', ')}`);
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

// Update global products array for main.js compatibility
if (window.products) {
    window.products = allProducts;
}

// Make functions globally available
window.showQuickView = window.showQuickView || function(productId) {
    console.log('Quick view for product:', productId);
};

window.addToCart = window.addToCart || function(productId) {
    console.log('Add to cart:', productId);
};

window.toggleCompare = toggleCompare;
window.removeFromCompare = removeFromCompare;
window.clearCompare = clearCompare;
window.compareProducts = compareProducts;
window.changePage = changePage;