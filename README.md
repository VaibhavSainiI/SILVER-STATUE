# 🏛️ Silver Statue - Luxury E-commerce Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.18+-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A premium e-commerce platform for luxury silver statues featuring a complete full-stack architecture with modern web technologies.

## 🌟 Features

### Frontend
- **Responsive Design**: Mobile-first approach with elegant UI/UX
- **Custom Cursor**: Interactive golden cursor with hover effects
- **Product Catalog**: Dynamic product display with filtering and search
- **Shopping Cart**: Full cart functionality with quantity management
- **Quick Buy**: Streamlined 30-second checkout process
- **User Authentication**: Secure login/register system
- **Modal System**: Enhanced modal interactions
- **PDF Integration**: Products extracted from PDF catalog

### Backend
- **RESTful API**: Complete API endpoints for all operations
- **Authentication**: JWT-based secure authentication
- **Database**: MongoDB with Mongoose ODM
- **Payment Processing**: Stripe integration for secure payments
- **Admin Dashboard**: Order and product management
- **Error Handling**: Comprehensive error management
- **Security**: CORS, helmet, and rate limiting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/VaibhavSainiI/SILVER-STATUE.git
   cd SILVER-STATUE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/silver-statue-store
   JWT_SECRET=your_jwt_secret_here
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   ```

4. **Seed the database**
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

## 🌐 Live Demo

### 🎯 Deployed Sites:
- **Full-Stack (Vercel)**: https://silver-statue-store.vercel.app
- **Frontend (GitHub Pages)**: https://vaibhavsainii.github.io/SILVER-STATUE/

### 🔗 Quick Links:
- **Repository**: https://github.com/VaibhavSainiI/SILVER-STATUE
- **API Health Check**: https://silver-statue-store.vercel.app/api/health
- **Product Catalog**: https://silver-statue-store.vercel.app/pages/catalog.html

## 📦 Deployment

### One-Click Deploy to Vercel:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/VaibhavSainiI/SILVER-STATUE)

### Manual Deployment:
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions including:
- Vercel deployment (full-stack)
- GitHub Pages deployment (frontend)
- Environment variable configuration
- Database setup with MongoDB Atlas

## 📁 Project Structure

```
silver-statue-store/
├── 📂 css/                    # Stylesheets
│   ├── styles.css            # Main styles
│   └── catalog.css           # Catalog specific styles
├── 📂 js/                     # Frontend JavaScript
│   ├── main.js               # Core functionality
│   ├── catalog.js            # Catalog features
│   ├── auth.js               # Authentication
│   ├── api.js                # API communication
│   └── quick-buy.js          # Quick buy feature
├── 📂 images/                 # Product images (300+)
├── 📂 pages/                  # HTML pages
├── 📂 models/                 # Database models
│   ├── User.js               # User model
│   ├── Product.js            # Product model
│   ├── Order.js              # Order model
│   └── Cart.js               # Cart model
├── 📂 routes/                 # API routes
│   ├── auth.js               # Authentication routes
│   ├── products.js           # Product routes
│   ├── orders.js             # Order routes
│   ├── cart.js               # Cart routes
│   └── admin.js              # Admin routes
├── 📂 middleware/             # Custom middleware
├── 📂 scripts/                # Utility scripts
├── server.js                 # Main server file
└── package.json              # Dependencies
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/category/:category` - Get products by category

### Cart & Orders
- `GET /api/cart` - Get user cart
- `POST /api/cart/add` - Add item to cart
- `POST /api/orders` - Create new order
- `POST /api/orders/quick-buy` - Quick buy order

### Admin
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id` - Update order status

## 🎨 Features in Detail

### Custom Cursor System
- Interactive golden cursor with smooth animations
- Hover effects on interactive elements
- Fallback system for touch devices
- Z-index management for modals

### Quick Buy Feature
- 30-second streamlined checkout
- Guest and authenticated user support
- Real-time stock validation
- Integrated payment processing

### Product Management
- PDF catalog integration with 300+ products
- Dynamic image galleries
- Category-based filtering
- Search functionality

### Security Features
- JWT token authentication
- Password hashing with bcrypt
- CORS configuration
- Rate limiting
- Input validation

## 🔧 Configuration

### MongoDB Setup
- **Local MongoDB**: Install and run MongoDB locally
- **MongoDB Atlas**: Use cloud MongoDB service
- Update `MONGODB_URI` in `.env` file

### Stripe Payment Setup
1. Create a Stripe account
2. Get API keys from Stripe dashboard
3. Add keys to `.env` file
4. Test with Stripe test cards

## 🎯 Demo Credentials

For testing purposes:
- **Email**: demo@silverstatue.com
- **Password**: demo123

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📋 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm run seed` - Seed database with sample data
- `npm test` - Run tests (if available)

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`

2. **Port Already in Use**
   - Change PORT in `.env` file
   - Kill existing Node processes

3. **Cursor Not Visible**
   - Check browser console for errors
   - Ensure JavaScript is enabled

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Vaibhav Saini**
- GitHub: [@VaibhavSainiI](https://github.com/VaibhavSainiI)

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- MongoDB team for the database solution
- Stripe for payment processing
- All contributors and testers

---

⭐ **If you found this project helpful, please give it a star!** ⭐