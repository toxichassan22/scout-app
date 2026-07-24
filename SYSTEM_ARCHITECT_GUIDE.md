# 🚀 Scout App - System Architecture, Deployment & Backup Guide
> **دليل النشر التلقائي والبنية التحتية والمزامنة الخاصة بمشروع المهرجان الكشفي الثلاثين**

---

## 1. 📌 الدومين ومواصفات السيرفر (Server Architecture)
- **الرابط المباشر للموقع الحي**: `https://manshya-festival-30.cfd`
- **مزود الاستضافة**: **Tencent Cloud (Ubuntu Linux Server)**
- **خادم الويب والـ Reverse Proxy**: **Nginx 1.18.0**
  - ملفات الفرونت إند الثابتة: `/var/www/scout-app/dist` (مرفوعة ومجهزة بـ Gzip و Cache لمدة 30 يوم).
  - توجيه الـ API والـ WebSockets: يمر عبر Nginx إلى الباك إند المحلي على بورت `5000` (`http://127.0.0.1:5000`).
  - السعة المسموحة للملفات (`client_max_body_size`): **50MB** لتسمح برفع تقارير PDF وفيديوهات بدون أخطاء.
- **إدارة عمليات النود (Node Process Manager)**: **PM2**
  - سكريبت التشغيل: `server/src/index.js`
  - ملف التكوين: `server/ecosystem.config.cjs`

---

## 2. 🗄️ قاعدة البيانات وتزامن الأداء العالي (Database Engine)
- **نوع قاعدة البيانات**: **SQLite** عبر **Prisma ORM** (`server/prisma/schema.prisma` -> `server/prisma/dev.db`).
- **وضع الأداء والتزامن (WAL Mode)**:
  - تم تفعيل وضع **Write-Ahead Logging (WAL)** و `busy_timeout = 5000ms` داخل `server/src/db.js`.
  - يضمن هذا الوضع عدم إغلاق أو قفل قاعدة البيانات عند استخدام 5000+ متصفح في نفس الوقت.

---

## 3. ☁️ النسخ الاحتياطي والمزامنة اللحظية مع Google Drive
- **روابط وخدمات Google Apps Script (Version 5 - Anti-Duplication)**:
  - Web App URL: `https://script.google.com/macros/s/AKfycbzHD74T61yvqwmYXReiDoO74vIQ_bRMuxylQy_QhGO37whehtCmzDAGHFvx1Nuf1RCyzA/exec`
  - يحتوي الـ Script على خوارزمية استبدال الملفات المكررة بنعومة (`setTrashed(true)`) بدون تكرار النسخ.
- **هيكلية مجلدات الحفظ الآلي على Google Drive**:
  - `01_DATABASE/`: نسخ احتياطية كاملة من قاعدة بيانات SQLite.
  - `02_SCORES_LEADERBOARD/`: تصدير النتيجة والترتيب التفصيلي للفرق بصيغة CSV/JSON.
  - `03_TEAMS_DATA/Team_Name/reports/`: **رفع لحظي فوري** بمجرد أن يرفع أي فريق تقريره من المتصفح!

---

## 4. 🔄 خطوات النشر والتحديث على GitHub (Git Deployment Workflow)

عند التعديل على المشروع من قِبل أي Agent أو مطور، يجب اتباع الأوامر التالية بالترتيب للرفع التلقائي:

```bash
# 1️⃣ بناء ملفات الفرونت إند والتأكد من عدم وجود أخطاء
npm run build

# 2️⃣ إضافة التعديلات إلى Git
git add .

# 3️⃣ كتابة Commit موضح للتعديلات
git commit -m "fix/feat: وصف التعديلات المصنوعة"

# 4️⃣ الرفع المباشر إلى فرع main
git push origin HEAD:main
```

### ⚡ كيف تتم المزامنة على السيرفر بعد الـ Push؟
1. **السحب الآلي (Auto Git Pull & Build)**:
   - يتم تشغيل سكريبت `/var/www/scout-app/deploy.sh` على السيرفر لتحديث الكود وتحديث الباك إند وإعادة تشغيل PM2 أوتوماتيكياً.
2. **التحديث اليدوي المباشر عند الحاجة (Manual Trigger)**:
   - يمكن للأدمن ضغط زر "سحب وتحديث من GitHub" من صفحة الأدمن (`/admin/dashboard`) أو طلب الزر الحسابي `POST /api/admin/deploy/git-pull`.

---

## 5. 🔑 بيانات الدخول واختبارات المهرجان (Access Credentials)

- **صفحة الأدمن**: `https://manshya-festival-30.cfd/admin/login`
  - **اسم المستخدم**: `admin`
  - **كلمة المرور**: `admin123`
- **أكواد المسابقات الرسمية المعتمدة للتحكيم**:
  - 🧠 **عبقرينو**: `1001`
  - 🎭 **حقيقتان وكذبة**: `1002`
  - 🌍 **الجغرافيا العربية**: `1003`
  - 📹 **تصميم الفيديو الكشفي والتقارير**: `1234`
- **حسابات الفرق الكشفية التجريبية**:
  - `team1` إلى `team5` | **كلمة السر**: `team123`

---

## 6. 📁 الشجرة البرمجية للمشروع (Project Structure Overview)
```
d:/app scout/
├── src/                          # كود الفرونت إند (React + Vite + TailwindCSS)
│   ├── pages/                    # صفحات الموقع (UploadReport, Genius, Geography, Admin, Judge...)
│   ├── services/api.js           # جميع اتصالات الشبكة والـ HTTP Endpoints
│   ├── context/                  # سياق إدارة البيانات (Auth, Competitions, Theme)
│   └── main.jsx                  # نقطة الانطلاق الرئيسية وإلغاء كاش الـ ServiceWorker القديم
├── server/                       # كود الباك إند (Node.js + Express + Prisma)
│   ├── src/index.js              # سيرفر Express الرئيسي والـ WebSockets
│   ├── src/db.js                 # اتصال Prisma SQLite المتزامن بـ WAL Mode
│   ├── src/backup-exporter.js    # محرك الرفع التلقائي واللحظي لـ Google Drive
│   ├── src/seed.js               # سكريبت زرع وبناء البيانات الأساسية والـ 50 سؤال عبقرينو
│   └── prisma/schema.prisma      # جدول وقواعد بيانات SQLite (Teams, TeamMember, Reports, Scores...)
├── nginx-optimized.conf          # إعدادات Nginx المحسنة للسرعة والضغط
├── deploy.sh                     # سكريبت النشر الآلي للسيرفر
└── SYSTEM_ARCHITECT_GUIDE.md     # دليل النشر والبنية التحتية الحالي
```
