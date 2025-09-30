const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect, authRateLimit } = require('../middleware/auth');
const {
  sendTokenResponse,
  sendErrorResponse,
  sendSuccessResponse,
  validateEmail,
  validatePassword,
  generateRandomToken,
  hashToken
} = require('../utils/helpers');

const router = express.Router();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  authRateLimit,
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be between 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { firstName, lastName, email, password, phone } = req.body;

    // Additional password validation
    if (!validatePassword(password)) {
      return sendErrorResponse(res, 400, 'Password must contain at least 6 characters with 1 uppercase, 1 lowercase, and 1 number');
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(res, 400, 'User already exists with this email');
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone
    });

    // Generate email verification token
    const verificationToken = generateRandomToken();
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    // TODO: Send verification email
    console.log(`Verification token for ${email}: ${verificationToken}`);

    sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    console.error('Registration error:', error);
    sendErrorResponse(res, 500, 'Error registering user');
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  authRateLimit,
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return sendErrorResponse(res, 401, 'Invalid credentials');
    }

    if (!user.isActive) {
      return sendErrorResponse(res, 401, 'Account is deactivated');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return sendErrorResponse(res, 401, 'Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    sendErrorResponse(res, 500, 'Error logging in');
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    sendSuccessResponse(res, 200, 'User data retrieved', { user });
  } catch (error) {
    console.error('Get user error:', error);
    sendErrorResponse(res, 500, 'Error getting user data');
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', [
  protect,
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().isMobilePhone(),
  body('address.street').optional().trim().isLength({ max: 200 }),
  body('address.city').optional().trim().isLength({ max: 100 }),
  body('address.state').optional().trim().isLength({ max: 100 }),
  body('address.zipCode').optional().trim().isLength({ max: 20 }),
  body('address.country').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { firstName, lastName, phone, address } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = { ...req.user.address, ...address };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    sendSuccessResponse(res, 200, 'Profile updated successfully', { user });
  } catch (error) {
    console.error('Update profile error:', error);
    sendErrorResponse(res, 500, 'Error updating profile');
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', [
  protect,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendErrorResponse(res, 400, 'Current password is incorrect');
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      return sendErrorResponse(res, 400, 'New password must contain at least 6 characters with 1 uppercase, 1 lowercase, and 1 number');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    sendSuccessResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    sendErrorResponse(res, 500, 'Error changing password');
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  authRateLimit,
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendErrorResponse(res, 404, 'User not found with this email');
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // TODO: Send reset email
    console.log(`Reset token for ${email}: ${resetToken}`);

    sendSuccessResponse(res, 200, 'Password reset email sent');
  } catch (error) {
    console.error('Forgot password error:', error);
    sendErrorResponse(res, 500, 'Error sending password reset email');
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
router.put('/reset-password/:resettoken', [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendErrorResponse(res, 400, 'Validation failed', errors.array());
    }

    const { password } = req.body;

    // Get hashed token
    const resetPasswordToken = hashToken(req.params.resettoken);

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return sendErrorResponse(res, 400, 'Invalid or expired reset token');
    }

    // Validate new password
    if (!validatePassword(password)) {
      return sendErrorResponse(res, 400, 'Password must contain at least 6 characters with 1 uppercase, 1 lowercase, and 1 number');
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password reset successful');
  } catch (error) {
    console.error('Reset password error:', error);
    sendErrorResponse(res, 500, 'Error resetting password');
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    sendSuccessResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    sendErrorResponse(res, 500, 'Error logging out');
  }
});

module.exports = router;