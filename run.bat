@echo off
:: Change directory to the folder where this batch file is located
cd /d "%~dp0"

title Scout App Launcher

echo ==========================================================
echo               Scout App Development Server
echo ==========================================================
echo.

:: Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed on this system!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Check if node_modules folder exists
if not exist node_modules (
    echo [INFO] node_modules folder not found.
    echo [INFO] Installing project dependencies, please wait...
    echo.
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies! Please check your internet connection.
        echo.
        pause
        exit /b
    )
    echo [SUCCESS] Dependencies installed successfully.
    echo.
)

:: Open the browser
echo [INFO] Launching browser to http://localhost:5173...
start http://localhost:5173

:: Start the Vite development server
echo [INFO] Starting Vite development server...
echo [INFO] Press Ctrl+C in this window to stop the server.
echo ==========================================================
echo.
call npm run dev

pause
