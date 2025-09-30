# 🚀 Deployment Guide for Silver Statue E-commerce

This guide explains how to deploy the Silver Statue e-commerce platform using multiple deployment options.

## 📋 Prerequisites

Before deploying, ensure you have:
- GitHub account
- Vercel account (free)
- MongoDB Atlas account (free tier available)
- Stripe account for payments

## 🎯 Deployment Options

### Option 1: Vercel (Recommended - Full Stack)

Vercel provides the best deployment experience for full-stack Node.js applications.

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**
   ```bash
   vercel
   ```

4. **Configure Environment Variables**
   In Vercel dashboard, go to your project → Settings → Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/silver-statue-store
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=sk_live_your_stripe_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
   NODE_ENV=production
   ```

5. **Custom Domain (Optional)**
   - Go to Domains tab in Vercel dashboard
   - Add your custom domain

### Option 2: GitHub Pages (Frontend Only)

GitHub Pages is perfect for static frontend deployment.

#### Automatic Deployment:
- Push to master branch triggers automatic deployment
- GitHub Actions workflow handles the build process
- Site available at: `https://vaibhavsainii.github.io/SILVER-STATUE/`

#### Manual Setup:
1. Go to your repository on GitHub
2. Settings → Pages
3. Source: Deploy from a branch
4. Branch: gh-pages
5. Folder: / (root)

### Option 3: Netlify (Alternative)

1. **Connect Repository**
   - Go to Netlify dashboard
   - "New site from Git"
   - Connect your GitHub repository

2. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Environment Variables**
   Add the same environment variables as Vercel

## 🔧 Configuration Files

### vercel.json
Configures Vercel deployment with serverless functions and routing.

### .github/workflows/deploy.yml
GitHub Actions workflow for automated deployment to GitHub Pages.

### .env.example
Template for environment variables - copy to `.env` and fill in values.

## 🌍 Database Setup (MongoDB Atlas)

1. **Create Atlas Account**
   - Go to https://cloud.mongodb.com/
   - Create free account

2. **Create Cluster**
   - Choose free tier (M0)
   - Select region closest to your users
   - Create cluster

3. **Setup Database Access**
   - Database Access → Add New Database User
   - Choose username/password authentication
   - Grant read/write access

4. **Setup Network Access**
   - Network Access → Add IP Address
   - Add 0.0.0.0/0 for all IPs (or specific IPs)

5. **Get Connection String**
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your user password

## 💳 Stripe Setup

1. **Create Stripe Account**
   - Go to https://stripe.com/
   - Create account and verify

2. **Get API Keys**
   - Dashboard → Developers → API Keys
   - Copy Publishable key and Secret key
   - Use test keys for development, live keys for production

3. **Setup Webhooks (Optional)**
   - Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/payment/webhook`

## 🔍 Testing Deployment

### Health Check Endpoints:
- `GET /api/health` - Check server status
- `GET /api/products` - Test database connection
- `POST /api/auth/login` - Test authentication

### Test Credentials:
- Email: demo@silverstatue.com
- Password: demo123

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check Node.js version (use 18+)
   - Verify all dependencies are installed
   - Check for syntax errors

2. **Database Connection Error**
   - Verify MongoDB Atlas connection string
   - Check network access settings
   - Ensure user has proper permissions

3. **Environment Variables Not Working**
   - Check variable names (case sensitive)
   - Restart deployment after adding variables
   - Verify variables are set in deployment platform

4. **Static Files Not Loading**
   - Check file paths in HTML
   - Verify build process copies all assets
   - Check server routing configuration

## 📊 Monitoring

### Vercel Analytics
- Built-in analytics available in Vercel dashboard
- Monitor traffic, performance, and errors

### MongoDB Atlas Monitoring
- Database performance metrics
- Connection monitoring
- Alert setup for issues

## 🔄 Continuous Deployment

Both Vercel and GitHub Pages support automatic deployment:
- Push to master branch triggers new deployment
- Build process runs automatically
- Updates go live within minutes

## 📞 Support

For deployment issues:
1. Check deployment logs in your platform dashboard
2. Verify environment variables are set correctly
3. Test API endpoints manually
4. Check database connection status

## 🎉 Success!

Once deployed, your site will be available at:
- **Vercel**: `https://your-project.vercel.app`
- **GitHub Pages**: `https://vaibhavsainii.github.io/SILVER-STATUE/`
- **Custom Domain**: `https://your-domain.com`

Your full-stack Silver Statue e-commerce platform is now live! 🏛️✨