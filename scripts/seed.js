require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');

// Import your existing product data
const pdfProducts = [
  {
    name: "Vigneshwara Lord Ganesha Silver Statue",
    description: "Exquisite handcrafted silver statue of Lord Ganesha, the remover of obstacles. Perfect for home temples and spiritual decoration.",
    shortDescription: "Handcrafted silver Ganesha statue with intricate details",
    price: 999,
    category: "ganesh",
    tags: ["ganesha", "lord", "religious", "silver", "handcrafted"],
    images: [
      { url: "/images/extracted_images/page_1_img_1.jpg", alt: "Ganesha Silver Statue", isPrimary: true }
    ],
    specifications: {
      weight: { value: 575, unit: "g" },
      dimensions: { length: 8, width: 6, height: 12, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "Polished",
      craftedBy: "Master Artisans"
    },
    stock: { quantity: 15, lowStockThreshold: 3, isInStock: true },
    isFeatured: true,
    isNewArrival: true
  },
  {
    name: "Royal Elephant Pair Silver Statue",
    description: "Magnificent pair of silver elephants symbolizing prosperity and good fortune. Ideal for office and home decoration.",
    shortDescription: "Royal elephant pair in premium silver finish",
    price: 5999,
    category: "elephant",
    tags: ["elephant", "royal", "pair", "prosperity", "decorative"],
    images: [
      { url: "/images/extracted_images/page_2_img_1.jpg", alt: "Royal Elephant Pair", isPrimary: true }
    ],
    specifications: {
      weight: { value: 2700, unit: "g" },
      dimensions: { length: 15, width: 10, height: 18, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "Antique Polished",
      craftedBy: "Royal Craftsmen"
    },
    stock: { quantity: 8, lowStockThreshold: 2, isInStock: true },
    isFeatured: true,
    isNewArrival: false
  },
  {
    name: "Krishna Flute Silver Statue",
    description: "Beautiful silver statue of Lord Krishna playing his divine flute. Captures the essence of divine music and love.",
    shortDescription: "Lord Krishna with flute in elegant silver",
    price: 2999,
    category: "krishna",
    tags: ["krishna", "flute", "divine", "music", "religious"],
    images: [
      { url: "/images/extracted_images/page_3_img_1.jpg", alt: "Krishna Flute Statue", isPrimary: true }
    ],
    specifications: {
      weight: { value: 1250, unit: "g" },
      dimensions: { length: 10, width: 8, height: 20, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "Matt & Polished",
      craftedBy: "Devotional Artisans"
    },
    stock: { quantity: 12, lowStockThreshold: 3, isInStock: true },
    isFeatured: true,
    isNewArrival: true
  },
  {
    name: "Goddess Lakshmi Silver Statue",
    description: "Sacred silver statue of Goddess Lakshmi, the deity of wealth and prosperity. Brings blessings to your home.",
    shortDescription: "Goddess Lakshmi in pure silver craftsmanship",
    price: 3599,
    category: "lakshmi",
    tags: ["lakshmi", "goddess", "wealth", "prosperity", "sacred"],
    images: [
      { url: "/images/extracted_images/page_4_img_1.jpg", alt: "Lakshmi Silver Statue", isPrimary: true }
    ],
    specifications: {
      weight: { value: 1450, unit: "g" },
      dimensions: { length: 9, width: 7, height: 16, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "High Polish",
      craftedBy: "Temple Artisans"
    },
    stock: { quantity: 10, lowStockThreshold: 2, isInStock: true },
    isFeatured: false,
    isNewArrival: true
  },
  {
    name: "Traditional Peacock Silver Statue",
    description: "Elegant silver peacock statue representing beauty and grace. Perfect decorative piece for modern homes.",
    shortDescription: "Beautiful peacock in intricate silver work",
    price: 1899,
    category: "decorative",
    tags: ["peacock", "traditional", "beauty", "grace", "decorative"],
    images: [
      { url: "/images/extracted_images/page_5_img_1.jpg", alt: "Peacock Silver Statue", isPrimary: true }
    ],
    specifications: {
      weight: { value: 850, unit: "g" },
      dimensions: { length: 12, width: 8, height: 14, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "Textured Polish",
      craftedBy: "Design Masters"
    },
    stock: { quantity: 20, lowStockThreshold: 5, isInStock: true },
    isFeatured: false,
    isNewArrival: false
  },
  {
    name: "Lord Hanuman Silver Statue",
    description: "Powerful silver statue of Lord Hanuman, symbol of strength and devotion. Ideal for worship and protection.",
    shortDescription: "Mighty Hanuman in premium silver",
    price: 2499,
    category: "religious",
    tags: ["hanuman", "strength", "devotion", "protection", "religious"],
    images: [
      { url: "/images/extracted_images/page_6_img_1.jpg", alt: "Hanuman Silver Statue", isPrimary: true }
    ],
    specifications: {
      weight: { value: 1100, unit: "g" },
      dimensions: { length: 8, width: 6, height: 18, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "Warrior Polish",
      craftedBy: "Devotional Masters"
    },
    stock: { quantity: 14, lowStockThreshold: 3, isInStock: true },
    isFeatured: true,
    isNewArrival: false
  },
  {
    name: "Sacred Om Silver Statue",
    description: "Divine Om symbol in pure silver, representing the universal sound. Essential for meditation and spiritual practice.",
    shortDescription: "Sacred Om symbol in pure silver",
    price: 799,
    category: "religious",
    tags: ["om", "sacred", "meditation", "spiritual", "symbol"],
    images: [
      { url: "/images/extracted_images/page_7_img_1.jpg", alt: "Om Silver Statue", isPrimary: true }
    ],
    specifications: {
      weight: { value: 425, unit: "g" },
      dimensions: { length: 6, width: 4, height: 8, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "Mirror Polish",
      craftedBy: "Spiritual Artisans"
    },
    stock: { quantity: 25, lowStockThreshold: 5, isInStock: true },
    isFeatured: false,
    isNewArrival: true
  },
  {
    name: "Royal Swan Pair Silver Statue",
    description: "Graceful swan pair in silver, symbolizing love and fidelity. Beautiful centerpiece for elegant interiors.",
    shortDescription: "Elegant swan pair in silver craftsmanship",
    price: 3299,
    category: "decorative",
    tags: ["swan", "pair", "love", "fidelity", "elegant"],
    images: [
      { url: "/images/extracted_images/page_8_img_1.jpg", alt: "Swan Pair Silver Statue", isPrimary: true }
    ],
    specifications: {
      weight: { value: 1650, unit: "g" },
      dimensions: { length: 14, width: 9, height: 12, unit: "cm" },
      material: "925 Sterling Silver",
      purity: "99.9% Pure Silver",
      finish: "Satin Polish",
      craftedBy: "Luxury Craftsmen"
    },
    stock: { quantity: 9, lowStockThreshold: 2, isInStock: true },
    isFeatured: false,
    isNewArrival: false
  }
];

const generateSKU = (name, category) => {
  const namePrefix = name.substring(0, 3).toUpperCase();
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${namePrefix}${categoryPrefix}${timestamp}${random}`;
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/silver-statue-store');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('🗑️ Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: process.env.ADMIN_EMAIL || 'admin@silverstatues.com',
      password: process.env.ADMIN_PASSWORD || 'AdminPassword123!',
      role: 'admin',
      isEmailVerified: true,
      phone: '+919876543210',
      address: {
        street: '123 Admin Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      }
    });
    console.log('👤 Created admin user:', adminUser.email);

    // Create test user
    const testUser = await User.create({
      firstName: 'Test',
      lastName: 'Customer',
      email: 'customer@test.com',
      password: 'TestPassword123!',
      role: 'user',
      isEmailVerified: true,
      phone: '+919876543211',
      address: {
        street: '456 Customer Lane',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India'
      }
    });
    console.log('👤 Created test user:', testUser.email);

    // Create products
    const productsToCreate = pdfProducts.map(product => ({
      ...product,
      sku: generateSKU(product.name, product.category),
      createdBy: adminUser._id,
      rating: {
        average: Math.random() * 2 + 3, // Random rating between 3-5
        count: Math.floor(Math.random() * 20) + 5 // Random count between 5-25
      }
    }));

    const createdProducts = await Product.create(productsToCreate);
    console.log(`📦 Created ${createdProducts.length} products`);

    // Add some sample reviews
    for (const product of createdProducts.slice(0, 4)) {
      const reviews = [
        {
          user: testUser._id,
          rating: 5,
          comment: 'Excellent quality and craftsmanship. Highly recommended!',
          isVerifiedPurchase: true,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        },
        {
          user: adminUser._id,
          rating: 4,
          comment: 'Beautiful piece, fast delivery. Very satisfied with the purchase.',
          isVerifiedPurchase: false,
          createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
        }
      ];

      product.reviews = reviews;
      product.updateRating();
      await product.save();
    }
    console.log('⭐ Added sample reviews');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👥 Users created: 2`);
    console.log(`📦 Products created: ${createdProducts.length}`);
    console.log(`⭐ Reviews added: 8`);
    console.log('\n🔐 Login credentials:');
    console.log(`Admin: ${adminUser.email} / ${process.env.ADMIN_PASSWORD || 'AdminPassword123!'}`);
    console.log(`Customer: ${testUser.email} / TestPassword123!`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
    process.exit();
  }
};

// Run if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;