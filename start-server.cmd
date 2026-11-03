@echo off
cd /d "%~dp0server"
start "LocoMov Server" cmd /k "node src/index.js"
