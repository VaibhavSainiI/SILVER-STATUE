const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const {
  sendErrorResponse,
  sendSuccessResponse,
  getPaginationData
} = require('../utils/helpers');

const router = express.Router();

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
router.post('/', [
  protect,
  body('shippingAddress.firstName').trim().notEmpty().withMessage('First name is required'),
  body('shippingAddress.lastName').trim().notEmpty().withMessage('Last name is required'),
  body('shippingAddress.email').isEmail().withMessage('Valid email is required'),
  body('shippingAddress.phone').notEmpty().withMessage('Phone number is required'),
  body('shippingAddress.street').trim().notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.zipCode').trim().notEmpty().withMessage('ZIP code is required'),
  body('shippingAddress.country').trim().notEmpty().withMessage('Country is required'),
  body('paymentDetails.method').isIn(['stripe', 'razorpay', 'paypal', 'cod']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { shippingAddress, billingAddress, paymentDetails, notes, isGift, giftMessage } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    
    if (!cart || cart.items.length === 0) {
      return sendErrorResponse(res, 400, 'Cart is empty');
    }

    // Validate cart items and stock
    const orderItems = [];
    let allItemsValid = true;

    for (const cartItem of cart.items) {
      const product = cartItem.product;

      // Check if product exists and is active
      if (!product || !product.isActive) {
        allItemsValid = false;
        break;
      }

      // Check stock availability
      if (!product.stock.isInStock || product.stock.quantity < cartItem.quantity) {
        return sendErrorResponse(res, 400, `Insufficient stock for ${product.name}. Available: ${product.stock.quantity}`);
      }

      // Create order item with product snapshot
      const orderItem = {
        product: product._id,
        productSnapshot: {
          name: product.name,
          description: product.description,
          images: product.images.map(img => img.url),
          specifications: {
            weight: product.specifications.weight,
            material: product.specifications.material,
            purity: product.specifications.purity
          }
        },
        quantity: cartItem.quantity,
        price: cartItem.price,
        totalPrice: cartItem.price * cartItem.quantity
      };

      orderItems.push(orderItem);
    }

    if (!allItemsValid) {
      return sendErrorResponse(res, 400, 'Some products in cart are no longer available');
    }

    // Calculate order summary
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.18); // 18% GST
    const shipping = subtotal >= 2000 ? 0 : 200; // Free shipping over ₹2000
    const total = subtotal + tax + shipping;

    // Create order
    const orderData = {
      user: req.user.id,
      items: orderItems,
      orderSummary: {
        subtotal,
        tax,
        shipping,
        discount: 0,
        total
      },
      shippingAddress,
      billingAddress: billingAddress || { ...shippingAddress, sameAsShipping: true },
      paymentDetails: {
        method: paymentDetails.method,
        status: paymentDetails.method === 'cod' ? 'pending' : 'pending'
      },
      notes: {
        customerNotes: notes || ''
      },
      isGift: isGift || false,
      giftMessage: giftMessage || ''
    };

    const order = await Order.create(orderData);

    // Add initial timeline entry
    order.timeline.push({
      status: 'pending',
      message: 'Order placed successfully',
      timestamp: new Date(),
      updatedBy: req.user.id
    });

    await order.save();

    // Update product stock
    for (const cartItem of cart.items) {
      await Product.findByIdAndUpdate(
        cartItem.product._id,
        { $inc: { 'stock.quantity': -cartItem.quantity } }
      );
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Populate order for response
    await order.populate('user', 'firstName lastName email');

    sendSuccessResponse(res, 201, 'Order created successfully', { order });
  } catch (error) {
    console.error('Create order error:', error);
    sendErrorResponse(res, 500, 'Error creating order');
  }
});

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { user: req.user.id };
    if (status) {
      filter.orderStatus = status;
    }

    const total = await Order.countDocuments(filter);
    const pagination = getPaginationData(page, limit, total);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.itemsPerPage)
      .populate('user', 'firstName lastName email')
      .lean();

    sendSuccessResponse(res, 200, 'Orders retrieved successfully', {
      orders,
      pagination
    });
  } catch (error) {
    console.error('Get orders error:', error);
    sendErrorResponse(res, 500, 'Error retrieving orders');
  }
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('timeline.updatedBy', 'firstName lastName');

    if (!order) {
      return sendErrorResponse(res, 404, 'Order not found');
    }

    // Check if user owns this order or is admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    sendSuccessResponse(res, 200, 'Order retrieved successfully', { order });
  } catch (error) {
    console.error('Get order error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Order not found');
    }
    sendErrorResponse(res, 500, 'Error retrieving order');
  }
});

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
router.put('/:id/cancel', [
  protect,
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendErrorResponse(res, 404, 'Order not found');
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return sendErrorResponse(res, 400, `Cannot cancel order with status: ${order.orderStatus}`);
    }

    // Update order status
    order.orderStatus = 'cancelled';
    order.cancellation = {
      reason: reason || 'Cancelled by customer',
      cancelledAt: new Date(),
      cancelledBy: req.user.id
    };

    // Add timeline entry
    order.timeline.push({
      status: 'cancelled',
      message: reason || 'Order cancelled by customer',
      timestamp: new Date(),
      updatedBy: req.user.id
    });

    await order.save();

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { 'stock.quantity': item.quantity } }
      );
    }

    sendSuccessResponse(res, 200, 'Order cancelled successfully', { order });
  } catch (error) {
    console.error('Cancel order error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Order not found');
    }
    sendErrorResponse(res, 500, 'Error cancelling order');
  }
});

