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
    echo        Some installations may fail.
    echo        Right-click install-deps.bat and choose "Run as administrator"
    echo.
    pause
)

set NODE_INSTALLED=0
set BUILD_INSTALLED=0

:: ────────────────────────────────────────────────
:: CHECK NODE.JS
:: ────────────────────────────────────────────────
echo [CHECK] Node.js...
node --version >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
    echo [ OK ]  Node.js %NODE_VER% is already installed
    set NODE_INSTALLED=1
) else (
    echo [MISS]  Node.js not found
)

:: ────────────────────────────────────────────────
:: CHECK BUILD TOOLS (look for cl.exe or node-gyp requirement)
:: ────────────────────────────────────────────────
echo [CHECK] Visual Studio Build Tools...
where cl.exe >nul 2>&1
if not errorlevel 1 (
    echo [ OK ]  Visual Studio Build Tools already installed
    set BUILD_INSTALLED=1
) else (
    :: Check if msbuild exists as fallback
    where msbuild >nul 2>&1
    if not errorlevel 1 (
        echo [ OK ]  MSBuild found (Build Tools available)
        set BUILD_INSTALLED=1
    ) else (
        echo [MISS]  Visual Studio Build Tools not found
    )
)

echo.

:: ────────────────────────────────────────────────
:: NOTHING TO DO
:: ────────────────────────────────────────────────
if %NODE_INSTALLED%==1 if %BUILD_INSTALLED%==1 (
    echo ================================================
    echo   All dependencies are already installed!
    echo   You can run start.bat now.
    echo ================================================
    echo.
    pause
    exit /b 0
)

:: ────────────────────────────────────────────────
:: SHOW WHAT WILL BE INSTALLED
:: ────────────────────────────────────────────────
echo The following will be installed:
if %NODE_INSTALLED%==0  echo   - Node.js v22 LTS  (from nodejs.org)
if %BUILD_INSTALLED%==0 echo   - Visual Studio Build Tools 2022  (from microsoft.com)
echo.
echo This may take 5-15 minutes depending on your internet speed.
echo.
set /p CONFIRM=Continue? (Y/n):
if /i "%CONFIRM%"=="n" (
    echo Cancelled.
    pause
    exit /b 0
)
if /i "%CONFIRM%"=="no" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.

:: ────────────────────────────────────────────────
:: INSTALL NODE.JS
:: ────────────────────────────────────────────────
if %NODE_INSTALLED%==0 (
    echo ================================================
    echo   Installing Node.js v22 LTS...
    echo ================================================

    :: Try winget first (Windows 11 / updated Windows 10)
    winget --version >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Using winget to install Node.js...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        if not errorlevel 1 (
            echo [ OK ] Node.js installed via winget
            goto :node_done
        )
        echo [WARN] winget install failed, trying direct download...
    )

    :: Download installer directly
    echo [INFO] Downloading Node.js installer...
    set NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi
    set NODE_MSI=%TEMP%\node-installer.msi

    :: Use PowerShell to download
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' -UseBasicParsing}" >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] Download failed. Please install manually:
        echo        https://nodejs.org  (Download LTS)
        echo.
        pause
        exit /b 1
    )

    echo [INFO] Running Node.js installer (silent)...
    msiexec /i "%NODE_MSI%" /quiet /norestart ADDLOCAL=ALL
    if errorlevel 1 (
        echo [FAIL] Node.js installation failed.
        echo        Try running installer manually: %NODE_MSI%
        pause
        exit /b 1
    )
    del "%NODE_MSI%" >nul 2>&1
    echo [ OK ] Node.js installed successfully

    :node_done
    echo.
)

:: ────────────────────────────────────────────────
:: INSTALL VISUAL STUDIO BUILD TOOLS
:: ────────────────────────────────────────────────
if %BUILD_INSTALLED%==0 (
    echo ================================================
    echo   Installing Visual Studio Build Tools 2022...
    echo   (Required for better-sqlite3 compilation)
    echo ================================================
    echo.

    :: Try winget first
    winget --version >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Using winget to install Build Tools...
        winget install Microsoft.VisualStudio.2022.BuildTools --silent --accept-package-agreements --accept-source-agreements --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
        if not errorlevel 1 (
            echo [ OK ] Build Tools installed via winget
            goto :build_done
        )
        echo [WARN] winget install failed, trying direct download...
    )

    :: Download installer directly
    echo [INFO] Downloading Visual Studio Build Tools installer...
    set VS_URL=https://aka.ms/vs/17/release/vs_buildtools.exe
    set VS_EXE=%TEMP%\vs_buildtools.exe

    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -Uri '%VS_URL%' -OutFile '%VS_EXE%' -UseBasicParsing}" >nul 2>&1
    if errorlevel 1 (
        echo [FAIL] Download failed. Please install manually:
        echo        https://visualstudio.microsoft.com/visual-cpp-build-tools/
        echo        Select: "Desktop development with C++"
        echo.
        pause
        exit /b 1
    )

    echo [INFO] Running Build Tools installer...
    echo [INFO] This will take several minutes, please wait...
    echo.
    "%VS_EXE%" --wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended
    if errorlevel 1 (
        echo [FAIL] Build Tools installation failed.
        echo        Try installing manually from:
        echo        https://visualstudio.microsoft.com/visual-cpp-build-tools/
        pause
        exit /b 1
    )
    del "%VS_EXE%" >nul 2>&1
    echo [ OK ] Build Tools installed successfully

    :build_done
    echo.
)

:: ────────────────────────────────────────────────
:: DONE
:: ────────────────────────────────────────────────
echo.
echo ================================================
echo   Installation Complete!
echo ================================================
echo.
echo IMPORTANT: Please CLOSE this window and
echo            open a NEW Command Prompt before
echo            running start.bat
echo.
echo (This is required so Windows loads the new PATH)
echo.
pause
