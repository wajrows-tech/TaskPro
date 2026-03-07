@echo off
REM ── TaskPro Deploy Script ─────────────────────────────────────────────
REM Builds the app and copies update artifacts to the local updates folder
REM so the installed app can auto-update without reinstalling.
REM ──────────────────────────────────────────────────────────────────────

setlocal enabledelayedexpansion

set "UPDATE_DIR=%LOCALAPPDATA%\TaskPro\updates"
set "RELEASE_DIR=%~dp0release"

echo.
echo ============================================
echo   TaskPro Deploy
echo ============================================
echo.

REM Step 1: Build
echo [1/3] Building TaskPro...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Vite build failed!
    exit /b 1
)

echo [2/3] Packaging with electron-builder...
call npx electron-builder --win --publish never
if %errorlevel% neq 0 (
    echo ERROR: electron-builder failed!
    exit /b 1
)

REM Step 2: Create update directory
echo [3/3] Deploying update files...
if not exist "%UPDATE_DIR%" mkdir "%UPDATE_DIR%"

REM Step 3: Find the setup exe and extract version info
for %%f in ("%RELEASE_DIR%\TaskPro Setup *.exe") do (
    set "SETUP_FILE=%%~nxf"
    set "SETUP_SIZE=%%~zf"
)

if not defined SETUP_FILE (
    echo ERROR: No setup exe found in release folder!
    exit /b 1
)

echo   Found: %SETUP_FILE%

REM Get the version from package.json using node
for /f %%v in ('node -p "require('./package.json').version"') do set "VERSION=%%v"
echo   Version: %VERSION%

REM Step 4: Generate latest.yml for electron-updater
REM Get file SHA512 hash using certutil
certutil -hashfile "%RELEASE_DIR%\%SETUP_FILE%" SHA512 > "%TEMP%\hash.txt" 2>nul
for /f "skip=1 tokens=*" %%h in (%TEMP%\hash.txt) do (
    if not defined FILE_HASH set "FILE_HASH=%%h"
)
set "FILE_HASH=%FILE_HASH: =%"

REM Generate latest.yml
(
echo version: %VERSION%
echo files:
echo   - url: %SETUP_FILE%
echo     sha512: %FILE_HASH%
echo     size: %SETUP_SIZE%
echo path: %SETUP_FILE%
echo sha512: %FILE_HASH%
echo releaseDate: '%date:~6,4%-%date:~0,2%-%date:~3,2%T00:00:00.000Z'
) > "%RELEASE_DIR%\latest.yml"

REM Step 5: Copy all update files
echo   Copying files to update directory...
copy /Y "%RELEASE_DIR%\latest.yml" "%UPDATE_DIR%\" >nul
copy /Y "%RELEASE_DIR%\%SETUP_FILE%" "%UPDATE_DIR%\" >nul

for %%f in ("%RELEASE_DIR%\*.blockmap") do (
    copy /Y "%%f" "%UPDATE_DIR%\" >nul
)

echo.
echo ============================================
echo   Deploy Complete!
echo ============================================
echo   Version: %VERSION%
echo   Update files in: %UPDATE_DIR%
echo   The app will auto-update on next launch.
echo ============================================
echo.

endlocal
