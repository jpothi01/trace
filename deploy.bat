@echo off
if exist "D:\Downloads\trace-debug.apk" (
	adb shell pm uninstall com.trace
	adb install D:\Downloads\trace-debug.apk
	del D:\Downloads\trace-debug.apk
)