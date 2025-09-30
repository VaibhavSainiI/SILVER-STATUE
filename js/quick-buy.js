// Quick Buy functionality
let currentQuickBuyProduct = null;

// Show Quick Buy Modal
function showQuickBuyModal(productId) {
    console.log('Quick Buy triggered for product:', productId);
    
    // Check if products array exists
    if (typeof products === 'undefined') {
        console.error('Products array not found. Make sure pdf_products.js is loaded first.');
        alert('Product data is still loading. Please try again in a moment.');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found for Quick Buy:', productId);
        alert('Product not found. Please refresh the page and try again.');
        return;
    }
    
    console.log('Found product for Quick Buy:', product.name);
    currentQuickBuyProduct = product;
    
    // Check if modal exists
    const modal = document.getElementById('quick-buy-modal');
    if (!modal) {
        console.error('Quick Buy modal not found in DOM');
        alert('Quick Buy feature is not properly loaded. Please refresh the page.');
        return;
    }
    
    // Update modal content
    const nameElement = document.getElementById('quick-buy-name');
    const priceElement = document.getElementById('quick-buy-price');
    const imageElement = document.getElementById('quick-buy-image');
    
    if (nameElement) nameElement.textContent = product.name;
    if (priceElement) priceElement.textContent = `₹${product.price.toLocaleString()}`;
    
    // Set product image
    if (imageElement) {
        const imagePath = product.images && product.images[0] ? 
            `images/${product.images[0]}` : 
            `images/product_${product.id}_1.png`;
        imageElement.src = imagePath;
        imageElement.alt = product.name;
    }
    
    // Reset quantity to 1
    const quantityElement = document.getElementById('quick-buy-quantity');
    if (quantityElement) quantityElement.value = 1;
    
    // Auto-fill user data if logged in
    if (typeof isLoggedIn !== 'undefined' && isLoggedIn && typeof userData !== 'undefined' && userData) {
        const nameInput = document.getElementById('quick-buy-name-input');
        const emailInput = document.getElementById('quick-buy-email');
        const phoneInput = document.getElementById('quick-buy-phone');
        const addressInput = document.getElementById('quick-buy-address');
        const cityInput = document.getElementById('quick-buy-city');
        const pincodeInput = document.getElementById('quick-buy-pincode');
        
        if (nameInput) nameInput.value = `${userData.firstName} ${userData.lastName}` || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phone || '';
        
        if (userData.address) {
            if (addressInput) addressInput.value = userData.address.street || '';
            if (cityInput) cityInput.value = userData.address.city || '';
            if (pincodeInput) pincodeInput.value = userData.address.zipCode || '';
        }
    }
    
    // Calculate initial totals
    updateQuickBuyTotals();
    
    // Show modal
    modal.style.display = 'flex';
    console.log('Quick Buy modal opened successfully');
}

// Close Quick Buy Modal
function closeQuickBuyModal() {
    console.log('Closing Quick Buy modal');
    const modal = document.getElementById('quick-buy-modal');
    if (modal) {
        modal.style.display = 'none';
        currentQuickBuyProduct = null;
        
        // Reset form
        const form = document.getElementById('quick-buy-form');
        if (form) {
            form.reset();
        }
        
        const quantityInput = document.getElementById('quick-buy-quantity');
        if (quantityInput) {
            quantityInput.value = 1;
        }
        
        console.log('Quick Buy modal closed successfully');
    } else {
        console.error('Quick Buy modal not found when trying to close');
    }
}

// Adjust quantity
function adjustQuantity(change) {
    const quantityInput = document.getElementById('quick-buy-quantity');
    const currentValue = parseInt(quantityInput.value);
    const newValue = Math.max(1, Math.min(10, currentValue + change));
    quantityInput.value = newValue;
    updateQuickBuyTotals();
}

// Update totals
function updateQuickBuyTotals() {
    if (!currentQuickBuyProduct) return;
    
    const quantity = parseInt(document.getElementById('quick-buy-quantity').value);
    const price = currentQuickBuyProduct.price;
    const subtotal = price * quantity;
    const shipping = subtotal >= 5000 ? 0 : 199; // Free shipping over ₹5000
    const total = subtotal + shipping;
    
    document.getElementById('quick-buy-subtotal').textContent = `₹${subtotal.toLocaleString()}`;
    document.getElementById('quick-buy-shipping').textContent = shipping === 0 ? 'Free' : `₹${shipping}`;
    document.getElementById('quick-buy-total').textContent = `₹${total.toLocaleString()}`;
}

