# خطة البنية التقنية الشاملة — لوحة الفرق / بوابة التحكيم / بوابة الأدمن

> **حالة المستند:** تخطيط فقط — لا يوجد كود منفذ بعد. الهدف إثبات الفهم واتخاذ القرارات التقنية الأساسية قبل الكتابة.

---

# الجزء الأول: لوحة الفرق (Team Client)

---

## 0. ملخص سريع (TL;DR)

الدومين الأساسي (`http://localhost:5173`) هو تطبيق الفرق. حالياً هو **Frontend فقط** (React + Vite) بدون أي Backend حقيقي — كل البيانات محفوظة في `localStorage` المتصفح. ده كان كفاية للتجربة (Demo)، لكنه **مش كفاية للمتطلبات الجديدة** لأن:

- الـ Leaderboard والأخبار والجدول لازم يكونوا **Real-time بين كل الأجهزة** — و `localStorage` مش بيتزامن بين جهازين مختلفين، بس بين تابين في نفس المتصفح.
- تسجيل الدخول لازم يكون باسم مستخدم + باسورد ينشئهم الأدمن — دلوقتي تسجيل الدخول بمجرد اسم الفريق بدون باسورد.
- لازم فيه سيرفر مركزي واحد يحفظ الحقيقة (Source of Truth) لكل الفرق في نفس اللحظة.

**القرار:** هنضيف Backend حقيقي (Node.js + Express + Socket.IO + قاعدة بيانات) واحد بيخدم **الثلاث بوابات** (الفرق، المحكّمين، الأدمن)، وهنعدّل/نضيف الصفحات عشان تتغذى من السيرفر ده بدل الـ `localStorage`.

هذا المستند دلوقتي بيغطي **الثلاث أجزاء كاملين**: لوحة الفرق (الجزء الأول)، بوابة التحكيم (الجزء الثاني)، وبوابة الأدمن (الجزء الثالث) — بعد ما تم شرح وتأكيد تفاصيل كل جزء. تفاصيل منطق كل مسابقة رقمية بالتحديد (شكل أسئلتها بالضبط) والأنشطة الجانبية هتُصمم في مستند لاحق.

---

## 1. نطاق المستند وحدوده (Scope)

**داخل النطاق (الثلاث أجزاء):**
- **لوحة الفرق:** الصفحة الرئيسية/Dashboard (`Home.jsx`) والـ Leaderboard، تسجيل الدخول (`Login.jsx`)، الأخبار (قراءة فقط)، دليل الفرق (`Program.jsx`).
- **بوابة التحكيم:** تسجيل دخول المحكّم، شاشة كود المسابقة، شيت التحكيم (QR + قائمة فرق + استمارة تقييم + Submit).
- **بوابة الأدمن:** تسجيل دخول الأدمن، وإدارة كل شيء (فرق / محكّمين / أخبار / درجات / تقارير / مسابقات / أسئلة / أجندة).
- الـ Backend الموحّد (Auth + Realtime + DB) اللي بيخدم الثلاث بوابات مع بعض.

**خارج النطاق (لسه هيُفصّل في مستند لاحق):**
- تفاصيل معايير كل مسابقة رقمية بالذات (شكل أسئلة كل نوع، منطق التصحيح الدقيق).
- الأنشطة الجانبية.
- تفاصيل واجهة رفع التقرير من طرف الفريق (الموديل الأساسي `Report` مُعرّف في الجزء الثالث، لكن الـ UX الكامل هيُفصّل لاحقاً).

---

## 2. تدقيق الوضع الحالي في الكود (Audit)

راجعت الكود الموجود فعلياً، ودي الحقائق:

