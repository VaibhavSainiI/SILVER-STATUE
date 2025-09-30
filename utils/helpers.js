const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Generate random token for password reset/email verification
const generateRandomToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

// Hash token
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Validate email format
const validateEmail = (email) => {
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePassword = (password) => {
  // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/;
  return passwordRegex.test(password);
};

// Validate phone number
const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        address: user.address,
        isEmailVerified: user.isEmailVerified
      }
    });
};

// Error response
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

// Success response
const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

// Parse sort query
const parseSortQuery = (sortQuery) => {
  if (!sortQuery) return { createdAt: -1 };

  const sortOptions = {};
  const sortPairs = sortQuery.split(',');

  sortPairs.forEach(pair => {
    const [field, order] = pair.split(':');
    sortOptions[field] = order === 'desc' ? -1 : 1;
  });

  return sortOptions;
};

// Parse filter query
const parseFilterQuery = (query) => {
  const filter = {};
  
  // Price range
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = parseFloat(query.minPrice);
    if (query.maxPrice) filter.price.$lte = parseFloat(query.maxPrice);
  }

  // Category
  if (query.category) {
    filter.category = { $in: query.category.split(',') };
  }

  // Rating
  if (query.minRating) {
    filter['rating.average'] = { $gte: parseFloat(query.minRating) };
  }

  // In stock
  if (query.inStock === 'true') {
    filter['stock.isInStock'] = true;
  }

  // Featured
  if (query.featured === 'true') {
    filter.isFeatured = true;
  }

  // New arrivals
  if (query.newArrival === 'true') {
    filter.isNewArrival = true;
  }

  // Active products only (unless admin)
  filter.isActive = true;

  return filter;
};

// Pagination helper
const getPaginationData = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(total / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems: total,
    skip,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
};

// Generate SKU
const generateSKU = (name, category) => {
  const namePrefix = name.substring(0, 3).toUpperCase();
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${namePrefix}${categoryPrefix}${timestamp}${random}`;
};

// Sanitize search query
const sanitizeSearchQuery = (query) => {
  if (!query) return '';
  
  // Remove special regex characters
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
};

module.exports = {
  generateToken,
  generateRandomToken,
  hashToken,
  validateEmail,
  validatePassword,
  validatePhone,
  sendTokenResponse,
  sendErrorResponse,
  sendSuccessResponse,
  parseSortQuery,
  parseFilterQuery,
  getPaginationData,
  generateSKU,
  sanitizeSearchQuery
};