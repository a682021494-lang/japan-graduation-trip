@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 (
  set "TRIP_PY=py -3"
) else (
  where python >nul 2>&1
  if errorlevel 1 (
    echo Install Python 3 and add it to PATH, then run this file again.
    pause
    exit /b 1
  )
  set "TRIP_PY=python"
)
%TRIP_PY% -c "import socket; s=socket.socket(); s.bind(('127.0.0.1', 8000)); s.close()" >nul 2>&1
if errorlevel 1 (
  echo Python 3 is unavailable or port 8000 is already in use.
  pause
  exit /b 1
)
start "Japan Graduation Trip 2027" %TRIP_PY% -m http.server 8000 --bind 127.0.0.1 --directory dist
%TRIP_PY% -c "import time,urllib.request,webbrowser; url='http://127.0.0.1:8000/'; time.sleep(1); urllib.request.urlopen(url,timeout=5).close(); webbrowser.open(url)"
if errorlevel 1 (
  echo Open http://127.0.0.1:8000/ once the server is ready.
  pause
)
