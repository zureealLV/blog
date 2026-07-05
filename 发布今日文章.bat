@echo off
cd /d D:\blog\Firefly_zureeallv
python publish_today.py
if %errorlevel% neq 0 (
    echo.
    echo [错误] 脚本异常退出，错误码: %errorlevel%
)
pause