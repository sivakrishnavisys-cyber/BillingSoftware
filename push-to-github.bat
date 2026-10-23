@echo off
title Push BillingSoftware to GitHub
color 0A
echo ========================================================
echo    Pushing BillingSoftware to GitHub
echo    Target: https://github.com/sivakrishnavisys-cyber/BillingSoftware
echo ========================================================
echo.
echo 1. Ensuring git branch is main...
git branch -M main
echo.
echo 2. Setting remote repository origin...
git remote set-url origin https://github.com/sivakrishnavisys-cyber/BillingSoftware.git
echo.
echo 3. Pushing code to GitHub...
echo (If a browser window opens, please click 'Sign in' / 'Authorize')
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo  SUCCESS! Your code has been pushed to GitHub.
    echo  Now go to https://vercel.com to deploy it for free.
    echo ========================================================
) else (
    echo ========================================================
    echo  If it says 'Repository not found', please make sure
    echo  you created 'BillingSoftware' at https://github.com/new
    echo ========================================================
)
echo.
pause
