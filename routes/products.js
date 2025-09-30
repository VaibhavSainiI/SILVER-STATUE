const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const {
  sendErrorResponse,
  sendSuccessResponse,
  parseSortQuery,
  parseFilterQuery,
  getPaginationData,
  generateSKU,
  sanitizeSearchQuery
} = require('../utils/helpers');

const router = express.Router();

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt:desc',
      search = '',
      category,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      featured,
      newArrival
    } = req.query;

    // Build filter object
    let filter = parseFilterQuery(req.query);

    // Add search functionality
    if (search.trim()) {
      const searchQuery = sanitizeSearchQuery(search);
      filter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { tags: { $regex: searchQuery, $options: 'i' } },
        { 'specifications.material': { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Build sort object
    const sortOptions = parseSortQuery(sort);

    // Count total documents
    const total = await Product.countDocuments(filter);

    // Get pagination data
    const pagination = getPaginationData(page, limit, total);

    // Get products
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(pagination.skip)
      .limit(pagination.itemsPerPage)
      .select('-reviews -createdBy -updatedBy')
      .lean();

    // Add user-specific data if authenticated
    if (req.user) {
      // Add wishlist status for each product
      const wishlistIds = req.user.wishlist.map(id => id.toString());
      products.forEach(product => {
        product.isInWishlist = wishlistIds.includes(product._id.toString());
      });
    }

    sendSuccessResponse(res, 200, 'Products retrieved successfully', {
      products,
      pagination,
      filters: {
        search,
        category,
        minPrice,
        maxPrice,
        minRating,
        inStock,
        featured,
        newArrival
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    sendErrorResponse(res, 500, 'Error retrieving products');
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('reviews.user', 'firstName lastName avatar')
      .lean();

    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    if (!product.isActive && (!req.user || req.user.role !== 'admin')) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    // Add user-specific data if authenticated
    if (req.user) {
      const wishlistIds = req.user.wishlist.map(id => id.toString());
      product.isInWishlist = wishlistIds.includes(product._id.toString());

      // Check if user has reviewed this product
      const userReview = product.reviews.find(
        review => review.user._id.toString() === req.user.id
      );
      product.userReview = userReview || null;
    }

    sendSuccessResponse(res, 200, 'Product retrieved successfully', { product });
  } catch (error) {
    console.error('Get product error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    sendErrorResponse(res, 500, 'Error retrieving product');
  }
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', [
  protect,
  authorize('admin'),
  body('name').trim().isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2-200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10-2000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(['ganesh', 'krishna', 'lakshmi', 'elephant', 'religious', 'decorative', 'royal', 'traditional']).withMessage('Invalid category'),
  body('stock.quantity').isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('specifications.weight.value').optional().isFloat({ min: 0 }).withMessage('Weight must be positive'),
  body('images').isArray({ min: 1 }).withMessage('At least one image is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const productData = req.body;

    // Generate SKU if not provided
    if (!productData.sku) {
      productData.sku = generateSKU(productData.name, productData.category);
    }

    // Ensure at least one image is marked as primary
    if (productData.images && productData.images.length > 0) {
      const hasPrimary = productData.images.some(img => img.isPrimary);
      if (!hasPrimary) {
        productData.images[0].isPrimary = true;
      }
    }

    // Set creator
    productData.createdBy = req.user.id;

    const product = await Product.create(productData);

    sendSuccessResponse(res, 201, 'Product created successfully', { product });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, 'Product with this SKU already exists');
    }
    sendErrorResponse(res, 500, 'Error creating product');
  }
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', [
  protect,
  authorize('admin'),
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().isIn(['ganesh', 'krishna', 'lakshmi', 'elephant', 'religious', 'decorative', 'royal', 'traditional']),
  body('stock.quantity').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    let product = await Product.findById(req.params.id);

    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    // Set updater
    req.body.updatedBy = req.user.id;

    product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    sendSuccessResponse(res, 200, 'Product updated successfully', { product });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, 'Product with this SKU already exists');
    }
    sendErrorResponse(res, 500, 'Error updating product');
  }
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    // Soft delete - just mark as inactive
    product.isActive = false;
    product.updatedBy = req.user.id;
    await product.save();

    sendSuccessResponse(res, 200, 'Product deleted successfully');
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    sendErrorResponse(res, 500, 'Error deleting product');
  }
});

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', [
  protect,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { rating, comment, images } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    if (!product.isActive) {
      return sendErrorResponse(res, 400, 'Cannot review inactive product');
    }

    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.id
    );

    if (existingReview) {
      return sendErrorResponse(res, 400, 'You have already reviewed this product');
    }

    const review = {
      user: req.user.id,
      rating,
      comment: comment || '',
      images: images || [],
      createdAt: new Date()
    };

    product.reviews.push(review);
    product.updateRating();
    await product.save();

    // Populate the new review
    await product.populate('reviews.user', 'firstName lastName avatar');

    const newReview = product.reviews[product.reviews.length - 1];

    sendSuccessResponse(res, 201, 'Review added successfully', { review: newReview });
  } catch (error) {
    console.error('Add review error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    sendErrorResponse(res, 500, 'Error adding review');
  }
});

// @desc    Get product categories
// @route   GET /api/products/categories/list
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    sendSuccessResponse(res, 200, 'Categories retrieved successfully', { categories });
  } catch (error) {
    console.error('Get categories error:', error);
    sendErrorResponse(res, 500, 'Error retrieving categories');
  }
});

// @desc    Get featured products
// @route   GET /api/products/featured/list
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      isFeatured: true
    })
      .sort({ 'rating.average': -1, createdAt: -1 })
      .limit(8)
      .select('-reviews -createdBy -updatedBy')
      .lean();

    sendSuccessResponse(res, 200, 'Featured products retrieved successfully', { products });
  } catch (error) {
    console.error('Get featured products error:', error);
    sendErrorResponse(res, 500, 'Error retrieving featured products');
  }
});

// @desc    Get new arrivals
// @route   GET /api/products/new-arrivals/list
// @access  Public
router.get('/new-arrivals/list', async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      isNewArrival: true
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('-reviews -createdBy -updatedBy')
      .lean();

    sendSuccessResponse(res, 200, 'New arrivals retrieved successfully', { products });
  } catch (error) {
    console.error('Get new arrivals error:', error);
    sendErrorResponse(res, 500, 'Error retrieving new arrivals');
  }
});

// @desc    Get product suggestions
// @route   GET /api/products/:id/suggestions
// @access  Public
router.get('/:id/suggestions', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    // Find similar products based on category and price range
    const priceRange = product.price * 0.3; // 30% price range
    const suggestions = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      category: product.category,
      price: {
        $gte: product.price - priceRange,
        $lte: product.price + priceRange
      }
    })
      .sort({ 'rating.average': -1 })
      .limit(6)
      .select('-reviews -createdBy -updatedBy')
      .lean();

    sendSuccessResponse(res, 200, 'Product suggestions retrieved successfully', { suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Product not found');
    }
    sendErrorResponse(res, 500, 'Error retrieving suggestions');
  }
});

module.exports = router;