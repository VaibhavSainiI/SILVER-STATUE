// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api',
    ENDPOINTS: {
        // Authentication
        AUTH: {
            LOGIN: '/auth/login',
            REGISTER: '/auth/register',
            LOGOUT: '/auth/logout',
            ME: '/auth/me',
            PROFILE: '/auth/profile',
            CHANGE_PASSWORD: '/auth/change-password',
            FORGOT_PASSWORD: '/auth/forgot-password',
            RESET_PASSWORD: '/auth/reset-password'
        },
        // Products
        PRODUCTS: {
            LIST: '/products',
            SINGLE: '/products',
            FEATURED: '/products/featured/list',
            NEW_ARRIVALS: '/products/new-arrivals/list',
            CATEGORIES: '/products/categories/list',
            SUGGESTIONS: '/products',
            REVIEWS: '/products'
        },
        // Cart
        CART: {
            GET: '/cart',
            ADD_ITEM: '/cart/items',
            UPDATE_ITEM: '/cart/items',
            REMOVE_ITEM: '/cart/items',
            CLEAR: '/cart',
            SUMMARY: '/cart/summary',
            VALIDATE: '/cart/validate'
        },
        // Orders
        ORDERS: {
            CREATE: '/orders',
            LIST: '/orders',
            SINGLE: '/orders',
            CANCEL: '/orders'
        },
        // Users
        USERS: {
            WISHLIST: '/users/wishlist',
            PROFILE: '/users/profile'
        },
        // Payment
        PAYMENT: {
            CREATE_INTENT: '/payment/create-intent',
            CONFIRM: '/payment/confirm',
            METHODS: '/payment/methods'
        }
    }
};

// API Helper Class
class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    // Get authentication headers
    getHeaders(contentType = 'application/json') {
        const headers = {
            'Content-Type': contentType
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication methods
    async login(email, password) {
        const response = await this.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, { email, password });
        if (response.success && response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async register(userData) {
        const response = await this.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, userData);
        if (response.success && response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async logout() {
        try {
            await this.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.setToken(null);
        }
    }

    async getCurrentUser() {
        return this.get(API_CONFIG.ENDPOINTS.AUTH.ME);
    }

    // Product methods
    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? 
            `${API_CONFIG.ENDPOINTS.PRODUCTS.LIST}?${queryString}` : 
            API_CONFIG.ENDPOINTS.PRODUCTS.LIST;
        return this.get(endpoint);
    }

    async getProduct(id) {
        return this.get(`${API_CONFIG.ENDPOINTS.PRODUCTS.SINGLE}/${id}`);
    }

    async getFeaturedProducts() {
        return this.get(API_CONFIG.ENDPOINTS.PRODUCTS.FEATURED);
    }

    async getNewArrivals() {
        return this.get(API_CONFIG.ENDPOINTS.PRODUCTS.NEW_ARRIVALS);
    }

    async getCategories() {
        return this.get(API_CONFIG.ENDPOINTS.PRODUCTS.CATEGORIES);
    }

    // Cart methods
    async getCart() {
        return this.get(API_CONFIG.ENDPOINTS.CART.GET);
    }

    async addToCart(productId, quantity = 1) {
        return this.post(API_CONFIG.ENDPOINTS.CART.ADD_ITEM, { productId, quantity });
    }

    async updateCartItem(productId, quantity) {
        return this.put(`${API_CONFIG.ENDPOINTS.CART.UPDATE_ITEM}/${productId}`, { quantity });
    }

    async removeFromCart(productId) {
        return this.delete(`${API_CONFIG.ENDPOINTS.CART.REMOVE_ITEM}/${productId}`);
    }

    async clearCart() {
        return this.delete(API_CONFIG.ENDPOINTS.CART.CLEAR);
    }

    async getCartSummary() {
        return this.get(API_CONFIG.ENDPOINTS.CART.SUMMARY);
    }

    // Order methods
    async createOrder(orderData) {
        return this.post(API_CONFIG.ENDPOINTS.ORDERS.CREATE, orderData);
    }

    async getOrders(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? 
            `${API_CONFIG.ENDPOINTS.ORDERS.LIST}?${queryString}` : 
            API_CONFIG.ENDPOINTS.ORDERS.LIST;
        return this.get(endpoint);
    }

    async getOrder(id) {
        return this.get(`${API_CONFIG.ENDPOINTS.ORDERS.SINGLE}/${id}`);
    }

    // Wishlist methods
    async addToWishlist(productId) {
        return this.post(`${API_CONFIG.ENDPOINTS.USERS.WISHLIST}/${productId}`);
    }

    async removeFromWishlist(productId) {
        return this.delete(`${API_CONFIG.ENDPOINTS.USERS.WISHLIST}/${productId}`);
    }

    async getWishlist() {
        return this.get(API_CONFIG.ENDPOINTS.USERS.WISHLIST);
    }

    // Payment methods
    async createPaymentIntent(orderId) {
        return this.post(API_CONFIG.ENDPOINTS.PAYMENT.CREATE_INTENT, { orderId });
    }

    async confirmPayment(paymentIntentId) {
        return this.post(API_CONFIG.ENDPOINTS.PAYMENT.CONFIRM, { paymentIntentId });
    }

    async getPaymentMethods() {
        return this.get(API_CONFIG.ENDPOINTS.PAYMENT.METHODS);
    }
}

// Create global API instance
const api = new ApiService();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, api, API_CONFIG };
}