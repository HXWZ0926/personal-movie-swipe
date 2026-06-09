@echo off
cd /d "%~dp0"
set "NODE_EXE=C:\Users\54562\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"
"%NODE_EXE%" "%~dp0node_modules\next\dist\bin\next" start --hostname 127.0.0.1 --port 3000
if errorlevel 1 pause
