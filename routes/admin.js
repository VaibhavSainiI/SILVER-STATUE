const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const {
  sendErrorResponse,
  sendSuccessResponse,
  getPaginationData
} = require('../utils/helpers');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentUsers,
      recentOrders,
      recentRevenue,
      orderStatusBreakdown,
      topProducts,
      lowStockProducts,
      recentActivities
    ] = await Promise.all([
      // Total counts
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { 'paymentDetails.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
      ]),

      // Recent data
      User.countDocuments({ 
        role: 'user',
        createdAt: { $gte: startDate }
      }),
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      Order.aggregate([
        { 
          $match: { 
            'paymentDetails.status': 'completed',
            createdAt: { $gte: startDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
      ]),

      // Order status breakdown
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),

      // Top selling products
      Order.aggregate([
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalPrice' },
            productName: { $first: '$items.productSnapshot.name' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]),

      // Low stock products
      Product.find({
        isActive: true,
        'stock.quantity': { $lte: 5 }
      })
      .select('name stock.quantity sku')
      .sort({ 'stock.quantity': 1 })
      .limit(10),

      // Recent activities (orders)
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'firstName lastName email')
        .select('orderNumber orderStatus orderSummary.total createdAt user')
    ]);

    const dashboard = {
      summary: {
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
        totalOrders: totalOrders || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentUsers: recentUsers || 0,
        recentOrders: recentOrders || 0,
        recentRevenue: recentRevenue[0]?.total || 0,
        period: parseInt(period)
      },
      orderStatusBreakdown: orderStatusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topProducts: topProducts.map(product => ({
        id: product._id,
        name: product.productName,
        totalSold: product.totalSold,
        totalRevenue: product.totalRevenue
      })),
      lowStockProducts: lowStockProducts.map(product => ({
        id: product._id,
        name: product.name,
        sku: product.sku,
        quantity: product.stock.quantity
      })),
      recentActivities: recentActivities.map(order => ({
        type: 'order',
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        amount: order.orderSummary.total,
        user: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Unknown',
        createdAt: order.createdAt
      }))
    };

    sendSuccessResponse(res, 200, 'Dashboard data retrieved successfully', { dashboard });
  } catch (error) {
    console.error('Get dashboard error:', error);
    sendErrorResponse(res, 500, 'Error retrieving dashboard data');
  }
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '',
      role = '',
      isActive = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    const total = await User.countDocuments(filter);
    const pagination = getPaginationData(page, limit, total);

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .sort(sortOptions)
      .skip(pagination.skip)
      .limit(pagination.itemsPerPage)
      .select('-password')
      .lean();

    // Add order counts for each user
    const userIds = users.map(user => user._id);
    const orderCounts = await Order.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);

    const orderCountMap = orderCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    users.forEach(user => {
      user.totalOrders = orderCountMap[user._id] || 0;
    });

    sendSuccessResponse(res, 200, 'Users retrieved successfully', {
      users,
      pagination
    });
  } catch (error) {
    console.error('Get users error:', error);
    sendErrorResponse(res, 500, 'Error retrieving users');
  }
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
router.put('/users/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  body('reason').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { isActive, reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    if (user.role === 'admin') {
      return sendErrorResponse(res, 403, 'Cannot modify admin user status');
    }

    user.isActive = isActive;
    await user.save();

    sendSuccessResponse(res, 200, `User ${isActive ? 'activated' : 'deactivated'} successfully`, {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'User not found');
    }
    sendErrorResponse(res, 500, 'Error updating user status');
  }
});

