@echo off
title Allegro AI - Network Troubleshooting

echo.
echo ================================================
echo    Allegro AI - Network Troubleshooting
echo ================================================
echo.

:: ── Check Node.js ───────────────────────────────
echo [INFO] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [FAIL] Node.js not found!
    echo.
    echo Please install Node.js from:
    echo   https://nodejs.org  (Download LTS version)
    echo.
    echo After installing, close this window and run start.bat again.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [ OK ] Node.js %NODE_VER%

:: ── Check npm ───────────────────────────────────
echo [INFO] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] npm not found - please reinstall Node.js
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo [ OK ] npm v%NPM_VER%

:: ── Go to app folder ────────────────────────────
cd /d "%~dp0..\app"
echo [ OK ] Working directory: %CD%

:: ── npm install ─────────────────────────────────
echo.
echo [INFO] Installing dependencies (first run may take a few minutes)...
echo.
npm install
if errorlevel 1 (
    echo.
    echo [FAIL] npm install failed!
    echo.
    echo Common fix: Install Visual Studio Build Tools
    echo   https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo   Select: "Desktop development with C++"
    echo.
    pause
    exit /b 1
)
echo.
echo [ OK ] Dependencies installed

:: ── Create .env.local if not exists ─────────────
if not exist ".env.local" (
    echo [INFO] Creating .env.local...
    (
        echo # Gemini API Key - get free key from https://aistudio.google.com
        echo GEMINI_API_KEY=
        echo.
        echo NEXTAUTH_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
    ) > .env.local
    echo [ OK ] Created .env.local
    echo [WARN] Add your GEMINI_API_KEY in app\.env.local or via Settings page
) else (
    echo [ OK ] .env.local already exists
)

:: ── Start server ────────────────────────────────
echo.
echo ================================================
echo   Ready! Starting server...
echo   Open browser: http://localhost:3000
echo   Press Ctrl+C to stop
echo ================================================
echo.

npm run dev
pause
