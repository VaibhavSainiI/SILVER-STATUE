const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendErrorResponse, sendSuccessResponse } = require('../utils/helpers');

const router = express.Router();

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist/:productId
// @access  Private
router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    // Check if product already in wishlist
    if (user.wishlist.includes(productId)) {
      return sendErrorResponse(res, 400, 'Product already in wishlist');
    }

    user.wishlist.push(productId);
    await user.save();

    await user.populate('wishlist');

    sendSuccessResponse(res, 200, 'Product added to wishlist', { wishlist: user.wishlist });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 400, 'Invalid product ID');
    }
    sendErrorResponse(res, 500, 'Error adding to wishlist');
  }
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
router.delete('/wishlist/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();

    await user.populate('wishlist');

    sendSuccessResponse(res, 200, 'Product removed from wishlist', { wishlist: user.wishlist });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 400, 'Invalid product ID');
    }
    sendErrorResponse(res, 500, 'Error removing from wishlist');
  }
});

// @desc    Get user's wishlist
// @route   GET /api/users/wishlist
// @access  Private
router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      match: { isActive: true },
      select: '-reviews -createdBy -updatedBy'
    });

    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    sendSuccessResponse(res, 200, 'Wishlist retrieved successfully', { wishlist: user.wishlist });
  } catch (error) {
    console.error('Get wishlist error:', error);
    sendErrorResponse(res, 500, 'Error retrieving wishlist');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist', 'name price images');

    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }

    sendSuccessResponse(res, 200, 'Profile retrieved successfully', { user });
  } catch (error) {
    console.error('Get profile error:', error);
    sendErrorResponse(res, 500, 'Error retrieving profile');
  }
});

module.exports = router;