@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (echo Install Node.js 24 LTS from nodejs.org first. & pause & exit /b 1)
call npm ci
if errorlevel 1 (pause & exit /b 1)
call npm run setup
if errorlevel 1 (pause & exit /b 1)
call npm run dev
pause
