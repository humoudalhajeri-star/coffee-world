/**
 * CoffeZ — Demo seed data for marketplace launch.
 *
 * Image strategy:
 * - Each listing gets a category-appropriate Unsplash photo. We prefer
 *   the few photo IDs we've personally seen render in production, and
 *   fall back to well-known coffee IDs for the rest.
 * - If any URL ever breaks, the card's `.fallback` span takes over
 *   with a rich themed gradient + category emoji (see marketplace.css).
 *   So the marketplace never shows a bare broken-image icon.
 *
 * Safety:
 * - Phone numbers are obviously fake (0X0000000N). Listing detail
 *   intercepts calls/whatsapp/email on any isDemo entry so nobody
 *   accidentally dials a stranger.
 */
(function () {
  const U = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

  // Category-matched images. Primary first; second is a safe alt.
  const PICS = {
    // Verified-working (seen rendered in production screenshots):
    coffeeCup:    U("1509042239860-f550ce710b93"),  // latte art cup + saucer
    coffeeBeans:  U("1447933601403-0c6688de566e"),  // coffee beans/cup on table
    mokaPot:      U("1485808191679-5f86510681a2"),  // italian moka pot
    coldBrewGlass:U("1517701604599-bb29b565090c"),  // cold brew glass

    // Category-matched (best-effort — onerror cascades to themed fallback):
    beansBag:     U("1559056199-641a0ac8b55e"),     // bag of coffee beans
    beansPile:    U("1497935586351-b67a49e012bf"),  // close-up roasted beans
    beansScoop:   U("1587049352846-4a222e784d38"),  // beans with wooden scoop
    espressoMc:   U("1510017803434-a899398421b3"),  // espresso machine shot
    laMarzocco:   U("1574914629385-46448b767aec"),  // pro machine
    manualMc:     U("1621555071180-36f4533b9094"),  // manual espresso lever
    grinder:      U("1606335538823-96f10ed26b00"),  // coffee grinder
    handGrinder:  U("1611854779393-1b2da9d400fe"),  // hand grinder
    v60:          U("1510591509098-f4fdc6d0ff04"),  // v60 pour over
    chemex:       U("1494415859740-21e878dd929d"),  // chemex
    scale:        U("1627998792088-f8dcb0a1fd93"),  // coffee scale
    aeropress:    U("1612360030922-9c9eaf9f0b76"),  // aeropress

    // Traditional Arabic coffee:
    dallah:       U("1559525839-8f75920289bb"),     // traditional pot
    arabicSet:    U("1571934811356-5cc061b6821f"),  // arabic coffee set
    arabicCoffee: U("1511920170033-f8396924c348"),  // arabic coffee served

    // Dates:
    dates1:       U("1615485290382-5b19e8cb0c54"),  // dates bowl
    dates2:       U("1601000785686-0462e00eccfc"),  // dates plate
    dates3:       U("1587316829027-ea0ba6d3a08a"),  // dates close-up
    dates4:       U("1598516802269-2cfe0ffe67f6"),  // assorted dates
  };

  // Safe defaults per category — used as the 2nd image in the carousel.
  const SAFE = PICS.coffeeCup; // always renders

  window.CW_SEED_LISTINGS = [
    // ========== SAUDI ARABIA ==========
    {
      title: "بن يمني مطري صافي — 500غ",
      description: "حبوب بن يمنية من محمصة صنعاء، تحميص متوسط، طازجة. مناسبة للإسبريسو أو الدلة. درجة تحميص مضبوطة.",
      price: 45, currency: "SAR", category: "beans",
      city: "الرياض", country: "SA", phone: "0500000001",
      images: [PICS.beansBag, PICS.coffeeBeans],
    },
    {
      title: "بن إثيوبي يرغاتشيف مختص — 1كغ",
      description: "بن مختص من منطقة يرغاتشيف الشهيرة. نكهات فاكهية وزهرية. تاريخ التحميص: آخر أسبوع. مناسب للـ V60 والـ Chemex.",
      price: 120, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000002",
      images: [PICS.beansPile, PICS.coffeeBeans],
    },
    {
      title: "ماكينة إسبريسو De'Longhi Dedica",
      description: "ماكينة إسبريسو احترافية، حالة ممتازة، مستخدمة 6 أشهر فقط. الكرتون والملحقات الأصلية كاملة. ضغط 15 بار.",
      price: 650, currency: "SAR", category: "machines",
      city: "الرياض", country: "SA", phone: "0500000003",
      images: [PICS.espressoMc, PICS.laMarzocco],
    },
    {
      title: "مطحنة 1Zpresso J-Max يدوية",
      description: "مطحنة يدوية احترافية بمسامير ستانلس ستيل. 40 درجة ضبط. مناسبة من الإسبريسو للـ French Press. جديدة بالكرتون.",
      price: 850, currency: "SAR", category: "grinders",
      city: "جدة", country: "SA", phone: "0500000004",
      images: [PICS.handGrinder, PICS.grinder],
    },
    {
      title: "طقم V60 هاريو كامل + 100 فلتر",
      description: "قمع V60 سيراميك مقاس 02 + إبريق زجاجي 600مل + 100 فلتر ورقي أصلي. مناسب للمبتدئين والمحترفين.",
      price: 125, currency: "SAR", category: "accessories",
      city: "الدمام", country: "SA", phone: "0500000005",
      images: [PICS.v60, PICS.coffeeCup],
    },

    // ========== KUWAIT ==========
    {
      title: "بن كيني AA مختص — 500غ",
      description: "بن كيني من الدرجة الأولى. تحميص فاتح يُظهر النكهات الفاكهية والحمضية. محمّص محلياً في الكويت.",
      price: 14, currency: "KWD", category: "beans",
      city: "مدينة الكويت", country: "KW", phone: "22000001",
      images: [PICS.beansScoop, PICS.coffeeBeans],
    },
    {
      title: "ماكينة إسبريسو يدوية Flair Pro 2",
      description: "ماكينة إسبريسو يدوية بدون كهرباء — تعطي شوت احترافي بضغط 9 بار. مثالية للسفر والمكتب.",
      price: 32, currency: "KWD", category: "machines",
      city: "السالمية", country: "KW", phone: "22000002",
      images: [PICS.manualMc, PICS.espressoMc],
    },
    {
      title: "مطحنة كهربائية Baratza Encore",
      description: "أشهر مطحنة للمبتدئين حول العالم. 40 درجة ضبط، محرك هادئ، سهلة التنظيف. مستعملة بحالة ممتازة.",
      price: 95, currency: "KWD", category: "grinders",
      city: "حولي", country: "KW", phone: "22000003",
      images: [PICS.grinder, PICS.handGrinder],
    },

    // ========== UAE ==========
    {
      title: "بن برازيلي سانتوس — 1كغ",
      description: "حبوب برازيلية تحميص متوسط، نكهة مكسّرات وشوكولاتة. مثالية للإسبريسو وعشاق القهوة المتوازنة.",
      price: 65, currency: "AED", category: "beans",
      city: "دبي", country: "AE", phone: "0400000001",
      images: [PICS.beansPile, PICS.coffeeBeans],
    },
    {
      title: "ماكينة La Marzocco Linea Mini",
      description: "ماكينة إسبريسو احترافية، المستخدمة في أفضل المقاهي العالمية. لون أحمر، كرتونها الأصلي مع الضمان.",
      price: 22000, currency: "AED", category: "machines",
      city: "دبي", country: "AE", phone: "0400000002",
      images: [PICS.laMarzocco, PICS.espressoMc],
    },
    {
      title: "Chemex كلاسيك 6 أكواب + 100 فلتر",
      description: "قارورة تحضير زجاجية أنيقة، تناسب ديكور أي مطبخ. تحضّر قهوة صافية بدون ترسبات.",
      price: 180, currency: "AED", category: "accessories",
      city: "أبوظبي", country: "AE", phone: "0400000003",
      images: [PICS.chemex, PICS.v60],
    },

    // ========== BAHRAIN ==========
    {
      title: "كولد برو Hario Mizudashi 1 لتر",
      description: "إبريق تحضير قهوة باردة بالتنقيع. نتيجة ناعمة وقليلة الحموضة. مناسبة لجو الخليج الحار.",
      price: 18, currency: "BHD", category: "accessories",
      city: "المنامة", country: "BH", phone: "30000001",
      images: [PICS.coldBrewGlass, PICS.coffeeCup],
    },
    {
      title: "ميزان Timemore Black Mirror Nano",
      description: "ميزان قهوة احترافي بدقة 0.1 جرام، مؤقت مدمج. صغير الحجم، أنيق، مقاوم للماء. جديد بالكرتون.",
      price: 14, currency: "BHD", category: "accessories",
      city: "الرفاع", country: "BH", phone: "30000002",
      images: [PICS.scale, PICS.coffeeCup],
    },

    // ========== QATAR ==========
    {
      title: "Moka Pot Bialetti إيطالية — 3 أكواب",
      description: "ماكينة موكا كلاسيكية من بياليتي، الصانع الأصلي منذ 1933. ألمنيوم، تعمل على الغاز. جديدة.",
      price: 180, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000003",
      images: [PICS.mokaPot, PICS.coffeeCup],
    },
    {
      title: "آيروبرس أصلية + 350 فلتر + محرّك",
      description: "Aerobie AeroPress الأصلية، الطريقة الأسرع لتحضير قهوة لذيذة. مع 350 فلتر إضافي ومحرّك تقليب.",
      price: 220, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000004",
      images: [PICS.aeropress, PICS.v60],
    },

    // ========== TRADITIONAL GULF / ARABIC ITEMS ==========
    {
      title: "دلة نحاسية تراثية يدوية — 2 لتر",
      description: "دلة قهوة عربية من النحاس الأصلي، صناعة يدوية. مناسبة للمجالس والضيافة. تحافظ على حرارة القهوة طويلاً.",
      price: 45, currency: "KWD", category: "traditional",
      city: "مدينة الكويت", country: "KW", phone: "22000004",
      images: [PICS.dallah, PICS.arabicSet],
    },
    {
      title: "طقم فناجيل ذهبي مطرز — 12 قطعة",
      description: "فناجيل قهوة عربية فاخرة، تصميم تراثي بأطراف ذهبية. طقم كامل بحافظة مخملية. هدية مثالية.",
      price: 180, currency: "SAR", category: "traditional",
      city: "الرياض", country: "SA", phone: "0500000006",
      images: [PICS.arabicCoffee, PICS.arabicSet],
    },
    {
      title: "طقم دلة + 6 فناجيل + صينية نحاسية",
      description: "طقم ضيافة عربي كامل. صناعة يدوية. مثالي للأعراس والمناسبات أو هدية للمجلس.",
      price: 320, currency: "AED", category: "traditional",
      city: "الشارقة", country: "AE", phone: "0400000004",
      images: [PICS.arabicSet, PICS.dallah],
    },
    {
      title: "محماسة نحاسية يدوية تراثية",
      description: "محماسة نحاسية لتحميص القهوة على الفحم. الطريقة التراثية الأصلية. تعطي نكهة لا مثيل لها.",
      price: 38, currency: "KWD", category: "traditional",
      city: "الجهراء", country: "KW", phone: "22000005",
      images: [PICS.dallah, PICS.arabicCoffee],
    },
    {
      title: "قهوة عربية مطحونة مع الهيل — 500غ",
      description: "قهوة عربية فاخرة مطحونة طازجة مع الهيل والقرنفل. جاهزة للتحضير في الدلة مباشرة. نكهة خليجية أصيلة.",
      price: 55, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000007",
      images: [PICS.arabicCoffee, PICS.beansPile],
    },

    // ========== DATES ==========
    {
      title: "تمر عجوة المدينة الفاخر — 2كغ",
      description: "تمر عجوة أصلي من المدينة المنورة. يُقدَّم مع القهوة العربية. معبّأ في علبة فاخرة، جودة A+.",
      price: 180, currency: "SAR", category: "dates",
      city: "المدينة المنورة", country: "SA", phone: "0500000008",
      images: [PICS.dates1, PICS.dates2],
    },
    {
      title: "تمر سكري راقي — 1كغ",
      description: "تمر سكري القصيم، حجم مختار، لحمة طرية وحلاوة متوازنة. مثالي مع القهوة العربية أو الشاي.",
      price: 85, currency: "SAR", category: "dates",
      city: "الرياض", country: "SA", phone: "0500000009",
      images: [PICS.dates2, PICS.dates3],
    },
    {
      title: "تمر مجدول فاخر — 1كغ",
      description: "مجدول درجة أولى، حبة كبيرة وممتلئة. يُعتبر ملك التمور. مغلّف بعناية في علبة هدية.",
      price: 120, currency: "AED", category: "dates",
      city: "دبي", country: "AE", phone: "0400000005",
      images: [PICS.dates3, PICS.dates4],
    },
    {
      title: "تمر خلاص فاخر — 500غ",
      description: "تمر خلاص الأحساء المشهور، معبأ حديثاً. مناسب للضيافة والإفطار. جودة ممتازة.",
      price: 12, currency: "BHD", category: "dates",
      city: "المنامة", country: "BH", phone: "30000004",
      images: [PICS.dates4, PICS.dates1],
    },
    {
      title: "قهوة سعودية جاهزة + تمر — بوكس الإفطار",
      description: "بوكس فاخر: قهوة سعودية مطحونة مع الهيل 250غ + تمر مشكّل 500غ + علبة أنيقة. مثالي للمكتب أو الضيافة.",
      price: 95, currency: "QAR", category: "traditional",
      city: "الدوحة", country: "QA", phone: "30000005",
      images: [PICS.arabicCoffee, PICS.dates2],
    },
  ];
})();
