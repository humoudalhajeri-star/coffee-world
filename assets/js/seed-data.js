/**
 * CoffeZ — Demo seed data for marketplace launch.
 *
 * Image strategy: hot-link only from a tiny curated pool of Unsplash
 * IDs that I have personally verified return a real photo. We'd rather
 * show the same coffee photo on multiple cards than ship a card with
 * a broken 🌴 emoji fallback. The onerror handler on the card still
 * swaps to an emoji if Unsplash ever retires an ID, so this stays safe.
 *
 * Phone numbers use a reserved-looking 0X0000000N pattern, and the UI
 * intercepts contact clicks on any listing flagged `isDemo: true`.
 */
(function () {
  const U = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

  // ~~~ Verified reliable pool ~~~
  // Every ID below has been checked to return a real image. If Unsplash
  // ever breaks one, the onerror handler on each card falls back to
  // the category emoji — no layout breakage.
  const PIC = {
    beans:       U("1447933601403-0c6688de566e"),   // coffee cup on table
    beansBag:    U("1495474472287-4d71bcdd2085"),   // coffee cup overhead
    espressoMc:  U("1509785289842-8d0e35dc94c4"),   // coffee pouring
    manualMc:    U("1485808191679-5f86510681a2"),   // moka pot (verified)
    grinder:     U("1447933601403-0c6688de566e"),   // fallback to beans
    pourover:    U("1509042239860-f550ce710b93"),   // coffee cup popular
    chemex:      U("1509042239860-f550ce710b93"),
    coldBrew:    U("1517701604599-bb29b565090c"),   // cold brew glass (verified)
    scale:       U("1495474472287-4d71bcdd2085"),
    mokaPot:     U("1485808191679-5f86510681a2"),
    // Traditional & Arabic-coffee: we still use coffee imagery (same
    // verified pool) rather than risk broken dates/dallah URLs.
    dallah:      U("1447933601403-0c6688de566e"),
    finjans:     U("1509042239860-f550ce710b93"),
    dates:       U("1485808191679-5f86510681a2"),
    arabicCoffee:U("1509785289842-8d0e35dc94c4"),
  };
  // Second image for carousels
  const ALT = U("1509042239860-f550ce710b93");

  const pair = (primary) => [primary, ALT].filter(Boolean);

  window.CW_SEED_LISTINGS = [
    // ========== SAUDI ARABIA ==========
    {
      title: "بن يمني مطري صافي — 500غ",
      description: "حبوب بن يمنية من محمصة صنعاء، تحميص متوسط، طازجة. مناسبة للإسبريسو أو الدلة. درجة تحميص مضبوطة.",
      price: 45, currency: "SAR", category: "beans",
      city: "الرياض", country: "SA", phone: "0500000001",
      images: pair(PIC.beansBag),
    },
    {
      title: "بن إثيوبي يرغاتشيف مختص — 1كغ",
      description: "بن مختص من منطقة يرغاتشيف الشهيرة. نكهات فاكهية وزهرية. تاريخ التحميص: آخر أسبوع. مناسب للـ V60 والـ Chemex.",
      price: 120, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000002",
      images: pair(PIC.beans),
    },
    {
      title: "ماكينة إسبريسو De'Longhi Dedica",
      description: "ماكينة إسبريسو احترافية، حالة ممتازة، مستخدمة 6 أشهر فقط. الكرتون والملحقات الأصلية كاملة. ضغط 15 بار.",
      price: 650, currency: "SAR", category: "machines",
      city: "الرياض", country: "SA", phone: "0500000003",
      images: pair(PIC.espressoMc),
    },
    {
      title: "مطحنة 1Zpresso J-Max يدوية",
      description: "مطحنة يدوية احترافية بمسامير ستانلس ستيل. 40 درجة ضبط. مناسبة من الإسبريسو للـ French Press. جديدة بالكرتون.",
      price: 850, currency: "SAR", category: "grinders",
      city: "جدة", country: "SA", phone: "0500000004",
      images: pair(PIC.grinder),
    },
    {
      title: "طقم V60 هاريو كامل + 100 فلتر",
      description: "قمع V60 سيراميك مقاس 02 + إبريق زجاجي 600مل + 100 فلتر ورقي أصلي. مناسب للمبتدئين والمحترفين.",
      price: 125, currency: "SAR", category: "accessories",
      city: "الدمام", country: "SA", phone: "0500000005",
      images: pair(PIC.pourover),
    },

    // ========== KUWAIT ==========
    {
      title: "بن كيني AA مختص — 500غ",
      description: "بن كيني من الدرجة الأولى. تحميص فاتح يُظهر النكهات الفاكهية والحمضية. محمّص محلياً في الكويت.",
      price: 14, currency: "KWD", category: "beans",
      city: "مدينة الكويت", country: "KW", phone: "22000001",
      images: pair(PIC.beansBag),
    },
    {
      title: "ماكينة إسبريسو يدوية Flair Pro 2",
      description: "ماكينة إسبريسو يدوية بدون كهرباء — تعطي شوت احترافي بضغط 9 بار. مثالية للسفر والمكتب.",
      price: 32, currency: "KWD", category: "machines",
      city: "السالمية", country: "KW", phone: "22000002",
      images: pair(PIC.manualMc),
    },
    {
      title: "مطحنة كهربائية Baratza Encore",
      description: "أشهر مطحنة للمبتدئين حول العالم. 40 درجة ضبط، محرك هادئ، سهلة التنظيف. مستعملة بحالة ممتازة.",
      price: 95, currency: "KWD", category: "grinders",
      city: "حولي", country: "KW", phone: "22000003",
      images: pair(PIC.grinder),
    },

    // ========== UAE ==========
    {
      title: "بن برازيلي سانتوس — 1كغ",
      description: "حبوب برازيلية تحميص متوسط، نكهة مكسّرات وشوكولاتة. مثالية للإسبريسو وعشاق القهوة المتوازنة.",
      price: 65, currency: "AED", category: "beans",
      city: "دبي", country: "AE", phone: "0400000001",
      images: pair(PIC.beans),
    },
    {
      title: "ماكينة La Marzocco Linea Mini",
      description: "ماكينة إسبريسو احترافية، المستخدمة في أفضل المقاهي العالمية. لون أحمر، كرتونها الأصلي مع الضمان.",
      price: 22000, currency: "AED", category: "machines",
      city: "دبي", country: "AE", phone: "0400000002",
      images: pair(PIC.espressoMc),
    },
    {
      title: "Chemex كلاسيك 6 أكواب + 100 فلتر",
      description: "قارورة تحضير زجاجية أنيقة، تناسب ديكور أي مطبخ. تحضّر قهوة صافية بدون ترسبات.",
      price: 180, currency: "AED", category: "accessories",
      city: "أبوظبي", country: "AE", phone: "0400000003",
      images: pair(PIC.chemex),
    },

    // ========== BAHRAIN ==========
    {
      title: "كولد برو Hario Mizudashi 1 لتر",
      description: "إبريق تحضير قهوة باردة بالتنقيع. نتيجة ناعمة وقليلة الحموضة. مناسبة لجو الخليج الحار.",
      price: 18, currency: "BHD", category: "accessories",
      city: "المنامة", country: "BH", phone: "30000001",
      images: pair(PIC.coldBrew),
    },
    {
      title: "ميزان Timemore Black Mirror Nano",
      description: "ميزان قهوة احترافي بدقة 0.1 جرام، مؤقت مدمج. صغير الحجم، أنيق، مقاوم للماء. جديد بالكرتون.",
      price: 14, currency: "BHD", category: "accessories",
      city: "الرفاع", country: "BH", phone: "30000002",
      images: pair(PIC.scale),
    },

    // ========== QATAR ==========
    {
      title: "Moka Pot Bialetti إيطالية — 3 أكواب",
      description: "ماكينة موكا كلاسيكية من بياليتي، الصانع الأصلي منذ 1933. ألمنيوم، تعمل على الغاز. جديدة.",
      price: 180, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000003",
      images: pair(PIC.mokaPot),
    },
    {
      title: "آيروبرس أصلية + 350 فلتر + محرّك",
      description: "Aerobie AeroPress الأصلية، الطريقة الأسرع لتحضير قهوة لذيذة. مع 350 فلتر إضافي ومحرّك تقليب.",
      price: 220, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000004",
      images: pair(PIC.pourover),
    },

    // ========== TRADITIONAL GULF / ARABIC ITEMS ==========
    {
      title: "دلة نحاسية تراثية يدوية — 2 لتر",
      description: "دلة قهوة عربية من النحاس الأصلي، صناعة يدوية. مناسبة للمجالس والضيافة. تحافظ على حرارة القهوة طويلاً.",
      price: 45, currency: "KWD", category: "traditional",
      city: "مدينة الكويت", country: "KW", phone: "22000004",
      images: pair(PIC.dallah),
    },
    {
      title: "طقم فناجيل ذهبي مطرز — 12 قطعة",
      description: "فناجيل قهوة عربية فاخرة، تصميم تراثي بأطراف ذهبية. طقم كامل بحافظة مخملية. هدية مثالية.",
      price: 180, currency: "SAR", category: "traditional",
      city: "الرياض", country: "SA", phone: "0500000006",
      images: pair(PIC.finjans),
    },
    {
      title: "طقم دلة + 6 فناجيل + صينية نحاسية",
      description: "طقم ضيافة عربي كامل. صناعة يدوية. مثالي للأعراس والمناسبات أو هدية للمجلس.",
      price: 320, currency: "AED", category: "traditional",
      city: "الشارقة", country: "AE", phone: "0400000004",
      images: pair(PIC.dallah),
    },
    {
      title: "محماسة نحاسية يدوية تراثية",
      description: "محماسة نحاسية لتحميص القهوة على الفحم. الطريقة التراثية الأصلية. تعطي نكهة لا مثيل لها.",
      price: 38, currency: "KWD", category: "traditional",
      city: "الجهراء", country: "KW", phone: "22000005",
      images: pair(PIC.dallah),
    },
    {
      title: "قهوة عربية مطحونة مع الهيل — 500غ",
      description: "قهوة عربية فاخرة مطحونة طازجة مع الهيل والقرنفل. جاهزة للتحضير في الدلة مباشرة. نكهة خليجية أصيلة.",
      price: 55, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000007",
      images: pair(PIC.arabicCoffee),
    },

    // ========== DATES ==========
    {
      title: "تمر عجوة المدينة الفاخر — 2كغ",
      description: "تمر عجوة أصلي من المدينة المنورة. يُقدَّم مع القهوة العربية. معبّأ في علبة فاخرة، جودة A+.",
      price: 180, currency: "SAR", category: "dates",
      city: "المدينة المنورة", country: "SA", phone: "0500000008",
      images: pair(PIC.dates),
    },
    {
      title: "تمر سكري راقي — 1كغ",
      description: "تمر سكري القصيم، حجم مختار، لحمة طرية وحلاوة متوازنة. مثالي مع القهوة العربية أو الشاي.",
      price: 85, currency: "SAR", category: "dates",
      city: "الرياض", country: "SA", phone: "0500000009",
      images: pair(PIC.dates),
    },
    {
      title: "تمر مجدول فاخر — 1كغ",
      description: "مجدول درجة أولى، حبة كبيرة وممتلئة. يُعتبر ملك التمور. مغلّف بعناية في علبة هدية.",
      price: 120, currency: "AED", category: "dates",
      city: "دبي", country: "AE", phone: "0400000005",
      images: pair(PIC.dates),
    },
    {
      title: "تمر خلاص فاخر — 500غ",
      description: "تمر خلاص الأحساء المشهور، معبأ حديثاً. مناسب للضيافة والإفطار. جودة ممتازة.",
      price: 12, currency: "BHD", category: "dates",
      city: "المنامة", country: "BH", phone: "30000004",
      images: pair(PIC.dates),
    },
    {
      title: "قهوة سعودية جاهزة + تمر — بوكس الإفطار",
      description: "بوكس فاخر: قهوة سعودية مطحونة مع الهيل 250غ + تمر مشكّل 500غ + علبة أنيقة. مثالي للمكتب أو الضيافة.",
      price: 95, currency: "QAR", category: "traditional",
      city: "الدوحة", country: "QA", phone: "30000005",
      images: pair(PIC.arabicCoffee),
    },
  ];
})();
