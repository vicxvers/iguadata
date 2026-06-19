@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\sync-local.ps1"
if errorlevel 1 pause
