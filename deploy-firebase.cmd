@echo off
setlocal
cd /d "%~dp0"
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org/ and open this file again.
  pause
  exit /b 1
)
if not exist dist\cloud-sdk.js (
  echo The Firebase build is missing. Run npm ci and npm run build in this folder.
  pause
  exit /b 1
)
echo Firebase project: japan-graduation-trip-2027
call npx --yes firebase-tools@14.27.0 login
if errorlevel 1 (
  echo Firebase login failed. Try again with the project owner's Google account.
  pause
  exit /b 1
)
call npx --yes firebase-tools@14.27.0 deploy --only firestore:rules,firestore:indexes,hosting --project japan-graduation-trip-2027
if errorlevel 1 (
  echo Deployment failed. Keep this window open to review the error above.
  pause
  exit /b 1
)
echo Open the Hosting URL printed above.
pause
