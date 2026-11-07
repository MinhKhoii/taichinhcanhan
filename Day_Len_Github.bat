@echo off
title MoneyFlow - Build va Day len GitHub Pages
echo ===================================================
echo     DANG BUILD VA DAY MONEYFLOW LEN GITHUB PAGES
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/3] Dang build ung dung production vao thu muc dist...
call npm.cmd run build

echo.
echo [2/3] Dang luu tru ma nguon vao nhanh source...
git add .
git commit -m "update: Luu tru ma nguon MoneyFlow"
git push origin main:source

echo.
echo [3/3] Dang day ban build dist len nhanh main GitHub Pages...
cd dist
git add -A
git commit -m "build: Cap nhat ban web GitHub Pages"
git push origin main --force

echo.
echo ===================================================
echo   DA HOAN TAT! Trang web se cap nhat sau 1 phut:
echo   https://minhkhoii.github.io/taichinhcanhan/
echo ===================================================
pause

