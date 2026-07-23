@echo off
chcp 65001 > nul
echo.
echo ============================================
echo    🚀  Scout App - Auto Push to GitHub
echo ============================================
echo.

:: اسأل عن رسالة الكوميت
set /p MSG="📝 رسالة التحديث (اضغط Enter للرسالة التلقائية): "

:: لو ما دخلتش رسالة، استخدم رسالة تلقائية بالتاريخ والوقت
if "%MSG%"=="" (
    for /f "tokens=*" %%a in ('powershell -Command "Get-Date -Format \"yyyy-MM-dd HH:mm\""') do set MSG=update: auto-push %%a
)

echo.
echo 📦 جاري إضافة التعديلات...
git add -A

echo ✅ جاري عمل Commit...
git commit -m "%MSG%"

echo 🚀 جاري الرفع على GitHub...
git push origin HEAD:main

echo.
if %ERRORLEVEL%==0 (
    echo ============================================
    echo  ✅  تم الرفع بنجاح على GitHub!
    echo ============================================
) else (
    echo ============================================
    echo  ❌  حدث خطأ أثناء الرفع!
    echo ============================================
)

echo.
pause
