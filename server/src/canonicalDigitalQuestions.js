import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTwoTruthsQuestions } from './workbook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TWO_TRUTHS_WORKBOOK = path.join(PROJECT_ROOT, 'حقيقتين و كدبه.xlsx');

export const CANONICAL_TWO_TRUTHS_50 = [
  {
    "id": "tt_q_1",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "كوكب الزهرة هو أشد كواكب المجموعة الشمسية حرارة",
        "isLie": false
      },
      {
        "text": "الشمس تدور حول الأرض مرة كل 365 يوماً وتعتبر أكبر كوكب صلب",
        "isLie": true
      },
      {
        "text": "اليوم على كوكب المريخ يقارب 24 ساعة و39 دقيقة",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 1
  },
  {
    "id": "tt_q_2",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "كوكب المشتري هو أصغر كوكب ويتكون بالكامل من الصخور الصلبة",
        "isLie": true
      },
      {
        "text": "المجموعة الشمسية تقع في أحد أذرع مجرة درب التبانة",
        "isLie": false
      },
      {
        "text": "القمر ليس له غلاف جوي سميك يحميه من النيازك",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 2
  },
  {
    "id": "tt_q_3",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "حزام الكويكبات الرئيسي يقع بين مداري المريخ والمشتري",
        "isLie": false
      },
      {
        "text": "السنة على كوكب عطارد أطول بكثير من السنة على نبتون",
        "isLie": true
      },
      {
        "text": "الثقب الأسود يمتلك جاذبية فائقة يمنع الضوء من الإفلات",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 3
  },
  {
    "id": "tt_q_4",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "يوري جاجارين هو أول إنسان يصعد إلى الفضاء الخارجي عام 1961",
        "isLie": false
      },
      {
        "text": "كوكب زحل هو الكوكب الوحيد الذي يمتلك حلقات حوله",
        "isLie": true
      },
      {
        "text": "رحلة أبوللو 11 هي أول رحلة هبطت بالإنسان على سطح القمر",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 4
  },
  {
    "id": "tt_q_5",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "النجم القطبي يُستخدم منذ القدم في تحديد اتجاه الشمال الجغرافي",
        "isLie": false
      },
      {
        "text": "المذنبات تتكون أساساً من الحديد والذهب الخالص وتشتعل قرب الأرض",
        "isLie": true
      },
      {
        "text": "مجرة أندروميدا هي أقرب مجرة حلزونية كبيرة لمجرتنا",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 5
  },
  {
    "id": "tt_q_6",
    "category": "التاريخ الإسلامي",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "غزوة بدر الكبرى وقعت في السنة الثانية من الهجرة في رمضان",
        "isLie": false
      },
      {
        "text": "أبو بكر الصديق هو أول سفير في الإسلام واستُشهد في مؤتة",
        "isLie": true
      },
      {
        "text": "صلاة الجمعة فرض عين على كل مسلم بالغ عاقل مقيم",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 6
  },
  {
    "id": "tt_q_7",
    "category": "التاريخ الإسلامي",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "عثمان بن عفان هو أول الخلفاء الراشرين وقائد معركة القادسية",
        "isLie": true
      },
      {
        "text": "سورة البقرة هي أطول سورة في القرآن الكريم وتحتوي آية الكرسي",
        "isLie": false
      },
      {
        "text": "معركة حطين عام 1187م قادها صلاح الدين الأيوبي لتحرير القدس",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 7
  },
  {
    "id": "tt_q_8",
    "category": "التاريخ الإسلامي",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "عدد سور القرآن الكريم 114 سورة وأول ما نزل أوائل العلق",
        "isLie": false
      },
      {
        "text": "جمع القرآن الكريم في مصحف واحد لأول مرة تم في عهد هارون الرشيد",
        "isLie": true
      },
      {
        "text": "العشرة المبشرون بالجنة هم من صحابة النبي محمد",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 8
  },
  {
    "id": "tt_q_9",
    "category": "التاريخ الإسلامي",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "فتح مكة كان في السنة الثامنة للهجرة وكان فتحاً عظيماً",
        "isLie": false
      },
      {
        "text": "الإمام البخاري وُلد في مكة وتوفي ودفن في المدينة المنورة",
        "isLie": true
      },
      {
        "text": "معركة اليرموك وقعت بين المسلمين والإمبراطورية البيزنطية",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 9
  },
  {
    "id": "tt_q_10",
    "category": "التاريخ الإسلامي",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "عمر بن الخطاب هو من كتب \"الرسالة\" وأسس المذهب الشافعي",
        "isLie": true
      },
      {
        "text": "الخلافة العباسية تأسست بعد سقوط الدولة الأموية عام 132 هـ",
        "isLie": false
      },
      {
        "text": "أركان الإسلام خمسة وأركان الإيمان ستة",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 10
  },
  {
    "id": "tt_q_11",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "نهر النيل هو أطول نهر في العالم ويقع في قارة أفريقيا",
        "isLie": false
      },
      {
        "text": "مدينة قسنطينة هي عاصمة البرازيل وتطل على المحيط الهادي",
        "isLie": true
      },
      {
        "text": "الثورة الفرنسية اندلعت عام 1789م وأثرت على تاريخ أوروبا",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 11
  },
  {
    "id": "tt_q_12",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "جبل إيفرست يقع في أمريكا الجنوبية في سلسلة جبال الأنديز",
        "isLie": true
      },
      {
        "text": "الحرب العالمية الأولى بدأت عام 1914 وانتهت عام 1918م",
        "isLie": false
      },
      {
        "text": "قارة أستراليا هي أصغر قارات العالم مساحة وتعد قارة ودولة",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 12
  },
  {
    "id": "tt_q_13",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الإسكندر المقدوني أنشأ إمبراطورية امتدت من اليونان للهند",
        "isLie": false
      },
      {
        "text": "سور الصين العظيم بُني بالكامل في قرن واحد خلال الحكم العثماني",
        "isLie": true
      },
      {
        "text": "المحيط الهادئ هو أكبر محيطات العالم من حيث المساحة",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 13
  },
  {
    "id": "tt_q_14",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "مدينة إسطنبول تقع جزئياً في قارة أوروبا وجزئياً في قارة آسيا",
        "isLie": false
      },
      {
        "text": "دولة اليابان تتكون من جزيرة صخرية واحدة ولا توجد بها براكين",
        "isLie": true
      },
      {
        "text": "حضارة المايا نشأت وتطورت في منطقة أمريكا الوسطى",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 14
  },
  {
    "id": "tt_q_15",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "نهر الأمازون يقع في قارة أوروبا ويمر داخل فرنسا وألمانيا",
        "isLie": true
      },
      {
        "text": "القارة القطبيّة الجنوبية (أنتاركتيكا) هي أبرد قارات الأرض",
        "isLie": false
      },
      {
        "text": "عاصمة المملكة المتحدة هي مدينة لندن ويمر بها خط غرينتش",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 15
  },
  {
    "id": "tt_q_16",
    "category": "الفنون والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "لوحة \"المونا ليزا\" الشهيرة رسمها ليوناردو دا فينشي",
        "isLie": false
      },
      {
        "text": "الشاعر العربي المتنبي عاش في الأندلس وكان الشاعر الخاص للملك لوثر",
        "isLie": true
      },
      {
        "text": "الموسيقار بتهوفن ألف بعض أعظم سيمفونياته بعد إصابته بالصمم",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 16
  },
  {
    "id": "tt_q_17",
    "category": "الفنون والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "رواية \"البؤساء\" كتبها الأديب الفرنسي فيكتور هوجو",
        "isLie": false
      },
      {
        "text": "المسرحية الشهيرة \"هاملت\" كتبها الفيلسوف اليوناني أرسطو",
        "isLie": true
      },
      {
        "text": "الكاتب المصري نج نجيب محفوظ هو أول أديب عربي ينال نوبل",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 17
  },
  {
    "id": "tt_q_18",
    "category": "الفنون والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "لوحة \"ليلة النجوم\" رسمها بيكاسو في أسلوب التكعيبية",
        "isLie": true
      },
      {
        "text": "ملحمة \"الإلياذة والأوديسة\" تُنسب للشاعر اليوناني هوميروس",
        "isLie": false
      },
      {
        "text": "الموسيقار موتسارت بدأ التأليف الموسيقي والعزف في طفولته",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 18
  },
  {
    "id": "tt_q_19",
    "category": "الفنون والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "تمثال \"داوود\" الشهير في فلورنسا نحته الفنان ميكيلانجيلو",
        "isLie": false
      },
      {
        "text": "أم كلثوم هي مطربة سينمائية إيطالية عاشت في القرن الـ19",
        "isLie": true
      },
      {
        "text": "خط المسند هو نظام كتابة قديم نشأ في جنوب الجزيرة العربية",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 19
  },
  {
    "id": "tt_q_20",
    "category": "الفنون والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "مسرحية \"روميو وجولييت\" كتبها الأديب الروسي دوستويفسكي",
        "isLie": true
      },
      {
        "text": "فن \"الأوريغامي\" هو فن طي الورق التقليدي المنشأ في اليابان",
        "isLie": false
      },
      {
        "text": "الكاتب تشارلز ديكنز هو مؤلف رواية \"أوليفر تويست\"",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 20
  },
  {
    "id": "tt_q_21",
    "category": "علوم عامة وطبيعة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الأكسجين يشكل 21% من الغلاف الجوي والنيتروجين 78%",
        "isLie": false
      },
      {
        "text": "قلب الإنسان يتكون من ستة أذينات وأربعة بطينات ضخمة",
        "isLie": true
      },
      {
        "text": "سرعة الضوء في الفراغ تبلغ تقريباً 300,000 كم/ثانية",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 21
  },
  {
    "id": "tt_q_22",
    "category": "علوم عامة وطبيعة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الحوت الأزرق هو أكبر كائن حي يعيش على كوكب الأرض",
        "isLie": false
      },
      {
        "text": "الخفافيش هي نوع من الطيور ذات الريش ولا تنتمي للثدييات",
        "isLie": true
      },
      {
        "text": "النباتات تقوم بعملية البناء الضوئي لإنتاج الغذاء بضوء الشمس",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 22
  },
  {
    "id": "tt_q_23",
    "category": "علوم عامة وطبيعة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الذرة تتكون من نواة (بروتونات ونيوترونات) وإلكترونات",
        "isLie": false
      },
      {
        "text": "حاسة التذوق عند الإنسان تعتمد كلياً على الأذن الوسطى",
        "isLie": true
      },
      {
        "text": "درجة غليان الماء النقية عند مستوى سطح البحر هي 100°C",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 23
  },
  {
    "id": "tt_q_24",
    "category": "علوم عامة وطبيعة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "خلايا الدم الحمراء مسؤولة عن نقل الأكسجين إلى أنحاء الجسم",
        "isLie": false
      },
      {
        "text": "البكتيريا والفيروسات هما نفس الكائن وتؤثر فيهما المضادات الحيوية بنفس الكفاءة",
        "isLie": true
      },
      {
        "text": "عنصر الهيدروجين هو الأخف والأكثر وفرة في الكون",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 24
  },
  {
    "id": "tt_q_25",
    "category": "علوم عامة وطبيعة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الصوت ينتقل في الفراغ الخارجي أسرع من انتقاله في الهواء",
        "isLie": true
      },
      {
        "text": "حمض الـ DNA يحمل التعليمات الشفرية الجينية الكملة",
        "isLie": false
      },
      {
        "text": "جهاز المناعة يتعرف على الأجسام الغريبة بإنتاج الأجسام المضادة",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 25
  },
  {
    "id": "tt_q_26",
    "category": "الثقافة العامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الألعاب الأولمبية الحديثة بدأت لأول مرة في نيويورك عام 1990",
        "isLie": true
      },
      {
        "text": "بطولة كأس العالم لكرة القدم تقام مرة كل أربعة سنوات",
        "isLie": false
      },
      {
        "text": "حجر رشيد مكن العالم شامبليون من فك رموز الهيروغليفية",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 26
  },
  {
    "id": "tt_q_27",
    "category": "الثقافة العامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "سور الصين العظيم والأهرامات يعتبران من أشهر المعالم",
        "isLie": false
      },
      {
        "text": "غاليليو غاليلي استخدم التلسكوب لدعم مركزية الشمس",
        "isLie": false
      },
      {
        "text": "لعبة الشطرنج تم اختراعها في القرن الـ21 في القطب الشمالي",
        "isLie": true
      }
    ],
    "correctOption": 2,
    "points": 1,
    "sortOrder": 27
  },
  {
    "id": "tt_q_28",
    "category": "الثقافة العامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "ابن الهيثم يُعتبر مؤسس علم البصريات ومكتشف الكاميرا المظلمة",
        "isLie": false
      },
      {
        "text": "قارة أمريكا تم اكتشافها بواسطة الرحالة ماركو بولو عام 1850م",
        "isLie": true
      },
      {
        "text": "الخط المسند والحروف الأبجدية من مراحل تطور الكتابة",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 28
  },
  {
    "id": "tt_q_29",
    "category": "الثقافة العامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "إسحاق نيوتن صاغ قوانين الحركة وقانون الجاذبية العام",
        "isLie": false
      },
      {
        "text": "البنسلين اكتشفه العالم لويس باستور عام 1600",
        "isLie": true
      },
      {
        "text": "آلبرت أينشتاين هو صاحب النظرية النسبية",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 29
  },
  {
    "id": "tt_q_30",
    "category": "الثقافة العامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "كرة القدم تُمارس رسمياً تحت الماء بملابس الغوص في كأس العالم",
        "isLie": true
      },
      {
        "text": "جائزة نوبل للسلام تُمنح بواسطة لجنة نوبل النرويجية",
        "isLie": false
      },
      {
        "text": "الأهرامات الثلاثة في الجيزة بُنيت في عهد خوفو وخفرع ومنقرع",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 30
  },
  {
    "id": "tt_q_31",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الشفق القطبي يحدث بسبب تفاعل الأسماك مع أمواج المحيط",
        "isLie": true
      },
      {
        "text": "كوكب أورانوس يتميز بكونه يدور على جانبه تقريباً",
        "isLie": false
      },
      {
        "text": "التلسكوب جيمس ويب يعمل بالأشعة تحت الحمراء لرصد المجرات",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 31
  },
  {
    "id": "tt_q_32",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الخسوف القمري يحدث عندما تقع الأرض بين الشمس والقمر",
        "isLie": false
      },
      {
        "text": "السنة الضوئية هي وحدة لقياس الزمن وتساوي 365 يوماً أرضياً",
        "isLie": true
      },
      {
        "text": "الثقوب السوداء تنشأ بعد انهيار النجوم الفائقة الكتلة",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 32
  },
  {
    "id": "tt_q_33",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "كوكب عطارد لا يملك أي أقمار طبيعية تدور حوله",
        "isLie": false
      },
      {
        "text": "الغلاف الجوي للأرض يتكون في معظمه من ثاني أكسيد الكربون بنسبة 90%",
        "isLie": true
      },
      {
        "text": "سديم الأوريون هو منطقة نشطة لتشكل النجوم الجديدة",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 33
  },
  {
    "id": "tt_q_34",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "كوكب المشتري يمتلك أكثر من 80 قمراً وأكبر أقماره جانيميد",
        "isLie": false
      },
      {
        "text": "رواد الفضاء يستطيعون التحدث وسماع بعضهم بالفضاء بدون راديو",
        "isLie": true
      },
      {
        "text": "ظاهرة المد والجزر تنشأ أساساً بسبب جاذبية القمر والشمس",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 34
  },
  {
    "id": "tt_q_35",
    "category": "الفلك والفضاء",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "حزام كويبر يقع خلف نبتون ويحتوي على أجرام مثل بلوتو",
        "isLie": false
      },
      {
        "text": "كوكب الزهرة يدور حول نفسه في ساعتين فقط ويملك 4 أقمار",
        "isLie": true
      },
      {
        "text": "تلسكوب هابل الفضائي أُطلق في المدار عام 1990م",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 35
  },
  {
    "id": "tt_q_36",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "العاصمة الحالية لإيطاليا هي مدريد وتقع في شبه الجزيرة العربية",
        "isLie": true
      },
      {
        "text": "جدار برلين تم هدمه عام 1989 وتوحدت ألمانيا بعد ذلك",
        "isLie": false
      },
      {
        "text": "قناة السويس المائية تربط بين البحر المتوسط والبحر الأحمر",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 36
  },
  {
    "id": "tt_q_37",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الدولة الرومانية القديمة تأسست في آسيا وعاصمتها طوكيو",
        "isLie": true
      },
      {
        "text": "حجر رشيد اكتُشف أثناء الحملة الفرنسية على مصر عام 1799م",
        "isLie": false
      },
      {
        "text": "مضيق جبل طارق يفصل بين قارة أوروبا وقارة أفريقيا",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 37
  },
  {
    "id": "tt_q_38",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الصحراء الكبرى تقع في القطب الشمالي وتغطي كندا بالكامل",
        "isLie": true
      },
      {
        "text": "الثورة الصناعية بدأت في بريطانيا في القرن الثامن عشر",
        "isLie": false
      },
      {
        "text": "بحيرة بايكال في روسيا تُعد أعمق وأقدم بحيرة عذبة في العالم",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 38
  },
  {
    "id": "tt_q_39",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "مدينة بغداد بُنيت في عهد أبو جعفر المنصور وتُلقب بمدينة السلام",
        "isLie": false
      },
      {
        "text": "دولة الفاتيكان هي أكبر دولة في العالم مساحة وسكاناً",
        "isLie": true
      },
      {
        "text": "معركة ووترلو عام 1815 كانت الهزيمة الأخيرة لنابليون بونابرت",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 39
  },
  {
    "id": "tt_q_40",
    "category": "الجغرافيا والتاريخ",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "مدينة الإسكندرية أسسها الفراعنة قبل بناء الأهرامات بألف سنة",
        "isLie": true
      },
      {
        "text": "البحر الميت يُعتبر أخفض نقطة على يابسة سطح الأرض",
        "isLie": false
      },
      {
        "text": "الدولة العثمانية انتهت رسمياً بعد الحرب العالمية الأولى",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 40
  },
  {
    "id": "tt_q_41",
    "category": "الحضارة والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "ابن خلدون يُعتبر مؤسس علم الاجتماع وصاحب \"المقدمة\"",
        "isLie": false
      },
      {
        "text": "معركة عين جالوت قادها قطز ضد الجيش الإسباني في الأطلسي",
        "isLie": true
      },
      {
        "text": "بيت الحكمة في بغداد كان مركزاً كبيراً للترجمة والبحث العلمى",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 41
  },
  {
    "id": "tt_q_42",
    "category": "الحضارة والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الخوارزمي هو عالم رياضيات مسلم يُعتبر مؤسس علم الجبر",
        "isLie": false
      },
      {
        "text": "وثيقة المدينة كتبها النبي لتنظيم العلاقة بعد الهجرة إلى مكة",
        "isLie": true
      },
      {
        "text": "معجم \"لسان العرب\" ألفه ابن منظور",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 42
  },
  {
    "id": "tt_q_43",
    "category": "الحضارة والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الشاعر أحمد شوقي لُقب بشاعر النيل وحافظ إبراهيم بأمير الشعراء",
        "isLie": true
      },
      {
        "text": "المسجد الأقصى يقع في القدس الشريف وهو أولى القبلتين",
        "isLie": false
      },
      {
        "text": "كتاب \"القانون في الطب\" مرجع طبي شهير ألفه ابن سينا",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 43
  },
  {
    "id": "tt_q_44",
    "category": "الحضارة والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الحسن بن الهيثم شرح حدوث الرؤية بنعكاس الضوء للعين",
        "isLie": false
      },
      {
        "text": "معركة بدر وقعت بعد فتح مكة بعشر سنوات في أرض العراق",
        "isLie": true
      },
      {
        "text": "جامع القرويين في فاس بالمغرب يُعتبر من أقدم الجامعات المستمرة",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 44
  },
  {
    "id": "tt_q_45",
    "category": "الحضارة والأدب",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "كتاب \"ألف ليلة وليلة\" حكايات شعبية شهيرة تحكيها شهرزاد",
        "isLie": false
      },
      {
        "text": "الشاعر ويليام شكسبير كتب كل مسرحياته باللغة العربية الفصحى",
        "isLie": true
      },
      {
        "text": "الفيلسوف ابن رشد عُرف في الغرب باسم Averroes",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 45
  },
  {
    "id": "tt_q_46",
    "category": "علوم ومعلومات عامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "الغاز الأساسي الذي يتنفسه الإنسان للحياة بنسبة أكبر هو الهيليوم",
        "isLie": true
      },
      {
        "text": "الشعب المرجانية العظمى تقع قبالة سواحل أستراليا",
        "isLie": false
      },
      {
        "text": "البوصلة تُستخدم لتحديد الاتجاهات بالاعتماد على المجال المغناطيسي",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 46
  },
  {
    "id": "tt_q_47",
    "category": "علوم ومعلومات عامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "ثاني أكسيد الكربون تستهلكه النباتات في البناء الضوئي",
        "isLie": false
      },
      {
        "text": "القطب الجنوبي يحتوي على أكبر تعداد للفيلة والزرافات",
        "isLie": true
      },
      {
        "text": "بركان كراكاتوا وفيزوف من أشهر البراكين التاريخية",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 47
  },
  {
    "id": "tt_q_48",
    "category": "علوم ومعلومات عامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "سرعة الصوت في الماء أسرع منها في الهواء الجوي",
        "isLie": false
      },
      {
        "text": "معدن الذهب يتصدأ ويتآكل بسرعة بمجرد تعرضه للهواء والماء",
        "isLie": true
      },
      {
        "text": "الخلية هي وحدة البناء والوظيفة الأساسية في الكائنات الحية",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 48
  },
  {
    "id": "tt_q_49",
    "category": "علوم ومعلومات عامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "فيتامين C يتواجد بكثرة في الفواكه الحمضية كالإقتراض",
        "isLie": false
      },
      {
        "text": "المحيط الأطلسي هو أعمق نقطة وتقع فيه ماريانا",
        "isLie": true
      },
      {
        "text": "عنصر الحديد هو المكون الأساسي للهيموجلوبين في الدم",
        "isLie": false
      }
    ],
    "correctOption": 1,
    "points": 1,
    "sortOrder": 49
  },
  {
    "id": "tt_q_50",
    "category": "علوم ومعلومات عامة",
    "text": "أي عبارة هي الكذبة؟",
    "options": [
      {
        "text": "كوكب الأرض تدور حوله خمسة أقمار زجاجية كبيرة بالعين المجردة",
        "isLie": true
      },
      {
        "text": "ظاهرة الانكسار الضوئي هي السبب في ظهور القلم مكسوراً بالماء",
        "isLie": false
      },
      {
        "text": "العضلات الهيكلية تخضع للتحكم الإرادي بينما القلب لا إرادية",
        "isLie": false
      }
    ],
    "correctOption": 0,
    "points": 1,
    "sortOrder": 50
  }
];

