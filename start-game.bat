@echo off
REM ================================================================
REM  HTML 试验方案启动脚本
REM  使用 Python 内置 HTTP 服务器运行游戏
REM  用法：双击此文件，然后浏览器访问 http://localhost:8080
REM ================================================================

echo ===================================
echo  俯视角自动射击生存游戏 - 启动中
echo ===================================
echo.

REM 尝试用 py -3 (Python Launcher)
where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] 使用 Python 3 HTTP 服务器...
    echo [INFO] 浏览器访问: http://localhost:8080
    echo [INFO] 按 Ctrl+C 停止服务器
    echo.
    start http://localhost:8080
    py -3 -m http.server 8080
    goto :end
)

REM 尝试用 python3
where python3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] 使用 Python 3 HTTP 服务器...
    echo [INFO] 浏览器访问: http://localhost:8080
    echo [INFO] 按 Ctrl+C 停止服务器
    echo.
    start http://localhost:8080
    python3 -m http.server 8080
    goto :end
)

REM 尝试用 python (可能是 Python 3)
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] 使用 Python HTTP 服务器...
    echo [INFO] 浏览器访问: http://localhost:8080
    echo [INFO] 按 Ctrl+C 停止服务器
    echo.
    start http://localhost:8080
    python -m http.server 8080
    goto :end
)

REM 尝试用 npx serve
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] 使用 npx serve...
    echo [INFO] 浏览器访问: http://localhost:3000
    echo [INFO] 按 Ctrl+C 停止服务器
    echo.
    npx serve -l 3000
    goto :end
)

echo [ERROR] 未找到 Python 或 Node.js，请安装其中之一：
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause

:end