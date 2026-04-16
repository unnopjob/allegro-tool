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

:: Ensure PowerShell full path is in PATH (some machines strip it)
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "PATH=%PATH%;%SystemRoot%\System32\WindowsPowerShell\v1.0"

:: ────────────────────────────────────────────────
:: REFRESH PATH FROM REGISTRY
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
:: DOWNLOAD HELPER SUBROUTINE
:: Tries: curl -> PowerShell -> bitsadmin
:: Usage: call :Download <URL> <OutFile>
:: ────────────────────────────────────────────────

:: ────────────────────────────────────────────────
:: INSTALL NODE.JS
:: ────────────────────────────────────────────────
if %NODE_INSTALLED%==0 (
    echo ================================================
    echo   [1/2] Installing Node.js v22 LTS...
    echo ================================================
    echo.

    set "NODE_MSI=%TEMP%\node-v22-x64.msi"
    set "NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi"

    echo [INFO] Downloading Node.js... ^(about 30MB^)
    call :Download "%NODE_URL%" "%NODE_MSI%"
    if errorlevel 1 (
        echo [FAIL] All download methods failed.
        echo        Please download manually: https://nodejs.org
        pause
        exit /b 1
    )
    echo [ OK ] Downloaded

    echo [INFO] Installing Node.js...
    msiexec /i "%NODE_MSI%" /passive ADDLOCAL=ALL
    if errorlevel 1 (
        echo [FAIL] Installation failed.
        pause
        exit /b 1
    )
    del "%NODE_MSI%" >nul 2>&1

    call :RefreshPath
    node --version >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Node.js installed but PATH not updated yet.
        echo        Close this window, open new CMD, then run start.bat
        pause
        exit /b 0
    )
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo [ OK ] Node.js %NODE_VER% installed!
    echo.
)

:: ────────────────────────────────────────────────
:: INSTALL VISUAL STUDIO BUILD TOOLS
:: ────────────────────────────────────────────────
if %BUILD_INSTALLED%==0 (
    echo ================================================
    echo   [2/2] Installing Visual Studio Build Tools...
    echo   ^(Required for SQLite compilation^)
    echo ================================================
    echo.

    set "VS_EXE=%TEMP%\vs_buildtools.exe"
    set "VS_URL=https://aka.ms/vs/17/release/vs_buildtools.exe"

    echo [INFO] Downloading Build Tools... ^(about 4MB^)
    call :Download "%VS_URL%" "%VS_EXE%"
    if errorlevel 1 (
        echo [FAIL] All download methods failed.
        echo        Please download manually:
        echo        https://visualstudio.microsoft.com/visual-cpp-build-tools/
        pause
        exit /b 1
    )
    echo [ OK ] Downloaded

    echo [INFO] Installing... This takes 5-15 minutes.
    echo [INFO] A progress window will appear.
    echo.
    "%VS_EXE%" --wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended
    del "%VS_EXE%" >nul 2>&1
    echo [ OK ] Build Tools installed!
    echo.
)

echo ================================================
echo   Installation complete! Starting app...
echo ================================================
echo.

:: ────────────────────────────────────────────────
:: START APP
:: ────────────────────────────────────────────────
:StartApp
cd /d "%~dp0..\app"

echo [INFO] Installing npm packages...
call npm install
if errorlevel 1 (
    echo.
    echo [FAIL] npm install failed.
    echo        Re-run this file after Build Tools finishes.
    echo.
    pause
    exit /b 1
)

if not exist ".env.local" (
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

:: ════════════════════════════════════════════════
:: SUBROUTINE: Download <URL> <OutFile>
:: Tries curl, then PowerShell full path, then bitsadmin
:: ════════════════════════════════════════════════
:Download
    set "_URL=%~1"
    set "_OUT=%~2"

    :: Method 1: curl (built-in Windows 10 1803+)
    echo [INFO] Trying curl...
    curl -L --silent --show-error --output "%_OUT%" "%_URL%" >nul 2>&1
    if not errorlevel 1 (
        if exist "%_OUT%" exit /b 0
    )

    :: Method 2: PowerShell via full path
    echo [INFO] Trying PowerShell...
    "%PS%" -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol='Tls12,Tls13'; (New-Object Net.WebClient).DownloadFile('%_URL%','%_OUT%')" >nul 2>&1
    if not errorlevel 1 (
        if exist "%_OUT%" exit /b 0
    )

    :: Method 3: bitsadmin (old fallback, always exists on Windows)
    echo [INFO] Trying bitsadmin...
    bitsadmin /transfer "AllegroAI_Download" /download /priority normal "%_URL%" "%_OUT%" >nul 2>&1
    if not errorlevel 1 (
        if exist "%_OUT%" exit /b 0
    )

    exit /b 1

:: ════════════════════════════════════════════════
:: SUBROUTINE: RefreshPath
:: ════════════════════════════════════════════════
:RefreshPath
    for /f "skip=2 tokens=3*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do (
        if "%%b"=="" (set "SYS_PATH=%%a") else (set "SYS_PATH=%%a %%b")
    )
    for /f "skip=2 tokens=3*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do (
        if "%%b"=="" (set "USR_PATH=%%a") else (set "USR_PATH=%%a %%b")
    )
    if defined SYS_PATH set "PATH=%SYS_PATH%"
    if defined USR_PATH set "PATH=%PATH%;%USR_PATH%"
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm;%SystemRoot%\System32\WindowsPowerShell\v1.0"
exit /b 0
