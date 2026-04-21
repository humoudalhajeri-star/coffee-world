/**
 * CoffeZ — Demo seed data for marketplace launch.
 *
 * Used once to populate the marketplace so it doesn't feel empty to
 * first-time visitors (especially TikTok ad traffic). The admin panel
 * exposes a button that iterates this array and creates real Firestore
 * documents, tagged with `isDemo: true` so we can bulk-delete them later
 * once real sellers arrive.
 *
 * All images come from Unsplash (free for commercial use).
 */
(function () {
  const U = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

  window.CW_SEED_LISTINGS = [
    // ========== SAUDI ARABIA (5) ==========
    {
      title: "بن يمني مطري صافي — 500غ",
      description: "حبوب بن يمنية من محمصة صنعاء، تحميص متوسط، طازجة. مناسبة للإسبريسو أو الدلة. درجة تحميص مضبوطة.",
      price: 45, currency: "SAR", category: "beans",
      city: "الرياض", country: "SA", phone: "0551234567",
      images: [U("1559056199-641a0ac8b55e"), U("1497935586351-b67a49e012bf")],
    },
    {
      title: "بن إثيوبي يرغاتشيف مختص — 1كغ",
      description: "بن مختص من منطقة يرغاتشيف الشهيرة. نكهات فاكهية وزهرية. تاريخ التحميص: آخر أسبوع. مناسب للـ V60 والـ Chemex.",
      price: 120, currency: "SAR", category: "beans",
      city: "جدة", country: "SA", phone: "0569876543",
      images: [U("1447933601403-0c6688de566e"), U("1442512595331-e89e73853f31")],
    },
    {
      title: "ماكينة إسبريسو De'Longhi Dedica — مستعملة ممتازة",
      description: "ماكينة إسبريسو احترافية، حالة ممتازة، مستخدمة 6 أشهر فقط. الكرتون والملحقات الأصلية كاملة. ضغط 15 بار.",
      price: 650, currency: "SAR", category: "machines",
      city: "الرياض", country: "SA", phone: "0533221100",
      images: [U("1572442388796-11668a67e53d"), U("1574914629385-46448b767aec")],
    },
    {
      title: "مطحنة 1Zpresso J-Max يدوية",
      description: "مطحنة يدوية احترافية بمسامير ستانلس ستيل. 40 درجة ضبط. مناسبة من الإسبريسو للـ French Press. جديدة بالكرتون.",
      price: 850, currency: "SAR", category: "grinders",
      city: "جدة", country: "SA", phone: "0541112233",
      images: [U("1611854779393-1b2da9d400fe"), U("1606335538823-96f10ed26b00")],
    },
    {
      title: "طقم V60 هاريو كامل + 100 فلتر",
      description: "قمع V60 سيراميك مقاس 02 + إبريق زجاجي 600مل + 100 فلتر ورقي أصلي. مناسب للمبتدئين والمحترفين.",
      price: 125, currency: "SAR", category: "accessories",
      city: "الدمام", country: "SA", phone: "0567788990",
      images: [U("1510591509098-f4fdc6d0ff04"), U("1461023058943-07fcbe16d735")],
    },

    // ========== KUWAIT (3) ==========
    {
      title: "بن كيني AA مختص — 500غ",
      description: "بن كيني من الدرجة الأولى. تحميص فاتح يُظهر النكهات الفاكهية والحمضية. محمّص محلياً في الكويت.",
      price: 14, currency: "KWD", category: "beans",
      city: "مدينة الكويت", country: "KW", phone: "99887766",
      images: [U("1497515114629-f71d768fd07c"), U("1559525839-8f75920289bb")],
    },
    {
      title: "ماكينة إسبريسو يدوية Flair Pro 2",
      description: "ماكينة إسبريسو يدوية بدون كهرباء — تعطي شوت احترافي بضغط 9 بار. مثالية للسفر والمكتب.",
      price: 32, currency: "KWD", category: "machines",
      city: "السالمية", country: "KW", phone: "99112233",
      images: [U("1585664811087-47f65abbad64"), U("1572286258212-9d6d2e99e8c6")],
    },
    {
      title: "مطحنة كهربائية Baratza Encore",
      description: "أشهر مطحنة للمبتدئين حول العالم. 40 درجة ضبط، محرك هادئ، سهلة التنظيف. مستعملة بحالة ممتازة.",
      price: 95, currency: "KWD", category: "grinders",
      city: "حولي", country: "KW", phone: "66554433",
      images: [U("1606335538823-96f10ed26b00"), U("1611854779393-1b2da9d400fe")],
    },

    // ========== UAE (3) ==========
    {
      title: "بن برازيلي سانتوس — 1كغ",
      description: "حبوب برازيلية تحميص متوسط، نكهة مكسّرات وشوكولاتة. مثالية للإسبريسو وعشاق القهوة المتوازنة.",
      price: 65, currency: "AED", category: "beans",
      city: "دبي", country: "AE", phone: "0501234567",
      images: [U("1442512595331-e89e73853f31"), U("1587049352846-4a222e784d38")],
    },
    {
      title: "ماكينة La Marzocco Linea Mini — جديدة",
      description: "ماكينة إسبريسو احترافية، المستخدمة في أفضل المقاهي العالمية. لون أحمر، كرتونها الأصلي مع الضمان.",
      price: 22000, currency: "AED", category: "machines",
      city: "دبي", country: "AE", phone: "0554433221",
      images: [U("1621555071180-36f4533b9094"), U("1510017803434-a899398421b3")],
    },
    {
      title: "Chemex كلاسيك 6 أكواب + 100 فلتر",
      description: "قارورة تحضير زجاجية أنيقة، تناسب ديكور أي مطبخ. تحضّر قهوة صافية بدون ترسبات.",
      price: 180, currency: "AED", category: "accessories",
      city: "أبوظبي", country: "AE", phone: "0509988776",
      images: [U("1494415859740-21e878dd929d"), U("1509785289842-8d0e35dc94c4")],
    },

    // ========== BAHRAIN (2) ==========
    {
      title: "كولد برو Hario Mizudashi 1 لتر",
      description: "إبريق تحضير قهوة باردة بالتنقيع. نتيجة ناعمة وقليلة الحموضة. مناسبة لجو الخليج الحار.",
      price: 18, currency: "BHD", category: "accessories",
      city: "المنامة", country: "BH", phone: "33445566",
      images: [U("1517701604599-bb29b565090c"), U("1461023058943-07fcbe16d735")],
    },
    {
      title: "ميزان Timemore Black Mirror Nano",
      description: "ميزان قهوة احترافي بدقة 0.1 جرام، مؤقت مدمج. صغير الحجم، أنيق، مقاوم للماء. جديد بالكرتون.",
      price: 14, currency: "BHD", category: "accessories",
      city: "الرفاع", country: "BH", phone: "39112233",
      images: [U("1627998792088-f8dcb0a1fd93"), U("1495474472287-4d71bcdd2085")],
    },

    // ========== QATAR (2) ==========
    {
      title: "Moka Pot Bialetti إيطالية — 3 أكواب",
      description: "ماكينة موكا كلاسيكية من بياليتي، الصانع الأصلي منذ 1933. ألمنيوم، تعمل على الغاز. جديدة.",
      price: 180, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "33778899",
      images: [U("1485808191679-5f86510681a2"), U("1512568400610-62da28bc8a13")],
    },
    {
      title: "آيروبرس أصلية + 350 فلتر + محرّك",
      description: "Aerobie AeroPress الأصلية، الطريقة الأسرع لتحضير قهوة لذيذة. مع 350 فلتر إضافي ومحرّك تقليب.",
      price: 220, currency: "QAR", category: "accessories",
      city: "الدوحة", country: "QA", phone: "55667788",
      images: [U("1612360030922-9c9eaf9f0b76"), U("1559056199-641a0ac8b55e")],
    },
  ];
})();
