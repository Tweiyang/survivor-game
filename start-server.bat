@echo off
echo ========================================
echo   Starting Game Server (port 2567)
echo ========================================
echo.

REM 先杀掉已有的服务器进程（防止端口占用）
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :2567 ^| findstr LISTENING 2^>nul') do (
    echo Killing old server process PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

cd /d "%~dp0server"
echo Starting server...
node dist/index.js
pause
