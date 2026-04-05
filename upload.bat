@echo off
cd /d %~dp0
git add .
git pull origin main --rebase
git add .
git commit -m "update"
git push origin main
pause
