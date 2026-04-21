/**
 * CoffeZ — Demo seed data for marketplace launch.
 *
 * 15 listings total. Every image is a specific Unsplash photo ID
 * that has been seen rendering real, on-topic coffee content in our
 * production screenshots. IDs that previously returned unrelated
 * photos (watermelon, smartwatches) or that fell back to emoji have
 * been removed. Dates and traditional dallah/finjan listings were
 * dropped entirely because we couldn't find reliable photo IDs for
 * those subjects — the user was firm: no placeholder, no random photo.
 *
 * Categories in use here: beans, machines, grinders, accessories.
 * The dates/traditional categories still exist in the UI so real
 * sellers can post in them, we just don't seed them.
 */
(function () {
  const U = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

  // ~~~ Verified-working image pool ~~~
  // Every ID below has been personally observed to return real coffee
  // content in the running app. Do NOT swap these for untested IDs.
  const coffeeCup     = U("1509042239860-f550ce710b93");  // latte-art cup on saucer
  const beansOnTable  = U("1447933601403-0c6688de566e");  // roasted beans by a cup
  const espressoSetup = U("1497935586351-b67a49e012bf");  // portafilter + grounds
  const grinderScene  = U("1606335538823-96f10ed26b00");  // bag + grinder on counter
  const arabicCoffee  = U("1511920170033-f8396924c348");  // arabic-coffee serving
  const mokaPot       = U("1485808191679-5f86510681a2");  // bialetti moka
  const coldBrew      = U("1517701604599-bb29b565090c");  // cold-brew glass

  window.CW_SEED_LISTINGS = [
    // ========== SAUDI ARABIA (5) ==========
    {
      title: "بن يمني مطري صافي — 500غ",
      description: "حبوب بن يمنية من محمصة صنعاء، تحميص متوسط، طازجة. مناسبة للإسبريسو أو الدلة. درجة تحميص مضبوطة.",
      price: 45, currency: "SAR", category: "beans",
      city: "الرياض", country: "SA", phone: "0500000001",
      images: [beansOnTable, espressoSetup],
    },
    {
      title: "بن إثيوبي يرغاتشيف مختص — 1كغ",
      description: "بن مختص من منطقة يرغاتشيف الشهيرة. نكهات فاكهية وزهرية. تاريخ التحميص: آخر أسبوع. مناسب للـ V60 والـ Chemex.",
      price: 120, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000002",
      images: [espressoSetup, beansOnTable],
    },
    {
      title: "قهوة عربية مطحونة مع الهيل — 500غ",
      description: "قهوة عربية فاخرة مطحونة طازجة مع الهيل والقرنفل. جاهزة للتحضير في الدلة مباشرة. نكهة خليجية أصيلة.",
      price: 55, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0500000007",
      images: [arabicCoffee, beansOnTable],
    },
    {
      title: "ماكينة إسبريسو De'Longhi Dedica",
      description: "ماكينة إسبريسو احترافية، حالة ممتازة، مستخدمة 6 أشهر فقط. الكرتون والملحقات الأصلية كاملة. ضغط 15 بار.",
      price: 650, currency: "SAR", category: "machines",
      city: "الرياض", country: "SA", phone: "0500000003",
      images: [espressoSetup, grinderScene],
    },
    {
      title: "طقم V60 هاريو كامل + 100 فلتر",
      description: "قمع V60 سيراميك مقاس 02 + إبريق زجاجي 600مل + 100 فلتر ورقي أصلي. مناسب للمبتدئين والمحترفين.",
      price: 125, currency: "SAR", category: "accessories",
      city: "الدمام", country: "SA", phone: "0500000005",
      images: [coffeeCup, arabicCoffee],
    },

    // ========== KUWAIT (3) ==========
    {
      title: "بن كيني AA مختص — 500غ",
      description: "بن كيني من الدرجة الأولى. تحميص فاتح يُظهر النكهات الفاكهية والحمضية. محمّص محلياً في الكويت.",
      price: 14, currency: "KWD", category: "beans",
      city: "مدينة الكويت", country: "KW", phone: "22000001",
      images: [beansOnTable, espressoSetup],
    },
    {
      title: "ماكينة إسبريسو يدوية Flair Pro 2",
      description: "ماكينة إسبريسو يدوية بدون كهرباء — تعطي شوت احترافي بضغط 9 بار. مثالية للسفر والمكتب.",
      price: 32, currency: "KWD", category: "machines",
      city: "السالمية", country: "KW", phone: "22000002",
      images: [grinderScene, espressoSetup],
    },
    {
      title: "مطحنة كهربائية Baratza Encore",
      description: "أشهر مطحنة للمبتدئين حول العالم. 40 درجة ضبط، محرك هادئ، سهلة التنظيف. مستعملة بحالة ممتازة.",
      price: 95, currency: "KWD", category: "grinders",
      city: "حولي", country: "KW", phone: "22000003",
      images: [grinderScene, beansOnTable],
    },

    // ========== UAE (3) ==========
    {
      title: "بن كولومبي سوبريمو — 1كغ",
      description: "حبوب كولومبية درجة سوبريمو. نكهة متوازنة بين الكراميل والمكسّرات. تحميص متوسط. مناسبة لكل طرق التحضير.",
      price: 55, currency: "AED", category: "beans",
      city: "دبي", country: "AE", phone: "0400000001",
      images: [beansOnTable, espressoSetup],
    },
    {
      title: "ماكينة La Marzocco Linea Mini",
      description: "ماكينة إسبريسو احترافية، المستخدمة في أفضل المقاهي العالمية. كرتونها الأصلي مع الضمان. حالة ممتازة.",
      price: 22000, currency: "AED", category: "machines",
      city: "دبي", country: "AE", phone: "0400000002",
      images: [espressoSetup, grinderScene],
    },
    {
      title: "Chemex كلاسيك 6 أكواب + 100 فلتر",
      description: "قارورة تحضير زجاجية أنيقة، تناسب ديكور أي مطبخ. تحضّر قهوة صافية بدون ترسبات.",
      price: 180, currency: "AED", category: "accessories",
      city: "أبوظبي", country: "AE", phone: "0400000003",
      images: [coffeeCup, arabicCoffee],
    },

    // ========== BAHRAIN (2) ==========
    {
      title: "كولد برو Hario Mizudashi 1 لتر",
      description: "إبريق تحضير قهوة باردة بالتنقيع. نتيجة ناعمة وقليلة الحموضة. مناسبة لجو الخليج الحار.",
      price: 18, currency: "BHD", category: "accessories",
      city: "المنامة", country: "BH", phone: "30000001",
      images: [coldBrew, coffeeCup],
    },
    {
      title: "مطحنة 1Zpresso J-Max يدوية",
      description: "مطحنة يدوية احترافية بمسامير ستانلس ستيل. 40 درجة ضبط. مناسبة من الإسبريسو للـ French Press. جديدة بالكرتون.",
      price: 95, currency: "BHD", category: "grinders",
      city: "الرفاع", country: "BH", phone: "30000002",
      images: [grinderScene, beansOnTable],
    },

    // ========== QATAR (2) ==========
    {
      title: "Moka Pot Bialetti إيطالية — 3 أكواب",
      description: "ماكينة موكا كلاسيكية من بياليتي، الصانع الأصلي منذ 1933. ألمنيوم، تعمل على الغاز. جديدة.",
      price: 180, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000003",
      images: [mokaPot, coffeeCup],
    },
    {
      title: "آيروبرس أصلية + 350 فلتر + محرّك",
      description: "Aerobie AeroPress الأصلية، الطريقة الأسرع لتحضير قهوة لذيذة. مع 350 فلتر إضافي ومحرّك تقليب.",
      price: 220, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "30000004",
      images: [coffeeCup, arabicCoffee],
    },
  ];
})();
