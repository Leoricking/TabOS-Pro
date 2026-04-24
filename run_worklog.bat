@echo off
chcp 65001 > nul
setlocal

cd /d "%~dp0"

if not exist output mkdir output

echo ==========================================
echo TabOS Worklog Manager
echo ==========================================
echo.

if not exist tools\worklog_parser.py (
    echo [ERROR] 找不到 tools\worklog_parser.py
    echo 請確認 tools 資料夾是否存在。
    pause
    exit /b 1
)

if exist "工作日誌.txt" (
    python tools\worklog_parser.py "工作日誌.txt" "output\worklog.html"
    if exist "output\worklog.html" (
        echo.
        echo Done: output\worklog.html
        start "" "%CD%\output\worklog.html"
    ) else (
        echo [ERROR] output\worklog.html 沒有產生
    )
    pause
    exit /b
)

if exist "command.txt" (
    python tools\worklog_parser.py "command.txt" "output\command_manager.html"
    if exist "output\command_manager.html" (
        echo.
        echo Done: output\command_manager.html
        start "" "%CD%\output\command_manager.html"
    ) else (
        echo [ERROR] output\command_manager.html 沒有產生
    )
    pause
    exit /b
)

echo [ERROR] 找不到 工作日誌.txt 或 command.txt
pause