Set shell = CreateObject("WScript.Shell")
root = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
script = root & "\desktop-app\MovieSwipeApp.ps1"
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -STA -File " & Chr(34) & script & Chr(34)
shell.Run cmd, 0, False
