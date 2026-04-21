/**
 * CoffeZ — Demo seed barista profiles.
 *
 * Six fictional barista profiles spread across the Gulf, used to fill
 * the baristas page so cafe owners visiting from TikTok ads see a real
 * talent pool instead of an empty listing. Each profile is tagged
 * `isDemo: true` for bulk cleanup once real baristas register.
 *
 * Phone numbers use the same fake-zero pattern as listings, and the
 * barista detail page intercepts contact attempts on demo profiles so
 * nobody calls a stranger.
 */
(function () {
  const P = (id) => `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop&crop=faces`;

  window.CW_SEED_BARISTAS = [
    {
      name: "أحمد السالم",
      city: "الرياض",
      country: "SA",
      phone: "0500000101",
      email: "ahmed.demo@coffez.example",
      experience: "senior",
      years: 5,
      bio: "بريستا محترف بخبرة 5 سنوات في القهوة المختصة. عملت في 3 من أفضل المقاهي في الرياض. متخصص في لاتيه آرت والإسبريسو.",
      photo: P("1507003211169-0a1dd7228f2d"),
      skills: ["latte-art", "espresso", "cupping", "training"],
      experiences: [
        { role: "Head Barista", place: "Cafe Bloom — الرياض", from: "2023-03", to: "", current: true },
        { role: "Senior Barista", place: "Brew Lab — الرياض", from: "2021-01", to: "2023-02", current: false },
      ],
      certifications: [
        { name: "SCA Barista Intermediate", issuer: "SCA", year: "2022" },
      ],
      languages: [
        { name: "العربية", level: "أصلية" },
        { name: "الإنجليزية", level: "متقدّم" },
      ],
    },
    {
      name: "فاطمة الكندري",
      city: "مدينة الكويت",
      country: "KW",
      phone: "22000101",
      email: "fatima.demo@coffez.example",
      experience: "mid",
      years: 3,
      bio: "بريستا متوسطة الخبرة، شغوفة بطرق التحضير اليدوية وفن الـ V60. حاصلة على دورات SCA. أبحث عن فرصة في كافيه مختص.",
      photo: P("1494790108377-be9c29b29330"),
      skills: ["latte-art", "v60", "chemex", "espresso"],
      experiences: [
        { role: "Barista", place: "Caribou Coffee — السالمية", from: "2023-06", to: "", current: true },
        { role: "Trainee Barista", place: "% Arabica — الأفنيوز", from: "2022-01", to: "2023-05", current: false },
      ],
      certifications: [
        { name: "SCA Brewing Foundation", issuer: "SCA", year: "2023" },
      ],
      languages: [
        { name: "العربية", level: "أصلية" },
        { name: "الإنجليزية", level: "ممتاز" },
      ],
    },
    {
      name: "خالد العتيبي",
      city: "جدة",
      country: "SA",
      phone: "0500000102",
      email: "khaled.demo@coffez.example",
      experience: "senior",
      years: 8,
      bio: "خبير قهوة وروستر معتمد. حاصل على Q-Grader. عملت 8 سنوات في تحميص وتقييم القهوة المختصة. أبحث عن فرصة قيادية في محمصة.",
      photo: P("1500648767791-00dcc994a43e"),
      skills: ["roasting", "q-grader", "cupping", "management"],
      experiences: [
        { role: "Head Roaster", place: "Camel Step — جدة", from: "2022-01", to: "", current: true },
        { role: "Roaster & Barista", place: "Mocha Roastery — جدة", from: "2018-03", to: "2021-12", current: false },
      ],
      certifications: [
        { name: "Q-Grader", issuer: "CQI", year: "2021" },
        { name: "SCA Roasting Professional", issuer: "SCA", year: "2020" },
      ],
      languages: [
        { name: "العربية", level: "أصلية" },
        { name: "الإنجليزية", level: "متقدّم" },
      ],
    },
    {
      name: "نورة الراشد",
      city: "دبي",
      country: "AE",
      phone: "0400000101",
      email: "noura.demo@coffez.example",
      experience: "mid",
      years: 2,
      bio: "بريستا متخصصة في فن اللاتيه آرت والقهوة الباردة. خبرة في كافيهات بوتيكية في دبي. مرنة بالساعات وأبحث عن مكان يقدّر الشغف.",
      photo: P("1438761681033-6461ffad8d80"),
      skills: ["espresso", "cold-brew", "latte-art", "v60"],
      experiences: [
        { role: "Barista", place: "Tom & Serg — دبي", from: "2023-09", to: "", current: true },
        { role: "Junior Barista", place: "Espresso Lab — دبي", from: "2022-04", to: "2023-08", current: false },
      ],
      certifications: [
        { name: "SCA Barista Foundation", issuer: "SCA", year: "2022" },
      ],
      languages: [
        { name: "العربية", level: "أصلية" },
        { name: "الإنجليزية", level: "ممتاز" },
        { name: "الفرنسية", level: "متوسط" },
      ],
    },
    {
      name: "محمد الأنصاري",
      city: "المنامة",
      country: "BH",
      phone: "30000101",
      email: "mohammed.demo@coffez.example",
      experience: "junior",
      years: 1,
      bio: "بريستا مبتدئ متحمّس. أكملت دورة SCA Foundation وأبحث عن فرصة لأطوّر مهاراتي. سريع التعلّم وأحب العمل الجماعي.",
      photo: P("1531427186611-ecfd6d936c79"),
      skills: ["espresso", "v60"],
      experiences: [
        { role: "Trainee Barista", place: "One Coffee — المنامة", from: "2024-06", to: "", current: true },
      ],
      certifications: [
        { name: "SCA Barista Foundation", issuer: "SCA", year: "2024" },
      ],
      languages: [
        { name: "العربية", level: "أصلية" },
        { name: "الإنجليزية", level: "متوسط" },
      ],
    },
    {
      name: "سارة المهري",
      city: "الدوحة",
      country: "QA",
      phone: "30000102",
      email: "sara.demo@coffez.example",
      experience: "senior",
      years: 6,
      bio: "بريستا ومدرّبة معتمدة. خبرة 6 سنوات تشمل إدارة فروع وتدريب فِرَق. أرغب بالعمل كمسؤولة تدريب أو مديرة كافيه.",
      photo: P("1487412720507-e7ab37603c6f"),
      skills: ["latte-art", "training", "management", "cupping"],
      experiences: [
        { role: "Branch Manager", place: "Espresso Lab — الدوحة", from: "2023-01", to: "", current: true },
        { role: "Training Lead", place: "Cafe Bateel — الدوحة", from: "2020-06", to: "2022-12", current: false },
        { role: "Senior Barista", place: "% Arabica — الدوحة", from: "2018-03", to: "2020-05", current: false },
      ],
      certifications: [
        { name: "Authorized SCA Trainer", issuer: "SCA", year: "2022" },
        { name: "SCA Barista Professional", issuer: "SCA", year: "2020" },
      ],
      languages: [
        { name: "العربية", level: "أصلية" },
        { name: "الإنجليزية", level: "متقدّم" },
      ],
    },
  ];
})();
