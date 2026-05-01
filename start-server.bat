@echo off
setlocal
echo ========================================
echo   Starting Game Server (port 2567)
echo ========================================
echo.

REM Kill old listeners on 2567 to avoid port conflict
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :2567 ^| findstr LISTENING 2^>nul') do (
    echo Killing old server process PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

cd /d "%~dp0server"
echo Starting server...
node dist/index.js
pause
endlocal
