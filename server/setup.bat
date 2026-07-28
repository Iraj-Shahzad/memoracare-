@echo off
REM ================================================================
REM  MemoryCare backend setup - clean install of ALL dependencies
REM  Just double-click this file, or run:  server\setup.bat
REM ================================================================
cd /d "%~dp0"

echo.
echo [1/4] Disabling production mode (so devDependencies like ts-node install)...
call npm config set production false
set NODE_ENV=

echo.
echo [2/4] Removing old node_modules and lock file for a clean install...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo.
echo [3/4] Installing dependencies (this can take a few minutes)...
call npm install

echo.
echo [4/4] Verifying ts-node...
if exist "node_modules\.bin\ts-node.cmd" (
  echo.
  echo ============================================
  echo  SUCCESS - ts-node is installed.
  echo  Now run:   npm run seed
  echo  Then:      npm run dev
  echo ============================================
) else (
  echo.
  echo ============================================
  echo  FAILED - ts-node still missing.
  echo  Scroll up and read the npm error above.
  echo ============================================
)

echo.
pause
