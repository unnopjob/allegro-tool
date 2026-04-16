@echo off
title Allegro AI - Setup
echo.
echo ================================================
echo    Allegro AI - Network Troubleshooting
echo ================================================
echo.

:: Refresh PATH
for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "PATH=%%a %%b"
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"

echo [CHECK] Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  Node.js not found! Please install it:
    echo  1. A browser will open now
    echo  2. Download Node.js LTS (left button)
    echo  3. Install it, then run this file again
    echo.
    pause
    start "" "https://nodejs.org"
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [ OK ] Node.js %NODE_VER%
echo.

cd /d "%~dp0..\app"

echo [INFO] Installing packages...
call npm install
if errorlevel 1 (
    echo [FAIL] npm install failed. Please restart and try again.
    pause
    exit /b 1
)

if not exist ".env.local" (
    (
        echo GEMINI_API_KEY=
        echo NEXTAUTH_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
    ) > .env.local
)

echo.
echo ================================================
echo   Open browser: http://localhost:3000
echo   Press Ctrl+C to stop
echo ================================================
echo.
call npm run dev
pause
