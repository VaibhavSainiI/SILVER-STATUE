const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productSnapshot: {
    name: { type: String, required: true },
    description: String,
    images: [String],
    specifications: {
      weight: {
        value: Number,
        unit: String
      },
      material: String,
      purity: String
    }
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  orderSummary: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    shipping: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    }
  },
  shippingAddress: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    apartment: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'India' },
    instructions: String
  },
  billingAddress: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    street: String,
    apartment: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    sameAsShipping: { type: Boolean, default: true }
  },
  paymentDetails: {
    method: {
      type: String,
      required: true,
      enum: ['stripe', 'razorpay', 'paypal', 'cod'],
      default: 'stripe'
    },
    transactionId: String,
    paymentIntentId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    paidAt: Date,
    refundAmount: {
      type: Number,
      default: 0
    },
    refundReason: String
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  tracking: {
    carrier: String,
    trackingNumber: String,
    trackingUrl: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  timeline: [{
    status: {
      type: String,
      required: true
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notes: {
    customerNotes: String,
    adminNotes: String,
    internalNotes: String
  },
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: String,
  cancellation: {
    reason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundProcessed: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ 'paymentDetails.status': 1 });
orderSchema.index({ createdAt: -1 });

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `SS${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Add timeline entry
orderSchema.methods.addTimelineEntry = function(status, message, updatedBy) {
  this.timeline.push({
    status,
    message,
    timestamp: new Date(),
    updatedBy
  });
  this.orderStatus = status;
  return this.save();
};

// Update order status
orderSchema.methods.updateStatus = function(newStatus, message, updatedBy) {
  const statusTransitions = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['out_for_delivery', 'delivered'],
    'out_for_delivery': ['delivered'],
    'delivered': ['returned'],
    'cancelled': [],
    'returned': []
  };

  const allowedTransitions = statusTransitions[this.orderStatus] || [];
  
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Cannot transition from ${this.orderStatus} to ${newStatus}`);
  }

  this.orderStatus = newStatus;
  this.addTimelineEntry(newStatus, message, updatedBy);

  // Update specific timestamps
  switch (newStatus) {
    case 'shipped':
      this.tracking.shippedAt = new Date();
      break;
    case 'delivered':
      this.tracking.deliveredAt = new Date();
      break;
    case 'cancelled':
      this.cancellation.cancelledAt = new Date();
      this.cancellation.cancelledBy = updatedBy;
      break;
  }

  return this.save();
};

// Calculate order summary
orderSchema.methods.calculateTotals = function() {
  this.orderSummary.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  // Calculate tax (18% GST for India)
  this.orderSummary.tax = Math.round(this.orderSummary.subtotal * 0.18);
  
  // Free shipping for orders above ₹2000
  this.orderSummary.shipping = this.orderSummary.subtotal >= 2000 ? 0 : 200;
  
  // Calculate final total
  this.orderSummary.total = this.orderSummary.subtotal + this.orderSummary.tax + this.orderSummary.shipping - this.orderSummary.discount;
};

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // days
});

// Virtual for total items
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Ensure virtual fields are included in JSON output
orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Order', orderSchema);