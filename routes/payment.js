const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/helpers');

const router = express.Router();

// @desc    Create payment intent
// @route   POST /api/payment/create-intent
// @access  Private
router.post('/create-intent', [
  protect,
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('currency').optional().isIn(['inr', 'usd']).withMessage('Invalid currency')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { orderId, currency = 'inr' } = req.body;

    // Get order
    const order = await Order.findById(orderId);

    if (!order) {
      return sendErrorResponse(res, 404, 'Order not found');
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    // Check if order is in correct status for payment
    if (order.orderStatus !== 'pending') {
      return sendErrorResponse(res, 400, 'Order is not in a payable state');
    }

    // Check if payment intent already exists
    if (order.paymentDetails.paymentIntentId) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(order.paymentDetails.paymentIntentId);
        
        if (existingIntent.status === 'succeeded') {
          return sendErrorResponse(res, 400, 'Payment already completed');
        }

        // Return existing intent if still valid
        if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingIntent.status)) {
          return sendSuccessResponse(res, 200, 'Payment intent retrieved', {
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id
          });
        }
      } catch (stripeError) {
        console.log('Existing payment intent not found, creating new one');
      }
    }

    // Create new payment intent
    const amount = Math.round(order.orderSummary.total * 100); // Convert to paise/cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id,
        orderNumber: order.orderNumber
      },
      description: `Payment for order ${order.orderNumber}`,
      receipt_email: order.shippingAddress.email
    });

    // Update order with payment intent ID
    order.paymentDetails.paymentIntentId = paymentIntent.id;
    await order.save();

    sendSuccessResponse(res, 200, 'Payment intent created successfully', {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    
    if (error.type === 'StripeCardError') {
      return sendErrorResponse(res, 400, error.message);
    }
    
    sendErrorResponse(res, 500, 'Error creating payment intent');
  }
});

// @desc    Confirm payment
// @route   POST /api/payment/confirm
// @access  Private
router.post('/confirm', [
  protect,
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { paymentIntentId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return sendErrorResponse(res, 404, 'Payment intent not found');
    }

    // Find associated order
    const order = await Order.findOne({
      'paymentDetails.paymentIntentId': paymentIntentId,
      user: req.user.id
    });

    if (!order) {
      return sendErrorResponse(res, 404, 'Order not found');
    }

    // Update order based on payment status
    if (paymentIntent.status === 'succeeded') {
      order.paymentDetails.status = 'completed';
      order.paymentDetails.transactionId = paymentIntent.id;
      order.paymentDetails.paidAt = new Date();
      order.orderStatus = 'confirmed';

      // Add timeline entry
      order.timeline.push({
        status: 'confirmed',
        message: 'Payment completed successfully',
        timestamp: new Date(),
        updatedBy: req.user.id
      });

      await order.save();

      sendSuccessResponse(res, 200, 'Payment confirmed successfully', { 
        order,
        paymentStatus: 'succeeded'
      });
    } else if (paymentIntent.status === 'requires_action') {
      sendSuccessResponse(res, 200, 'Payment requires additional action', {
        paymentStatus: 'requires_action',
        clientSecret: paymentIntent.client_secret
      });
    } else {
      order.paymentDetails.status = 'failed';
      await order.save();

      sendErrorResponse(res, 400, 'Payment failed or incomplete', {
        paymentStatus: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Confirm payment error:', error);
    sendErrorResponse(res, 500, 'Error confirming payment');
  }
});

// @desc    Handle Stripe webhook
// @route   POST /api/payment/webhook
// @access  Public (but verified)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentFailed(failedPayment);
        break;

      case 'payment_intent.canceled':
        const canceledPayment = event.data.object;
        await handlePaymentCanceled(canceledPayment);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Handle successful payment
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      'paymentDetails.paymentIntentId': paymentIntent.id
    });

    if (order && order.paymentDetails.status !== 'completed') {
      order.paymentDetails.status = 'completed';
      order.paymentDetails.transactionId = paymentIntent.id;
      order.paymentDetails.paidAt = new Date();
      
      if (order.orderStatus === 'pending') {
        order.orderStatus = 'confirmed';
        order.timeline.push({
          status: 'confirmed',
          message: 'Payment completed via webhook',
          timestamp: new Date()
        });
      }

      await order.save();
      console.log(`Payment succeeded for order ${order.orderNumber}`);
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Handle failed payment
const handlePaymentFailed = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      'paymentDetails.paymentIntentId': paymentIntent.id
    });

    if (order) {
      order.paymentDetails.status = 'failed';
      order.timeline.push({
        status: order.orderStatus,
        message: 'Payment failed',
        timestamp: new Date()
      });

      await order.save();
      console.log(`Payment failed for order ${order.orderNumber}`);
    }
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

