@echo off
echo 🚀 Silver Statue Deployment Script
echo.

echo ✅ Installing dependencies...
call npm install

echo.
echo ✅ Building application...
call npm run build

echo.
echo 🎯 Deployment Options:
echo 1. Deploy to Vercel (Full-Stack)
echo 2. Deploy to GitHub Pages (Frontend Only)
echo 3. Both Deployments
echo.

set /p choice="Choose deployment option (1-3): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Deploying to Vercel...
    call npx vercel --prod
) else if "%choice%"=="2" (
    echo.
    echo 🚀 Deploying to GitHub Pages...
    call git add .
    call git commit -m "Deploy to GitHub Pages"
    call git push origin master
    echo ✅ GitHub Pages deployment triggered!
) else if "%choice%"=="3" (
    echo.
    echo 🚀 Deploying to both platforms...
    call npx vercel --prod
    call git add .
    call git commit -m "Deploy to all platforms"
    call git push origin master
    echo ✅ Both deployments triggered!
) else (
    echo ❌ Invalid choice. Please run the script again.
    pause
    exit
)

echo.
echo ✅ Deployment completed!
echo.
echo 🌐 Your sites will be available at:
echo   - Vercel: https://silver-statue-store.vercel.app
echo   - GitHub Pages: https://vaibhavsainii.github.io/SILVER-STATUE/
echo.
pause