| الملف/الموضوع | الوضع الحالي | المشكلة بالنسبة للمتطلبات الجديدة |
|---|---|---|
| `src/context/AuthContext.jsx` | تسجيل دخول الفريق بـ **اسم الفريق فقط** (بدون باسورد)، من قايمة `MOCK_TEAMS` مخزنة في `localStorage` | المطلوب: اسم مستخدم + باسورد ينشئهم الأدمن مسبقاً |
| `src/pages/Login.jsx` | فيه واجهة "تسجيل دخول بواسطة Google" **مزيفة بالكامل** (مجرد UI، مفيش OAuth حقيقي) | لازم تتشال أو تُستبدل بفورم Username/Password حقيقي |
| `src/components/ProtectedRoute.jsx` | الكومبوننت بيعمل `return children` مباشرة — **مفيش أي حماية فعلية حالياً** (bug موجود) | أي مستخدم يقدر يفتح أي صفحة بدون تسجيل دخول عن طريق الرابط المباشر |
| تخزين هوية المستخدم | `localStorage.setItem('dsc_auth_user', {role: 'admin'|'team', ...})` | أي شخص يقدر يفتح Console ويغيّر الـ role بنفسه ويصبح أدمن — **ثغرة أمنية حقيقية** لازم تتحل بالـ Backend |
| `src/context/CompetitionContext.jsx` → `getOverallLeaderboard()` | بيرجع `{teamName, score}` — بيحتفظ بأسماء الفرق كاملة داخلياً | البيانات دي محفوظة كاملة (بأسماء الفرق) في `localStorage` **كل فريق عنده نسخة منها في متصفحه** — يعني أي فريق فاهم في الـ DevTools يقدر يشوف اسم ودرجة كل الفرق التانية! |
| `src/pages/Home.jsx` (شكل الـ Leaderboard) | بالفعل مصمم بنفس فكرة الصورة اللي بعتها: Top 3 + "باقي المراكز" + فرق النقاط بين المراكز، **بدون عرض اسم أي فريق في الواجهة** | الشكل (UI) قريب من المطلوب جداً فعلاً ✅ — المشكلة في **مصدر البيانات** بس (localStorage محلي، مش Real-time بين الأجهزة، والبيانات الخام مش Anonymized فعلياً زي ما شرحت فوق) |
| `src/pages/News.jsx` | فيه نظام "قيد المراجعة / منشور" (الفريق بيرسل، الأدمن بيوافق) | ⚠️ **تغيير في المتطلبات:** الفريق **مش المفروض يرسل أخبار خالص** — الأدمن بس هو الناشر الوحيد. لازم تتشال استمارة الإرسال بالكامل من `News.jsx` ويصبح للعرض فقط (Read-only) + Real-time حقيقي (Sockets) بدل `storage` event |
| `src/pages/Program.jsx` | خريطة "شكلية" (SVG Zones ثابتة) + جدول فعاليات (`PROGRAM_EVENTS`) **Hardcoded في الكود مباشرة** | لازم البيانات دي تيجي من الأدمن وتتحدث لحظياً، مش تعديل كود |
| Backend / DB / Sockets | **غير موجودين في المشروع خالص** — مشروع Frontend بحت (Vite + React + Context API) | هما أساس كل المتطلبات الجديدة (Real-time, Auth حقيقي, Atomic Save) |
| `edits/Scoring.md` (ملاحظات سابقة) | بتقول: "الـ Leaderboard يظهر عند الأدمن بس، وميتحدثش Real-time" | ⚠️ **تعارض مباشر** مع وثيقة التوصيف الجديدة اللي بعتها (اللي تقول لازم يظهر للفرق لحظياً بدون أسماء). **هعتمد وثيقة التوصيف الجديدة** لأنها الأحدث والرسمية، وهعلّم عليها كملاحظة هنا للتوثيق. |

**خلاصة الـ Audit:** الشكل البصري (UI/UX) لصفحة الـ Home قريب من اللي عايزه فعلاً، وده ميزة كبيرة (توفير وقت تصميم). المجهود الحقيقي كله في **الطبقة اللي تحت** (Backend + DB + Realtime + Auth حقيقي).

---

## 3. القرارات التقنية (بما إنك سيبتها لي)

