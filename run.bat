@echo off
setlocal enabledelayedexpansion

:: Change directory to the folder where this batch file is located
cd /d "%~dp0"

title Digital Scout Camp Full-Stack Launcher

:: Ensure Node.js and System32 are in PATH
set "PATH=%PATH%;C:\Windows\System32;C:\Program Files\nodejs;%LocalAppData%\Programs\nodejs;%AppData%\nvm"

echo ==========================================================
echo           Digital Scout Camp - Full Stack Server
echo ==========================================================
echo.

:: Check if Node.js is available
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please ensure Node.js is installed from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Step 1: Prepare Server (Backend)
echo [1/3] Checking Backend Server Setup...
if not exist "server\node_modules" (
    echo [INFO] Installing backend server dependencies...
    cd /d "%~dp0server"
    call npm install
    cd /d "%~dp0"
)

:: Push database schema & seed if needed
if not exist "server\prisma\dev.db" (
    echo [INFO] Initializing local SQLite database and seeding default data...
    cd /d "%~dp0server"
    call npx prisma db push
    call npm run seed
    cd /d "%~dp0"
)

:: Start Backend in a separate window
echo [INFO] Launching Backend Express and Socket.IO server on port 5000...
start "Digital Scout Camp Backend Server (Port 5000)" cmd /k "cd /d "%~dp0server" && set "PATH=%%PATH%%;C:\Windows\System32;C:\Program Files\nodejs;%LocalAppData%\Programs\nodejs;%AppData%\nvm" && npm run dev"

:: Step 2: Prepare Frontend
echo.
echo [2/3] Checking Frontend Setup...
if not exist "node_modules\lucide-react\dist\esm\icons\shopping-cart.js" (
    echo [INFO] Repairing corrupted lucide-react package...
    if exist "node_modules\lucide-react" rd /s /q "node_modules\lucide-react" >nul 2>&1
    call npm install lucide-react@^0.395.0 --save
)

if exist "node_modules\.vite" (
    rd /s /q "node_modules\.vite" >nul 2>&1
)

:: Step 3: Launch Browser & Frontend Server
echo.
echo [3/3] Launching Browser and Vite Frontend Server...
echo [INFO] Opening http://localhost:5173 ...
ping 127.0.0.1 -n 3 >nul
start http://localhost:5173

echo ==========================================================
echo Backend Server:  http://localhost:5000 (Running in second window)
echo Frontend Server: http://localhost:5173 (Running below)
echo Press Ctrl+C in these windows to stop the servers.
echo ==========================================================
echo.

call npm run dev

pause
