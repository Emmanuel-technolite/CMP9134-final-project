@echo off
echo Starting Virtual Robot Platform...

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 goto start_docker
goto run_docker

:start_docker
echo Docker is not running. Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo Waiting for Docker to start (this may take a minute)...

:wait_loop
timeout /t 5 /nobreak >nul
docker info >nul 2>&1
if %errorlevel% neq 0 goto wait_loop

echo Docker is now up!

:run_docker
echo Starting Containers...
docker compose up -d
echo.
echo Application is now running in the background!
echo You can access the Dashboard at: http://localhost:8000
pause
