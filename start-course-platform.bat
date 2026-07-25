@echo off
setlocal
set "ROOT=%~dp0"

echo ============================================
echo   Starting Offline Academy (Course Platform)
echo ============================================
echo.

if not exist "%ROOT%server\node_modules" (
    echo Installing backend dependencies for the first time - this may take a minute...
    pushd "%ROOT%server"
    call npm install
    popd
)

start "Course Platform - BACKEND (keep open)" cmd /k "cd /d "%ROOT%server" && npm start"

echo Waiting for the backend to boot...
timeout /t 5 /nobreak > nul

if not exist "%ROOT%client\node_modules" (
    echo Installing frontend dependencies for the first time - this may take a minute...
    pushd "%ROOT%client"
    call npm install
    popd
)

start "Course Platform - FRONTEND (keep open)" cmd /k "cd /d "%ROOT%client" && npm run dev"

echo Waiting for the frontend to boot...
timeout /t 4 /nobreak > nul

start "" "http://localhost:5173"

echo.
echo Two new windows just opened - BACKEND and FRONTEND.
echo Leave BOTH of those open the whole time you're using the app.
echo Your browser should open automatically. If not, go to http://localhost:5173
echo.
echo This window (and this one only) is safe to close.
echo.
pause
