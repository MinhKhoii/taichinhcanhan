@echo off
title MoneyFlow - Khoi Dong Ung Dung
echo ===================================================
echo     DANG KHOI DONG MONEYFLOW - QUAN LY TAI CHINH
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/2] Dang mo trinh duyet...
start http://localhost:5173/

echo [2/2] Dang chay may chu MoneyFlow...
echo (De dung ung dung, ban chi can dong cua so nay)
echo.
call npm.cmd run dev
pause

