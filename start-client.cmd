@echo off
cd /d "%~dp0client"
start "LocoMov Client" cmd /k "npm run dev"