| القرار | الاختيار | السبب |
|---|---|---|
| **Backend Framework** | Node.js + Express | نفس لغة الفرونت (JavaScript) — أسهل صيانة لفريق واحد، خفيف ومباشر بدون تعقيد زيادة |
| **Real-time** | Socket.IO | بيتكامل مباشر مع Express، بيدعم Rooms (مفيدة عشان نبعت لكل الفرق مرة واحدة)، وبيرجع تلقائي لـ polling لو الشبكة ضعيفة (مهم في مكان زي مركز شباب ممكن يكون فيه WiFi غير مستقر) |
| **قاعدة البيانات** | PostgreSQL + Prisma ORM | العلاقات بين البيانات (فرق، مسابقات، درجات، أخبار) علائقية بطبيعتها، و Prisma بيوفر Migrations واضحة و Transactions لازمة لـ "الحفظ الفوري الذري" (Atomic Score Persistence) المطلوب في بند 5 |
| **بديل أخف للتطوير المحلي** | SQLite (لو مفيش سيرفر Postgres متاح فوراً) | نفس الـ Prisma schema، تبديل سطر واحد في الإعدادات لاحقاً للانتقال لـ Postgres |
| **Auth** | JWT قصير العمر + بيانات الجلسة في Cookie (httpOnly) | أأمن من تخزين بيانات المستخدم كـ JSON عادي في `localStorage` (المشكلة الموجودة حالياً) |
| **كلمات السر** | Bcrypt hashing | معيار أمني أساسي — حالياً مفيش تشفير خالص (`admin123` نص عادي) |
| **الخريطة (Teams Guide)** | نفس فكرة الـ SVG الشكلية الموجودة في `Program.jsx` حالياً، لكن البيانات جايه من الـ API بدل ما تكون Hardcoded | تجنب تكلفة/تعقيد دمج خرائط حقيقية (Google Maps API مثلاً) لمكان مغلق (مركز شباب) مفيش فيه GPS دقيق أصلاً. **قابل للتغيير لو عايز خريطة تفاعلية حقيقية** |
| **مكان الـ Backend في المشروع** | مجلد جديد `server/` في جذر المشروع، منفصل عن `src/` (اللي هو الفرونت) | يحافظ على تنظيم المشروع الحالي بدون تدخل في بنية Vite |
| **الاستضافة (Hosting)** | ✅ **مؤكد:** إنترنت متوفر في مكان المهرجان → السيرفر هيتحط على استضافة سحابية (Cloud) عادية (مش محتاجين حل Offline/LAN) | تم التأكيد من صاحب المشروع |

---

## 4. البنية المعمارية المقترحة (Architecture)

```
┌─────────────────────────┐        REST (HTTPS)        ┌──────────────────────────┐
│   Team Client (React)   │ ──────────────────────────▶ │   Express API Server    │
│   d:\app scout\src      │ ◀────────────────────────── │   (server/)              │
│   :5173 (Vite dev)      │                              │                          │
│                          │      Socket.IO (WS)         │  - Auth (JWT)            │
│                          │ ◀───────────────────────────▶│  - Leaderboard endpoint  │
└─────────────────────────┘                              │  - News endpoint         │
                                                           │  - Agenda/Zones endpoint │
                                                           └────────────┬─────────────┘
                                                                        │ Prisma
                                                                        ▼
                                                           ┌──────────────────────────┐
                                                           │  PostgreSQL / SQLite     │
                                                           └──────────────────────────┘
```

- عملية واحدة (Process) للـ Express + Socket.IO مع بعض — مفيش حاجة لتعقيد Microservices في حجم المشروع ده.
- الفرونت بيعمل `fetch` أول مرة (REST) عشان يجيب الحالة الابتدائية (مثلاً الـ Leaderboard وقت فتح الصفحة)، وبعد كذا بيسمع (`socket.on`) للتحديثات اللحظية بدل ما يعمل Refresh أو Polling.

---

## 5. نماذج البيانات (Data Models) — لهذا الجزء فقط

