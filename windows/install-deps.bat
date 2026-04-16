@echo off
title Allegro AI - Install Dependencies
echo.
echo ================================================
echo    Allegro AI - Install Required Dependencies
echo ================================================
echo.

:: Must run as Administrator
net session >nul 2>&1
if errorlevel 1 (
    echo [WARN] Not running as Administrator.
    echo        Right-click install-deps.bat ^> "Run as administrator"
    echo.
    pause
    exit /b 1
)

:: ────────────────────────────────────────────────
:: REFRESH PATH FROM REGISTRY (in case Node was just installed)
:: ────────────────────────────────────────────────
call :RefreshPath

set NODE_INSTALLED=0
set BUILD_INSTALLED=0

:: ── Check Node.js ────────────────────────────────
echo [CHECK] Node.js...
node --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo [ OK ]  Node.js %NODE_VER% is already installed
    set NODE_INSTALLED=1
) else (
    echo [MISS]  Node.js not found - will install
)

:: ── Check Build Tools ────────────────────────────
echo [CHECK] Visual Studio Build Tools...
if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" (
    echo [ OK ]  Visual Studio Build Tools 2022 already installed
    set BUILD_INSTALLED=1
) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC" (
    echo [ OK ]  Visual Studio Build Tools 2022 already installed
    set BUILD_INSTALLED=1
) else (
    where cl.exe >nul 2>&1
    if not errorlevel 1 (
        echo [ OK ]  C++ compiler found
        set BUILD_INSTALLED=1
    ) else (
        echo [MISS]  Visual Studio Build Tools not found - will install
    )
)

echo.

:: ── All installed already ────────────────────────
if %NODE_INSTALLED%==1 if %BUILD_INSTALLED%==1 (
    echo ================================================
    echo   All dependencies are already installed!
    echo ================================================
    echo.
    echo Starting app now...
    echo.
    goto :StartApp
)

:: ── Confirm ──────────────────────────────────────
echo Will install:
if %NODE_INSTALLED%==0  echo   [1] Node.js v22 LTS
if %BUILD_INSTALLED%==0 echo   [2] Visual Studio Build Tools 2022
echo.
echo This may take 10-20 minutes.
echo.
set /p CONFIRM=Continue? (Y/n):
if /i "%CONFIRM%"=="n" goto :EOF
if /i "%CONFIRM%"=="no" goto :EOF
echo.

:: ────────────────────────────────────────────────
:: INSTALL NODE.JS
:: ────────────────────────────────────────────────
if %NODE_INSTALLED%==0 (
    echo ================================================
    echo   [1/2] Installing Node.js v22 LTS...
    echo ================================================
    echo.

    set NODE_MSI=%TEMP%\node-v22-x64.msi
    set NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi

    echo [INFO] Downloading Node.js... (about 30MB)
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12,Tls13'; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' -UseBasicParsing"
    if errorlevel 1 (
        echo [FAIL] Download failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo [ OK ] Downloaded

    echo [INFO] Installing Node.js (a progress window will appear)...
    msiexec /i "%NODE_MSI%" /passive ADDLOCAL=ALL
    if errorlevel 1 (
        echo [FAIL] Installation failed. Try running the MSI manually: %NODE_MSI%
        pause
        exit /b 1
    )
    del "%NODE_MSI%" >nul 2>&1

    :: Refresh PATH so node is available immediately
    call :RefreshPath

    node --version >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Node.js installed but not in PATH yet.
        echo        Close this window, open a new one, then run start.bat
        pause
        exit /b 0
    )
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo [ OK ] Node.js %NODE_VER% installed successfully!
    echo.
)

:: ────────────────────────────────────────────────
:: INSTALL VISUAL STUDIO BUILD TOOLS
:: ────────────────────────────────────────────────
if %BUILD_INSTALLED%==0 (
    echo ================================================
    echo   [2/2] Installing Visual Studio Build Tools...
    echo   (Required for SQLite compilation)
    echo ================================================
    echo.

    set VS_EXE=%TEMP%\vs_buildtools.exe
    set VS_URL=https://aka.ms/vs/17/release/vs_buildtools.exe

    echo [INFO] Downloading Build Tools installer... (about 4MB)
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12,Tls13'; Invoke-WebRequest -Uri '%VS_URL%' -OutFile '%VS_EXE%' -UseBasicParsing"
    if errorlevel 1 (
        echo [FAIL] Download failed. Check your internet connection.
        pause
        exit /b 1
    )
    echo [ OK ] Downloaded

    echo [INFO] Installing C++ Build Tools...
    echo [INFO] This will take 5-15 minutes. A progress window will appear.
    echo.
    "%VS_EXE%" --wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended
    del "%VS_EXE%" >nul 2>&1
    echo [ OK ] Build Tools installed!
    echo.
)

:: ────────────────────────────────────────────────
:: ALL DONE - START APP
:: ────────────────────────────────────────────────
echo ================================================
echo   Installation complete! Starting app...
echo ================================================
echo.

:StartApp
cd /d "%~dp0..\app"

echo [INFO] Installing npm packages...
call npm install
if errorlevel 1 (
    echo.
    echo [FAIL] npm install failed.
    echo        Make sure Visual Studio Build Tools finished installing.
    echo        Then run this file again.
    echo.
    pause
    exit /b 1
)

if not exist ".env.local" (
    echo [INFO] Creating .env.local...
    (
        echo # Get free Gemini API Key from https://aistudio.google.com
        echo GEMINI_API_KEY=
        echo NEXTAUTH_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
    ) > .env.local
    echo [ OK ] Created .env.local
)

echo.
echo ================================================
echo   Ready!  Open browser: http://localhost:3000
echo   Press Ctrl+C to stop
echo ================================================
echo.
call npm run dev
pause
exit /b 0

:: ────────────────────────────────────────────────
:: SUBROUTINE: Refresh PATH from registry
:: ────────────────────────────────────────────────
:RefreshPath
    for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do (
        if "%%b"=="" (set "SYS_PATH=%%a") else (set "SYS_PATH=%%a %%b")
    )
    for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do (
        if "%%b"=="" (set "USR_PATH=%%a") else (set "USR_PATH=%%a %%b")
    )
    if defined SYS_PATH set "PATH=%SYS_PATH%"
    if defined USR_PATH set "PATH=%PATH%;%USR_PATH%"
    :: Always add common Node.js locations
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
exit /b 0
