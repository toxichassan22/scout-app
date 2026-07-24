import os
import json
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display

# Register Arabic Font
pdfmetrics.registerFont(TTFont('ArabicFont', 'C:\\Windows\\Fonts\\tahoma.ttf'))
pdfmetrics.registerFont(TTFont('ArabicBold', 'C:\\Windows\\Fonts\\tahomabd.ttf'))

def ar(text):
    if not text:
        return ""
    reshaped_text = arabic_reshaper.reshape(str(text))
    return get_display(reshaped_text)

# Read questions from seed data logic
questions = [
    # 25 AI & Tech Questions
    {"text": "1 / ما الميزة الأساسية لمعمارية الـ Transformer مقارنة بنماذج الـ RNN التقليدية؟", "options": ["أ) الاعتماد الكلي على القواعد المكتوبة يدوياً", "ب) معالجة البيانات بالتوازي (Parallel Processing)", "ج) عدم الحاجة لوجود معالجات رسومية (GPUs)"], "correct": 1},
    {"text": "2 / ما الهدف الأساسي من خوارزمية الـ Gradient Descent في تعلم الآلة؟", "options": ["أ) تقليل قيمة دالة الخسارة (Loss Function)", "ب) زيادة عدد طبقات الشبكة العصبية", "ج) تحويل النصوص إلى صور تلقائياً"], "correct": 0},
    {"text": "3 / مفهوم يعني انحياز النموذج للبيانات التي تدرب عليها فقط فيحقق دقة عالية في التدريب وأداءً سيئاً مع البيانات الجديدة:", "options": ["أ) Overfitting", "ب) Underfitting", "ج) Quantization"], "correct": 0},
    {"text": "4 / ما هي دالة التفعيل (Activation Function) الأكثر استخداماً في الطبقات الخفية لتجنب مشكلة Vanishing Gradient؟", "options": ["أ) Sigmoid", "ب) Softmax", "ج) ReLU"], "correct": 2},
    {"text": "5 / تقنية تُتيح نقل معرفة نموذج تم تدريبه مسبقاً لاستخدامه في مهمة جديدة:", "options": ["أ) إعادة تدريب النموذج من الصفر دائماً", "ب) Transfer Learning", "ج) تشفير البيانات أثناء النقل"], "correct": 1},
    {"text": "6 / ما الهدف الأساسي من تقنية RAG (Retrieval-Augmented Generation)؟", "options": ["أ) تزويد النموذج ببيانات خارجية موثوقة لتقليل الهلوسة ودعم الإجابات ببيانات حديثة", "ب) تسريع توليد الصور فقط", "ج) ضغط حجم الهارد ديسك الخاص بالسيرفر"], "correct": 0},
    {"text": "7 / ماذا يعني مصطلح Quantization في نماذج الذكاء الاصطناعي؟", "options": ["أ) تقليل دقة تمثيل أوزان النموذج لتسريع الاستدلال وحفظ الذاكرة", "ب) زيادة أعداد البارامترات في النموذج", "ج) حظر الإجابات المسيئة وغير الأخلاقية"], "correct": 0},
    {"text": "8 / معامل \"Temperature\" في إعدادات النماذج اللغوية يحدد:", "options": ["أ) درجة حرارة المعالج أثناء التشغيل", "ب) مدى عشوائية وإبداع النص المُولد", "ج) سرعة اتصال الجهاز بالإنترنت"], "correct": 1},
    {"text": "9 / ما هو هجوم الـ Prompt Injection؟", "options": ["أ) مسح محادثات المستخدم القديمة", "ب) إدخال تعليمات خبيثة لتجاوز قيود النموذج وجعله ينفذ أوامر غير مصرح بها", "ج) تعطيل الراوتر بشكل كامل"], "correct": 1},
    {"text": "10 / ما هي نماذج الموداليات المتعددة (Multimodal Models)؟", "options": ["أ) نماذج تعمل بدون الحاجة لإنترنت", "ب) نماذج قادرة على فهم ومعالجة أنواع مختلفة من البيانات (نص، صورة، صوت) معاً", "ج) نماذج مخصصة للعمل كآلة حاسبة فقط"], "correct": 1},
    {"text": "11 / ظاهرة \"الهلوسة\" (Hallucination) في النماذج اللغوية تعني:", "options": ["أ) توقف النظام عن العمل تماماً", "ب) مسح البيانات المسجلة بالخطأ", "ج) تقديم النموذج لمعلومات غير صحيحة أو مخترعة بثقة عالية"], "correct": 2},
    {"text": "12 / ما التعقيدية الزمانية (Time Complexity) للبحث في شجرة بحث ثنائية متوازنة (Balanced BST)؟", "options": ["أ) O(1)", "ب) O(n²)", "ج) O(log n)"], "correct": 2},
    {"text": "13 / حالة الـ Deadlock في أنظمة التشغيل تعني:", "options": ["أ) ارتفاع درجة حرارة اللوحة الأم", "ب) توقف العمليات لأن كل عملية تنتظر مورداً تحتجز العمليات الأخرى", "ج) انقطاع الاتصال بالشبكة المحلية"], "correct": 1},
    {"text": "14 / مشكلة Race Condition في البرمجة متعددة الخيوط (Multithreading) تحدث عندما:", "options": ["أ) تحاول خيوط برمجية متعددة القراءة والتعديل على نفس البيانات في نفس الوقت دون تزامن", "ب) يعمل المعالج بأقصى سرعة ممكنة", "ج) يغلق البرنامج تلقائياً بعد إنهاء المهام"], "correct": 0},
    {"text": "15 / ما ميزة بروتوكول UDP مقارنة بـ TCP؟", "options": ["أ) أنه بروتوكول غير متصل (Connectionless) وسريع ولكنه لا يضمن وصول الحزم", "ب) أنه يبطئ نقل البيانات في الشبكة", "ج) أنه يضمن ترتيب وصول الحزم بنسبة 100%"], "correct": 0},
    {"text": "16 / ما الفرق الجوهري بين gRPC و REST APIs؟", "options": ["أ) gRPC تعتمد على HTTP/2 و Protocol Buffers بينما REST تعتمد غالباً على HTTP/1.1 و JSON", "ب) REST أسرع دائماً في نقل البيانات", "ج) gRPC لا تعمل مع لغات البرمجة الحديثة"], "correct": 0},
    {"text": "17 / الهدف الرئيسي من استخدام أنظمة الـ CI/CD Pipelines هو:", "options": ["أ) أتمتة عمليات بناء، اختبار، ونشر الكود باستمرار وبأقل أخطاء بشرية", "ب) كتابة الأكواد البرمجية بدلاً من المطورين", "ج) مسح الملفات القديمة من السيرفر"], "correct": 0},
    {"text": "18 / الـ Reverse Proxy (مثل Nginx) يُستخدم أساساً لـ:", "options": ["أ) استقبال الطلبات وتوزيع الأحمال (Load Balancing) وحماية السيرفرات الخلفية", "ب) تسريع تشغيل الألعاب على الحاسوب", "ج) تعديل كود الـ HTML تلقائياً"], "correct": 0},
    {"text": "19 / ميزة الـ WebSockets مقارنة بالـ HTTP التقليدي:", "options": ["أ) أنها تعمل بدون إتصال بالإنترنت", "ب) توفير قناة اتصال مستمرة وثنائية الاتجاه (Full-duplex) بين العميل والسيرفر", "ج) تقليل حجم الصور المرفوعة تلقائياً"], "correct": 1},
    {"text": "20 / هجوم Cross-Site Scripting (XSS) يتضمن:", "options": ["أ) حقن كود JavaScript خبيث ليتنفذ داخل متصفح المستخدمين الآخرين", "ب) قطع التيار الكهربائي عن غرفة السيرفرات", "ج) تخمين كلمة المرور يدوياً"], "correct": 0},
    {"text": "21 / حماية قواعد البيانات من هجمات الـ SQL Injection تتطلب:", "options": ["أ) تغيير اسم قاعدة البيانات أسبوعياً", "ب) استخدام الاستعلامات المعلمية (Prepared Statements / Parameterized Queries)", "ج) إغلاق السيرفرات خلال أوقات الليل"], "correct": 1},
    {"text": "22 / ثغرة الـ Zero-Day تعني:", "options": ["أ) ثغرة أمنية مجهولة تم استغلالها قبل توفر تحديث أو علاج أمني لها من المطور", "ب) ثغرة تظهر فقط في اليوم الأول من كل شهر", "ج) تطبيق ينتهي اشتراكه بعد يوم واحد"], "correct": 0},
    {"text": "23 / الـ Hashing (مثل SHA-256) يختلف عن التشفير التقليدي بأنه:", "options": ["أ) يمكن فك الهاش بسهولة بمفتاح خاص", "ب) عملية أحادية الاتجاه (One-way) لا يمكن استرجاع النص الأصلي منها", "ج) يُستخدم فقط للصور وليس للنصوص"], "correct": 1},
    {"text": "24 / هجوم الـ DDoS Attack يهدف إلى:", "options": ["أ) إغراق السيرفر بطلبات وهمية مكثفة من شبكة أجهزة مخترقة لإسقاط الخدمة", "ب) سرقة الشاشات التابعة للسيرفر", "ج) تعديل ألوان الموقع الإلكتروني"], "correct": 0},
    {"text": "25 / أداة الـ JWT (JSON Web Token) تُستخدم بشكل شائع في:", "options": ["أ) تخزين ملفات الفيديو الضخمة", "ب) إثبات الهوية والترخيص (Authentication & Authorization) بشكل آمن", "ج) ضغط الصور قبل نشرها"], "correct": 1},

    # 25 Scout & General Culture Questions
    {"text": "26 / أين يوجد مقام سيدنا إبراهيم عليه السلام ؟", "options": ["أ) المدينة المنورة", "ب) القدس", "ج) مكة المكرمة"], "correct": 2},
    {"text": "27 / ما هي أطول رحلة في تاريخ البشرية ؟", "options": ["أ) رحلة الشتاء والصيف", "ب) رحلة الإسراء والمعراج", "ج) اكتشاف الأميركتين"], "correct": 1},
    {"text": "28 / ما هي السورة التي تقع في نصف القرآن ؟", "options": ["أ) سورة مريم", "ب) سورة الكهف", "ج) سورة الأنفال"], "correct": 1},
    {"text": "29 / ما هو الشيء الذي خُلق من حجر ؟", "options": ["أ) ناقة صالح", "ب) هدهد سليمان", "ج) فيل أبرهة"], "correct": 0},
    {"text": "30 / لماذا سمي سيدنا عمر ابن الخطاب بالفاروق ؟", "options": ["أ) لأنه يفرق بين الحق والباطل", "ب) لأنه يفرق أحسنا", "ج) لأنه قدراته فارقة عن غيره"], "correct": 0},
    {"text": "31 / من هو مؤذن الرسول ؟", "options": ["أ) عبد الله بن مسعود", "ب) بلال بن رباح", "ج) سعد بن أبي وقاص"], "correct": 1},
    {"text": "32 / من أول من رمى سهم في سبيل الله ؟", "options": ["أ) حمزة بن عبد المطلب", "ب) عمر بن الخطاب", "ج) سعد بن أبي وقاص"], "correct": 2},
    {"text": "33 / من الذي قاد المسلمين في معركة عين جالوت ؟", "options": ["أ) صلاح الدين الأيوبي", "ب) سيف الدين قطز", "ج) الظاهر بيبرس"], "correct": 1},
    {"text": "34 / كم عدد السجدات في القرآن الكريم ؟", "options": ["أ) 15 سجدة", "ب) 21 سجدة", "ج) 30 سجدة"], "correct": 0},
    {"text": "35 / كم عدد أرباع القرآن الكريم ؟", "options": ["أ) 180 ربع", "ب) 240 ربع", "ج) 280 ربع"], "correct": 1},
    {"text": "36 / كم عدد آيات القرآن الكريم ؟", "options": ["أ) 6236", "ب) 6848", "ج) 7214"], "correct": 0},
    {"text": "37 / كم عدد المرات التي سعت فيها السيدة هاجر بين الصفا والمروة ؟", "options": ["أ) خمس مرات", "ب) سبع مرات", "ج) تسع مرات"], "correct": 1},
    {"text": "38 / ماهي السورة الوحيدة التي بدأت وانتهت بنداء ( يا أيها الذين أمنو ) ؟", "options": ["أ) سورة الأنفال", "ب) سورة هود", "ج) سورة الممتحنة"], "correct": 2},
    {"text": "39 / ما هي أكبر جزيرة في البحر المتوسط ؟", "options": ["أ) براونسي", "ب) جزيرة صقلية", "ج) برمودة"], "correct": 1},
    {"text": "40 / ما هي اصغر دولة في العالم ؟", "options": ["أ) الفاتيكان", "ب) البحرين", "ج) قطر"], "correct": 0},
    {"text": "41 / ما هي أصغر دولة عربية من حيث المساحة ؟", "options": ["أ) قطر", "ب) البحرين", "ج) جزر القمر"], "correct": 1},
    {"text": "42 / ما هي المدينة التي تسمى بمدينة الضباب ؟", "options": ["أ) باريس", "ب) موسكو", "ج) لندن"], "correct": 2},
    {"text": "43 / من هو مكتشف أمريكا ؟", "options": ["أ) ماجلان", "ب) كريستوفر كولومبوس", "ج) كونت كونتى"], "correct": 1},
    {"text": "44 / إلى ماذا يشير مصطلح الذهب الأسود ؟", "options": ["أ) البترول", "ب) الفحم", "ج) الغاز الطبيعي"], "correct": 0},
    {"text": "45 / ما هي أول دولة قامت باستخدام الطابع البريدي فما هي ؟", "options": ["أ) فرنسا", "ب) بريطانيا", "ج) تركيا"], "correct": 1},
    {"text": "46 / ماهي الدولة التي يطلق عليها بلد المليون شهيد ؟", "options": ["أ) مصر", "ب) فلسطين", "ج) الجزائر"], "correct": 2},
    {"text": "47 / من أول من عرف البارود و أشعله ؟", "options": ["أ) الصينيون", "ب) البيانيون", "ج) القدماء المصريين"], "correct": 0},
    {"text": "48 / كم عدد ألوان قوس قزح ؟", "options": ["أ) 7 ألوان", "ب) 9 ألوان", "ج) 11 لون"], "correct": 0},
    {"text": "49 / من هو أول من اكتشف وحدة قياس الفيمتو ثانية ( Femto - Second ) ؟", "options": ["أ) د/أحمد زويل", "ب) الحسن بن الهيثم", "ج) جابر بن حيان"], "correct": 0},
    {"text": "50 / من هو مخترع قانون الجاذبية ؟", "options": ["أ) آينشتين", "ب) أرشميدس", "ج) إسحاق نيوتن"], "correct": 2}
]

