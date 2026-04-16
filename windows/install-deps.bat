@echo off
title Allegro AI - Setup Check
echo.
echo ================================================
echo    Allegro AI - Setup Check
echo ================================================
echo.

:: Refresh PATH to pick up recently installed software
for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "PATH=%%a %%b"
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"

:: ────────────────────────────────────────────────
:: CHECK NODE.JS
:: ────────────────────────────────────────────────
echo [1/2] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo [FAIL] Node.js not found!
    echo.
    echo  Please install Node.js:
    echo  1. A browser window will open now
    echo  2. Click "Download Node.js LTS"  ^(left button^)
    echo  3. Run the installer, click Next until done
    echo  4. CLOSE this window
    echo  5. Run install-deps.bat again
    echo.
    pause
    start "" "https://nodejs.org"
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [ OK ] Node.js %NODE_VER%

:: ────────────────────────────────────────────────
:: CHECK BUILD TOOLS
:: ────────────────────────────────────────────────
echo [2/2] Checking Visual Studio Build Tools...
set BUILD_OK=0
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" set BUILD_OK=1
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" set BUILD_OK=1
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC\Tools\MSVC" set BUILD_OK=1
where cl.exe >nul 2>&1
if not errorlevel 1 set BUILD_OK=1

if %BUILD_OK%==0 (
    echo.
    echo [FAIL] Visual Studio Build Tools not found!
    echo.
    echo  Please install Build Tools:
    echo  1. A browser window will open now
    echo  2. Click "Download Build Tools"
    echo  3. Run the installer
    echo  4. Check "Desktop development with C++"
    echo  5. Click Install and wait ^(~10 min^)
    echo  6. CLOSE this window
    echo  7. Run install-deps.bat again
    echo.
    pause
    start "" "https://visualstudio.microsoft.com/visual-cpp-build-tools/"
    exit /b 1
)
echo [ OK ] Build Tools found

:: ────────────────────────────────────────────────
:: ALL GOOD - RUN APP
:: ────────────────────────────────────────────────
echo.
echo [ OK ] All dependencies ready!
echo.
cd /d "%~dp0..\app"

echo [INFO] Installing npm packages...
call npm install
if errorlevel 1 (
    echo.
    echo [FAIL] npm install failed.
    echo        Try restarting your PC and run this file again.
    echo.
    pause
    exit /b 1
)

if not exist ".env.local" (
    (
        echo GEMINI_API_KEY=
        echo NEXTAUTH_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
    ) > .env.local
    echo [ OK ] Created .env.local
)

echo.
echo ================================================
echo   Ready!  Open: http://localhost:3000
echo   Press Ctrl+C to stop
echo ================================================
echo.
call npm run dev
pause
