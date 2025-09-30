const express = require('express');
const { body, validationResult } = require('express-validator');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/helpers');

const router = express.Router();

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const cart = await Cart.getOrCreateCart(req.user.id);

    sendSuccessResponse(res, 200, 'Cart retrieved successfully', { cart });
  } catch (error) {
    console.error('Get cart error:', error);
    sendErrorResponse(res, 500, 'Error retrieving cart');
  }
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
router.post('/items', [
  protect,
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { productId, quantity } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    // Check stock availability
    if (!product.stock.isInStock || product.stock.quantity < quantity) {
      return sendErrorResponse(res, 400, 'Insufficient stock available');
    }

    // Get or create cart
    const cart = await Cart.getOrCreateCart(req.user.id);

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product._id.toString() === productId
    );

    if (existingItemIndex >= 0) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      // Check if new quantity exceeds stock
      if (newQuantity > product.stock.quantity) {
        return sendErrorResponse(res, 400, `Only ${product.stock.quantity} items available in stock`);
      }

      // Check max quantity per item
      if (newQuantity > 10) {
        return sendErrorResponse(res, 400, 'Maximum 10 items allowed per product');
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].addedAt = new Date();
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity,
        price: product.discountedPrice || product.price,
        addedAt: new Date()
      });
    }

    await cart.save();

    // Populate and return updated cart
    await cart.populate('items.product');

    sendSuccessResponse(res, 200, 'Item added to cart successfully', { cart });
  } catch (error) {
    console.error('Add to cart error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 400, 'Invalid product ID');
    }
    sendErrorResponse(res, 500, 'Error adding item to cart');
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
router.put('/items/:productId', [
  protect,
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { productId } = req.params;
    const { quantity } = req.body;

    // Check if product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    // Check stock availability
    if (!product.stock.isInStock || product.stock.quantity < quantity) {
      return sendErrorResponse(res, 400, `Only ${product.stock.quantity} items available in stock`);
    }

    // Get cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart) {
      return sendErrorResponse(res, 404, 'Cart not found');
    }

    // Find item in cart
    const itemIndex = cart.items.findIndex(
      item => item.product._id.toString() === productId
    );

    if (itemIndex === -1) {
      return sendErrorResponse(res, 404, 'Item not found in cart');
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].addedAt = new Date();

    await cart.save();

    sendSuccessResponse(res, 200, 'Cart item updated successfully', { cart });
  } catch (error) {
    console.error('Update cart item error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 400, 'Invalid product ID');
    }
    sendErrorResponse(res, 500, 'Error updating cart item');
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
router.delete('/items/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    // Get cart
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return sendErrorResponse(res, 404, 'Cart not found');
    }

    // Remove item from cart
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    if (cart.items.length === initialLength) {
      return sendErrorResponse(res, 404, 'Item not found in cart');
    }

    await cart.save();
    await cart.populate('items.product');

    sendSuccessResponse(res, 200, 'Item removed from cart successfully', { cart });
  } catch (error) {
    console.error('Remove cart item error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 400, 'Invalid product ID');
    }
    sendErrorResponse(res, 500, 'Error removing cart item');
  }
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
router.delete('/', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return sendErrorResponse(res, 404, 'Cart not found');
    }

    cart.items = [];
    await cart.save();

    sendSuccessResponse(res, 200, 'Cart cleared successfully', { cart });
  } catch (error) {
    console.error('Clear cart error:', error);
    sendErrorResponse(res, 500, 'Error clearing cart');
  }
});

// @desc    Get cart summary
// @route   GET /api/cart/summary
// @access  Private
router.get('/summary', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return sendSuccessResponse(res, 200, 'Cart is empty', {
        summary: {
          totalItems: 0,
          subtotal: 0,
          tax: 0,
          shipping: 0,
          total: 0
        }
      });
    }

    const subtotal = cart.totalAmount;
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const shipping = subtotal >= 2000 ? 0 : 200; // Free shipping over ₹2000
    const total = subtotal + tax + shipping;

    const summary = {
      totalItems: cart.totalItems,
      subtotal,
      tax,
      shipping,
      total,
      freeShippingThreshold: 2000,
      amountForFreeShipping: subtotal < 2000 ? 2000 - subtotal : 0
    };

    sendSuccessResponse(res, 200, 'Cart summary retrieved successfully', { summary });
  } catch (error) {
    console.error('Get cart summary error:', error);
    sendErrorResponse(res, 500, 'Error retrieving cart summary');
  }
});

// @desc    Validate cart items (check stock and prices)
// @route   POST /api/cart/validate
// @access  Private
router.post('/validate', protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return sendSuccessResponse(res, 200, 'Cart is empty', { 
        isValid: true, 
        issues: [],
        cart: null 
      });
    }

    const issues = [];
    const validItems = [];

    for (const item of cart.items) {
      const product = item.product;

      // Check if product still exists and is active
      if (!product || !product.isActive) {
        issues.push({
          type: 'unavailable',
          productId: item.product?._id || 'unknown',
          productName: item.product?.name || 'Unknown Product',
          message: 'Product is no longer available'
        });
        continue;
      }

      // Check stock availability
      if (!product.stock.isInStock || product.stock.quantity === 0) {
        issues.push({
          type: 'out_of_stock',
          productId: product._id,
          productName: product.name,
          message: 'Product is out of stock'
        });
        continue;
      }

      // Check if requested quantity is available
      if (item.quantity > product.stock.quantity) {
        issues.push({
          type: 'insufficient_stock',
          productId: product._id,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: product.stock.quantity,
          message: `Only ${product.stock.quantity} items available`
        });
        
        // Adjust quantity to available stock
        item.quantity = product.stock.quantity;
      }

      // Check if price has changed
      const currentPrice = product.discountedPrice || product.price;
      if (Math.abs(item.price - currentPrice) > 0.01) {
        issues.push({
          type: 'price_change',
          productId: product._id,
          productName: product.name,
          oldPrice: item.price,
          newPrice: currentPrice,
          message: `Price has changed from ₹${item.price} to ₹${currentPrice}`
        });
        
        // Update price
        item.price = currentPrice;
      }

      validItems.push(item);
    }

    // Remove invalid items and update cart
    if (issues.some(issue => ['unavailable', 'out_of_stock'].includes(issue.type))) {
      cart.items = validItems;
      await cart.save();
    }

    const isValid = issues.length === 0;

    sendSuccessResponse(res, 200, isValid ? 'Cart is valid' : 'Cart validation completed with issues', {
      isValid,
      issues,
      cart: isValid ? cart : await Cart.findOne({ user: req.user.id }).populate('items.product')
    });

  } catch (error) {
    console.error('Validate cart error:', error);
    sendErrorResponse(res, 500, 'Error validating cart');
  }
});

module.exports = router;