@echo off
title Allegro AI - Network Troubleshooting
echo.
echo ================================================
echo    Allegro AI - Network Troubleshooting
echo ================================================
echo.

:: ── Check Python ──────────────────────────────────
echo [1/5] Checking Python...
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
echo  ERROR: Python not found!
echo  Please install Python 3.11 or newer:
echo    1. Open https://www.python.org/downloads/
echo    2. Download Python 3.11+
echo    3. IMPORTANT: Tick "Add Python to PATH" during install
echo    4. Close this window and run start.bat again
echo.
pause
start "" "https://www.python.org/downloads/"
exit /b 1

:python_ok
for /f "tokens=*" %%v in ('%PYTHON% --version') do set PY_VER=%%v
echo [ OK ] %PY_VER%

:: ── Go to app folder ──────────────────────────────
cd /d "%~dp0..\app-python"
if errorlevel 1 (
    echo [FAIL] Cannot find app-python folder.
    pause
    exit /b 1
)

:: ── Create virtualenv if not exists ───────────────
echo [2/5] Checking virtual environment...
if not exist "venv\Scripts\activate.bat" (
    echo [INFO] Creating virtual environment (first run only, may take 30s)...
    %PYTHON% -m venv venv
    if errorlevel 1 (
        echo [FAIL] Cannot create virtual environment.
        echo        Try running as Administrator, or check Python installation.
        pause
        exit /b 1
    )
)
echo [ OK ] Virtual environment ready

:: ── Activate venv ─────────────────────────────────
call venv\Scripts\activate.bat

:: ── Upgrade pip silently ───────────────────────────
echo [3/5] Updating pip...
python -m pip install --upgrade pip -q
echo [ OK ] pip up to date

:: ── Install packages ──────────────────────────────
echo [4/5] Installing packages (first run may take 1-2 minutes)...
python -m pip install -r requirements.txt -q
if errorlevel 1 (
    echo.
    echo [FAIL] Package installation failed.
    echo        Re-running with verbose output:
    python -m pip install -r requirements.txt
    pause
    exit /b 1
)
echo [ OK ] Packages ready

:: ── Create .env.local if missing ──────────────────
if not exist ".env.local" (
    (echo GEMINI_API_KEY=)>".env.local"
    echo [ OK ] Created .env.local
)

:: ── Start server ───────────────────────────────────
echo [5/5] Starting server...
echo.
echo ================================================
echo   Browser will open automatically at:
echo   http://localhost:8000
echo.
echo   To stop: press Ctrl+C
echo ================================================
echo.
python app.py
pause