export const CANONICAL_GENIUS_50 = [
  // 25 AI & Tech Questions
  { id: 'g_q_1', category: 'الذكاء الاصطناعي والتقنية', text: 'ما الميزة الأساسية لمعمارية الـ Transformer مقارنة بنماذج الـ RNN التقليدية؟', options: ['الاعتماد الكلي على القواعد المكتوبة يدوياً', 'معالجة البيانات بالتوازي (Parallel Processing)', 'عدم الحاجة لوجود معالجات رسومية (GPUs)'], correctOption: 1, points: 1, sortOrder: 1 },
  { id: 'g_q_2', category: 'الذكاء الاصطناعي والتقنية', text: 'ما الهدف الأساسي من خوارزمية الـ Gradient Descent في تعلم الآلة؟', options: ['تقليل قيمة دالة الخسارة (Loss Function)', 'زيادة عدد طبقات الشبكة العصبية', 'تحويل النصوص إلى صور تلقائياً'], correctOption: 0, points: 1, sortOrder: 2 },
  { id: 'g_q_3', category: 'الذكاء الاصطناعي والتقنية', text: 'مفهوم يعني انحياز النموذج للبيانات التي تدرب عليها فقط فيحقق دقة عالية في التدريب وأداءً سيئاً مع البيانات الجديدة:', options: ['Overfitting', 'Underfitting', 'Quantization'], correctOption: 0, points: 1, sortOrder: 3 },
  { id: 'g_q_4', category: 'الذكاء الاصطناعي والتقنية', text: 'ما هي دالة التفعيل (Activation Function) الأكثر استخداماً في الطبقات الخفية لتجنب مشكلة Vanishing Gradient؟', options: ['Sigmoid', 'Softmax', 'ReLU'], correctOption: 2, points: 1, sortOrder: 4 },
  { id: 'g_q_5', category: 'الذكاء الاصطناعي والتقنية', text: 'تقنية تُتيح نقل معرفة نموذج تم تدريبه مسبقاً لاستخدامه في مهمة جديدة:', options: ['إعادة تدريب النموذج من الصفر دائماً', 'Transfer Learning', 'تشفير البيانات أثناء النقل'], correctOption: 1, points: 1, sortOrder: 5 },
  { id: 'g_q_6', category: 'الذكاء الاصطناعي والتقنية', text: 'ما الهدف الأساسي من تقنية RAG (Retrieval-Augmented Generation)؟', options: ['تزويد النموذج ببيانات خارجية موثوقة لتقليل الهلوسة ودعم الإجابات ببيانات حديثة', 'تسريع توليد الصور فقط', 'ضغط حجم الهارد ديسك الخاص بالسيرفر'], correctOption: 0, points: 1, sortOrder: 6 },
  { id: 'g_q_7', category: 'الذكاء الاصطناعي والتقنية', text: 'ماذا يعني مصطلح Quantization في نماذج الذكاء الاصطناعي؟', options: ['تقليل دقة تمثيل أوزان النموذج لتسريع الاستدلال وحفظ الذاكرة', 'زيادة أعداد البارامترات في النموذج', 'حظر الإجابات المسيئة وغير الأخلاقية'], correctOption: 0, points: 1, sortOrder: 7 },
  { id: 'g_q_8', category: 'الذكاء الاصطناعي والتقنية', text: 'معامل "Temperature" في إعدادات النماذج اللغوية يحدد:', options: ['درجة حرارة المعالج أثناء التشغيل', 'مدى عشوائية وإبداع النص المُولد', 'سرعة اتصال الجهاز بالإنترنت'], correctOption: 1, points: 1, sortOrder: 8 },
  { id: 'g_q_9', category: 'الذكاء الاصطناعي والتقنية', text: 'ما هو هجوم الـ Prompt Injection؟', options: ['مسح محادثات المستخدم القديمة', 'إدخال تعليمات خبيثة لتجاوز قيود النموذج وجعله ينفذ أوامر غير مصرح بها', 'تعطيل الراوتر بشكل كامل'], correctOption: 1, points: 1, sortOrder: 9 },
  { id: 'g_q_10', category: 'الذكاء الاصطناعي والتقنية', text: 'ما هي نماذج الموداليات المتعددة (Multimodal Models)؟', options: ['نماذج تعمل بدون الحاجة لإنترنت', 'نماذج قادرة على فهم ومعالجة أنواع مختلفة من البيانات (نص، صورة، صوت) معاً', 'نماذج مخصصة للعمل كآلة حاسبة فقط'], correctOption: 1, points: 1, sortOrder: 10 },
  { id: 'g_q_11', category: 'الذكاء الاصطناعي والتقنية', text: 'ظاهرة "الهلوسة" (Hallucination) في النماذج اللغوية تعني:', options: ['توقف النظام عن العمل تماماً', 'مسح البيانات المسجلة بالخطأ', 'تقديم النموذج لمعلومات غير صحيحة أو مخترعة بثقة عالية'], correctOption: 2, points: 1, sortOrder: 11 },
  { id: 'g_q_12', category: 'الذكاء الاصطناعي والتقنية', text: 'ما التعقيدية الزمانية (Time Complexity) للبحث في شجرة بحث ثنائية متوازنة (Balanced BST)؟', options: ['O(1)', 'O(n²)', 'O(log n)'], correctOption: 2, points: 1, sortOrder: 12 },
  { id: 'g_q_13', category: 'الذكاء الاصطناعي والتقنية', text: 'حالة الـ Deadlock في أنظمة التشغيل تعني:', options: ['ارتفاع درجة حرارة اللوحة الأم', 'توقف العمليات لأن كل عملية تنتظر مورداً تحتجز العمليات الأخرى', 'انقطاع الاتصال بالشبكة المحلية'], correctOption: 1, points: 1, sortOrder: 13 },
  { id: 'g_q_14', category: 'الذكاء الاصطناعي والتقنية', text: 'مشكلة Race Condition في البرمجة متعددة الخيوط (Multithreading) تحدث عندما:', options: ['تحاول خيوط برمجية متعددة القراءة والتعديل على نفس البيانات في نفس الوقت دون تزامن', 'يعمل المعالج بأقصى سرعة ممكنة', 'يغلق البرنامج تلقائياً بعد إنهاء المهام'], correctOption: 0, points: 1, sortOrder: 14 },
  { id: 'g_q_15', category: 'الذكاء الاصطناعي والتقنية', text: 'ما ميزة بروتوكول UDP مقارنة بـ TCP؟', options: ['أنه بروتوكول غير متصل (Connectionless) وسريع ولكنه لا يضمن وصول الحزم', 'أنه يبطئ نقل البيانات في الشبكة', 'أنه يضمن ترتيب وصول الحزم بنسبة 100%'], correctOption: 0, points: 1, sortOrder: 15 },
  { id: 'g_q_16', category: 'الذكاء الاصطناعي والتقنية', text: 'ما الفرق الجوهري بين gRPC و REST APIs؟', options: ['gRPC تعتمد على HTTP/2 و Protocol Buffers بينما REST تعتمد غالباً على HTTP/1.1 و JSON', 'REST أسرع دائماً في نقل البيانات', 'gRPC لا تعمل مع لغات البرمجة الحديثة'], correctOption: 0, points: 1, sortOrder: 16 },
  { id: 'g_q_17', category: 'الذكاء الاصطناعي والتقنية', text: 'الهدف الرئيسي من استخدام أنظمة الـ CI/CD Pipelines هو:', options: ['أتمتة عمليات بناء، اختبار، ونشر الكود باستمرار وبأقل أخطاء بشرية', 'كتابة الأكواد البرمجية بدلاً من المطورين', 'مسح الملفات القديمة من السيرفر'], correctOption: 0, points: 1, sortOrder: 17 },
  { id: 'g_q_18', category: 'الذكاء الاصطناعي والتقنية', text: 'الـ Reverse Proxy (مثل Nginx) يُستخدم أساساً لـ:', options: ['استقبال الطلبات وتوزيع الأحمال (Load Balancing) وحماية السيرفرات الخلفية', 'تسريع تشغيل الألعاب على الحاسوب', 'تعديل كود الـ HTML تلقائياً'], correctOption: 0, points: 1, sortOrder: 18 },
  { id: 'g_q_19', category: 'الذكاء الاصطناعي والتقنية', text: 'ميزة الـ WebSockets مقارنة بالـ HTTP التقليدي:', options: ['أنها تعمل بدون إتصال بالإنترنت', 'توفير قناة اتصال مستمرة وثنائية الاتجاه (Full-duplex) بين العميل والسيرفر', 'تقليل حجم الصور المرفوعة تلقائياً'], correctOption: 1, points: 1, sortOrder: 19 },
  { id: 'g_q_20', category: 'الذكاء الاصطناعي والتقنية', text: 'هجوم Cross-Site Scripting (XSS) يتضمن:', options: ['حقن كود JavaScript خبيث ليتنفذ داخل متصفح المستخدمين الآخرين', 'قطع التيار الكهربائي عن غرفة السيرفرات', 'تخمين كلمة المرور يدوياً'], correctOption: 0, points: 1, sortOrder: 20 },
  { id: 'g_q_21', category: 'الذكاء الاصطناعي والتقنية', text: 'حماية قواعد البيانات من هجمات الـ SQL Injection تتطلب:', options: ['تغيير اسم قاعدة البيانات أسبوعياً', 'استخدام الاستعلامات المعلمية (Prepared Statements / Parameterized Queries)', 'إغلاق السيرفرات خلال أوقات الليل'], correctOption: 1, points: 1, sortOrder: 21 },
  { id: 'g_q_22', category: 'الذكاء الاصطناعي والتقنية', text: 'ثغرة الـ Zero-Day تعني:', options: ['ثغرة أمنية مجهولة تم استغلالها قبل توفر تحديث أو علاج أمني لها من المطور', 'ثغرة تظهر فقط في اليوم الأول من كل شهر', 'تطبيق ينتهي اشتراكه بعد يوم واحد'], correctOption: 0, points: 1, sortOrder: 22 },
  { id: 'g_q_23', category: 'الذكاء الاصطناعي والتقنية', text: 'الـ Hashing (مثل SHA-256) يختلف عن التشفير التقليدي بأنه:', options: ['يمكن فك الهاش بسهولة بمفتاح خاص', 'عملية أحادية الاتجاه (One-way) لا يمكن استرجاع النص الأصلي منها', 'يُستخدم فقط للصور وليس للنصوص'], correctOption: 1, points: 1, sortOrder: 23 },
  { id: 'g_q_24', category: 'الذكاء الاصطناعي والتقنية', text: 'هجوم الـ DDoS Attack يهدف إلى:', options: ['إغراق السيرفر بطلبات وهمية مكثفة من شبكة أجهزة مخترقة لإسقاط الخدمة', 'سرقة الشاشات التابعة للسيرفر', 'تعديل ألوان الموقع الإلكتروني'], correctOption: 0, points: 1, sortOrder: 24 },
  { id: 'g_q_25', category: 'الذكاء الاصطناعي والتقنية', text: 'أداة الـ JWT (JSON Web Token) تُستخدم بشكل شائع في:', options: ['تخزين ملفات الفيديو الضخمة', 'إثبات الهوية والترخيص (Authentication & Authorization) بشكل آمن', 'ضغط الصور قبل نشرها'], correctOption: 1, points: 1, sortOrder: 25 },

  // 25 Scout, Religious & General Culture Questions
  { id: 'g_q_26', category: 'ثقافة عامة وكشفية', text: 'أين يوجد مقام سيدنا إبراهيم عليه السلام ؟', options: ['المدينة المنورة', 'القدس', 'مكة المكرمة'], correctOption: 2, points: 1, sortOrder: 26 },
  { id: 'g_q_27', category: 'ثقافة عامة وكشفية', text: 'ما هي أطول رحلة في تاريخ البشرية ؟', options: ['رحلة الشتاء والصيف', 'رحلة الإسراء والمعراج', 'اكتشاف الأميركتين'], correctOption: 1, points: 1, sortOrder: 27 },
  { id: 'g_q_28', category: 'ثقافة عامة وكشفية', text: 'ما هي السورة التي تقع في نصف القرآن ؟', options: ['سورة مريم', 'سورة الكهف', 'سورة الأنفال'], correctOption: 1, points: 1, sortOrder: 28 },
  { id: 'g_q_29', category: 'ثقافة عامة وكشفية', text: 'ما هو الشيء الذي خُلق من حجر ؟', options: ['ناقة صالح', 'هدهد سليمان', 'فيل أبرهة'], correctOption: 0, points: 1, sortOrder: 29 },
  { id: 'g_q_30', category: 'ثقافة عامة وكشفية', text: 'لماذا سمي سيدنا عمر ابن الخطاب بالفاروق ؟', options: ['لأنه يفرق بين الحق والباطل', 'لأنه يفرق أحسنا', 'لأنه قدراته فارقة عن غيره'], correctOption: 0, points: 1, sortOrder: 30 },
  { id: 'g_q_31', category: 'ثقافة عامة وكشفية', text: 'من هو مؤذن الرسول ؟', options: ['عبد الله بن مسعود', 'بلال بن رباح', 'سعد بن أبي وقاص'], correctOption: 1, points: 1, sortOrder: 31 },
  { id: 'g_q_32', category: 'ثقافة عامة وكشفية', text: 'من أول من رمى سهم في سبيل الله ؟', options: ['حمزة بن عبد المطلب', 'عمر بن الخطاب', 'سعد بن أبي وقاص'], correctOption: 2, points: 1, sortOrder: 32 },
  { id: 'g_q_33', category: 'ثقافة عامة وكشفية', text: 'من الذي قاد المسلمين في معركة عين جالوت ؟', options: ['صلاح الدين الأيوبي', 'سيف الدين قطز', 'الظاهر بيبرس'], correctOption: 1, points: 1, sortOrder: 33 },
  { id: 'g_q_34', category: 'ثقافة عامة وكشفية', text: 'كم عدد السجدات في القرآن الكريم ؟', options: ['15 سجدة', '21 سجدة', '30 سجدة'], correctOption: 0, points: 1, sortOrder: 34 },
  { id: 'g_q_35', category: 'ثقافة عامة وكشفية', text: 'كم عدد أرباع القرآن الكريم ؟', options: ['180 ربع', '240 ربع', '280 ربع'], correctOption: 1, points: 1, sortOrder: 35 },
  { id: 'g_q_36', category: 'ثقافة عامة وكشفية', text: 'كم عدد آيات القرآن الكريم ؟', options: ['6236', '6848', '7214'], correctOption: 0, points: 1, sortOrder: 36 },
  { id: 'g_q_37', category: 'ثقافة عامة وكشفية', text: 'كم عدد المرات التي سعت فيها السيدة هاجر بين الصفا والمروة ؟', options: ['خمس مرات', 'سبع مرات', 'تسع مرات'], correctOption: 1, points: 1, sortOrder: 37 },
  { id: 'g_q_38', category: 'ثقافة عامة وكشفية', text: 'ماهي السورة الوحيدة التي بدأت وانتهت بنداء ( يا أيها الذين أمنو ) ؟', options: ['سورة الأنفال', 'سورة هود', 'سورة الممتحنة'], correctOption: 2, points: 1, sortOrder: 38 },
  { id: 'g_q_39', category: 'ثقافة عامة وكشفية', text: 'ما هي أكبر جزيرة في البحر المتوسط ؟', options: ['براونسي', 'جزيرة صقلية', 'برمودة'], correctOption: 1, points: 1, sortOrder: 39 },
  { id: 'g_q_40', category: 'ثقافة عامة وكشفية', text: 'ما هي اصغر دولة في العالم ؟', options: ['الفاتيكان', 'البحرين', 'قطر'], correctOption: 0, points: 1, sortOrder: 40 },
  { id: 'g_q_41', category: 'ثقافة عامة وكشفية', text: 'ما هي أصغر دولة عربية من حيث المساحة ؟', options: ['قطر', 'البحرين', 'جزر القمر'], correctOption: 1, points: 1, sortOrder: 41 },
  { id: 'g_q_42', category: 'ثقافة عامة وكشفية', text: 'ما هي المدينة التي تسمى بمدينة الضباب ؟', options: ['باريس', 'موسكو', 'لندن'], correctOption: 2, points: 1, sortOrder: 42 },
  { id: 'g_q_43', category: 'ثقافة عامة وكشفية', text: 'من هو مكتشف أمريكا ؟', options: ['ماجلان', 'كريستوفر كولومبوس', 'كونت كونتى'], correctOption: 1, points: 1, sortOrder: 43 },
  { id: 'g_q_44', category: 'ثقافة عامة وكشفية', text: 'إلى ماذا يشير مصطلح الذهب الأسود ؟', options: ['البترول', 'الفحم', 'الغاز الطبيعي'], correctOption: 0, points: 1, sortOrder: 44 },
  { id: 'g_q_45', category: 'ثقافة عامة وكشفية', text: 'ما هي أول دولة قامت باستخدام الطابع البريدي فما هي ؟', options: ['فرنسا', 'بريطانيا', 'تركيا'], correctOption: 1, points: 1, sortOrder: 45 },
  { id: 'g_q_46', category: 'ثقافة عامة وكشفية', text: 'ماهي الدولة التي يطلق عليها بلد المليون شهيد ؟', options: ['مصر', 'فلسطين', 'الجزائر'], correctOption: 2, points: 1, sortOrder: 46 },
  { id: 'g_q_47', category: 'ثقافة عامة وكشفية', text: 'من أول من عرف البارود و أشعله ؟', options: ['الصينيون', 'البيانيون', 'القدماء المصريين'], correctOption: 0, points: 1, sortOrder: 47 },
  { id: 'g_q_48', category: 'ثقافة عامة وكشفية', text: 'كم عدد ألوان قوس قزح ؟', options: ['7 ألوان', '9 ألوان', '11 لون'], correctOption: 0, points: 1, sortOrder: 48 },
  { id: 'g_q_49', category: 'ثقافة عامة وكشفية', text: 'من هو أول من اكتشف وحدة قياس الفيمتو ثانية ( Femto - Second ) ؟', options: ['د/أحمد زويل', 'الحسن بن الهيثم', 'جابر بن حيان'], correctOption: 0, points: 1, sortOrder: 49 },
  { id: 'g_q_50', category: 'ثقافة عامة وكشفية', text: 'من هو مخترع قانون الجاذبية ؟', options: ['آينشتين', 'أرشميدس', 'إسحاق نيوتن'], correctOption: 2, points: 1, sortOrder: 50 },
];

