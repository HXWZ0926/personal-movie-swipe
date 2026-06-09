@echo off
cd /d "%~dp0"
set "PATH=C:\nodes;C:\Windows\System32;C:\Windows"
"C:\nodes\npm.cmd" run dev -- --hostname 127.0.0.1 --port 3000 > dev-server.log 2> dev-server.err.log
