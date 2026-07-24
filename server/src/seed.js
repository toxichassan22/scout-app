import bcrypt from 'bcryptjs';
import prisma from './db.js';

async function seed() {
  console.log('[Seed] Starting database seed with official 15 Report Competitions + Digital Quizzes...');

  // 1️⃣ Admin Account
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword
    }
  });

  // 2️⃣ Sample Teams
  const sampleTeams = [
    { username: 'team1', label: 'الكتيبة الأولى', pass: 'team123' },
    { username: 'team2', label: 'فريق الصقور', pass: 'team123' },
    { username: 'team3', label: 'فريق النسر الفضي', pass: 'team123' },
    { username: 'team4', label: 'فريق الفرسان', pass: 'team123' },
    { username: 'team5', label: 'فريق الشعلة', pass: 'team123' }
  ];

  for (const t of sampleTeams) {
    const passwordHash = await bcrypt.hash(t.pass, 10);
    await prisma.team.upsert({
      where: { username: t.username },
      update: {},
      create: {
        username: t.username,
        passwordHash,
        label: t.label
      }
    });
  }

  // 3️⃣ Sample Judge
  const judgePassword = await bcrypt.hash('judge123', 10);
  await prisma.judge.upsert({
    where: { username: 'judge1' },
    update: {},
    create: {
      name: 'د. أحمد المحكّم',
      username: 'judge1',
      passwordHash: judgePassword
    }
  });

  // 4️⃣ Official Competitions (Digital Quizzes + 15 Report Competitions Selected by User)
  const competitions = [
    // Digital Interactive Quizzes
    {
      id: 'comp-digital-1',
      name: 'مسابقة عبقرينو (50 سؤالاً: 25 تقني + 25 كشفي)',
      slug: 'genius',
      type: 'auto_digital',
      description: 'خمسون سؤالاً متوازناً في ربع ساعة - الذكاء الاصطناعي والثقافة الكشفية والعامة',
      isOpen: true,
      duration: 900,
      criteria: JSON.stringify([])
    },
    {
      id: 'comp-digital-2',
      name: 'مسابقة حقيقتان وكذبة',
      slug: 'two_truths',
      type: 'auto_digital',
      description: 'اكتشف عبارة الزور من بين الحقائق الكشفية والتاريخية',
      isOpen: true,
      duration: 600,
      criteria: JSON.stringify([])
    },
    {
      id: 'comp-digital-3',
      name: 'مسابقة الجغرافيا وتضاريس الوطن العربي',
      slug: 'geography',
      type: 'auto_digital',
      description: 'التعرف على الأعلام والعواصم والعملات والتقسيم الإداري ونظام الحكم للـ 22 دولة عربية',
      isOpen: true,
      duration: 600,
      criteria: JSON.stringify([])
    },
    {
      id: 'comp-video-1',
      name: 'مسابقة تصميم الفيديو الكشفي (دقيقتين)',
      slug: 'video_design',
      type: 'manual_judged',
      description: 'تقييم لجنة التحكيم لمونتاج ومحتوى الفيديو الكشفي',
      isOpen: true,
      passcode: '1234',
      criteria: JSON.stringify([
        { key: 'creativity', label: 'الابتكار والفكرة', maxScore: 30 },
        { key: 'editing', label: 'جودة المونتاج والإخراج', maxScore: 40 },
        { key: 'sound', label: 'الهندسة الصوتية والمؤثرات', maxScore: 30 }
      ])
    },

    // 15 Official Report Competitions Selected by User
    { id: 'comp-quran', name: 'تسميع القرآن الكريم', slug: 'quran', type: 'manual_judged', isOpen: true, passcode: '1001', criteria: JSON.stringify([{ key: 'tajweed', label: 'التجويد والحفظ', maxScore: 100 }]) },
    { id: 'comp-hadith', name: 'تسميع الأحاديث النبوية', slug: 'hadith', type: 'manual_judged', isOpen: true, passcode: '1002', criteria: JSON.stringify([{ key: 'recitation', label: 'الحفظ والفهم', maxScore: 100 }]) },
    { id: 'comp-sports', name: 'المجال الرياضي (التحديات الرياضية)', slug: 'sports', type: 'manual_judged', isOpen: true, passcode: '1003', criteria: JSON.stringify([{ key: 'performance', label: 'الأداء والرياضة', maxScore: 100 }]) },
    { id: 'comp-art-poster', name: 'الملصق الفني الكشفي', slug: 'art_poster', type: 'manual_judged', isOpen: true, passcode: '1004', criteria: JSON.stringify([{ key: 'design', label: 'جودة الملصق والإبداع', maxScore: 100 }]) },
    { id: 'comp-knots', name: 'العقد والربطات الكشفية', slug: 'knots', type: 'manual_judged', isOpen: true, passcode: '1005', criteria: JSON.stringify([{ key: 'precision', label: 'دقة العقد السرعة', maxScore: 100 }]) },
    { id: 'comp-art-workshop', name: 'الورشة الفنية', slug: 'art_workshop', type: 'manual_judged', isOpen: true, passcode: '1006', criteria: JSON.stringify([{ key: 'art', label: 'الأعمال الفنية والتنفيذ', maxScore: 100 }]) },
    { id: 'comp-scout-model', name: 'النموذج الكشفي', slug: 'scout_model', type: 'manual_judged', isOpen: true, passcode: '1007', criteria: JSON.stringify([{ key: 'model', label: 'جودة وشكل النموذج الكشفي', maxScore: 100 }]) },
    { id: 'comp-innovations', name: 'بحث ثلاث أفكار لمبتكرات علمية', slug: 'innovations', type: 'manual_judged', isOpen: true, passcode: '1008', criteria: JSON.stringify([{ key: 'research', label: 'ابتكار الأفكار العلمية والبحث', maxScore: 100 }]) },
    { id: 'comp-carnival', name: 'الكرنفال الكشفي', slug: 'carnival', type: 'manual_judged', isOpen: true, passcode: '1009', criteria: JSON.stringify([{ key: 'show', label: 'العرض الكرنفالي والروح', maxScore: 100 }]) },
    { id: 'comp-ciphers', name: 'كينج الشفرات (King of Ciphers)', slug: 'ciphers', type: 'manual_judged', isOpen: true, passcode: '1010', criteria: JSON.stringify([{ key: 'decoding', label: 'سرعة حل الشفرات والدقة', maxScore: 100 }]) },
    { id: 'comp-models-pres', name: 'عرض تقديمي عن أحد الموديلات الكشفية', slug: 'models_presentation', type: 'manual_judged', isOpen: true, passcode: '1011', criteria: JSON.stringify([{ key: 'presentation', label: 'الإلقاء والعرض الميداني', maxScore: 100 }]) },
    { id: 'comp-ground-mag', name: 'المجلة الأرضية المعرض الكشفي', slug: 'ground_magazine', type: 'manual_judged', isOpen: true, passcode: '1012', criteria: JSON.stringify([{ key: 'magazine', label: 'تنسيق المجلة والمحتوى', maxScore: 100 }]) },
    { id: 'comp-comedy-pres', name: 'عرض تقديمي كوميدي عن مهارة كشفية', slug: 'comedy_presentation', type: 'manual_judged', isOpen: true, passcode: '1013', criteria: JSON.stringify([{ key: 'humor', label: 'الإبداع والكوميديا والمهارة', maxScore: 100 }]) },
    { id: 'comp-code-winner', name: 'من سيربح الكود (Code Winner)', slug: 'code_winner', type: 'manual_judged', isOpen: true, passcode: '1014', criteria: JSON.stringify([{ key: 'code', label: 'حل الأكواد والبرمجة', maxScore: 100 }]) },
    { id: 'comp-camp-night', name: 'سهرة السمر والختام', slug: 'camp_night', type: 'manual_judged', isOpen: true, passcode: '1015', criteria: JSON.stringify([{ key: 'samar', label: 'فقرة السمر والالتزام', maxScore: 100 }]) }
  ];

  for (const comp of competitions) {
    await prisma.competition.upsert({
      where: { id: comp.id },
      update: comp,
      create: comp
    });
  }
  console.log('[Seed] 15 Selected Report Competitions + Digital Quizzes created successfully!');

  // 5️⃣ 50 Balanced Genius Questions
  const balanced50Questions = [
    // 🧠 25 AI & Tech Questions
    { text: 'ما الميزة الأساسية لمعمارية الـ Transformer مقارنة بنماذج الـ RNN التقليدية؟', options: ['الاعتماد الكلي على القواعد المكتوبة يدوياً', 'معالجة البيانات بالتوازي (Parallel Processing)', 'عدم الحاجة لوجود معالجات رسومية (GPUs)'], correctOption: 1 },
    { text: 'ما الهدف الأساسي من خوارزمية الـ Gradient Descent في تعلم الآلة؟', options: ['تقليل قيمة دالة الخسارة (Loss Function)', 'زيادة عدد طبقات الشبكة العصبية', 'تحويل النصوص إلى صور تلقائياً'], correctOption: 0 },
    { text: 'مفهوم يعني انحياز النموذج للبيانات التي تدرب عليها فقط فيحقق دقة عالية في التدريب وأداءً سيئاً مع البيانات الجديدة:', options: ['Overfitting', 'Underfitting', 'Quantization'], correctOption: 0 },
    { text: 'ما هي دالة التفعيل (Activation Function) الأكثر استخداماً في الطبقات الخفية لتجنب مشكلة Vanishing Gradient؟', options: ['Sigmoid', 'Softmax', 'ReLU'], correctOption: 2 },
    { text: 'تقنية تُتيح نقل معرفة نموذج تم تدريبه مسبقاً لاستخدامه في مهمة جديدة:', options: ['إعادة تدريب النموذج من الصفر دائماً', 'Transfer Learning', 'تشفير البيانات أثناء النقل'], correctOption: 1 },
    { text: 'ما الهدف الأساسي من تقنية RAG (Retrieval-Augmented Generation)؟', options: ['تزويد النموذج ببيانات خارجية موثوقة لتقليل الهلوسة ودعم الإجابات ببيانات حديثة', 'تسريع توليد الصور فقط', 'ضغط حجم الهارد ديسك الخاص بالسيرفر'], correctOption: 0 },
    { text: 'ماذا يعني مصطلح Quantization في نماذج الذكاء الاصطناعي؟', options: ['تقليل دقة تمثيل أوزان النموذج لتسريع الاستدلال وحفظ الذاكرة', 'زيادة أعداد البارامترات في النموذج', 'حظر الإجابات المسيئة وغير الأخلاقية'], correctOption: 0 },
    { text: 'معامل "Temperature" في إعدادات النماذج اللغوية يحدد:', options: ['درجة حرارة المعالج أثناء التشغيل', 'مدى عشوائية وإبداع النص المُولد', 'سرعة اتصال الجهاز بالإنترنت'], correctOption: 1 },
    { text: 'ما هو هجوم الـ Prompt Injection؟', options: ['مسح محادثات المستخدم القديمة', 'إدخال تعليمات خبيثة لتجاوز قيود النموذج وجعله ينفذ أوامر غير مصرح بها', 'تعطيل الراوتر بشكل كامل'], correctOption: 1 },
    { text: 'ما هي نماذج الموداليات المتعددة (Multimodal Models)؟', options: ['نماذج تعمل بدون الحاجة لإنترنت', 'نماذج قادرة على فهم ومعالجة أنواع مختلفة من البيانات (نص، صورة، صوت) معاً', 'نماذج مخصصة للعمل كآلة حاسبة فقط'], correctOption: 1 },
    { text: 'ظاهرة "الهلوسة" (Hallucination) في النماذج اللغوية تعني:', options: ['توقف النظام عن العمل تماماً', 'مسح البيانات المسجلة بالخطأ', 'تقديم النموذج لمعلومات غير صحيحة أو مخترعة بثقة عالية'], correctOption: 2 },
    { text: 'ما التعقيدية الزمانية (Time Complexity) للبحث في شجرة بحث ثنائية متوازنة (Balanced BST)؟', options: ['O(1)', 'O(n²)', 'O(log n)'], correctOption: 2 },
    { text: 'حالة الـ Deadlock في أنظمة التشغيل تعني:', options: ['ارتفاع درجة حرارة اللوحة الأم', 'توقف العمليات لأن كل عملية تنتظر مورداً تحتجز العمليات الأخرى', 'انقطاع الاتصال بالشبكة المحلية'], correctOption: 1 },
    { text: 'مشكلة Race Condition في البرمجة متعددة الخيوط (Multithreading) تحدث عندما:', options: ['تحاول خيوط برمجية متعددة القراءة والتعديل على نفس البيانات في نفس الوقت دون تزامن', 'يعمل المعالج بأقصى سرعة ممكنة', 'يغلق البرنامج تلقائياً بعد إنهاء المهام'], correctOption: 0 },
    { text: 'ما ميزة بروتوكول UDP مقارنة بـ TCP؟', options: ['أنه بروتوكول غير متصل (Connectionless) وسريع ولكنه لا يضمن وصول الحزم', 'أنه يبطئ نقل البيانات في الشبكة', 'أنه يضمن ترتيب وصول الحزم بنسبة 100%'], correctOption: 0 },
    { text: 'ما الفرق الجوهري بين gRPC و REST APIs؟', options: ['gRPC تعتمد على HTTP/2 و Protocol Buffers بينما REST تعتمد غالباً على HTTP/1.1 و JSON', 'REST أسرع دائماً في نقل البيانات', 'gRPC لا تعمل مع لغات البرمجة الحديثة'], correctOption: 0 },
    { text: 'الهدف الرئيسي من استخدام أنظمة الـ CI/CD Pipelines هو:', options: ['أتمتة عمليات بناء، اختبار، ونشر الكود باستمرار وبأقل أخطاء بشرية', 'كتابة الأكواد البرمجية بدلاً من المطورين', 'مسح الملفات القديمة من السيرفر'], correctOption: 0 },
    { text: 'الـ Reverse Proxy (مثل Nginx) يُستخدم أساساً لـ:', options: ['استقبال الطلبات وتوزيع الأحمال (Load Balancing) وحماية السيرفرات الخلفية', 'تسريع تشغيل الألعاب على الحاسوب', 'تعديل كود الـ HTML تلقائياً'], correctOption: 0 },
    { text: 'ميزة الـ WebSockets مقارنة بالـ HTTP التقليدي:', options: ['أنها تعمل بدون إتصال بالإنترنت', 'توفير قناة اتصال مستمرة وثنائية الاتجاه (Full-duplex) بين العميل والسيرفر', 'تقليل حجم الصور المرفوعة تلقائياً'], correctOption: 1 },
    { text: 'هجوم Cross-Site Scripting (XSS) يتضمن:', options: ['حقن كود JavaScript خبيث ليتنفذ داخل متصفح المستخدمين الآخرين', 'قطع التيار الكهربائي عن غرفة السيرفرات', 'تخمين كلمة المرور يدوياً'], correctOption: 0 },
    { text: 'حماية قواعد البيانات من هجمات الـ SQL Injection تتطلب:', options: ['تغيير اسم قاعدة البيانات أسبوعياً', 'استخدام الاستعلامات المعلمية (Prepared Statements / Parameterized Queries)', 'إغلاق السيرفرات خلال أوقات الليل'], correctOption: 1 },
    { text: 'ثغرة الـ Zero-Day تعني:', options: ['ثغرة أمنية مجهولة تم استغلالها قبل توفر تحديث أو علاج أمني لها من المطور', 'ثغرة تظهر فقط في اليوم الأول من كل شهر', 'تطبيق ينتهي اشتراكه بعد يوم واحد'], correctOption: 0 },
    { text: 'الـ Hashing (مثل SHA-256) يختلف عن التشفير التقليدي بأنه:', options: ['يمكن فك الهاش بسهولة بمفتاح خاص', 'عملية أحادية الاتجاه (One-way) لا يمكن استرجاع النص الأصلي منها', 'يُستخدم فقط للصور وليس للنصوص'], correctOption: 1 },
    { text: 'هجوم الـ DDoS Attack يهدف إلى:', options: ['إغراق السيرفر بطلبات وهمية مكثفة من شبكة أجهزة مخترقة لإسقاط الخدمة', 'سرقة الشاشات التابعة للسيرفر', 'تعديل ألوان الموقع الإلكتروني'], correctOption: 0 },
    { text: 'أداة الـ JWT (JSON Web Token) تُستخدم بشكل شائع في:', options: ['تخزين ملفات الفيديو الضخمة', 'إثبات الهوية والترخيص (Authentication & Authorization) بشكل آمن', 'ضغط الصور قبل نشرها'], correctOption: 1 },

    // ⚜️ 25 Scout, Religious & General Culture Questions
    { text: 'أين يوجد مقام سيدنا إبراهيم عليه السلام ؟', options: ['المدينة المنورة', 'القدس', 'مكة المكرمة'], correctOption: 2 },
    { text: 'ما هي أطول رحلة في تاريخ البشرية ؟', options: ['رحلة الشتاء والصيف', 'رحلة الإسراء والمعراج', 'اكتشاف الأميركتين'], correctOption: 1 },
    { text: 'ما هي السورة التي تقع في نصف القرآن ؟', options: ['سورة مريم', 'سورة الكهف', 'سورة الأنفال'], correctOption: 1 },
    { text: 'ما هو الشيء الذي خُلق من حجر ؟', options: ['ناقة صالح', 'هدهد سليمان', 'فيل أبرهة'], correctOption: 0 },
    { text: 'لماذا سمي سيدنا عمر ابن الخطاب بالفاروق ؟', options: ['لأنه يفرق بين الحق والباطل', 'لأنه يفرق أحسنا', 'لأنه قدراته فارقة عن غيره'], correctOption: 0 },
    { text: 'من هو مؤذن الرسول ؟', options: ['عبد الله بن مسعود', 'بلال بن رباح', 'سعد بن أبي وقاص'], correctOption: 1 },
    { text: 'من أول من رمى سهم في سبيل الله ؟', options: ['حمزة بن عبد المطلب', 'عمر بن الخطاب', 'سعد بن أبي وقاص'], correctOption: 2 },
    { text: 'من الذي قاد المسلمين في معركة عين جالوت ؟', options: ['صلاح الدين الأيوبي', 'سيف الدين قطز', 'الظاهر بيبرس'], correctOption: 1 },
    { text: 'كم عدد السجدات في القرآن الكريم ؟', options: ['15 سجدة', '21 سجدة', '30 سجدة'], correctOption: 0 },
    { text: 'كم عدد أرباع القرآن الكريم ؟', options: ['180 ربع', '240 ربع', '280 ربع'], correctOption: 1 },
    { text: 'كم عدد آيات القرآن الكريم ؟', options: ['6236', '6848', '7214'], correctOption: 0 },
    { text: 'كم عدد المرات التي سعت فيها السيدة هاجر بين الصفا والمروة ؟', options: ['خمس مرات', 'سبع مرات', 'تسع مرات'], correctOption: 1 },
    { text: 'ماهي السورة الوحيدة التي بدأت وانتهت بنداء ( يا أيها الذين أمنو ) ؟', options: ['سورة الأنفال', 'سورة هود', 'سورة الممتحنة'], correctOption: 2 },
    { text: 'ما هي أكبر جزيرة في البحر المتوسط ؟', options: ['براونسي', 'جزيرة صقلية', 'برمودة'], correctOption: 1 },
    { text: 'ما هي اصغر دولة في العالم ؟', options: ['الفاتيكان', 'البحرين', 'قطر'], correctOption: 0 },
    { text: 'ما هي أصغر دولة عربية من حيث المساحة ؟', options: ['قطر', 'البحرين', 'جزر القمر'], correctOption: 1 },
    { text: 'ما هي المدينة التي تسمى بمدينة الضباب ؟', options: ['باريس', 'موسكو', 'لندن'], correctOption: 2 },
    { text: 'من هو مكتشف أمريكا ؟', options: ['ماجلان', 'كريستوفر كولومبوس', 'كونت كونتى'], correctOption: 1 },
    { text: 'إلى ماذا يشير مصطلح الذهب الأسود ؟', options: ['البترول', 'الفحم', 'الغاز الطبيعي'], correctOption: 0 },
    { text: 'ما هي أول دولة قامت باستخدام الطابع البريدي فما هي ؟', options: ['فرنسا', 'بريطانيا', 'تركيا'], correctOption: 1 },
    { text: 'ماهي الدولة التي يطلق عليها بلد المليون شهيد ؟', options: ['مصر', 'فلسطين', 'الجزائر'], correctOption: 2 },
    { text: 'من أول من عرف البارود و أشعله ؟', options: ['الصينيون', 'البيانيون', 'القدماء المصريين'], correctOption: 0 },
    { text: 'كم عدد ألوان قوس قزح ؟', options: ['7 ألوان', '9 ألوان', '11 لون'], correctOption: 0 },
    { text: 'من هو أول من اكتشف وحدة قياس الفيمتو ثانية ( Femto - Second ) ؟', options: ['د/أحمد زويل', 'الحسن بن الهيثم', 'جابر بن حيان'], correctOption: 0 },
    { text: 'من هو مخترع قانون الجاذبية ؟', options: ['آينشتين', 'أرشميدس', 'إسحاق نيوتن'], correctOption: 2 }
  ];

  await prisma.question.deleteMany({ where: { competitionId: 'comp-digital-1' } });

  for (let idx = 0; idx < balanced50Questions.length; idx++) {
    const q = balanced50Questions[idx];
    await prisma.question.create({
      data: {
        id: `g_q_${idx + 1}`,
        competitionId: 'comp-digital-1',
        text: q.text,
        options: JSON.stringify(q.options),
        correctOption: q.correctOption,
        points: 2,
        sortOrder: idx + 1
      }
    });
  }

  // 6️⃣ Seed Official 22 Arab Geography Countries
  const arabCountries = [
    { id: 'geo-1', name: 'مصر', capital: 'القاهرة', division: '27 محافظة', governance: 'جمهوري رئاسي', currency: 'جنيه مصري', flag: '🇪🇬', sortOrder: 1 },
    { id: 'geo-2', name: 'السعودية', capital: 'الرياض', division: '13 منطقة إدارية', governance: 'ملكي مطلق', currency: 'ريال سعودي', flag: '🇸🇦', sortOrder: 2 },
    { id: 'geo-3', name: 'الإمارات', capital: 'أبوظبي', division: '7 إمارات اتحادية', governance: 'إتحادي رئاسي', currency: 'درهم إماراتي', flag: '🇦🇪', sortOrder: 3 },
    { id: 'geo-4', name: 'الكويت', capital: 'الكويت', division: '6 محافظات', governance: 'أميري دستوري', currency: 'دينار كويتي', flag: '🇰🇼', sortOrder: 4 },
    { id: 'geo-5', name: 'قطر', capital: 'الدوحة', division: '8 بلديات', governance: 'أميري وراثي', currency: 'ريال قطري', flag: '🇶🇦', sortOrder: 5 },
    { id: 'geo-6', name: 'البحرين', capital: 'المنامة', division: '4 محافظات', governance: 'ملكي دستوري', currency: 'دينار بحريني', flag: '🇧🇭', sortOrder: 6 },
    { id: 'geo-7', name: 'سلطنة عُمان', capital: 'مسقط', division: '11 محافظة', governance: 'سلطاني وراثي', currency: 'ريال عُماني', flag: '🇴🇲', sortOrder: 7 },
    { id: 'geo-8', name: 'الأردن', capital: 'عمّان', division: '12 محافظة', governance: 'ملكي نيابي وراثي', currency: 'دينار أردني', flag: '🇯🇴', sortOrder: 8 },
    { id: 'geo-9', name: 'العراق', capital: 'بغداد', division: '18 محافظة', governance: 'جمهوري برلماني اتحادي', currency: 'دينار عراقي', flag: '🇮🇶', sortOrder: 9 },
    { id: 'geo-10', name: 'سوريا', capital: 'دمشق', division: '14 محافظة', governance: 'جمهوري', currency: 'ليرة سورية', flag: '🇸🇾', sortOrder: 10 },
    { id: 'geo-11', name: 'لبنان', capital: 'بيروت', division: '9 محافظات', governance: 'جمهوري برلماني', currency: 'ليرة لبنانية', flag: '🇱🇧', sortOrder: 11 },
    { id: 'geo-12', name: 'فلسطين', capital: 'القدس', division: '16 محافظة', governance: 'جمهوري شبه رئاسي', currency: 'الشيكل / الدينار الأردني', flag: '🇵🇸', sortOrder: 12 },
    { id: 'geo-13', name: 'اليمن', capital: 'صنعاء', division: '22 محافظة', governance: 'جمهوري', currency: 'ريال يمني', flag: '🇾🇪', sortOrder: 13 },
    { id: 'geo-14', name: 'السودان', capital: 'الخرطوم', division: '18 ولاية', governance: 'جمهوري', currency: 'جنيه سوداني', flag: '🇸🇩', sortOrder: 14 },
    { id: 'geo-15', name: 'ليبيا', capital: 'طرابلس', division: '22 بلدية', governance: 'جمهوري', currency: 'دينار ليبي', flag: '🇱🇾', sortOrder: 15 },
    { id: 'geo-16', name: 'تونس', capital: 'تونس', division: '24 ولاية', governance: 'جمهوري رئاسي', currency: 'دينار تونسي', flag: '🇹🇳', sortOrder: 16 },
    { id: 'geo-17', name: 'الجزائر', capital: 'الجزائر', division: '58 ولاية', governance: 'جمهوري شبه رئاسي', currency: 'دينار جزائري', flag: '🇩🇿', sortOrder: 17 },
    { id: 'geo-18', name: 'المغرب', capital: 'الرباط', division: '12 جهة', governance: 'ملكي دستوري نيابي', currency: 'درهم مغربي', flag: '🇲🇦', sortOrder: 18 },
    { id: 'geo-19', name: 'موريتانيا', capital: 'نواكشوط', division: '15 ولاية', governance: 'جمهوري إسلامي', currency: 'أوقية موريتانية', flag: '🇲🇷', sortOrder: 19 },
    { id: 'geo-20', name: 'الصومال', capital: 'مقديشو', division: '18 إقليماً', governance: 'جمهوري اتحادي برلماني', currency: 'شلن صومالي', flag: '🇸🇴', sortOrder: 20 },
    { id: 'geo-21', name: 'جيبوتي', capital: 'جيبوتي', division: '6 أقاليم', governance: 'جمهوري شبه رئاسي', currency: 'فرنك جيبوتي', flag: '🇩🇯', sortOrder: 21 },
    { id: 'geo-22', name: 'جزر القمر', capital: 'موروني', division: '3 جزر رئيسية', governance: 'جمهوري اتحادي رئاسي', currency: 'فرنك قمري', flag: '🇰🇲', sortOrder: 22 },
  ];

  for (const item of arabCountries) {
    await prisma.geographyCountry.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 7️⃣ Official 8 Zones
  const officialZones = [
    { id: 'zone-1', numberLabel: '١', name: 'مبنى الإدارة', description: 'المقر الإداري واستقبال الوفود', colorHex: '#ef4444', order: 1 },
    { id: 'zone-2', numberLabel: '٢', name: 'مبنى الأنشطة', description: 'منطقة الورش والمسابقات الثقافية والذكاء الاصطناعي', colorHex: '#10b981', order: 2 },
    { id: 'zone-3', numberLabel: '٣', name: 'المسجد', description: 'مكان الصلاة والمصلى الرئيسي', colorHex: '#f59e0b', order: 3 },
    { id: 'zone-4', numberLabel: '٤', name: 'المبنى الجديد', description: 'قاعات المحاضرات والتقييمات الميدانية', colorHex: '#3b82f6', order: 4 },
    { id: 'zone-5', numberLabel: '٥', name: 'المخيم الكشفي', description: 'أرض المخيم الكشفي والتخييم الكشفي الفعلي', colorHex: '#8b5cf6', order: 5 },
    { id: 'zone-6', numberLabel: '٦', name: 'ملعب كرة القدم', description: 'الملعب الكروي الرئيسي والعروض الميدانية', colorHex: '#06b6d4', order: 6 },
    { id: 'zone-7', numberLabel: '٧', name: 'ملعب كرة السلة', description: 'ملعب الرياضات السريعة والمسابقات الميدانية', colorHex: '#ec4899', order: 7 },
    { id: 'zone-8', numberLabel: '٨', name: 'ملعب الخماسي', description: 'ملعب الأنشطة الكشفية الخماسية والألعاب الرياضية', colorHex: '#14b8a6', order: 8 },
  ];

  for (const z of officialZones) {
    await prisma.zone.upsert({
      where: { id: z.id },
      update: { name: z.name, description: z.description, numberLabel: z.numberLabel, colorHex: z.colorHex, order: z.order },
      create: z
    });
  }

  // 8️⃣ Official Agenda Items
  const officialAgenda = [
    {
      id: 'agenda-1',
      title: 'تجمع واستقبال الوفود',
      type: 'ceremony',
      zoneId: 'zone-1',
      startTime: '08:00',
      endTime: '09:00',
      description: 'استقبال جميع الفرق والوفود الكشفية المشاركة وتوزيع التعليمات التنظيمية'
    },
    {
      id: 'agenda-2',
      title: 'تحية العلم وافتتاح المهرجان',
      type: 'ceremony',
      zoneId: 'zone-5',
      startTime: '09:00',
      endTime: '10:00',
      description: 'مراسم رفع العلم الكشفي وافتتاح فعاليات المهرجان رسمياً'
    },
    {
      id: 'agenda-3',
      title: 'اجتماع القادة وتسليم الأعمال الجاهزة',
      type: 'workshop',
      zoneId: 'zone-1',
      startTime: '10:00',
      endTime: '10:30',
      description: 'اجتماع قادة الفرق وتسليم الأبحاث والأعمال الكشفية المجهزة مسبقاً'
    },
    {
      id: 'agenda-4',
      title: 'تسميع القرآن والأحاديث والأنشطة الفنية والرياضية',
      type: 'competition',
      zoneId: 'zone-2',
      startTime: '10:30',
      endTime: '11:30',
      description: 'تسميع القرآن - تسميع الأحاديث - المجال الرياضي - الملصق الفني - عقد وربطات - تصميم فيديو دقيقتين - عواصم وعملات الدول العربية'
    },
    {
      id: 'agenda-5',
      title: 'الورش الفنية والمبتكرات العلمية والنموذج الكشفي',
      type: 'workshop',
      zoneId: 'zone-2',
      startTime: '11:30',
      endTime: '01:00',
      description: 'تكملة المجال الرياضي - الورشة الفنية - النموذج الكشفي - بحث ثلاث أفكار لمبتكرات علمية - ورقة عمل على خطي الأنبياء'
    },
    {
      id: 'agenda-6',
      title: 'صلاة الجمعة',
      type: 'ceremony',
      zoneId: 'zone-3',
      startTime: '01:00',
      endTime: '02:00',
      description: 'أداء صلاة الجمعة بالمصلى الرئيسي للمخيم'
    },
    {
      id: 'agenda-7',
      title: 'العروض الميدانية والمعرض والمسابقات الكشفية',
      type: 'competition',
      zoneId: 'zone-6',
      startTime: '02:00',
      endTime: '04:00',
      description: 'عرض تطير الطائرات - الكرنفال - كينج الشفرات - عرض تقديمي عن أحد الموديلات - حقيقتين وكذبة - نصب المجلة الأرضية والمعرض الساعة 3 العصر - الكاشف الذكي'
    },
    {
      id: 'agenda-8',
      title: 'الخدمة العامة والعروض التقديمية ومهرجان التلاوة',
      type: 'workshop',
      zoneId: 'zone-5',
      startTime: '04:00',
      endTime: '05:30',
      description: 'الخدمة العامة - عرض تقديمي كوميدي عن مهارة - من سيربح الكود - الاستعداد للختام - مهرجان التلاوة'
    },
    {
      id: 'agenda-9',
      title: 'حفل الختام والسمر الكشفي',
      type: 'ceremony',
      zoneId: 'zone-6',
      startTime: '05:30',
      endTime: '08:30',
      description: 'حفل الختام الرسمي، إعلان النتائج وتوزيع الجوائز وسهرة السمر الكشفي'
    }
  ];

  for (const item of officialAgenda) {
    await prisma.agendaItem.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  console.log('[Seed] Completed seeding 15 selected report competitions successfully!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
