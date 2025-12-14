@echo off
setlocal enabledelayedexpansion

:: Configuration
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%ot-list\"
set "PB_DIR=%ROOT_DIR%pb"
set "DIST_DIR=%ROOT_DIR%dist"
set "TEMP_DIR=%TEMP%\ot-list-deploy-%RANDOM%"


:: GitHub repositories
set "POCKETBASE_REPO=pocketbase/pocketbase"
set "OTLIST_REPO=aliaafee/ot-list"

:: Default version (will be overridden by latest release)
set "VERSION=latest"

:: Error tracking
set "ERROR_OCCURRED=0"

echo ============================================
echo OT List Windows Deployment Script
echo ============================================
echo.

:: Check if curl is available
where curl >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] curl is not available. Please install curl or use Windows 10/11.
    exit /b 1
)

:: Check if tar is available (Windows 10 1803+ has built-in tar)
where tar >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] tar is not available. Please use Windows 10 version 1803 or later.
    exit /b 1
)

:: Create temp directory
echo [*] Creating temporary directory..%TEMP_DIR%...
mkdir "%TEMP_DIR%" 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] tar is not available. Please use Windows 10 version 1803 or later.
    exit /b 1
)


:: Download latest PocketBase
echo.
echo [*] Downloading latest PocketBase for Windows...
set "PB_API_URL=https://api.github.com/repos/%POCKETBASE_REPO%/releases/latest"
set "PB_JSON=%TEMP_DIR%\pocketbase-release.json"

curl -sL "%PB_API_URL%" -o "%PB_JSON%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to fetch PocketBase release information
    set "ERROR_OCCURRED=1"
    goto cleanup
)

:: Parse JSON to get download URL for windows_amd64
echo [*] Finding Windows AMD64 release...
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content '%PB_JSON%' | ConvertFrom-Json).assets | Where-Object { $_.name -like '*windows_amd64.zip' } | Select-Object -ExpandProperty browser_download_url"') do (
    set "PB_DOWNLOAD_URL=%%i"
)

if not defined PB_DOWNLOAD_URL (
    echo [ERROR] Could not find Windows AMD64 release for PocketBase
    set "ERROR_OCCURRED=1"
    goto cleanup
)

echo [*] Downloading from: !PB_DOWNLOAD_URL!
set "PB_ZIP=%TEMP_DIR%\pocketbase.zip"
curl -sL "!PB_DOWNLOAD_URL!" -o "%PB_ZIP%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to download PocketBase
    set "ERROR_OCCURRED=1"
    goto cleanup
)

:: Extract PocketBase
echo [*] Extracting PocketBase...
if not exist "%PB_DIR%" mkdir "%PB_DIR%"
tar -xf "%PB_ZIP%" -C "%PB_DIR%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to extract PocketBase
    set "ERROR_OCCURRED=1"
    goto cleanup
)
echo [*] PocketBase installed to: %PB_DIR%

:: Download latest OT List release
echo.
echo [*] Downloading latest OT List release...
set "OTLIST_API_URL=https://api.github.com/repos/%OTLIST_REPO%/releases/latest"
set "OTLIST_JSON=%TEMP_DIR%\otlist-release.json"

curl -sL "%OTLIST_API_URL%" -o "%OTLIST_JSON%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to fetch OT List release information
    set "ERROR_OCCURRED=1"
    goto cleanup
)

:: Parse JSON to get version tag
echo [*] Finding release version...
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-Content '%OTLIST_JSON%' | ConvertFrom-Json).tag_name"') do (
    set "VERSION_TAG=%%i"
)

if not defined VERSION_TAG (
    echo [ERROR] Could not find version tag in release information
    set "ERROR_OCCURRED=1"
    goto cleanup
)

:: Strip 'v' prefix from version tag to get version number
set "VERSION=!VERSION_TAG:v=!"

:: Construct download URL
set "OTLIST_DOWNLOAD_URL=https://github.com/%OTLIST_REPO%/releases/download/v!VERSION!/ot-list-v!VERSION!.zip"

