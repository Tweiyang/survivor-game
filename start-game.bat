@echo off
setlocal

REM Keep script robust across devices/code pages: ASCII only.
cd /d "%~dp0"

echo ===================================
echo Survivor Game - Starting local server
echo ===================================
echo.

set "PORT=8080"
set "URL=http://localhost:%PORT%/"

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :run_py

where python3 >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :run_python3

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :run_python

where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 goto :run_npx

echo [ERROR] Python or Node.js not found.
echo Install one of them:
echo   - Python: https://www.python.org/downloads/
echo   - Node.js: https://nodejs.org/
echo.
pause
exit /b 1

:run_py
echo [INFO] Using py -3 HTTP server on port %PORT%
echo [INFO] Open: %URL%
start "" "%URL%"
py -3 -m http.server %PORT%
goto :end

:run_python3
echo [INFO] Using python3 HTTP server on port %PORT%
echo [INFO] Open: %URL%
start "" "%URL%"
python3 -m http.server %PORT%
goto :end

:run_python
echo [INFO] Using python HTTP server on port %PORT%
echo [INFO] Open: %URL%
start "" "%URL%"
python -m http.server %PORT%
goto :end

:run_npx
set "PORT=3000"
set "URL=http://localhost:%PORT%/"
echo [INFO] Using npx serve on port %PORT%
echo [INFO] Open: %URL%
start "" "%URL%"
npx serve -l %PORT%
goto :end

:end
echo.
echo Server stopped.
pause
endlocal