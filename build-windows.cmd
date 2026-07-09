@echo off
setlocal

cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-windows.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not defined CI pause
exit /b %EXIT_CODE%
