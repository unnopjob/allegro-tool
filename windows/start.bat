@echo off
chcp 65001 >nul
title Allegro AI — Network Troubleshooting

echo.
echo ╔══════════════════════════════════════════════╗
echo ║     Allegro AI — Network Troubleshooting     ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ── Check Node.js ──────────────────────────────────────────────────────────
echo [INFO] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] ไม่พบ Node.js — ดาวน์โหลดจาก https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [ OK ] Node.js %NODE_VER%

:: ── Check npm ──────────────────────────────────────────────────────────────
echo [INFO] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] ไม่พบ npm — ลองติดตั้ง Node.js ใหม่
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo [ OK ] npm %NPM_VER%

:: ── npm install ────────────────────────────────────────────────────────────
echo.
echo [INFO] Installing dependencies...
echo.
cd /d "%~dp0..\app"
npm install
if errorlevel 1 (
    echo.
    echo [FAIL] npm install ล้มเหลว
    echo        สาเหตุที่พบบ่อย: ขาด Visual Studio Build Tools
    echo        ดาวน์โหลดจาก: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo        เลือก: Desktop development with C++
    echo.
    pause
    exit /b 1
)
echo.
echo [ OK ] Dependencies พร้อมแล้ว

:: ── Create .env.local ──────────────────────────────────────────────────────
if not exist ".env.local" (
    echo [INFO] สร้าง .env.local...
    (
        echo # Gemini API Key — รับจาก https://aistudio.google.com
        echo GEMINI_API_KEY=
        echo.
        echo # NextAuth secret
        echo NEXTAUTH_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
    ) > .env.local
    echo [ OK ] สร้าง .env.local เรียบร้อย
    echo [WARN] กรุณาใส่ GEMINI_API_KEY ใน app\.env.local หรือตั้งค่าใน Settings
) else (
    echo [ OK ] .env.local มีอยู่แล้ว
)

:: ── Start ──────────────────────────────────────────────────────────────────
echo.
echo ────────────────────────────────────────────────
echo   พร้อมแล้ว! กำลังเริ่ม server...
echo   URL: http://localhost:3000
echo   กด Ctrl+C เพื่อหยุด
echo ────────────────────────────────────────────────
echo.

npm run dev
pause