// @desc    Get all orders (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus, 
      search,
      startDate,
      endDate
    } = req.query;

    const filter = {};

    if (status) {
      filter.orderStatus = status;
    }

    if (paymentStatus) {
      filter['paymentDetails.status'] = paymentStatus;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const total = await Order.countDocuments(filter);
    const pagination = getPaginationData(page, limit, total);

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.itemsPerPage)
      .populate('user', 'firstName lastName email')
      .lean();

    // Calculate summary statistics
    const totalRevenue = await Order.aggregate([
      { $match: { orderStatus: 'delivered', 'paymentDetails.status': 'completed' } },
      { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
    ]);

    const statusCounts = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    sendSuccessResponse(res, 200, 'Orders retrieved successfully', {
      orders,
      pagination,
      summary: {
        totalRevenue: totalRevenue[0]?.total || 0,
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    sendErrorResponse(res, 500, 'Error retrieving orders');
  }
});

// @desc    Update order status (Admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
router.put('/:id/status', [
  protect,
  authorize('admin'),
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned']).withMessage('Invalid status'),
  body('message').optional().trim().isLength({ max: 500 }),
  body('trackingNumber').optional().trim(),
  body('carrier').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { status, message, trackingNumber, carrier, estimatedDelivery } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendErrorResponse(res, 404, 'Order not found');
    }

    try {
      // Update order status using the model method
      await order.updateStatus(status, message, req.user.id);

      // Update tracking information if provided
      if (status === 'shipped') {
        if (trackingNumber) order.tracking.trackingNumber = trackingNumber;
        if (carrier) order.tracking.carrier = carrier;
        if (estimatedDelivery) order.tracking.estimatedDelivery = new Date(estimatedDelivery);
      }

      await order.save();

      sendSuccessResponse(res, 200, 'Order status updated successfully', { order });
    } catch (statusError) {
      return sendErrorResponse(res, 400, statusError.message);
    }
  } catch (error) {
    console.error('Update order status error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 404, 'Order not found');
    }
    sendErrorResponse(res, 500, 'Error updating order status');
  }
});

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/admin/statistics
// @access  Private/Admin
router.get('/admin/statistics', protect, authorize('admin'), async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const [
      totalOrders,
      recentOrders,
      totalRevenue,
      recentRevenue,
      statusBreakdown,
      dailyStats
    ] = await Promise.all([
      // Total orders
      Order.countDocuments(),
      
      // Recent orders
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      
      // Total revenue
      Order.aggregate([
        { $match: { 'paymentDetails.status': 'completed' } },
        { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
      ]),
      
      // Recent revenue
      Order.aggregate([
        { 
          $match: { 
            'paymentDetails.status': 'completed',
            createdAt: { $gte: startDate }
          }
        },
        { $group: { _id: null, total: { $sum: '$orderSummary.total' } } }
      ]),
      
      // Status breakdown
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),
      
      // Daily statistics for the period
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: '$orderSummary.total' }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    const statistics = {
      totalOrders: totalOrders || 0,
      recentOrders: recentOrders || 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentRevenue: recentRevenue[0]?.total || 0,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      dailyStats: dailyStats.map(day => ({
        date: day._id,
        orders: day.orders,
        revenue: day.revenue
      }))
    };

    sendSuccessResponse(res, 200, 'Order statistics retrieved successfully', { statistics });
  } catch (error) {
    console.error('Get order statistics error:', error);
    sendErrorResponse(res, 500, 'Error retrieving order statistics');
  }
});

