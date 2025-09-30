@echo off
echo Starting Silver Statue Store Backend...
echo.

REM Check if MongoDB is running
echo Checking MongoDB connection...
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/silver-statue-store').then(() => { console.log('MongoDB connected successfully'); process.exit(0); }).catch(() => { console.log('Please make sure MongoDB is running on localhost:27017'); process.exit(1); });"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Cannot connect to MongoDB
    echo Please ensure MongoDB is installed and running on localhost:27017
    echo.
    echo To install MongoDB:
    echo 1. Download from https://www.mongodb.com/try/download/community
    echo 2. Install and start the service
    echo 3. Or use MongoDB Atlas cloud database
    echo.
    pause
    exit /b 1
)

echo.
echo Seeding database with sample data...
npm run seed

echo.
echo Starting the server...
npm run dev