@echo off
echo Starting local web server for SOULS...
echo.
echo If your browser does not open automatically, please go to:
echo http://localhost:8000
echo.

:: Try python 3
python -m http.server 8000
if %ERRORLEVEL% EQU 0 goto end

:: Try python 2
python -m SimpleHTTPServer 8000
if %ERRORLEVEL% EQU 0 goto end

:: Try npx http-server
npx http-server -p 8000
if %ERRORLEVEL% EQU 0 goto end

echo.
echo ERROR: You need Python or Node.js installed to run this game locally!
pause

:end