```prisma
model Team {
  id            String   @id @default(uuid())
  username      String   @unique
  passwordHash  String
  label         String   // اسم داخلي للأدمن بس (مثلاً "الفريق الأول") — لا يُعرض لأي فريق آخر أبداً
  createdAt     DateTime @default(now())
}

model Admin {
  id           String @id @default(uuid())
  username     String @unique
  passwordHash String
}

model News {
  id               String    @id @default(uuid())
  title            String
  body             String
  photoUrl         String?
  createdByAdminId String    // الأدمن هو الناشر الوحيد — لا يوجد teamId ولا status/pending
  createdAt        DateTime  @default(now())
}

model Zone {
  id          String @id @default(uuid())
  numberLabel String   // "١", "٢"...
  name        String
  description String
  colorHex    String
  order       Int
}

model AgendaItem {
  id          String   @id @default(uuid())
  title       String
  type        String   // competition | workshop | ceremony
  zoneId      String
  startTime   DateTime
  endTime     DateTime
  description String
  isVisible   Boolean  @default(true)
}
```

> **ملاحظة:** جدول الـ Leaderboard نفسه (النقاط) هيُبنى فوق جداول المسابقات والدرجات (`Competition`, `Score`) المُعرّفة بالتفصيل في **الجزء الثاني** (بوابة التحكيم) تحت. هنا في الجزء الأول بس هنستخدمها للقراءة عبر endpoint واحد (`GET /api/leaderboard`).

---

## 6. عقد الـ API والـ Sockets (Contract)

### REST

| Method | Endpoint | الوصف | صلاحية |
|---|---|---|---|
| `POST` | `/api/auth/team/login` | دخول الفريق بـ username + password | عام |
| `POST` | `/api/auth/logout` | خروج | فريق/أدمن |
| `GET` | `/api/leaderboard` | ترتيب مجهول الهوية `[{rank, points, gapToNext}]` | فريق مسجل دخول |
| `GET` | `/api/news` | الأخبار المعتمدة فقط | فريق مسجل دخول |
| ~~`POST`~~ | ~~`/api/news`~~ | ❌ محذوف — الفريق لا يرسل أخبار. النشر أصبح `POST /api/admin/news` (شوف الجزء الثالث) | — |
| `GET` | `/api/agenda` | الأجندة + الزونز | فريق مسجل دخول |

### Socket Events (اتجاه Server → Client)

| Event | الوصف |
|---|---|
| `leaderboard:update` | يُبعث عند أي تغيير في نقاط أي فريق — الـ payload **بدون** أي معرّف هوية |
| `news:published` | خبر جديد نشره الأدمن مباشرة |
| `news:deleted` | الأدمن حذف خبر — يتشال من الواجهة فوراً |
| `agenda:update` | تعديل في الجدول أو الزونز من الأدمن |
| `alert:popup` | (نقطة تكامل فقط — التفاصيل الكاملة في مستند المسابقات القادم) |

---

## 7. خريطة التغييرات على الفرونت إند الحالي (ملف بملف)

| الملف | التغيير المخطط |
|---|---|
| `src/context/AuthContext.jsx` | استبدال منطق `localStorage`/`MOCK_TEAMS` بنداء API حقيقي + تخزين التوكن |
| `src/pages/Login.jsx` | حذف واجهة "Google" المزيفة، فورم Username + Password حقيقي |
| `src/components/ProtectedRoute.jsx` | تفعيل الحارس الفعلي (تحويل المستخدم لو مش مسجل دخول أو دوره غلط) — إصلاح Bug موجود |
| `src/pages/Home.jsx` | الاحتفاظ بنفس تصميم الـ Podium الحالي (قريب جداً من الصورة المرفقة) لكن تغذيته من `GET /api/leaderboard` + `socket.on('leaderboard:update')` بدل `getOverallLeaderboard()` المحلي |
| `src/pages/News.jsx` | حذف استمارة الإرسال بالكامل، الصفحة تعرض فقط (`GET /api/news`) + استماع لـ `news:published`/`news:deleted` |
| `src/pages/Program.jsx` | تحويل `PROGRAM_EVENTS` و `ZONES` من Arrays ثابتة إلى بيانات من `GET /api/agenda` + الاستماع لـ `agenda:update` |
| جديد: `src/context/SocketContext.jsx` | إدارة اتصال Socket.IO مرة واحدة على مستوى التطبيق |
| جديد: `src/services/api.js` | Wrapper موحّد لـ `fetch` (Base URL + إرسال التوكن تلقائياً) |
| جديد: `.env` | `VITE_API_URL`, `VITE_SOCKET_URL` |
| `src/pages/Profile.jsx` | ⚠️ **معلق** — الصفحة دي حالياً بتعرض اسم الفريق ودرجته الكلية لنفسه. ده يتعارض مع "الفريق ميعرفش اسمه ولا درجته". محتاج قرارك (شوف الأسئلة تحت) قبل ما أخطط لتعديلها |