def generate_pdf():
    pdf_filename = "d:\\app scout\\مسابقة_عبقرينو_الإجابات_النموذجية.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=18,
        leading=24,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=1 # Center
    )
    
    subtitle_style = ParagraphStyle(
        'SubTitleStyle',
        parent=styles['Normal'],
        fontName='ArabicFont',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#047857'),
        alignment=1 # Center
    )

    header_section_style = ParagraphStyle(
        'HeaderSectionStyle',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor('#b91c1c'),
        alignment=2 # Right
    )

    q_style = ParagraphStyle(
        'QStyle',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#1f2937'),
        alignment=2 # Right
    )

    opt_style = ParagraphStyle(
        'OptStyle',
        parent=styles['Normal'],
        fontName='ArabicFont',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151'),
        alignment=2 # Right
    )

    opt_correct_style = ParagraphStyle(
        'OptCorrectStyle',
        parent=styles['Normal'],
        fontName='ArabicBold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#065f46'),
        backColor=colors.HexColor('#d1fae5'), # Highlight Green
        alignment=2 # Right
    )

    story = []

    # Header Title
    story.append(Paragraph(ar("محافظة القاهرة - مديرية الشباب والرياضة - منطقة عين شمس"), subtitle_style))
    story.append(Paragraph(ar("مركز شباب منشية التحرير - مجموعات المنشية الكشفية والإرشادية"), subtitle_style))
    story.append(Spacer(1, 8))
    story.append(Paragraph(ar("🌟 مسابقة عبقرينو الكشفية الرقمية (50 سؤالاً في 15 دقيقة) 🌟"), title_style))
    story.append(Paragraph(ar("نموذج الأسئلة والإجابات الرسمية المعتمدة - المهرجان السنوي التاسع والعشرون"), subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#3b82f6'), spaceAfter=15))

    # Section 1: AI & Tech
    story.append(Paragraph(ar("🚀 القسم الأول: الذكاء الاصطناعي والتكنولوجيا والأمن السيبراني (25 سؤالاً)"), header_section_style))
    story.append(Spacer(1, 8))

    for idx, q in enumerate(questions):
        if idx == 25:
            story.append(Spacer(1, 10))
            story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#10b981'), spaceAfter=15))
            story.append(Paragraph(ar("⚜️ القسم الثاني: الثقافة الكشفية والعامة والعلوم (25 سؤالاً)"), header_section_style))
            story.append(Spacer(1, 8))

        # Question text
        story.append(Paragraph(ar(q["text"]), q_style))
        story.append(Spacer(1, 4))

        # Options
        opts_formatted = []
        for opt_idx, opt_text in enumerate(q["options"]):
            is_ans = (opt_idx == q["correct"])
            if is_ans:
                opts_formatted.append(Paragraph(ar(f"<b><u>✔ {opt_text} (الإجابة الصحيحة)</u></b>"), opt_correct_style))
            else:
                opts_formatted.append(Paragraph(ar(opt_text), opt_style))

        # Render options inside a clean table
        table_data = [[opts_formatted[2]], [opts_formatted[1]], [opts_formatted[0]]]
        t = Table(table_data, colWidths=[520])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('TOPPADDING', (0,0), (-1,-1), 3),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    doc.build(story)
    print("PDF Generated successfully!")

if __name__ == "__main__":
    generate_pdf()