echo [*] Version: !VERSION!
echo [*] Downloading from: !OTLIST_DOWNLOAD_URL!
set "OTLIST_ZIP=%TEMP_DIR%\otlist.zip"
curl -sL "!OTLIST_DOWNLOAD_URL!" -o "%OTLIST_ZIP%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to download OT List release
    set "ERROR_OCCURRED=1"
    goto cleanup
)

:: Extract OT List
echo [*] Extracting OT List release...
set "EXTRACT_DIR=%TEMP_DIR%\otlist-extract"
mkdir "%EXTRACT_DIR%" 2>nul
tar -xf "%OTLIST_ZIP%" -C "%EXTRACT_DIR%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to extract OT List release
    set "ERROR_OCCURRED=1"
    goto cleanup
)

:: The extracted directory should be ot-list-v{VERSION}
set "EXTRACTED_DIR=%EXTRACT_DIR%"

if not exist "!EXTRACTED_DIR!" (
    echo [ERROR] Could not find extracted directory: !EXTRACTED_DIR!
    set "ERROR_OCCURRED=1"
    goto cleanup
)

echo [*] Copying OT List files...

:: Copy dist directory
if exist "%EXTRACTED_DIR%\dist" (
    echo [*] Copying dist/...
    xcopy /E /I /Y "%EXTRACTED_DIR%\dist" "%DIST_DIR%" >nul
    echo     [OK] dist/ copied
) else (
    echo     [WARNING] dist/ directory not found in release
)

:: Copy pb_migrations directory
if exist "%EXTRACTED_DIR%\pb\pb_migrations" (
    echo [*] Copying pb/pb_migrations/...
    if not exist "%PB_DIR%\pb_migrations" mkdir "%PB_DIR%\pb_migrations"
    xcopy /E /I /Y "%EXTRACTED_DIR%\pb\pb_migrations" "%PB_DIR%\pb_migrations" >nul
    echo     [OK] pb_migrations/ copied
) else (
    echo     [WARNING] pb/pb_migrations/ directory not found in release
)

:: Copy pb_schema.json
if exist "%EXTRACTED_DIR%\pb_schema.json" (
    echo [*] Copying pb_schema.json...
    copy /Y "%EXTRACTED_DIR%\pb_schema.json" "%ROOT_DIR%\pb_schema.json" >nul
    echo     [OK] pb_schema.json copied
) else (
    echo     [WARNING] pb_schema.json not found in release
)

:: Copy scripts directory (optional)
if exist "%EXTRACTED_DIR%\scripts" (
    echo [*] Copying scripts/...
    if not exist "%ROOT_DIR%\scripts" mkdir "%ROOT_DIR%\scripts"
    xcopy /E /I /Y "%EXTRACTED_DIR%\scripts" "%ROOT_DIR%\scripts" >nul
    echo     [OK] scripts/ copied
)

:cleanup
echo.
echo [*] Cleaning up temporary files...
if exist "%TEMP_DIR%" rd /s /q "%TEMP_DIR%" 2>nul

echo.
if "!ERROR_OCCURRED!"=="1" (
    echo ============================================
    echo Installation Failed!
    echo ============================================
    echo.
    echo One or more errors occurred during installation.
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo PocketBase: %PB_DIR%\pocketbase.exe
echo OT List Version: !VERSION!
echo.
echo To start PocketBase, run:
echo     cd /d "%ROOT_DIR%"
echo     pb\pocketbase.exe serve --publicDir dist
echo.

:: Ask if user wants to start PocketBase now
set /p "START_NOW=Start PocketBase now? (Y/N): "
if /i "!START_NOW!"=="Y" (
    echo.
    echo [*] Starting PocketBase...
    cd /d "%ROOT_DIR%"
    "%PB_DIR%\pocketbase.exe" serve --publicDir dist
) else (
    echo.
    echo You can start PocketBase later using:
    echo     cd /d "%ROOT_DIR%"
    echo     pb\pocketbase.exe serve --publicDir dist
)

endlocal