---

## 8. الأمان (Security Notes)

- **كلمات السر:** Bcrypt، مفيش تخزين Plain-text (زي `admin123` الحالية).
- **صلاحيات السيرفر:** أي عملية حساسة (اعتماد خبر، تعديل الجدول) تتحقق من الدور على السيرفر نفسه، مش بس تتخفي في الواجهة — لأن الوضع الحالي (`role` في `localStorage`) قابل للتلاعب بالكامل من طرف المستخدم.
- **عدم تسريب الهوية:** أي Endpoint أو Socket Event يوصل لجهاز الفريق **لازم يتفلتر من السيرفر نفسه** بحيث ما يحتويش على أسماء فرق تانية أبداً — حتى لو حصل فحص لطلبات الشبكة (Network tab) من مستخدم فاهم.
- **Rate limiting** على `/api/auth/team/login` لمنع تجربة باسوردات عشوائية.

---

## 9. خطة تنفيذ تدريجية لهذا الجزء (للمستقبل — لسه ملناخدش قرار نبدأ)

1. **إعداد السيرفر الأساسي:** Express + Prisma + قاعدة البيانات + Auth (JWT) + جدول Teams/Admins، واستبدال بيانات `ADMIN_CREDENTIALS`/`MOCK_TEAMS`.
2. **Socket.IO:** تركيبه على نفس السيرفر + `SocketContext` في الفرونت.
3. **Leaderboard الحقيقي:** Endpoint + Event + ربطه بـ `Home.jsx`.
4. **الأخبار:** تحويل `News.jsx` لعرض فقط (Read-only) + Realtime، والنشر الفعلي بيتم من لوحة الأدمن (الجزء الثالث).
5. **دليل الفرق:** ترحيل `Program.jsx` (الأجندة + الزونز) للـ API + Realtime.
6. **تنظيف:** حذف كود الـ Google المزيف، تفعيل `ProtectedRoute` الحقيقي.

---

## 10. أسئلة مفتوحة قبل التنفيذ

1. ~~الشبكة في المكان~~ ✅ **تم الرد:** إنترنت متوفر → استضافة Cloud عادية.
2. **"الفريق ميعرفش اسمه ولا درجته":** يعني الفريق ميشوفش حتى صفحة "بروفايله" الشخصية بدرجته الكلية (يعني نشيل/نعدّل `Profile.jsx`)، ولا المقصود بس إنه ميشوفش اسم أو درجة **الفرق التانية**؟
3. **عدد الفرق تقريباً؟** (تقدير بسيط يساعد في حجم الـ Infrastructure، مش لازم رقم دقيق).
4. **الخريطة:** الشكل الحالي (SVG مناطق ثابتة قابلة للضغط) كافي، ولا محتاجين خريطة حقيقية تفاعلية (Google Maps/أبعاد GPS)؟
5. **تسجيل الدخول:** نشيل واجهة "تسجيل الدخول بجوجل" المزيفة تماماً، ولا نسيبها كخيار إضافي بجانب Username/Password؟

---

# الجزء الثاني: بوابة التحكيم (Judges Portal)

---

## 2.0 نظرة عامة

**القرار:** بوابة التحكيم هتكون route جديد `/judge/*` **داخل نفس تطبيق React الحالي** (زي `/admin/*` الموجود فعلاً في `src/pages/admin/`)، مش تطبيق/Subdomain منفصل — نفس السيرفر، نفس الـ Build، أسهل نشر وصيانة. مفيش أي داعي لتعقيد إضافي هنا.

