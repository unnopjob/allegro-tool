@echo off
title Allegro AI - Network Troubleshooting
echo.
echo ================================================
echo    Allegro AI - Network Troubleshooting
echo ================================================
echo.

:: ── Check Python ─────────────────────────────────
echo [1/4] Checking Python...
python --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON=python
    goto :python_ok
)
py --version >nul 2>&1
if not errorlevel 1 (
    set PYTHON=py
    goto :python_ok
)
echo.
echo  Python not found!
echo  1. Browser will open now
echo  2. Download Python 3.11+
echo  3. IMPORTANT: Check "Add Python to PATH"
echo  4. Install, close this window, run again
echo.
pause
start "" "https://www.python.org/downloads/"
exit /b 1

:python_ok
for /f "tokens=*" %%v in ('%PYTHON% --version') do set PY_VER=%%v
echo [ OK ] %PY_VER%

:: ── Go to app folder ─────────────────────────────
cd /d "%~dp0..\app-python"

:: ── Create virtualenv if not exists ──────────────
echo [2/4] Checking virtual environment...
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Creating venv...
    %PYTHON% -m venv venv
    if errorlevel 1 (
        echo [FAIL] Cannot create venv.
        pause
        exit /b 1
    )
)
echo [ OK ] venv ready

:: ── Activate venv ────────────────────────────────
call venv\Scripts\activate.bat

:: ── pip install ───────────────────────────────────
echo [3/4] Installing packages...
python -m pip install -r requirements.txt -q
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

:: ── Start server ──────────────────────────────────
echo [4/4] Starting server...
echo.
echo ================================================
echo   Open browser: http://localhost:8000
echo   Press Ctrl+C to stop
echo ================================================
echo.
python app.py
pause