export function getTwoTruthsQuestions() {
  if (fs.existsSync(TWO_TRUTHS_WORKBOOK)) {
    try {
      const questions = loadTwoTruthsQuestions(TWO_TRUTHS_WORKBOOK);
      if (Array.isArray(questions) && questions.length >= 50) return questions;
    } catch {}
  }
  return CANONICAL_TWO_TRUTHS_50;
}

export function getGeniusQuestions() {
  return CANONICAL_GENIUS_50;
}

export async function syncCanonicalDigitalQuestions(prisma) {
  const twoTruthsQuestions = getTwoTruthsQuestions();
  const geniusQuestions = getGeniusQuestions();

  // Sync Two Truths (comp-digital-2 / two_truths)
  const twoTruthsComp = await prisma.competition.findFirst({ where: { OR: [{ id: 'comp-digital-2' }, { slug: 'two_truths' }] } });
  if (twoTruthsComp) {
    if (twoTruthsComp.questionCount !== 50) {
      await prisma.competition.update({
        where: { id: twoTruthsComp.id },
        data: { questionCount: 50 }
      });
    }
    const count = await prisma.question.count({ where: { competitionId: twoTruthsComp.id } });
    if (count < 50) {
      await prisma.draftAnswer.deleteMany({ where: { session: { competitionId: twoTruthsComp.id } } });
      await prisma.question.deleteMany({ where: { competitionId: twoTruthsComp.id } });
      for (const q of twoTruthsQuestions) {
        await prisma.question.create({
          data: {
            id: `${twoTruthsComp.id}-${q.id}`,
            competitionId: twoTruthsComp.id,
            text: q.text,
            category: q.category || 'عام',
            options: JSON.stringify(q.options),
            correctOption: q.correctOption,
            points: Number(q.points || 1),
            questionType: 'multiple_choice',
            sortOrder: q.sortOrder || 0,
          },
        });
      }
    }
  }

  // Sync Genius (comp-digital-1 / genius)
  const geniusComp = await prisma.competition.findFirst({ where: { OR: [{ id: 'comp-digital-1' }, { slug: 'genius' }] } });
  if (geniusComp) {
    if (geniusComp.questionCount !== 50) {
      await prisma.competition.update({
        where: { id: geniusComp.id },
        data: { questionCount: 50 }
      });
    }
    const count = await prisma.question.count({ where: { competitionId: geniusComp.id } });
    if (count < 50) {
      await prisma.draftAnswer.deleteMany({ where: { session: { competitionId: geniusComp.id } } });
      await prisma.question.deleteMany({ where: { competitionId: geniusComp.id } });
      for (const q of geniusQuestions) {
        await prisma.question.create({
          data: {
            id: `${geniusComp.id}-${q.id}`,
            competitionId: geniusComp.id,
            text: q.text,
            category: q.category || 'عام',
            options: JSON.stringify(q.options),
            correctOption: q.correctOption,
            points: Number(q.points || 1),
            questionType: 'multiple_choice',
            sortOrder: q.sortOrder || 0,
          },
        });
      }
    }
  }
}