**التدفق المؤكد (من نقاشنا):**
1. المحكّم عنده حساب شخصي (username + password) بينشئه الأدمن — للتوثيق (مين حكم إيه).
2. بعد تسجيل الدخول الشخصي، تظهر شاشة "إدخال كود المسابقة" (Passcode).
3. كود صحيح → توجيه حصري لشيت تحكيم **هذه المسابقة فقط**.
4. جلسة المسابقة تقفل تلقائياً عند: (أ) الأدمن يقفل المسابقة، أو (ب) المحكّم يخلص تقييم كل الفرق → رجوع لشاشة الكود (بدون خروج من الحساب الشخصي).

**ربط بالكود الحالي:** المسابقات الرقمية الحالية (`two_truths`, `genius`, `geography` — الموجودة في `src/data/mockData.js` وبتظهر في `CompetitionCard.jsx`) هتفضل تُصحّح أوتوماتيك من غير محكّم. مسابقة **تصميم الفيديو** (`video`) — اللي حالياً بتُقيَّم يدوي من الأدمن مباشرة في `src/pages/admin/VideoJudging.jsx` — ومعاها أي مسابقة تقييمية/ميدانية تانية، هتتحوّل لتتحكم عن طريق **بوابة التحكيم دي بدل الأدمن**، والأدمن يقدر بس يعدّل الدرجة بعدين لو احتاج (شوف الجزء الثالث).

---

## 2.1 نماذج البيانات

```prisma
model Judge {
  id           String   @id @default(uuid())
  name         String
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
}

model Competition {
  id              String    @id @default(uuid())
  name            String
  type            String    // auto_digital | manual_judged
  isOpen          Boolean   @default(false)
  passcode        String?   // فقط للمسابقات manual_judged — الأدمن بينشئه/يدوّره
  assignedJudgeId String?
  criteria        Json      // بنود التقييم الديناميكية: [{ key, label, maxScore }]
  createdAt       DateTime  @default(now())
}

model Score {
  id              String    @id @default(uuid())
  competitionId   String
  teamId          String
  judgeId         String?   // null لو المسابقة auto_digital
  values          Json      // { criteriaKey: value, ... }
  total           Float
  submittedAt     DateTime  @default(now())
  editedByAdminId String?   // تعبئة عند أي تعديل من الأدمن (الجزء الثالث)
  editedAt        DateTime?
}
```

> `Score` هو نفسه المصدر اللي الـ `GET /api/leaderboard` (الجزء الأول) بيتجمّع منه، وده اللي بيوحّد الأخبار "الرقمية" و"اليدوية" في نفس الجدول.

---

## 2.2 عقد الـ API والـ Sockets

### REST

| Method | Endpoint | الوصف | صلاحية |
|---|---|---|---|
| `POST` | `/api/auth/judge/login` | دخول المحكّم الشخصي (username + password) | عام |
| `POST` | `/api/judge/unlock` | إدخال كود المسابقة → فتح الجلسة | محكّم مسجل دخول |
| `GET` | `/api/judge/teams` | قائمة الفرق (أسماء/أرقام حقيقية) للمسابقة المفتوحة حالياً في جلسته | محكّم بجلسة مفتوحة |
| `GET` | `/api/judge/qr` | QR Code الخاص بالمسابقة الحالية | محكّم بجلسة مفتوحة |
| `GET` | `/api/judge/criteria` | بنود التقييم الديناميكية للمسابقة الحالية | محكّم بجلسة مفتوحة |
| `POST` | `/api/judge/scores` | إرسال درجة فريق بعد تأكيد الـ Submit | محكّم بجلسة مفتوحة |
| `POST` | `/api/auth/logout` | خروج كامل من الحساب الشخصي | محكّم |

### Socket Events

| Event | اتجاه | الوصف |
|---|---|---|
| `judge:session:closed` | Server → Judge | المسابقة اتقفلت (من الأدمن) أو خلصت كل الفرق → رجوع فوري لشاشة الكود |
| `score:submitted` | Judge → Server | يطلق تلقائياً `leaderboard:update` (للفرق) + `admin:score:new` (للأدمن) |

---

## 2.3 خريطة الصفحات الجديدة (Frontend)

