@echo off
git add .
git commit -m "Auto update %date% %time%"
git push origin main
echo.
echo ==========================================
echo  Changes pushed to GitHub.
echo  Vercel will deploy automatically.
echo ==========================================
pause