// Handle Quick Buy form submission
function handleQuickBuySubmit(event) {
    event.preventDefault();
    
    if (!currentQuickBuyProduct) {
        showNotification('Error: No product selected', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const orderData = {
        product: {
            id: currentQuickBuyProduct.id,
            name: currentQuickBuyProduct.name,
            price: currentQuickBuyProduct.price,
            image: currentQuickBuyProduct.images?.[0] || `product_${currentQuickBuyProduct.id}_1.png`
        },
        quantity: parseInt(document.getElementById('quick-buy-quantity').value),
        customer: {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            pincode: formData.get('pincode')
        },
        paymentMethod: formData.get('paymentMethod'),
        subtotal: currentQuickBuyProduct.price * parseInt(document.getElementById('quick-buy-quantity').value),
        shipping: parseInt(document.getElementById('quick-buy-quantity').value) * currentQuickBuyProduct.price >= 5000 ? 0 : 199,
        total: parseInt(document.getElementById('quick-buy-total').textContent.replace(/[₹,]/g, ''))
    };
    
    processQuickBuyOrder(orderData);
}

// Process Quick Buy Order
async function processQuickBuyOrder(orderData) {
    showLoading();
    
    try {
        if (isBackendConnected) {
            // Send to backend API
            const response = await apiService.post('/orders/quick-buy', orderData);
            
            if (response.success) {
                showNotification('Order placed successfully! You will receive a confirmation email shortly.', 'success');
                
                if (orderData.paymentMethod === 'online') {
                    // Redirect to payment gateway
                    if (response.paymentUrl) {
                        window.open(response.paymentUrl, '_blank');
                    } else {
                        showNotification('Redirecting to payment...', 'info');
                        // Simulate payment process
                        setTimeout(() => {
                            showNotification('Payment successful! Order confirmed.', 'success');
                        }, 2000);
                    }
                } else {
                    showNotification(`Order #${response.orderId} confirmed! Pay ₹${orderData.total.toLocaleString()} on delivery.`, 'success');
                }
                
                closeQuickBuyModal();
            } else {
                throw new Error(response.message || 'Failed to place order');
            }
        } else {
            // Demo mode - simulate order processing
            await simulateQuickBuyOrder(orderData);
        }
    } catch (error) {
        console.error('Quick Buy Error:', error);
        showNotification('Failed to place order. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Simulate Quick Buy Order (Demo Mode)
function simulateQuickBuyOrder(orderData) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const orderId = 'QB' + Date.now();
            
            if (orderData.paymentMethod === 'online') {
                showNotification('Redirecting to payment gateway...', 'info');
                setTimeout(() => {
                    showNotification('Payment successful! Order confirmed.', 'success');
                    showNotification(`Order #${orderId} confirmed!`, 'success');
                }, 2000);
            } else {
                showNotification(`Order #${orderId} placed successfully!`, 'success');
                showNotification(`Pay ₹${orderData.total.toLocaleString()} on delivery.`, 'info');
            }
            
            closeQuickBuyModal();
            resolve({ success: true, orderId });
        }, 1500);
    });
}

// Initialize Quick Buy functionality
function initializeQuickBuy() {
    console.log('Initializing Quick Buy functionality...');
    
    // Check if modal exists
    const modal = document.getElementById('quick-buy-modal');
    if (!modal) {
        console.error('Quick Buy modal not found in DOM');
        return;
    }
    
    // Add event listeners for Quick Buy buttons using event delegation
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('quick-buy-btn')) {
            e.stopPropagation();
            e.preventDefault();
            const productId = parseInt(e.target.dataset.productId);
            console.log('Quick Buy button clicked for product:', productId);
            if (productId) {
                showQuickBuyModal(productId);
            } else {
                console.error('No product ID found on Quick Buy button');
            }
        }
        
        if (e.target.classList.contains('quick-buy-modal')) {
            e.stopPropagation();
            e.preventDefault();
            const productId = parseInt(e.target.dataset.productId);
            if (productId) {
                // Close quick view modal if it exists
                if (typeof closeQuickViewModal === 'function') {
                    const quickViewModal = e.target.closest('.modal');
                    if (quickViewModal) {
                        closeQuickViewModal(quickViewModal);
                    }
                }
                showQuickBuyModal(productId);
            }
        }
    });
    
    // Add event listener for form submission
    const quickBuyForm = document.getElementById('quick-buy-form');
    if (quickBuyForm) {
        quickBuyForm.addEventListener('submit', handleQuickBuySubmit);
        console.log('Quick Buy form listener added');
    }
    
    // Add event listener for quantity input
    const quantityInput = document.getElementById('quick-buy-quantity');
    if (quantityInput) {
        quantityInput.addEventListener('input', updateQuickBuyTotals);
        console.log('Quantity input listener added');
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeQuickBuyModal();
            }
        });
        console.log('Modal outside click listener added');
    }
    
    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
            closeQuickBuyModal();
        }
    });
    
    console.log('Quick Buy initialization complete');
}

// Auto-format phone number
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 10) {
        input.value = value;
    } else {
        input.value = value.substring(0, 10);
    }
}

// Validate PIN code
function validatePincode(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 6) {
        input.value = value;
    } else {
        input.value = value.substring(0, 6);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Quick Buy script loaded');
    
    // Wait a bit for other scripts to load
    setTimeout(() => {
        initializeQuickBuy();
        console.log('✅ Quick Buy functionality initialized');
    }, 100);
    
    // Add input formatters
    const phoneInput = document.getElementById('quick-buy-phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            formatPhoneNumber(this);
        });
    }
    
    const pincodeInput = document.getElementById('quick-buy-pincode');
    if (pincodeInput) {
        pincodeInput.addEventListener('input', function() {
            validatePincode(this);
        });
    }
});

// Also initialize when window loads (fallback)
window.addEventListener('load', function() {
    if (typeof showQuickBuyModal === 'function') {
        console.log('🔄 Quick Buy already initialized');
    } else {
        console.log('⚠️ Quick Buy not found, re-initializing...');
        setTimeout(initializeQuickBuy, 200);
    }
});