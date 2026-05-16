@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

if /I "%~1"=="menu" goto menu
if /I "%~1"=="test" goto full_check
if /I "%~1"=="e2e" goto e2e_tests

echo Chronotop starten
echo =================
echo.
echo Arbeitsordner:
echo %CD%
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo npm wurde nicht gefunden. Bitte Node.js installieren oder Terminal neu starten.
  goto fail_pause
)

if not exist "node_modules" (
  echo Dependencies fehlen. Fuehre npm ci aus...
  call npm ci
  if errorlevel 1 goto fail_pause
)

call :check_ports
if errorlevel 1 goto fail_pause

echo.
echo Demo-Daten werden vorbereitet...
call npm run seed:local
if errorlevel 1 goto fail_pause

echo.
echo Browser wird geoeffnet, sobald der Dev-Server gestartet ist...
start "" cmd /c "timeout /t 8 /nobreak >nul && start "" http://localhost:5173/author/00000000-0000-0000-0000-000000000005"

echo.
echo Starte Chronotop. Dieses Fenster offen lassen.
echo.
echo Backend:  http://localhost:3000/api/v1
echo Frontend: http://localhost:5173
echo Ebersbach-Modul: http://localhost:5173/author/00000000-0000-0000-0000-000000000005
echo.
echo Beenden mit STRG+C.
echo Fuer Wartungsoptionen: run-chronotop.bat menu
echo.
call npm run dev
goto end

:menu
cls
echo Chronotop Wartungsmenue
echo =======================
echo.
echo 1 - Dependencies neu installieren (npm ci)
echo 2 - Unit-Tests ausfuehren (Server + Client)
echo 3 - Lokale Demo-Daten einspielen
echo 4 - Dev-App starten
echo 5 - Full local check (Tests + Build)
echo 6 - Playwright E2E-Tests ausfuehren
echo 7 - Frontend im Browser oeffnen
echo 0 - Beenden
echo.
set /p choice="Auswahl: "

if "%choice%"=="1" goto install
if "%choice%"=="2" goto unit_tests
if "%choice%"=="3" goto seed_data
if "%choice%"=="4" goto start_dev
if "%choice%"=="5" goto full_check
if "%choice%"=="6" goto e2e_tests
if "%choice%"=="7" goto open_browser
if "%choice%"=="0" goto end
goto menu

:install
call npm ci
if errorlevel 1 goto fail_pause
goto done

:unit_tests
call npm test
if errorlevel 1 goto fail_pause
goto done

:seed_data
call :check_ports
if errorlevel 1 goto fail_pause
call npm run seed:local
if errorlevel 1 goto fail_pause
goto done

:start_dev
call :check_ports
if errorlevel 1 goto fail_pause
echo.
echo Starte Chronotop. Beenden mit STRG+C.
echo Backend:  http://localhost:3000/api/v1
echo Frontend: http://localhost:5173
echo.
call npm run dev
goto done

:full_check
call npm test
if errorlevel 1 goto fail_pause
call npm run build
if errorlevel 1 goto fail_pause
goto done

:e2e_tests
call npm run test:e2e
if errorlevel 1 goto fail_pause
goto done

:open_browser
start "" "http://localhost:5173"
goto done

:check_ports
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports=@(3000,5173); $hits=@(); foreach($port in $ports){ if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue){ $hits += $port } }; if($hits.Count -gt 0){ Write-Host ('Belegte Ports: ' + ($hits -join ', ')); exit 1 }"
if errorlevel 1 (
  echo.
  echo Es laeuft bereits eine Chronotop-Instanz oder ein anderer Dienst auf Port 3000/5173.
  echo Bitte das alte Server-Fenster zuerst mit STRG+C beenden und dann erneut starten.
  exit /b 1
)
exit /b 0

:done
echo.
echo Fertig.
pause
goto menu

:fail_pause
echo.
echo Der letzte Befehl ist fehlgeschlagen. Details stehen oben im Fenster.
pause
goto end

:end
endlocal