| الملف الجديد | الوصف |
|---|---|
| `src/pages/judge/JudgeLogin.jsx` | فورم دخول شخصي (username + password) |
| `src/pages/judge/PasscodeGate.jsx` | شاشة إدخال كود المسابقة |
| `src/pages/judge/JudgingSheet.jsx` | QR + قائمة الفرق + استمارة تقييم ديناميكية (مبنية من `criteria`) + Modal تأكيد الإرسال |
| تعديل `App.jsx` | إضافة شجرة route جديدة `/judge/*` بنفس نمط `/admin/*` الموجود |
| تعديل `AuthContext.jsx` (أو Context جديد `JudgeAuthContext.jsx`) | إضافة `role: 'judge'` + حفظ حالة الجلسة (فيه مسابقة مفتوحة دلوقتي ولا لأ) |

---

## 2.4 الأمان

- الكود (Passcode) بيتولّد/يتدوّر لكل مسابقة من الأدمن، ومفيش استخدام له بعد ما المسابقة تُقفل.
- أي محاولة وصول لمسابقة تانية (بتغيير ID في الرابط مثلاً) بترفض من السيرفر نفسه — الجلسة مربوطة بمسابقة واحدة بس (`Scope Limit`).
- Rate limiting على `/api/judge/unlock` لمنع تجربة أكواد عشوائية.
- المحكّم **مالوش أي endpoint يرجّع Leaderboard أو درجات فرق تانية** — بياناته محدودة بالفريق اللي بيقيّمه دلوقتي بس.

---

# الجزء الثالث: بوابة الأدمن (Admin Portal)

---

## 3.0 نظرة عامة

Route `/admin/*` (موجود جزء منه فعلاً في `src/pages/admin/`). **حساب Super Admin واحد فقط** — username + password (Bcrypt)، JWT بدور `admin`. الأدمن هو نقطة التحكم والتجميع الكاملة لكل بيانات السيستم.

## 3.1 الصلاحيات المؤكدة

| الصلاحية | التفاصيل |
|---|---|
| **الأخبار** | نشر مباشر + حذف — الناشر الوحيد في كل السيستم (لا يوجد اعتماد/رفض لأن الفريق لا يرسل أخبار أصلاً) |
| **الدرجات** | تعديل/تغيير **أي درجة** بدون استثناء — رقمية (auto_digital) أو يدوية (من محكّم) |
| **التقارير** | تحميل (Download) تقارير الفرق المرفوعة، محلياً على جهاز الأدمن |
| **الفرق** | إنشاء / تعديل / حذف — يدوي (فريق فريق) **أو** استيراد جماعي (مثلاً CSV/Excel) |
| **المحكّمين** | إنشاء حساباتهم الشخصية + توليد/تدوير كود Passcode لكل مسابقة |
| **المسابقات** | فتح/قفل، تحديد نوعها (`auto_digital`/`manual_judged`)، تعريف بنود التقييم الديناميكية — امتداد لـ `AdminCompetitions.jsx` الموجودة |
| **الأسئلة** | إدارة أسئلة المسابقات الرقمية — امتداد لـ `AdminQuestions.jsx` الموجودة |
| **الأجندة والمناطق** | تعديل جدول الفعاليات والمناطق (بدل الـ Hardcoded array في `Program.jsx`) وينعكس لحظياً على الفرق |
| **نظرة شاملة** | لوحة كاملة بأسماء الفرق الحقيقية ودرجاتها (بعكس اللوحة المجهولة عند الفرق) |

## 3.2 نماذج البيانات الإضافية

```prisma
model Report {
  id            String    @id @default(uuid())
  teamId        String
  competitionId String?
  fileUrl       String
  fileName      String
  uploadedAt    DateTime  @default(now())
  downloadedAt  DateTime?
}
```

> باقي الموديلات (`Team`, `Admin`, `Judge`, `Competition`, `Score`, `News`, `Zone`, `AgendaItem`) مُعرّفة في الجزء الأول والثاني — الأدمن عنده صلاحية Full CRUD عليهم كلهم.

## 3.3 عقد الـ API

