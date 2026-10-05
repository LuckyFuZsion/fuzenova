@echo off
REM Double-click to play Cinder Automata locally. Opens http://localhost:5177 in your browser.
REM Add ?build=20&fight=40 to the address (seconds) to shorten the rounds while testing.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing (first run only)...
  call npm install
)
echo.
echo Starting the game. Leave this window open while you play; close it to stop.
call npx vite --port 5177 --strictPort --host 127.0.0.1 --open
pause
