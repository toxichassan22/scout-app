import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import prisma from './db.js';
import { OFFICIAL_AGENDA, OFFICIAL_ZONES } from './agendaCanonical.js';

async function seed() {
  const explicitlyAllowed = process.env.ALLOW_PRODUCTION_SEED === 'I_UNDERSTAND_THIS_MODIFIES_DATA';
  if (process.env.NODE_ENV === 'production' && !explicitlyAllowed) {
    throw new Error('Production seed refused. Set ALLOW_PRODUCTION_SEED explicitly for a planned maintenance operation.');
  }
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  const judgePassword = process.env.INITIAL_JUDGE_PASSWORD;
  const teamPassword = process.env.INITIAL_TEAM_PASSWORD;
  if (!adminPassword || !judgePassword || !teamPassword || [adminPassword, judgePassword, teamPassword].some(value => value.length < 12)) {
    throw new Error('Seed requires env-provided initial passwords of at least 12 characters; no default credentials are allowed.');
  }
  console.log('[Seed] Explicitly authorized idempotent seed...');

  // 1️⃣ Admin Account
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.admin.upsert({
    where: { username: process.env.INITIAL_ADMIN_USERNAME || 'admin' },
    update: {},
    create: {
      username: process.env.INITIAL_ADMIN_USERNAME || 'admin',
      passwordHash: adminPasswordHash
    }
  });

  // 2️⃣ Official Sample Teams
  const sampleTeams = [{
    username: process.env.INITIAL_TEAM_USERNAME || 'team1',
    label: process.env.INITIAL_TEAM_LABEL || 'فريق تجريبي'
  }];

  for (const t of sampleTeams) {
    const passwordHash = await bcrypt.hash(teamPassword, 12);
    const team = await prisma.team.upsert({
      where: { username: t.username },
      update: {},
      create: {
        username: t.username,
        passwordHash,
        label: t.label
      }
    });

    // Seed 24 default scout members for each team
    const existingMembersCount = await prisma.teamMember.count({ where: { teamId: team.id } });
    if (existingMembersCount === 0) {
      for (let i = 1; i <= 24; i++) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            name: `عضو كشفي #${i} - ${t.label}`,
            role: i === 1 ? 'قائد الفريق' : i === 2 ? 'نائب القائد' : 'عضو'
          }
        });
      }
    }
  }

  // 3️⃣ Official Judge bootstrap account
  const judgePasswordHash = await bcrypt.hash(judgePassword, 12);
  await prisma.judge.upsert({
    where: { username: process.env.INITIAL_JUDGE_USERNAME || 'judge1' },
    update: {},
    create: {
      name: 'محكم أول',
      username: process.env.INITIAL_JUDGE_USERNAME || 'judge1',
      passwordHash: judgePasswordHash
    }
  });

  // 4️⃣ Official report competitions (manual_judged) — one report per team per competition
  const reportCompetitions = [
    {
      id: 'comp-report-5',
      name: 'تسميع القرآن الكريم',
      slug: 'report_quran',
      type: 'manual_judged',
      description: 'حفظ وتسميع آيات وأجزاء من القرآن الكريم',
      isOpen: true,
      passcode: '1005',
      criteria: JSON.stringify([
        { key: 'memorization', label: 'حسن الحفظ والتثبت', maxScore: 50 },
        { key: 'tajweed', label: 'التجويد والأداء الصوتي', maxScore: 30 },
        { key: 'confidence', label: 'الثقة والأداء أمام اللجنة', maxScore: 20 }
      ])
    },
    {
      id: 'comp-report-6',
      name: 'تسميع الأحاديث النبوية',
      slug: 'report_hadith',
      type: 'manual_judged',
      description: 'حفظ وتسميع أحاديث نبوية مختارة مع الفهم والتطبيق',
      isOpen: true,
      passcode: '1006',
      criteria: JSON.stringify([
        { key: 'memorization', label: 'حسن الحفظ', maxScore: 50 },
        { key: 'understanding', label: 'فهم المعنى والشرح', maxScore: 30 },
        { key: 'presentation', label: 'الأداء والثقة', maxScore: 20 }
      ])
    },
    {
      id: 'comp-report-8',
      name: 'الملصق الفني الكشفي',
      slug: 'report_poster',
      type: 'manual_judged',
      description: 'تصميم ملصق فني يعبر عن قيمة أو موضوع كشفي',
      isOpen: true,
      passcode: '1008',
      criteria: JSON.stringify([
        { key: 'design', label: 'التصميم والجاذبية البصرية', maxScore: 40 },
        { key: 'message', label: 'وضوح الرسالة والفكرة', maxScore: 30 },
        { key: 'creativity', label: 'الإبداع والتنفيذ', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-9',
      name: 'العقد والربطات الكشفية',
      slug: 'report_knots',
      type: 'manual_judged',
      description: 'إتقان عقد وربطات كشفية مفيدة في المخيم والخدمة',
      isOpen: true,
      passcode: '1009',
      criteria: JSON.stringify([
        { key: 'mastery', label: 'إتقان العقد بشكل صحيح', maxScore: 50 },
        { key: 'speed', label: 'السرعة والمهارة', maxScore: 25 },
        { key: 'usage', label: 'معرفة الاستخدامات العملية', maxScore: 25 }
      ])
    },
    {
      id: 'comp-report-10',
      name: 'الورشة الفنية',
      slug: 'report_art_workshop',
      type: 'manual_judged',
      description: 'تقرير ومخرجات ورشة فنية تنفذها الفرقة',
      isOpen: true,
      passcode: '1010',
      criteria: JSON.stringify([
        { key: 'output', label: 'جودة المخرج الفني', maxScore: 40 },
        { key: 'teamwork', label: 'التعاون الجماعي', maxScore: 30 },
        { key: 'documentation', label: 'توثيق خطوات الورشة', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-11',
      name: 'النموذج الكشفي',
      slug: 'report_scout_model',
      type: 'manual_judged',
      description: 'تصميم وعرض نموذج كشفي تعليمي أو وظيفي',
      isOpen: true,
      passcode: '1011',
      criteria: JSON.stringify([
        { key: 'model', label: 'جودة النموذج والتنفيذ', maxScore: 40 },
        { key: 'idea', label: 'فكرة النموذج والفائدة', maxScore: 30 },
        { key: 'presentation', label: 'جودة العرض والشرح', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-12',
      name: 'بحث ثلاث أفكار لمبتكرات علمية',
      slug: 'report_science_ideas',
      type: 'manual_judged',
      description: 'بحث وتقديم ثلاث أفكار لمبتكرات علمية قابلة للتطبيق',
      isOpen: true,
      passcode: '1012',
      criteria: JSON.stringify([
        { key: 'ideas', label: 'جودة الأفكار والإبداع', maxScore: 40 },
        { key: 'research', label: 'عمق البحث والمصادر', maxScore: 30 },
        { key: 'presentation', label: 'جودة العرض والتنفيذ', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-13',
      name: 'ورقة عمل على خطى الأنبياء',
      slug: 'report_prophets',
      type: 'manual_judged',
      description: 'إعداد ورقة عمل تربوية مستوحاة من سير الأنبياء',
      isOpen: true,
      passcode: '1013',
      criteria: JSON.stringify([
        { key: 'content', label: 'محتوى الورقة والقيمة التربوية', maxScore: 40 },
        { key: 'design', label: 'تصميم الورقة وتنظيمها', maxScore: 30 },
        { key: 'applicability', label: 'قابلية التطبيق في الفترة الكشفية', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-15',
      name: 'الكرنفال الكشفي',
      slug: 'report_carnival',
      type: 'manual_judged',
      description: 'تقرير مشاركة الفرقة في الكرنفال الكشفي والأنشطة المصاحبة',
      isOpen: true,
      passcode: '1015',
      criteria: JSON.stringify([
        { key: 'participation', label: 'مستوى المشاركة والتنظيم', maxScore: 40 },
        { key: 'creativity', label: 'الإبداع في العرض', maxScore: 30 },
        { key: 'impact', label: 'التأثير والتفاعل', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-17',
      name: 'عرض تقديمي عن أحد الموديلات الكشفية',
      slug: 'report_model_presentation',
      type: 'manual_judged',
      description: 'عرض تقديمي يشرح أحد الموديلات أو المهارات الكشفية',
      isOpen: true,
      passcode: '1017',
      criteria: JSON.stringify([
        { key: 'content', label: 'جودة المحتوى والشرح', maxScore: 40 },
        { key: 'presentation', label: 'جودة العرض التقديمي', maxScore: 30 },
        { key: 'engagement', label: 'التفاعل وإيصال الفكرة', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-18',
      name: 'المجلة الأرضية المعرض الكشفي',
      slug: 'report_scout_magazine',
      type: 'manual_judged',
      description: 'إعداد مجلة أرضية أو معرض كشفي يوثق أنشطة الفرقة',
      isOpen: true,
      passcode: '1018',
      criteria: JSON.stringify([
        { key: 'content', label: 'تنوع وجودة المحتوى', maxScore: 40 },
        { key: 'design', label: 'التصميم والتنسيق', maxScore: 30 },
        { key: 'creativity', label: 'الإبداع في العرض', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-19',
      name: 'الكاشف الذكي (Smart Scout Detector)',
      slug: 'report_smart_detector',
      type: 'manual_judged',
      description: 'ابتكار أو برمجة كاشف ذكي يخدم فكرة كشفية أو علمية',
      isOpen: true,
      passcode: '1019',
      criteria: JSON.stringify([
        { key: 'innovation', label: 'الفكرة والابتكار', maxScore: 40 },
        { key: 'execution', label: 'التنفيذ والعملية', maxScore: 30 },
        { key: 'presentation', label: 'جودة العرض والشرح', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-21',
      name: 'عرض تقديمي كوميدي عن مهارة كشفية',
      slug: 'report_comedy_scout',
      type: 'manual_judged',
      description: 'عرض كوميدي قصير يوضح مهارة أو قيمة كشفية',
      isOpen: true,
      passcode: '1021',
      criteria: JSON.stringify([
        { key: 'humor', label: 'الفكاهة والإبداع', maxScore: 40 },
        { key: 'message', label: 'وضوح الرسالة الكشفية', maxScore: 30 },
        { key: 'performance', label: 'الأداء والتمثيل', maxScore: 30 }
      ])
    },
    {
      id: 'comp-report-23',
      name: 'مهرجان التلاوة',
      slug: 'report_tilawa_festival',
      type: 'manual_judged',
      description: 'مشاركة الفرقة في مهرجان التلاوة وتقرير الأداء',
      isOpen: true,
      passcode: '1023',
      criteria: JSON.stringify([
        { key: 'recitation', label: 'جودة التلاوة والتجويد', maxScore: 50 },
        { key: 'voice', label: 'الأداء الصوتي والخشوع', maxScore: 30 },
        { key: 'presence', label: 'الحضور والثقة', maxScore: 20 }
      ])
    },
    {
      id: 'comp-report-24',
      name: 'سهرة السمر والختام',
      slug: 'report_closing_night',
      type: 'manual_judged',
      description: 'تقرير مشاركة الفرقة في سهرة السمر والختام',
      isOpen: true,
      passcode: '1024',
      criteria: JSON.stringify([
        { key: 'participation', label: 'مستوى المشاركة', maxScore: 40 },
        { key: 'performance', label: 'جودة الأداء الفني', maxScore: 30 },
        { key: 'teamwork', label: 'التعاون والروح الجماعية', maxScore: 30 }
      ])
    }
  ];

  // Clean up old placeholder report competitions that were replaced by official list
  const staleReportIds = ['comp-manual-2', 'comp-manual-3', 'comp-manual-4', 'comp-manual-5', 'comp-manual-6'];
  try {
    await prisma.report.deleteMany({ where: { competitionId: { in: staleReportIds } } });
    await prisma.score.deleteMany({ where: { competitionId: { in: staleReportIds } } });
    await prisma.competition.deleteMany({ where: { id: { in: staleReportIds } } });
  } catch (err) {
    console.warn('[Seed] Could not remove stale placeholder competitions:', err.message);
  }

  // 5️⃣ The 3 Main Official Competitions (+ Video Design) + Report Competitions
  const competitions = [
    {
      id: 'comp-digital-1',
      name: 'مسابقة عبقرينو',
      slug: 'genius',
      type: 'auto_digital',
      description: 'خمسون سؤالاً متوازناً في ربع ساعة - الذكاء الاصطناعي والثقافة الكشفية والعامة',
      isOpen: true,
      passcode: '1001',
      duration: 900, // 15 mins
      criteria: JSON.stringify([{ key: 'score', label: 'درجة الأسئلة الإلكترونية', maxScore: 100 }])
    },
    {
      id: 'comp-digital-2',
      name: 'مسابقة حقيقتان وكذبة',
      slug: 'two_truths',
      type: 'auto_digital',
      description: 'اكتشف عبارة الزور من بين الحقائق الكشفية والتاريخية',
      isOpen: true,
      passcode: '1002',
      duration: 600,
      criteria: JSON.stringify([{ key: 'score', label: 'درجة الأسئلة الإلكترونية', maxScore: 100 }])
    },
    {
      id: 'comp-digital-3',
      name: 'مسابقة الجغرافيا',
      slug: 'geography',
      type: 'auto_digital',
      description: 'التعرف على الأعلام والعواصم والعملات والتقسيم الإداري ونظام الحكم للـ 22 دولة عربية',
      isOpen: true,
      passcode: '1003',
      duration: 600,
      criteria: JSON.stringify([{ key: 'score', label: 'درجة الأعلام والعواصم', maxScore: 100 }])
    },
    {
      id: 'comp-video-1',
      name: 'مسابقة تصميم الفيديو الكشفي',
      slug: 'video_design',
      type: 'manual_judged',
      description: 'تقييم لجنة التحكيم لمونتاج ومحتوى الفيديو الكشفي والتقارير',
      isOpen: true,
      passcode: '1234',
      criteria: JSON.stringify([
        { key: 'creativity', label: 'الابتكار والفكرة', maxScore: 30 },
        { key: 'editing', label: 'جودة المونتاج والإخراج', maxScore: 40 },
        { key: 'sound', label: 'الهندسة الصوتية والمؤثرات', maxScore: 30 }
      ])
    },
    // 5️⃣ Official report competitions (manual_judged) — each accepts one team report
    ...reportCompetitions
  ];

  for (const comp of competitions) {
    await prisma.competition.upsert({
      where: { id: comp.id },
      update: {},
      create: comp
    });
  }

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

  for (let idx = 0; idx < balanced50Questions.length; idx++) {
    const q = balanced50Questions[idx];
    const questionId = `g_q_${idx + 1}`;
    const existing = await prisma.question.findUnique({ where: { id: questionId } });
    if (!existing) {
      await prisma.question.create({
        data: {
          id: questionId,
          competitionId: 'comp-digital-1',
          text: q.text,
          options: JSON.stringify(q.options),
          correctOption: q.correctOption,
          points: 2,
          sortOrder: idx + 1
        }
      });
    }
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

  // 7️⃣ Official schedule zones and the complete canonical program.
  for (const z of OFFICIAL_ZONES) {
    await prisma.zone.upsert({
      where: { id: z.id },
      update: { name: z.name, description: z.description, numberLabel: z.numberLabel, colorHex: z.colorHex, order: z.order },
      create: z
    });
  }

  // Only rows owned by the canonical schedule are replaced. Unrelated admin UUID rows remain intact.
  await prisma.agendaItem.deleteMany({ where: { id: { startsWith: 'agenda-official-' } } });
  for (const item of OFFICIAL_AGENDA) {
    await prisma.agendaItem.create({ data: item });
  }

  console.log('[Seed] Core data verified with 8 zones and ' + OFFICIAL_AGENDA.length + ' complete agenda items.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