| Method | Endpoint | الوصف |
|---|---|---|
| `POST` | `/api/auth/admin/login` | دخول الأدمن |
| `POST` | `/api/admin/news` | نشر خبر مباشر |
| `DELETE` | `/api/admin/news/:id` | حذف خبر |
| `PATCH` | `/api/admin/scores/:id` | تعديل درجة (يسجّل `editedByAdminId` و `editedAt` تلقائياً) |
| `GET` | `/api/admin/reports` | كل التقارير المرفوعة من الفرق |
| `GET` | `/api/admin/reports/:id/download` | تنزيل تقرير محدد |
| `POST` | `/api/admin/teams` | إنشاء فريق واحد |
| `POST` | `/api/admin/teams/import` | استيراد جماعي (CSV/Excel) |
| `PATCH` / `DELETE` | `/api/admin/teams/:id` | تعديل/حذف فريق |
| `POST` | `/api/admin/judges` | إنشاء محكّم |
| `POST` | `/api/admin/competitions/:id/passcode` | توليد/تدوير كود مسابقة |
| `PATCH` | `/api/admin/competitions/:id` | فتح/قفل/تعديل معايير مسابقة |
| `POST` / `PATCH` / `DELETE` | `/api/admin/questions` | إدارة أسئلة المسابقات الرقمية |
| `POST` / `PATCH` / `DELETE` | `/api/admin/agenda` | إدارة الأجندة والمناطق |
| `GET` | `/api/admin/leaderboard/full` | لوحة كاملة بالأسماء الحقيقية والدرجات |

**Sockets:** الأدمن بيُطلق نفس الـ Events المعرّفة في الجزء الأول والثاني (`leaderboard:update`, `news:published`, `news:deleted`, `agenda:update`, `judge:session:closed`) كل مرة يعمل تعديل مؤثر.

## 3.4 خريطة الصفحات (Frontend)

| الملف | الوصف |
|---|---|
| `src/pages/admin/News.jsx` | جديد — نشر/حذف خبر مباشر |
| `src/pages/admin/Reports.jsx` | جديد — عرض وتحميل تقارير الفرق |
| `src/pages/admin/Teams.jsx` | جديد — CRUD + استيراد جماعي للفرق |
| `src/pages/admin/Judges.jsx` | جديد — CRUD للمحكّمين + توليد أكواد المسابقات |
| `src/pages/admin/Agenda.jsx` | جديد — تحرير الجدول والمناطق (يستبدل الـ Hardcoded array) |
| `src/pages/admin/Scoring.jsx` | جديد — تعديل أي درجة (رقمية أو يدوية)، يستبدل/يوسّع منطق `VideoJudging.jsx` الحالي |
| `src/pages/admin/Competitions.jsx` | تعديل الموجودة — إضافة نوع المسابقة (`auto_digital`/`manual_judged`) وبنود التقييم الديناميكية |
| `src/pages/admin/Questions.jsx` | باقية كما هي تقريباً — امتداد بسيط لتوافق الـ API الجديد |

## 3.5 الأمان

- **Audit خفيف على الدرجات:** كل تعديل يسجّل `editedByAdminId` و `editedAt` تلقائياً على مستوى الـ Backend (قرار افتراضي مني — تحسين أمان بسيط ومنطقي، حتى لو مش مطلوب صراحة).
- **حساب واحد بس:** التوكن الخاص بيه لازم يكون قوي (JWT + انتهاء صلاحية قصير)، مع إمكانية تفعيل 2FA لاحقاً لو احتاج الأمر (غير أساسي دلوقتي).
- **تأكيد قبل الحذف:** أي عملية حذف (فريق / خبر / محكّم) لازم يظهر لها Confirmation Modal في الواجهة لمنع الحذف بالغلط.
- **صلاحيات السيرفر:** كل الـ Endpoints فوق تتطلب `role: admin` محقّق من السيرفر نفسه، مش بس إخفاء الروابط في الواجهة.

---

*نهاية مستند التخطيط الشامل للثلاث بوابات (الفرق / التحكيم / الأدمن). في انتظار ملاحظاتك أو الإجابة على الأسئلة المفتوحة المتبقية (بند 10، الجزء الأول) قبل البدء الفعلي في أي تنفيذ.*