// Handle canceled payment
const handlePaymentCanceled = async (paymentIntent) => {
  try {
    const order = await Order.findOne({
      'paymentDetails.paymentIntentId': paymentIntent.id
    });

    if (order) {
      order.paymentDetails.status = 'failed';
      order.timeline.push({
        status: order.orderStatus,
        message: 'Payment canceled',
        timestamp: new Date()
      });

      await order.save();
      console.log(`Payment canceled for order ${order.orderNumber}`);
    }
  } catch (error) {
    console.error('Error handling payment cancellation:', error);
  }
};

// @desc    Get payment methods
// @route   GET /api/payment/methods
// @access  Private
router.get('/methods', protect, async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'stripe',
        name: 'Credit/Debit Card',
        description: 'Pay securely with your credit or debit card',
        icon: 'credit-card',
        enabled: true,
        types: ['visa', 'mastercard', 'amex', 'discover']
      },
      {
        id: 'cod',
        name: 'Cash on Delivery',
        description: 'Pay when your order is delivered',
        icon: 'cash',
        enabled: true,
        additionalInfo: 'Available for orders within India'
      }
    ];

    sendSuccessResponse(res, 200, 'Payment methods retrieved successfully', { 
      paymentMethods 
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    sendErrorResponse(res, 500, 'Error retrieving payment methods');
  }
});

// @desc    Process refund
// @route   POST /api/payment/refund
// @access  Private/Admin
router.post('/refund', [
  protect,
  body('orderId').isMongoId().withMessage('Valid order ID is required'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Refund amount must be positive'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { orderId, amount, reason } = req.body;

    // Get order
    const order = await Order.findById(orderId);

    if (!order) {
      return sendErrorResponse(res, 404, 'Order not found');
    }

    // Check if user is admin or owns the order
    if (req.user.role !== 'admin' && order.user.toString() !== req.user.id) {
      return sendErrorResponse(res, 403, 'Access denied');
    }

    // Check if payment was completed
    if (order.paymentDetails.status !== 'completed') {
      return sendErrorResponse(res, 400, 'Cannot refund unpaid order');
    }

    // Check if payment method supports refund
    if (order.paymentDetails.method === 'cod') {
      return sendErrorResponse(res, 400, 'Cash on delivery orders cannot be refunded through this system');
    }

    const refundAmount = amount || order.orderSummary.total;

    // Process refund with Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentDetails.paymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to paise
      reason: 'requested_by_customer',
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        refundReason: reason || 'Customer request'
      }
    });

    // Update order
    order.paymentDetails.refundAmount = (order.paymentDetails.refundAmount || 0) + refundAmount;
    order.paymentDetails.refundReason = reason || 'Customer request';

    if (refundAmount >= order.orderSummary.total) {
      order.paymentDetails.status = 'refunded';
    } else {
      order.paymentDetails.status = 'partially_refunded';
    }

    // Add timeline entry
    order.timeline.push({
      status: order.orderStatus,
      message: `Refund of ₹${refundAmount} processed. Reason: ${reason || 'Customer request'}`,
      timestamp: new Date(),
      updatedBy: req.user.id
    });

    await order.save();

    sendSuccessResponse(res, 200, 'Refund processed successfully', {
      refund: {
        id: refund.id,
        amount: refundAmount,
        status: refund.status,
        reason: reason
      },
      order
    });

  } catch (error) {
    console.error('Process refund error:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return sendErrorResponse(res, 400, error.message);
    }
    
    sendErrorResponse(res, 500, 'Error processing refund');
  }
});

module.exports = router;