// @desc    Create quick buy order (no authentication required)
// @route   POST /api/orders/quick-buy
// @access  Public
router.post('/quick-buy', [
  body('product.id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
  body('product.name').trim().notEmpty().withMessage('Product name is required'),
  body('product.price').isFloat({ min: 0 }).withMessage('Valid product price is required'),
  body('quantity').isInt({ min: 1, max: 10 }).withMessage('Quantity must be between 1 and 10'),
  body('customer.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('customer.email').isEmail().withMessage('Valid email is required'),
  body('customer.phone').notEmpty().withMessage('Phone number is required'),
  body('customer.address').trim().notEmpty().withMessage('Address is required'),
  body('customer.city').trim().notEmpty().withMessage('City is required'),
  body('customer.pincode').matches(/^[0-9]{6}$/).withMessage('Valid 6-digit PIN code is required'),
  body('paymentMethod').isIn(['cod', 'online']).withMessage('Invalid payment method'),
  body('subtotal').isFloat({ min: 0 }).withMessage('Valid subtotal is required'),
  body('shipping').isFloat({ min: 0 }).withMessage('Valid shipping cost is required'),
  body('total').isFloat({ min: 0 }).withMessage('Valid total is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, 400, 'Validation failed', { errors: errors.array() });
  }

  try {
    const {
      product,
      quantity,
      customer,
      paymentMethod,
      subtotal,
      shipping,
      total
    } = req.body;

    // Verify product exists and is in stock
    const productData = await Product.findById(product.id);
    if (!productData) {
      return sendErrorResponse(res, 404, 'Product not found');
    }

    if (!productData.stock.isInStock || productData.stock.quantity < quantity) {
      return sendErrorResponse(res, 400, 'Product is out of stock or insufficient quantity');
    }

    // Verify pricing (basic check against tampering)
    const expectedSubtotal = productData.price * quantity;
    const expectedShipping = expectedSubtotal >= 5000 ? 0 : 199;
    const expectedTotal = expectedSubtotal + expectedShipping;

    if (Math.abs(subtotal - expectedSubtotal) > 0.01 || 
        Math.abs(shipping - expectedShipping) > 0.01 || 
        Math.abs(total - expectedTotal) > 0.01) {
      return sendErrorResponse(res, 400, 'Invalid pricing calculation');
    }

    // Create quick buy order
    const orderData = {
      orderNumber: `QB${Date.now()}${Math.floor(Math.random() * 1000)}`,
      items: [{
        product: productData._id,
        name: productData.name,
        price: productData.price,
        quantity: quantity,
        total: expectedSubtotal
      }],
      shippingAddress: {
        firstName: customer.fullName.split(' ')[0] || customer.fullName,
        lastName: customer.fullName.split(' ').slice(1).join(' ') || '',
        email: customer.email,
        phone: customer.phone,
        street: customer.address,
        city: customer.city,
        state: 'Not Specified', // Default for quick buy
        zipCode: customer.pincode,
        country: 'India' // Default for quick buy
      },
      paymentDetails: {
        method: paymentMethod === 'online' ? 'stripe' : 'cod',
        status: paymentMethod === 'cod' ? 'pending' : 'pending'
      },
      itemsTotal: expectedSubtotal,
      shippingCost: expectedShipping,
      totalAmount: expectedTotal,
      orderSource: 'quick-buy',
      status: 'pending'
    };

    const order = await Order.create(orderData);

    // Update product stock
    await Product.findByIdAndUpdate(
      productData._id,
      {
        $inc: { 'stock.quantity': -quantity },
        'stock.isInStock': productData.stock.quantity - quantity > 0
      }
    );

    // Generate response
    const responseData = {
      orderId: order.orderNumber,
      orderTotal: total,
      paymentMethod: paymentMethod,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
    };

    // If online payment, you would typically generate payment URL here
    if (paymentMethod === 'online') {
      // In a real implementation, integrate with Stripe/Razorpay here
      responseData.paymentUrl = `/payment/${order._id}`;
    }

    sendSuccessResponse(res, 201, 'Quick buy order placed successfully', responseData);
  } catch (error) {
    console.error('Quick buy order error:', error);
    sendErrorResponse(res, 500, 'Error placing quick buy order');
  }
});

module.exports = router;