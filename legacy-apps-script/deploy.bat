@echo off
REM Deploy script for OPSTech Site
REM Usage: deploy.bat [version_number]
REM Example: deploy.bat 24

setlocal enabledelayedexpansion

REM Get version number from argument or prompt
if "%~1"=="" (
    set /p VERSION="Enter version number (e.g., 24): "
) else (
    set VERSION=%~1
)

echo.
echo ========================================
echo OPSTech Site - Deployment v%VERSION%
echo ========================================
echo.

REM Step 1: Push changes
echo [1/4] Pushing local changes to Apps Script...
call clasp push --force
if errorlevel 1 (
    echo ERROR: Failed to push changes
    exit /b 1
)
echo.

REM Step 2: Create version
echo [2/4] Creating version %VERSION%...
call clasp create-version "OPS Tech v%VERSION%"
if errorlevel 1 (
    echo ERROR: Failed to create version
    exit /b 1
)
echo.

REM Step 3: Update deployment
echo [3/4] Updating production deployment...
call clasp update-deployment AKfycbwBiJzbG-3yHqH_t0UecdM2iUoUbNzp8v5WpXaWQv1rzAeATJgqALPa0pGl-lAjJ21Ipw --description "OPS Tech v%VERSION%"
if errorlevel 1 (
    echo ERROR: Failed to update deployment
    exit /b 1
)
echo.

REM Step 4: List deployments
echo [4/4] Verifying deployment...
call clasp list-deployments
echo.

echo ========================================
echo SUCCESS: Deployed OPS Tech v%VERSION%
echo ========================================
echo.
echo Production URL: https://script.google.com/macros/s/AKfycbwBiJzbG-3yHqH_t0UecdM2iUoUbNzp8v5WpXaWQv1rzAeATJgqALPa0pGl-lAjJ21Ipw/exec
echo.

endlocal
