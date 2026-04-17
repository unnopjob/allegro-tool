@echo off
title Allegro AI - Network Troubleshooting
echo.
echo ================================================
echo    Allegro AI - Network Troubleshooting
echo ================================================
echo.

:: ── Check Python ─────────────────────────────────
echo [CHECK] Python...
python --version >nul 2>&1
if errorlevel 1 (
    py --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo  Python not found! Please install it:
        echo  1. Browser will open now
        echo  2. Download Python 3.11+
        echo  3. IMPORTANT: Check "Add Python to PATH"
        echo  4. Install, then run this file again
        echo.
        pause
        start "" "https://www.python.org/downloads/"
        exit /b 1
    )
    set PYTHON=py
) else (
    set PYTHON=python
)

for /f "tokens=*" %%v in ('%PYTHON% --version') do set PY_VER=%%v
echo [ OK ] %PY_VER%
echo.

:: ── Go to app-python folder ───────────────────────
cd /d "%~dp0..\app-python"

:: ── pip install ───────────────────────────────────
echo [INFO] Installing packages...
%PYTHON% -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [FAIL] pip install failed.
    pause
    exit /b 1
)
echo [ OK ] Packages ready

:: ── Create .env.local ─────────────────────────────
if not exist ".env.local" (
    echo GEMINI_API_KEY=> .env.local
    echo [ OK ] Created .env.local
)

:: ── Start ─────────────────────────────────────────
echo.
echo ================================================
echo   Starting... browser will open automatically
echo   URL: http://localhost:8000
echo   Press Ctrl+C to stop
echo ================================================
echo.
%PYTHON% app.py
pause
