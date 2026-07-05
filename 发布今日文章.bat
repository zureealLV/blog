@echo off
chcp 65001 > nul
cd /d D:\blog\Firefly_zureeallv
python publish_today.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Script exited with code: %errorlevel%
)
pause