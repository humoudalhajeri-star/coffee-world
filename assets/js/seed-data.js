/**
 * CoffeZ — Demo seed data for marketplace launch.
 *
 * Purpose: fill the marketplace with realistic listings so first-time
 * visitors from TikTok ads see an active platform instead of an empty
 * grid. Items span Gulf countries and cover modern gear + traditional
 * Arabic coffee culture (dallah, finjans, dates).
 *
 * Safety notes:
 * - Every phone number uses a clearly-fake repeating-zero pattern so
 *   real users can't accidentally call a stranger. The UI further
 *   guards against contact attempts on demo listings (see
 *   listing-detail.js — `isDemo` check on WhatsApp/call/email).
 * - Images are hot-linked from Unsplash (free for commercial use);
 *   cards fall back to a category emoji if any URL fails to load.
 *
 * Legal: only images we are licensed to use. Never scraped from other
 * marketplaces.
 */
(function () {
  // Curated pool of Unsplash photo IDs verified to exist. We rotate
  // them across listings so we always have at least one working image
  // per item even if a specific URL ever goes away.
  const U = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

  const IMG = {
    beans:       [U("1447933601403-0c6688de566e"), U("1442512595331-e89e73853f31")],
    beansBag:    [U("1559056199-641a0ac8b55e"), U("1495474472287-4d71bcdd2085")],
    espressoMc:  [U("1572442388796-11668a67e53d"), U("1510017803434-a899398421b3")],
    manualMc:    [U("1485808191679-5f86510681a2"), U("1461023058943-07fcbe16d735")],
    grinder:     [U("1606335538823-96f10ed26b00"), U("1509785289842-8d0e35dc94c4")],
    pourover:    [U("1495474472287-4d71bcdd2085"), U("1461023058943-07fcbe16d735")],
    chemex:      [U("1494415859740-21e878dd929d"), U("1509785289842-8d0e35dc94c4")],
    coldBrew:    [U("1517701604599-bb29b565090c"), U("1461023058943-07fcbe16d735")],
    scale:       [U("1509785289842-8d0e35dc94c4"), U("1495474472287-4d71bcdd2085")],
    mokaPot:     [U("1485808191679-5f86510681a2"), U("1447933601403-0c6688de566e")],
    // Traditional Arabic / Gulf items
    dallah:      [U("1559525839-8f75920289bb"), U("1571934811356-5cc061b6821f")],
    finjans:     [U("1495474472287-4d71bcdd2085"), U("1509785289842-8d0e35dc94c4")],
    dates:       [U("1587316829027-ea0ba6d3a08a"), U("1601000785686-0462e00eccfc")],
    arabicCoffee:[U("1587049352846-4a222e784d38"), U("1442512595331-e89e73853f31")],
  };

  window.CW_SEED_LISTINGS = [
    // ========== SAUDI ARABIA ==========
    {
      title: "بن يمني مطري صافي — 500غ",
      description: "حبوب بن يمنية من محمصة صنعاء، تحميص متوسط، طازجة. مناسبة للإسبريسو أو الدلة. درجة تحميص مضبوطة.",
      price: 45, currency: "SAR", category: "beans",
      city: "الرياض", country: "SA", phone: "0500000001",
      images: IMG.beansBag,
    },
    {
      title: "بن إثيوبي يرغاتشيف مختص — 1كغ",
      description: "بن مختص من منطقة يرغاتشيف الشهيرة. نكهات فاكهية وزهرية. تاريخ التحميص: آخر أسبوع. مناسب للـ V60 والـ Chemex.",
      price: 120, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000002",
      images: IMG.beans,
    },
    {
      title: "ماكينة إسبريسو De'Longhi Dedica",
      description: "ماكينة إسبريسو احترافية، حالة ممتازة، مستخدمة 6 أشهر فقط. الكرتون والملحقات الأصلية كاملة. ضغط 15 بار.",
      price: 650, currency: "SAR", category: "machines",
      city: "الرياض", country: "SA", phone: "0500000003",
      images: IMG.espressoMc,
    },
    {
      title: "مطحنة 1Zpresso J-Max يدوية",
      description: "مطحنة يدوية احترافية بمسامير ستانلس ستيل. 40 درجة ضبط. مناسبة من الإسبريسو للـ French Press. جديدة بالكرتون.",
      price: 850, currency: "SAR", category: "grinders",
      city: "جدة", country: "SA", phone: "0500000004",
      images: IMG.grinder,
    },
    {
      title: "طقم V60 هاريو كامل + 100 فلتر",
      description: "قمع V60 سيراميك مقاس 02 + إبريق زجاجي 600مل + 100 فلتر ورقي أصلي. مناسب للمبتدئين والمحترفين.",
      price: 125, currency: "SAR", category: "accessories",
      city: "الدمام", country: "SA", phone: "0500000005",
      images: IMG.pourover,
    },

    // ========== KUWAIT ==========
    {
      title: "بن كيني AA مختص — 500غ",
      description: "بن كيني من الدرجة الأولى. تحميص فاتح يُظهر النكهات الفاكهية والحمضية. محمّص محلياً في الكويت.",
      price: 14, currency: "KWD", category: "beans",
      city: "مدينة الكويت", country: "KW", phone: "22000001",
      images: IMG.beansBag,
    },
    {
      title: "ماكينة إسبريسو يدوية Flair Pro 2",
      description: "ماكينة إسبريسو يدوية بدون كهرباء — تعطي شوت احترافي بضغط 9 بار. مثالية للسفر والمكتب.",
      price: 32, currency: "KWD", category: "machines",
      city: "السالمية", country: "KW", phone: "22000002",
      images: IMG.manualMc,
    },
    {
      title: "مطحنة كهربائية Baratza Encore",
      description: "أشهر مطحنة للمبتدئين حول العالم. 40 درجة ضبط، محرك هادئ، سهلة التنظيف. مستعملة بحالة ممتازة.",
      price: 95, currency: "KWD", category: "grinders",
      city: "حولي", country: "KW", phone: "22000003",
      images: IMG.grinder,
    },

    // ========== UAE ==========
    {
      title: "بن برازيلي سانتوس — 1كغ",
      description: "حبوب برازيلية تحميص متوسط، نكهة مكسّرات وشوكولاتة. مثالية للإسبريسو وعشاق القهوة المتوازنة.",
      price: 65, currency: "AED", category: "beans",
      city: "دبي", country: "AE", phone: "0400000001",
      images: IMG.beans,
    },
    {
      title: "ماكينة La Marzocco Linea Mini",
      description: "ماكينة إسبريسو احترافية، المستخدمة في أفضل المقاهي العالمية. لون أحمر، كرتونها الأصلي مع الضمان.",
      price: 22000, currency: "AED", category: "machines",
      city: "دبي", country: "AE", phone: "0400000002",
      images: IMG.espressoMc,
    },
    {
      title: "Chemex كلاسيك 6 أكواب + 100 فلتر",
      description: "قارورة تحضير زجاجية أنيقة، تناسب ديكور أي مطبخ. تحضّر قهوة صافية بدون ترسبات.",
      price: 180, currency: "AED", category: "accessories",
      city: "أبوظبي", country: "AE", phone: "0400000003",
      images: IMG.chemex,
    },

    // ========== BAHRAIN ==========
    {
      title: "كولد برو Hario Mizudashi 1 لتر",
      description: "إبريق تحضير قهوة باردة بالتنقيع. نتيجة ناعمة وقليلة الحموضة. مناسبة لجو الخليج الحار.",
      price: 18, currency: "BHD", category: "accessories",
      city: "المنامة", country: "BH", phone: "30000001",
      images: IMG.coldBrew,
    },
    {
      title: "ميزان Timemore Black Mirror Nano",
      description: "ميزان قهوة احترافي بدقة 0.1 جرام، مؤقت مدمج. صغير الحجم، أنيق، مقاوم للماء. جديد بالكرتون.",
      price: 14, currency: "BHD", category: "accessories",
      city: "الرفاع", country: "BH", phone: "30000002",
      images: IMG.scale,
    },

    // ========== QATAR ==========
    {
      title: "Moka Pot Bialetti إيطالية — 3 أكواب",
      description: "ماكينة موكا كلاسيكية من بياليتي، الصانع الأصلي منذ 1933. ألمنيوم، تعمل على الغاز. جديدة.",
      price: 180, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000003",
      images: IMG.mokaPot,
    },
    {
      title: "آيروبرس أصلية + 350 فلتر + محرّك",
      description: "Aerobie AeroPress الأصلية، الطريقة الأسرع لتحضير قهوة لذيذة. مع 350 فلتر إضافي ومحرّك تقليب.",
      price: 220, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000004",
      images: IMG.pourover,
    },

    // ========== TRADITIONAL GULF / ARABIC ITEMS ==========
    {
      title: "دلة نحاسية تراثية يدوية — 2 لتر",
      description: "دلة قهوة عربية من النحاس الأصلي، صناعة يدوية. مناسبة للمجالس والضيافة. تحافظ على حرارة القهوة طويلاً.",
      price: 45, currency: "KWD", category: "traditional",
      city: "مدينة الكويت", country: "KW", phone: "22000004",
      images: IMG.dallah,
    },
    {
      title: "طقم فناجيل ذهبي مطرز — 12 قطعة",
      description: "فناجيل قهوة عربية فاخرة، تصميم تراثي بأطراف ذهبية. طقم كامل بحافظة مخملية. هدية مثالية.",
      price: 180, currency: "SAR", category: "traditional",
      city: "الرياض", country: "SA", phone: "0500000006",
      images: IMG.finjans,
    },
    {
      title: "طقم دلة + 6 فناجيل + صينية نحاسية",
      description: "طقم ضيافة عربي كامل. صناعة يدوية. مثالي للأعراس والمناسبات أو هدية للمجلس.",
      price: 320, currency: "AED", category: "traditional",
      city: "الشارقة", country: "AE", phone: "0400000004",
      images: IMG.dallah,
    },
    {
      title: "محماسة نحاسية يدوية تراثية",
      description: "محماسة نحاسية لتحميص القهوة على الفحم. الطريقة التراثية الأصلية. تعطي نكهة لا مثيل لها.",
      price: 38, currency: "KWD", category: "traditional",
      city: "الجهراء", country: "KW", phone: "22000005",
      images: IMG.dallah,
    },
    {
      title: "قهوة عربية مطحونة مع الهيل — 500غ",
      description: "قهوة عربية فاخرة مطحونة طازجة مع الهيل والقرنفل. جاهزة للتحضير في الدلة مباشرة. نكهة خليجية أصيلة.",
      price: 55, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000007",
      images: IMG.arabicCoffee,
    },

    // ========== DATES ==========
    {
      title: "تمر عجوة المدينة الفاخر — 2كغ",
      description: "تمر عجوة أصلي من المدينة المنورة. يُقدَّم مع القهوة العربية. معبّأ في علبة فاخرة، جودة A+.",
      price: 180, currency: "SAR", category: "dates",
      city: "المدينة المنورة", country: "SA", phone: "0500000008",
      images: IMG.dates,
    },
    {
      title: "تمر سكري راقي — 1كغ",
      description: "تمر سكري القصيم، حجم مختار، لحمة طرية وحلاوة متوازنة. مثالي مع القهوة العربية أو الشاي.",
      price: 85, currency: "SAR", category: "dates",
      city: "الرياض", country: "SA", phone: "0500000009",
      images: IMG.dates,
    },
    {
      title: "تمر مجدول فاخر — 1كغ",
      description: "مجدول درجة أولى، حبة كبيرة وممتلئة. يُعتبر ملك التمور. مغلّف بعناية في علبة هدية.",
      price: 120, currency: "AED", category: "dates",
      city: "دبي", country: "AE", phone: "0400000005",
      images: IMG.dates,
    },
    {
      title: "تمر خلاص فاخر — 500غ",
      description: "تمر خلاص الأحساء المشهور، معبأ حديثاً. مناسب للضيافة والإفطار. جودة ممتازة.",
      price: 12, currency: "BHD", category: "dates",
      city: "المنامة", country: "BH", phone: "30000004",
      images: IMG.dates,
    },
    {
      title: "قهوة سعودية جاهزة + تمر — بوكس الإفطار",
      description: "بوكس فاخر: قهوة سعودية مطحونة مع الهيل 250غ + تمر مشكّل 500غ + علبة أنيقة. مثالي للمكتب أو الضيافة.",
      price: 95, currency: "QAR", category: "traditional",
      city: "الدوحة", country: "QA", phone: "30000005",
      images: IMG.dates,
    },
  ];
})();