// @desc    Get user details with orders
// @route   GET /api/admin/users/:id
// @access  Private/Admin
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('wishlist', 'name price images')
      .lean();

    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    // Get user's orders
    const orders = await Order.find({ user: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber orderStatus orderSummary.total createdAt')
      .lean();

    // Get user statistics
    const [totalOrders, totalSpent, avgOrderValue] = await Promise.all([
      Order.countDocuments({ user: req.params.id }),
      Order.aggregate([
        { $match: { user: user._id, 'paymentDetails.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
      ]),
      Order.aggregate([
        { $match: { user: user._id, 'paymentDetails.status': 'completed' } },
        { $group: { _id: null, avg: { $avg: '$orderSummary.total' } } }
      ])
    ]);

    const userDetails = {
      ...user,
      statistics: {
        totalOrders: totalOrders || 0,
        totalSpent: totalSpent[0]?.total || 0,
        avgOrderValue: Math.round(avgOrderValue[0]?.avg || 0),
        joinedDays: Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
      },
      recentOrders: orders
    };

    sendSuccessResponse(res, 200, 'User details retrieved successfully', { user: userDetails });
  } catch (error) {
    console.error('Get user details error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'User not found');
    }
    sendErrorResponse(res, 500, 'Error retrieving user details');
  }
});

// @desc    Get product analytics
// @route   GET /api/admin/products/analytics
// @access  Private/Admin
router.get('/products/analytics', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
      categoryBreakdown,
      averagePrice,
      topPerformingProducts,
      recentlyAddedProducts
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ 'stock.isInStock': false }),
      Product.countDocuments({ 
        'stock.isInStock': true,
        'stock.quantity': { $lte: 5 }
      }),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, avg: { $avg: '$price' } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalPrice' },
            productName: { $first: '$items.productSnapshot.name' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]),
      Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name price category createdAt')
    ]);

    const analytics = {
      summary: {
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        outOfStockProducts: outOfStockProducts || 0,
        lowStockProducts: lowStockProducts || 0,
        averagePrice: Math.round(averagePrice[0]?.avg || 0),
        period: parseInt(period)
      },
      categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      topPerformingProducts: topPerformingProducts.map(product => ({
        id: product._id,
        name: product.productName,
        totalSold: product.totalSold,
        totalRevenue: product.totalRevenue
      })),
      recentlyAddedProducts: recentlyAddedProducts.map(product => ({
        id: product._id,
        name: product.name,
        price: product.price,
        category: product.category,
        createdAt: product.createdAt
      }))
    };

    sendSuccessResponse(res, 200, 'Product analytics retrieved successfully', { analytics });
  } catch (error) {
    console.error('Get product analytics error:', error);
    sendErrorResponse(res, 500, 'Error retrieving product analytics');
  }
});

// @desc    Bulk update product status
// @route   PUT /api/admin/products/bulk-status
// @access  Private/Admin
router.put('/products/bulk-status', [
  body('productIds').isArray({ min: 1 }).withMessage('Product IDs array is required'),
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { productIds, isActive } = req.body;

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { 
        isActive,
        updatedBy: req.user.id,
        updatedAt: new Date()
      }
    );

    sendSuccessResponse(res, 200, `${result.modifiedCount} products updated successfully`, {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk update products error:', error);
    sendErrorResponse(res, 500, 'Error updating products');
  }
});

// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
router.get('/settings', async (req, res) => {
  try {
    // These would typically come from a settings collection or environment
    const settings = {
      general: {
        siteName: 'Silver Statue Store',
        siteDescription: 'Premium Silver Statues and Religious Artifacts',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        language: 'en'
      },
      ecommerce: {
        freeShippingThreshold: 2000,
        taxRate: 0.18, // 18% GST
        lowStockThreshold: 5,
        maxCartItems: 10
      },
      payment: {
        stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
        codEnabled: true,
        autoConfirmPayments: true
      },
      notifications: {
        emailNotifications: true,
        orderUpdateEmails: true,
        marketingEmails: false,
        smsNotifications: false
      }
    };

    sendSuccessResponse(res, 200, 'Settings retrieved successfully', { settings });
  } catch (error) {
    console.error('Get settings error:', error);
    sendErrorResponse(res, 500, 'Error retrieving settings');
  }
});

// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
router.put('/settings', [
  body('general.siteName').optional().trim().isLength({ min: 1, max: 100 }),
  body('ecommerce.freeShippingThreshold').optional().isFloat({ min: 0 }),
  body('ecommerce.taxRate').optional().isFloat({ min: 0, max: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    // In a real application, you would save these to a database
    // For now, we'll just return the updated settings
    const updatedSettings = req.body;

    sendSuccessResponse(res, 200, 'Settings updated successfully', { 
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('Update settings error:', error);
    sendErrorResponse(res, 500, 'Error updating settings');
  }
});

module.exports = router;