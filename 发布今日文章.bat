@echo off
setlocal
chcp 65001 > nul
cd /d "%~dp0" || exit /b 1
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"

rem Prefer the installed Python launcher over the WindowsApps store alias.
py -3 -c "import sys; assert sys.version_info >= (3, 10)" >nul 2>&1
if not errorlevel 1 goto use_py
python -c "import sys; assert sys.version_info >= (3, 10)" >nul 2>&1
if not errorlevel 1 goto use_python
echo [ERROR] Python 3.10+ was not found. Install Python with the py launcher.
set "PUBLISH_EXIT=1"
goto finish

:use_py
py -3 -X utf8 "%~dp0publish_today.py" %*
set "PUBLISH_EXIT=%errorlevel%"
goto finish

:use_python
python -X utf8 "%~dp0publish_today.py" %*
set "PUBLISH_EXIT=%errorlevel%"

:finish
if not "%PUBLISH_EXIT%"=="0" echo [ERROR] Publisher exited with code: %PUBLISH_EXIT%
rem Tests and scheduled callers can disable the single launcher pause.
if not defined PUBLISH_NO_PAUSE pause
exit /b %PUBLISH_EXIT%
