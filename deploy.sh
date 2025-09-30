#!/bin/bash

echo "🚀 Silver Statue Deployment Script"
echo ""

echo "✅ Installing dependencies..."
npm install

echo ""
echo "✅ Building application..."
npm run build

echo ""
echo "🎯 Deployment Options:"
echo "1. Deploy to Vercel (Full-Stack)"
echo "2. Deploy to GitHub Pages (Frontend Only)"  
echo "3. Both Deployments"
echo ""

read -p "Choose deployment option (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to Vercel..."
        npx vercel --prod
        ;;
    2)
        echo ""
        echo "🚀 Deploying to GitHub Pages..."
        git add .
        git commit -m "Deploy to GitHub Pages"
        git push origin master
        echo "✅ GitHub Pages deployment triggered!"
        ;;
    3)
        echo ""
        echo "🚀 Deploying to both platforms..."
        npx vercel --prod
        git add .
        git commit -m "Deploy to all platforms"
        git push origin master
        echo "✅ Both deployments triggered!"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🌐 Your sites will be available at:"
echo "  - Vercel: https://silver-statue-store.vercel.app"
echo "  - GitHub Pages: https://vaibhavsainii.github.io/SILVER-STATUE/"
echo ""